import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, SCORE_TO_WIN,
  ROUND_START_DELAY, ROUND_END_DELAY, TEXT_COLOR, MAX_DT,
  MAZE_COLS, MAZE_ROWS, CELL_SIZE, WALL_THICKNESS, WALL_REMOVE_RATIO, SPAWN_CLEAR_RADIUS,
  TANK_ROTATE_SPEED, TANK_MOVE_SPEED, TANK_BACK_SPEED,
  BULLET_SPEED, BULLET_SHOOT_COOLDOWN, BULLET_WALL_PUSH, BULLET_WALL_COOLDOWN,
  AMMO_MAX, AMMO_REFILL_INTERVAL,
} from '../config';
import { InputManager } from '../systems/InputManager';
import { generateMaze } from '../systems/MazeGenerator';
import { separateCircleFromRect, circleCircleOverlap, circleRectOverlap } from '../systems/Collision';
import { reflect } from '../utils/math';
import { Wall } from '../objects/Wall';
import { Tank } from '../objects/Tank';
import { Bullet, isOwnerSafe } from '../objects/Bullet';

enum RoundState {
  GENERATING = 'GENERATING',
  COUNTDOWN = 'COUNTDOWN',
  PLAYING = 'PLAYING',
  ROUND_OVER = 'ROUND_OVER',
  MATCH_OVER = 'MATCH_OVER',
}

export class GameScene extends Phaser.Scene {
  private roundState: RoundState = RoundState.GENERATING;
  private scoreP1: number = 0;
  private scoreP2: number = 0;
  private inputManager!: InputManager;
  private walls: Wall[] = [];
  private wallData: Array<{ x: number; y: number; width: number; height: number; orientation: 'vertical' | 'horizontal' }> = [];
  private tanks: Tank[] = [];
  private bullets: Bullet[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private ammoBarP1!: Phaser.GameObjects.Graphics;
  private ammoBarP2!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.scoreP1 = 0;
    this.scoreP2 = 0;
    this.inputManager = new InputManager(this);

    this.scoreText = this.add.text(GAME_WIDTH / 2, 20, '', {
      fontSize: '24px',
      color: TEXT_COLOR,
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setDepth(100);

    this.statusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontSize: '36px',
      color: TEXT_COLOR,
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(100);

    this.ammoBarP1 = this.add.graphics().setDepth(100);
    this.ammoBarP2 = this.add.graphics().setDepth(100);

    this.startRound();
  }

  private startRound(): void {
    this.roundState = RoundState.GENERATING;

    for (const wall of this.walls) wall.destroy();
    this.walls = [];
    for (const tank of this.tanks) tank.destroy();
    this.tanks = [];
    for (const bullet of this.bullets) bullet.destroy();
    this.bullets = [];

    const maze = generateMaze(MAZE_COLS, MAZE_ROWS, CELL_SIZE, WALL_THICKNESS, WALL_REMOVE_RATIO, SPAWN_CLEAR_RADIUS);
    this.wallData = maze.walls;

    for (const wd of this.wallData) {
      this.walls.push(new Wall(this, wd.x, wd.y, wd.width, wd.height, wd.orientation));
    }

    this.tanks.push(new Tank(this, maze.spawn1.x, maze.spawn1.y, 0, 0));
    this.tanks.push(new Tank(this, maze.spawn2.x, maze.spawn2.y, Math.PI, 1));

    this.roundState = RoundState.COUNTDOWN;
    this.statusText.setText('READY');
    this.updateScoreText();

    this.time.delayedCall(ROUND_START_DELAY * 1000, () => {
      this.statusText.setText('');
      this.roundState = RoundState.PLAYING;
    });
  }

  update(_time: number, delta: number): void {
    this.updateScoreText();

    if (this.inputManager.isEscapePressed()) {
      this.scene.start('MenuScene');
      return;
    }

    if (this.roundState !== RoundState.PLAYING) return;

    this.drawAmmoBars();

    const dt = Math.min(delta / 1000, MAX_DT);
    const currentTimeMs = this.time.now;

    const p1 = this.inputManager.getPlayer1Input();
    const p2 = this.inputManager.getPlayer2Input();

    const rotateP1 = (p1.rotateLeft ? -1 : 0) + (p1.rotateRight ? 1 : 0);
    const rotateP2 = (p2.rotateLeft ? -1 : 0) + (p2.rotateRight ? 1 : 0);

    this.updateTank(this.tanks[0], p1.forward, p1.backward, rotateP1, dt);
    this.updateTank(this.tanks[1], p2.forward, p2.backward, rotateP2, dt);

    this.handleShoot(this.tanks[0], p1.shoot, currentTimeMs);
    this.handleShoot(this.tanks[1], p2.shoot, currentTimeMs);

    // Tick bullet wall cooldowns
    for (const bullet of this.bullets) {
      if (!bullet.state.active) continue;
      for (const [wallIdx, cd] of bullet.state.wallCooldowns) {
        const newCd = cd - dt;
        if (newCd <= 0) {
          bullet.state.wallCooldowns.delete(wallIdx);
        } else {
          bullet.state.wallCooldowns.set(wallIdx, newCd);
        }
      }
    }

    // Ammo refill timer
    for (const tank of this.tanks) {
      tank.ammoRefillTimer += dt;
      if (tank.ammoRefillTimer >= AMMO_REFILL_INTERVAL) {
        tank.ammo = AMMO_MAX;
        tank.ammoRefillTimer = 0;
      }
    }

    for (const bullet of this.bullets) {
      if (!bullet.state.active) continue;
      bullet.update(dt, currentTimeMs);
      this.handleBulletWallCollision(bullet, dt);
      bullet.state.active = bullet.state.active && bullet.state.bounceCount <= 8;
    }

    const deadPlayers: number[] = [];
    for (const bullet of this.bullets) {
      if (!bullet.state.active) continue;
      for (const tank of this.tanks) {
        if (!tank.alive) continue;
        if (bullet.state.ownerId === tank.playerId && isOwnerSafe(bullet.state, currentTimeMs)) continue;
        if (circleCircleOverlap(bullet.state.x, bullet.state.y, bullet.radius, tank.x, tank.y, tank.radius)) {
          deadPlayers.push(tank.playerId);
        }
      }
    }

    this.bullets = this.bullets.filter(b => {
      if (!b.state.active) { b.destroy(); return false; }
      return true;
    });

    if (deadPlayers.length > 0) {
      this.resolveRound(deadPlayers);
    }
  }

  private updateTank(tank: Tank, forward: boolean, backward: boolean, rotateInput: number, dt: number): void {
    if (rotateInput !== 0) {
      tank.rotation += rotateInput * TANK_ROTATE_SPEED * dt;
    }

    let newX = tank.x;
    let newY = tank.y;
    if (forward) {
      newX += Math.cos(tank.rotation) * TANK_MOVE_SPEED * dt;
      newY += Math.sin(tank.rotation) * TANK_MOVE_SPEED * dt;
    } else if (backward) {
      newX -= Math.cos(tank.rotation) * TANK_BACK_SPEED * dt;
      newY -= Math.sin(tank.rotation) * TANK_BACK_SPEED * dt;
    }

    // Split-axis wall collision
    let testX = newX;
    let testY = tank.y;
    for (const wd of this.wallData) {
      const sep = separateCircleFromRect(testX, testY, tank.radius, wd.x, wd.y, wd.width, wd.height);
      testX = sep.x;
      testY = sep.y;
    }
    const finalX = testX;
    testY = newY;
    for (const wd of this.wallData) {
      const sep = separateCircleFromRect(finalX, testY, tank.radius, wd.x, wd.y, wd.width, wd.height);
      testX = sep.x;
      testY = sep.y;
    }

    tank.setPosition(testX, testY);
    tank.draw();
  }

  private handleShoot(tank: Tank, shootPressed: boolean, currentTimeMs: number): void {
    if (!shootPressed) return;
    if (tank.shootCooldown > 0) return;
    if (tank.ammo <= 0) return;

    const tip = tank.getBarrelTip();
    const vx = Math.cos(tank.rotation) * BULLET_SPEED;
    const vy = Math.sin(tank.rotation) * BULLET_SPEED;
    const bullet = new Bullet(this, tip.x, tip.y, vx, vy, tank.playerId, currentTimeMs / 1000);
    this.bullets.push(bullet);
    tank.ammo--;
    tank.shootCooldown = BULLET_SHOOT_COOLDOWN;

    this.time.addEvent({
      delay: BULLET_SHOOT_COOLDOWN * 1000,
      callback: () => { tank.shootCooldown = 0; },
    });
  }

  private handleBulletWallCollision(bullet: Bullet, _dt: number): void {
    const collisions: Array<{ wallIndex: number; orientation: 'vertical' | 'horizontal' }> = [];

    for (let i = 0; i < this.wallData.length; i++) {
      const wd = this.wallData[i];
      const cooldown = bullet.state.wallCooldowns.get(i) ?? 0;
      if (cooldown > 0) continue;

      if (circleRectOverlap(bullet.state.x, bullet.state.y, bullet.radius, wd.x, wd.y, wd.width, wd.height)) {
        collisions.push({ wallIndex: i, orientation: wd.orientation });
      }
    }

    if (collisions.length === 0) return;

    let newVx = bullet.state.vx;
    let newVy = bullet.state.vy;
    for (const col of collisions) {
      const reflected = reflect(newVx, newVy, col.orientation);
      newVx = reflected.vx;
      newVy = reflected.vy;
      bullet.state.wallCooldowns.set(col.wallIndex, BULLET_WALL_COOLDOWN);
    }

    bullet.state.bounceCount++;
    if (bullet.state.bounceCount > 8) {
      bullet.state.active = false;
      return;
    }

    bullet.state.vx = newVx;
    bullet.state.vy = newVy;

    const speed = Math.sqrt(newVx * newVx + newVy * newVy);
    if (speed > 0) {
      bullet.state.x += (newVx / speed) * BULLET_WALL_PUSH;
      bullet.state.y += (newVy / speed) * BULLET_WALL_PUSH;
    }
  }

  private resolveRound(deadPlayers: number[]): void {
    this.roundState = RoundState.ROUND_OVER;
    const uniqueDead = [...new Set(deadPlayers)];

    if (uniqueDead.length === 2) {
      this.statusText.setText('DRAW!');
    } else if (uniqueDead.includes(0)) {
      this.scoreP2++;
      this.statusText.setText('P2 Wins!');
    } else {
      this.scoreP1++;
      this.statusText.setText('P1 Wins!');
    }

    this.updateScoreText();

    this.time.delayedCall(ROUND_END_DELAY * 1000, () => {
      if (this.scoreP1 >= SCORE_TO_WIN || this.scoreP2 >= SCORE_TO_WIN) {
        this.roundState = RoundState.MATCH_OVER;
        const winner = this.scoreP1 >= SCORE_TO_WIN ? 'Player 1' : 'Player 2';
        this.statusText.setText(`${winner} Wins the Match!\n\nPress SPACE for Menu`);
        this.input.keyboard!.once('keydown-SPACE', () => {
          this.scene.start('MenuScene');
        });
      } else {
        this.startRound();
      }
    });
  }

  private updateScoreText(): void {
    this.scoreText.setText(`P1: ${this.scoreP1}  |  P2: ${this.scoreP2}`);
  }

  private drawAmmoBars(): void {
    const barWidth = 80;
    const barHeight = 10;
    const border = 1;

    // P1 bar - left side
    this.ammoBarP1.clear();
    this.ammoBarP1.fillStyle(0x333333, 1);
    this.ammoBarP1.fillRect(10, 50, barWidth, barHeight);
    if (this.tanks[0]) {
      const fillWidth = (this.tanks[0].ammo / AMMO_MAX) * barWidth;
      this.ammoBarP1.fillStyle(0x4488ff, 1);
      this.ammoBarP1.fillRect(10, 50, fillWidth, barHeight);
    }
    this.ammoBarP1.lineStyle(border, 0x888888, 1);
    this.ammoBarP1.strokeRect(10, 50, barWidth, barHeight);

    // P2 bar - right side
    this.ammoBarP2.clear();
    this.ammoBarP2.fillStyle(0x333333, 1);
    this.ammoBarP2.fillRect(GAME_WIDTH - 90, 50, barWidth, barHeight);
    if (this.tanks[1]) {
      const fillWidth = (this.tanks[1].ammo / AMMO_MAX) * barWidth;
      this.ammoBarP2.fillStyle(0xff4444, 1);
      this.ammoBarP2.fillRect(GAME_WIDTH - 90, 50, fillWidth, barHeight);
    }
    this.ammoBarP2.lineStyle(border, 0x888888, 1);
    this.ammoBarP2.strokeRect(GAME_WIDTH - 90, 50, barWidth, barHeight);
  }
}
