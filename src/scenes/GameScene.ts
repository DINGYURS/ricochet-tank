import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, SCORE_TO_WIN,
  ROUND_START_DELAY, ROUND_END_DELAY, TEXT_COLOR, MAX_DT,
  MAZE_COLS, MAZE_ROWS, CELL_SIZE, WALL_THICKNESS, WALL_REMOVE_RATIO, SPAWN_CLEAR_RADIUS,
  TANK_ROTATE_SPEED, TANK_MOVE_SPEED, TANK_BACK_SPEED,
  BULLET_SPEED, BULLET_SHOOT_COOLDOWN, BULLET_WALL_PUSH, BULLET_WALL_COOLDOWN,
  AMMO_MAX, AMMO_REFILL_INTERVAL,
  SHIELD_DURATION, RAPID_FIRE_DURATION, DOUBLE_SHOT_DURATION,
  ROCKET_TURN_SPEED, LASER_LIFETIME, POWERUP_RADIUS,
  DEATH_RAY_CHARGE_DURATION, DEATH_RAY_BEAM_LIFETIME,
  RC_MISSILE_SPEED,
  DEFAULT_GAME_SETTINGS,
  DEBUG_AI_PATHS,
  type GameSettings,
} from '../config';
import { InputManager, type PlayerInput } from '../systems/InputManager';
import { generateMaze } from '../systems/MazeGenerator';
import { separateCircleFromRect, circleCircleOverlap, circleRectOverlap } from '../systems/Collision';
import { reflect } from '../utils/math';
import { SoundManager } from '../systems/SoundManager';
import { Wall } from '../objects/Wall';
import { Tank } from '../objects/Tank';
import { Bullet, isOwnerSafe } from '../objects/Bullet';
import { PowerUpType, POWERUP_VISUALS } from '../enums/PowerUpType';
import { PowerUpManager } from '../systems/PowerUpManager';
import { getEffectiveCooldown, createBulletsForShot, fireLaser, fireRocket, placeMine, fireShotgun } from '../systems/PowerUpEffects';
import { Rocket } from '../objects/Rocket';
import { Mine } from '../objects/Mine';
import { AIController } from '../systems/AIController';
import { evaluateRound } from '../systems/MatchRules';
import { PauseScene, type PauseStatus } from './PauseScene';
import { resolveWeaponAction, type WeaponAction } from '../systems/WeaponInputResolver';
import { advanceDeathRayCharge, traceDeathRay, type DeathRayChargeState, type Point } from '../systems/DeathRay';
import { RCMissile } from '../objects/RCMissile';

enum RoundState {
  GENERATING = 'GENERATING',
  COUNTDOWN = 'COUNTDOWN',
  PLAYING = 'PLAYING',
  ROUND_OVER = 'ROUND_OVER',
  MATCH_OVER = 'MATCH_OVER',
}

interface WeaponCommand {
  action: WeaponAction;
  activePowerUp: PowerUpType | null;
}

interface ActiveDeathRayCharge {
  state: DeathRayChargeState;
  origin: Point;
  direction: Point;
}

export class GameScene extends Phaser.Scene {
  static readonly KEY = 'GameScene';

  private roundState: RoundState = RoundState.GENERATING;
  private scores: number[] = [];
  private inputManager!: InputManager;
  private walls: Wall[] = [];
  private wallData: Array<{ x: number; y: number; width: number; height: number; orientation: 'vertical' | 'horizontal' }> = [];
  private tanks: Tank[] = [];
  private bullets: Bullet[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private powerUpHudGraphics: Phaser.GameObjects.Graphics[] = [];
  private soundManager!: SoundManager;
  private powerUpManager!: PowerUpManager;
  private rockets: Rocket[] = [];
  private mines: Mine[] = [];
  private laserGraphics: Phaser.GameObjects.Graphics | null = null;
  private laserTimer: number = 0;
  private laserHitPlayerId: number | null = null;
  private collectionText!: Phaser.GameObjects.Text;
  private settings: GameSettings = { ...DEFAULT_GAME_SETTINGS };
  private aiController: AIController | null = null;
  private aiDebugGraphics: Phaser.GameObjects.Graphics | null = null;
  private soundEnabled = true;
  private powerUpsEnabled = true;
  private countdownEvent: Phaser.Time.TimerEvent | null = null;
  private roundEndEvent: Phaser.Time.TimerEvent | null = null;
  private matchOverSpaceHandler: (() => void) | null = null;
  private deathRayCharges = new Map<number, ActiveDeathRayCharge>();
  private deathRayBeams: Array<{ graphics: Phaser.GameObjects.Graphics; remaining: number }> = [];
  private rcMissiles: RCMissile[] = [];
  private rcMissileWallCooldowns = new Map<RCMissile, Map<number, number>>();

  constructor() {
    super({ key: GameScene.KEY });
  }

  create(settings?: GameSettings): void {
    this.clearAsyncTasks();
    this.events.once('shutdown', this.clearAsyncTasks, this);
    this.settings = settings ?? { ...DEFAULT_GAME_SETTINGS };
    this.aiController = null;
    this.soundEnabled = true;
    this.powerUpsEnabled = true;
    const playerCount = this.settings.mode === 'local' ? this.settings.localPlayers : 2;
    this.scores = Array(playerCount).fill(0);
    this.inputManager = new InputManager(this);
    this.soundManager = new SoundManager();
    this.soundManager.setEnabled(this.soundEnabled);

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

    this.powerUpHudGraphics = Array.from(
      { length: playerCount },
      () => this.add.graphics().setDepth(100),
    );

    this.collectionText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, '', {
      fontSize: '20px',
      color: '#ffff00',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    this.rockets = [];
    this.mines = [];
    this.laserGraphics = null;
    this.laserTimer = 0;

    this.events.on('powerup-collected', (data: { playerId: number; type: PowerUpType }) => {
      this.soundManager.powerUpPickup();
      const visual = POWERUP_VISUALS[data.type];
      this.collectionText.setText(visual.label);
      this.collectionText.setColor('#' + visual.color.toString(16).padStart(6, '0'));
      this.collectionText.setAlpha(1);
      this.time.delayedCall(1000, () => {
        this.collectionText.setAlpha(0);
      });
    });

    this.startRound();
  }

  private startRound(): void {
    this.clearAsyncTasks();
    this.clearDeathRays();
    this.clearRCMissiles();
    this.roundState = RoundState.GENERATING;

    for (const wall of this.walls) wall.destroy();
    this.walls = [];
    for (const tank of this.tanks) tank.destroy();
    this.tanks = [];
    for (const bullet of this.bullets) bullet.destroy();
    this.bullets = [];
    for (const rocket of this.rockets) rocket.destroy();
    this.rockets = [];
    for (const mine of this.mines) mine.destroy();
    this.mines = [];
    if (this.laserGraphics) { this.laserGraphics.destroy(); this.laserGraphics = null; }
    this.laserTimer = 0;

    const maze = generateMaze(MAZE_COLS, MAZE_ROWS, CELL_SIZE, WALL_THICKNESS, WALL_REMOVE_RATIO, SPAWN_CLEAR_RADIUS);
    this.wallData = maze.walls;

    for (const wd of this.wallData) {
      this.walls.push(new Wall(this, wd.x, wd.y, wd.width, wd.height, wd.orientation));
    }

    const playerCount = this.settings.mode === 'local' ? this.settings.localPlayers : 2;
    const rotations = [0, Math.PI, Math.PI];
    for (let playerId = 0; playerId < playerCount; playerId++) {
      const spawn = maze.spawns[playerId];
      this.tanks.push(new Tank(this, spawn.x, spawn.y, rotations[playerId], playerId));
    }

    this.powerUpManager = new PowerUpManager(this, this.wallData, this.tanks);
    this.powerUpManager.setEnabled(this.powerUpsEnabled);

    if (this.aiDebugGraphics && typeof this.aiDebugGraphics.destroy === 'function') {
      this.aiDebugGraphics.destroy();
    }
    this.aiDebugGraphics = null;

    if (this.settings.mode === 'ai') {
      this.aiController = new AIController(this.tanks[1], this.tanks[0], this.settings.aiDifficulty);
      if (DEBUG_AI_PATHS) {
        this.aiDebugGraphics = this.add.graphics().setDepth(99);
      }
    }

    this.roundState = RoundState.COUNTDOWN;
    this.statusText.setText('READY');
    this.updateScoreText();

    let tickCount = 0;
    this.countdownEvent = this.time.addEvent({
      delay: ROUND_START_DELAY * 1000 / 3,
      repeat: 2,
      callback: () => {
        tickCount++;
        this.soundManager.countdownTick();
        if (tickCount === 3) {
          this.countdownEvent = null;
          this.statusText.setText('');
          this.roundState = RoundState.PLAYING;
        }
      },
    });
  }

  update(_time: number, delta: number): void {
    this.updateScoreText();

    if (this.inputManager.isEscapePressed()) {
      this.scene.pause(GameScene.KEY);
      this.scene.launch(PauseScene.KEY);
      return;
    }

    if (this.roundState !== RoundState.PLAYING) return;

    this.drawPowerUpHUD();

    const dt = Math.min(delta / 1000, MAX_DT);
    const currentTimeMs = this.time.now;
    const eliminatedThisFrame = new Set<number>();
    const chargingPlayerIds = new Set(this.deathRayCharges.keys());

    this.updateDeathRays(dt, eliminatedThisFrame);
    for (const playerId of eliminatedThisFrame) {
      this.tanks.find(tank => tank.playerId === playerId)?.setAlive(false);
    }

    const inputs: PlayerInput[] = [this.inputManager.getPlayer1Input()];

    let player2Input: PlayerInput;
    if (this.aiController) {
      this.aiController.setWorldState(
        this.bullets.map(b => b.state),
        this.powerUpManager.getPowerUps().map(pu => ({ x: pu.x, y: pu.y, type: pu.type, active: pu.active })),
        this.wallData,
        GAME_WIDTH,
        GAME_HEIGHT,
      );
      player2Input = this.aiController.getInput(delta, this.time.now);
      // Draw AI debug path
      if (DEBUG_AI_PATHS) {
        this.drawAIDebugPath();
      }
    } else {
      player2Input = this.inputManager.getPlayer2Input();
    }
    inputs.push(player2Input);
    if (this.tanks.length === 3) {
      inputs.push(this.inputManager.getPlayer3Input(this.tanks[2]));
    }

    this.updateRCMissiles(dt, inputs, eliminatedThisFrame);
    const rcOwnerIds = new Set(this.rcMissiles.filter(missile => missile.active).map(missile => missile.ownerId));

    for (let playerId = 0; playerId < this.tanks.length; playerId++) {
      const tank = this.tanks[playerId];
      const input = inputs[playerId];
      if (!tank.alive || chargingPlayerIds.has(tank.playerId) || rcOwnerIds.has(tank.playerId)) continue;
      const rotateInput = (input.rotateLeft ? -1 : 0) + (input.rotateRight ? 1 : 0);
      this.updateTank(tank, input.forward, input.backward, rotateInput, dt);
    }

    const weaponCommands: WeaponCommand[] = this.tanks.map((tank, playerId) => {
      if (!tank.alive || chargingPlayerIds.has(tank.playerId) || rcOwnerIds.has(tank.playerId)) return { action: 'none', activePowerUp: null };
      const input = inputs[playerId];
      const action = resolveWeaponAction({
        shoot: input.shoot,
        usePowerUp: input.usePowerUp,
        heldPowerUp: tank.heldPowerUp,
      });
      const activePowerUp = action === 'active' ? tank.heldPowerUp : null;
      if (action === 'active') tank.heldPowerUp = null;
      return {
        action,
        activePowerUp,
      };
    });
    for (let playerId = 0; playerId < this.tanks.length; playerId++) {
      if (weaponCommands[playerId].action === 'standard') {
        this.executeWeaponAction(this.tanks[playerId], 'standard', currentTimeMs);
      }
    }

    // Power-up manager
    this.powerUpManager.update(dt, this.time.now);

    // Passive timer tick
    for (const tank of this.tanks) {
      this.powerUpManager.updatePassiveTimers(tank, dt);
    }

    // Laser timer
    if (this.laserTimer > 0) {
      this.laserTimer -= dt;
      if (this.laserTimer <= 0 && this.laserGraphics) {
        this.laserGraphics.destroy();
        this.laserGraphics = null;
        // Apply laser damage
        if (this.laserHitPlayerId !== null) {
          const target = this.tanks.find(t => t.playerId === this.laserHitPlayerId);
          if (target && target.alive) {
            if (target.shieldActive) {
              target.shieldActive = false;
              target.passiveEffects.delete(PowerUpType.Shield);
              target.passiveTimers.delete(PowerUpType.Shield);
              this.soundManager.shieldBreak();
            } else {
              eliminatedThisFrame.add(this.laserHitPlayerId);
            }
          }
          this.laserHitPlayerId = null;
        }
      }
    }

    // Update rockets
    for (const rocket of this.rockets) {
      if (!rocket.active) continue;
      const target = this.tanks.find(t => t.alive && t.playerId !== rocket.ownerId);
      if (target) {
        rocket.update(dt, target.x, target.y, ROCKET_TURN_SPEED);
      }
    }

    // Rocket collision: wall (explode) and tank (damage/shield)
    this.rockets = this.rockets.filter(rocket => {
      if (!rocket.active) return false;
      // Wall collision — explode
      for (const wd of this.wallData) {
        if (circleRectOverlap(rocket.x, rocket.y, rocket.radius, wd.x, wd.y, wd.width, wd.height)) {
          rocket.destroy();
          this.soundManager.explosion();
          return false;
        }
      }
      // Tank collision
      for (const tank of this.tanks) {
        if (!tank.alive || tank.playerId === rocket.ownerId) continue;
        if (circleCircleOverlap(rocket.x, rocket.y, rocket.radius, tank.x, tank.y, tank.radius)) {
          if (tank.shieldActive) {
            tank.shieldActive = false;
            tank.passiveEffects.delete(PowerUpType.Shield);
            tank.passiveTimers.delete(PowerUpType.Shield);
            this.soundManager.shieldBreak();
          } else {
            eliminatedThisFrame.add(tank.playerId);
          }
          rocket.destroy();
          return false;
        }
      }
      return true;
    });

    // Update mines
    for (const mine of this.mines) {
      if (!mine.active) continue;
      mine.update(dt);
      // Check trigger (only for opponent)
      for (const tank of this.tanks) {
        if (!tank.alive || tank.playerId === mine.ownerId) continue;
        if (circleCircleOverlap(mine.x, mine.y, mine.triggerRadius, tank.x, tank.y, tank.radius)) {
          if (tank.shieldActive) {
            tank.shieldActive = false;
            tank.passiveEffects.delete(PowerUpType.Shield);
            tank.passiveTimers.delete(PowerUpType.Shield);
            this.soundManager.shieldBreak();
          } else {
            this.soundManager.mineExplode();
            eliminatedThisFrame.add(tank.playerId);
          }
          mine.destroy();
        }
      }
    }
    this.mines = this.mines.filter(m => m.active);

    // Active weapons keep their previous lifecycle position after projectile updates.
    for (let playerId = 0; playerId < this.tanks.length; playerId++) {
      const command = weaponCommands[playerId];
      if (this.tanks[playerId].alive && command.action === 'active') {
        this.executeWeaponAction(
          this.tanks[playerId],
          'active',
          currentTimeMs,
          command.activePowerUp ?? undefined,
        );
      }
    }

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
          if (tank.shieldActive) {
            tank.shieldActive = false;
            tank.passiveEffects.delete(PowerUpType.Shield);
            tank.passiveTimers.delete(PowerUpType.Shield);
            bullet.state.active = false;
            this.soundManager.shieldBreak();
          } else {
            this.soundManager.explosion();
            deadPlayers.push(tank.playerId);
          }
        }
      }
    }

    this.bullets = this.bullets.filter(b => {
      if (!b.state.active) { b.destroy(); return false; }
      return true;
    });

    if (deadPlayers.length > 0) {
      for (const playerId of deadPlayers) eliminatedThisFrame.add(playerId);
    }

    if (eliminatedThisFrame.size > 0) {
      this.eliminatePlayers([...eliminatedThisFrame]);
    }
  }

  getPauseStatus(): PauseStatus {
    return {
      settings: this.settings,
      soundEnabled: this.soundEnabled,
      powerUpsEnabled: this.powerUpsEnabled,
    };
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    this.soundManager.setEnabled(enabled);
  }

  setPowerUpsEnabled(enabled: boolean): void {
    this.powerUpsEnabled = enabled;
    this.powerUpManager.setEnabled(enabled);
  }

  restartMatch(): void {
    this.scores.fill(0);
    this.startRound();
  }

  private clearAsyncTasks(): void {
    this.countdownEvent?.remove(false);
    this.countdownEvent = null;
    this.roundEndEvent?.remove(false);
    this.roundEndEvent = null;
    if (this.matchOverSpaceHandler) {
      this.input.keyboard?.off('keydown-SPACE', this.matchOverSpaceHandler);
      this.matchOverSpaceHandler = null;
    }
    this.clearDeathRays();
    this.clearRCMissiles();
  }

  private clearDeathRays(): void {
    this.deathRayCharges.clear();
    for (const beam of this.deathRayBeams) beam.graphics.destroy();
    this.deathRayBeams = [];
  }

  private clearRCMissiles(): void {
    for (const missile of this.rcMissiles) missile.destroy();
    this.rcMissiles = [];
    this.rcMissileWallCooldowns.clear();
  }

  private updateRCMissiles(dt: number, inputs: PlayerInput[], eliminatedThisFrame: Set<number>): void {
    for (const missile of this.rcMissiles) {
      if (!missile.active) continue;
      const owner = this.tanks.find(tank => tank.playerId === missile.ownerId);
      if (!owner?.alive) {
        missile.destroy();
        continue;
      }
      const input = inputs[missile.ownerId];
      const steerInput = input ? (input.rotateLeft ? -1 : 0) + (input.rotateRight ? 1 : 0) : 0;
      missile.update(dt, steerInput);
      if (!missile.active) continue;

      const wallCooldowns = this.rcMissileWallCooldowns.get(missile) ?? new Map<number, number>();
      this.rcMissileWallCooldowns.set(missile, wallCooldowns);
      for (const [wallIndex, cooldown] of wallCooldowns) {
        const remaining = cooldown - dt;
        if (remaining <= 0) wallCooldowns.delete(wallIndex);
        else wallCooldowns.set(wallIndex, remaining);
      }
      const wallCollisions: Array<{ index: number; orientation: 'vertical' | 'horizontal' }> = [];
      for (let wallIndex = 0; wallIndex < this.wallData.length; wallIndex++) {
        if (wallCooldowns.has(wallIndex)) continue;
        const wall = this.wallData[wallIndex];
        if (!circleRectOverlap(missile.x, missile.y, missile.radius, wall.x, wall.y, wall.width, wall.height)) continue;
        wallCollisions.push({ index: wallIndex, orientation: wall.orientation });
      }
      if (wallCollisions.length > 0) {
        const orientations = [...new Set(wallCollisions.map(collision => collision.orientation))];
        missile.reflect(orientations);
        for (const collision of wallCollisions) {
          wallCooldowns.set(collision.index, BULLET_WALL_COOLDOWN);
        }
        const speed = Math.hypot(missile.state.vx, missile.state.vy);
        if (missile.active && speed > 0) {
          missile.state.x += missile.state.vx / speed * BULLET_WALL_PUSH;
          missile.state.y += missile.state.vy / speed * BULLET_WALL_PUSH;
        }
      }
      if (!missile.active) continue;

      for (const tank of this.tanks) {
        if (!tank.alive) continue;
        if (tank.playerId === missile.ownerId && missile.isOwnerSafe()) continue;
        if (!circleCircleOverlap(missile.x, missile.y, missile.radius, tank.x, tank.y, tank.radius)) continue;
        if (tank.shieldActive) {
          tank.shieldActive = false;
          tank.passiveEffects.delete(PowerUpType.Shield);
          tank.passiveTimers.delete(PowerUpType.Shield);
          this.soundManager.shieldBreak();
        } else {
          eliminatedThisFrame.add(tank.playerId);
        }
        missile.destroy();
        break;
      }
    }
    this.rcMissiles = this.rcMissiles.filter(missile => {
      if (!missile.active) this.rcMissileWallCooldowns.delete(missile);
      return missile.active;
    });
  }

  private updateDeathRays(dt: number, eliminatedThisFrame: Set<number>): void {
    this.deathRayBeams = this.deathRayBeams.filter(beam => {
      beam.remaining -= dt;
      if (beam.remaining <= 0) {
        beam.graphics.destroy();
        return false;
      }
      return true;
    });

    for (const [playerId, charge] of this.deathRayCharges) {
      const owner = this.tanks.find(tank => tank.playerId === playerId);
      if (!owner?.alive) {
        this.deathRayCharges.delete(playerId);
        continue;
      }
      const advanced = advanceDeathRayCharge(charge.state, dt, DEATH_RAY_CHARGE_DURATION);
      charge.state = advanced.state;
      if (!advanced.fire) continue;

      const result = traceDeathRay(
        charge.origin,
        charge.direction,
        { x: 0, y: 0, width: GAME_WIDTH, height: GAME_HEIGHT },
        this.tanks,
        playerId,
      );
      const graphics = this.add.graphics().setDepth(50);
      graphics.lineStyle(7, 0x00eeff, 0.9);
      graphics.lineBetween(charge.origin.x, charge.origin.y, result.end.x, result.end.y);
      this.deathRayBeams.push({ graphics, remaining: DEATH_RAY_BEAM_LIFETIME });
      this.soundManager.laserFire();

      for (const hitPlayerId of result.hitPlayerIds) {
        const target = this.tanks.find(tank => tank.playerId === hitPlayerId);
        if (!target?.alive) continue;
        if (target.shieldActive) {
          target.shieldActive = false;
          target.passiveEffects.delete(PowerUpType.Shield);
          target.passiveTimers.delete(PowerUpType.Shield);
          this.soundManager.shieldBreak();
        } else {
          eliminatedThisFrame.add(hitPlayerId);
        }
      }
      this.deathRayCharges.delete(playerId);
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
  }

  private handleShoot(tank: Tank, shootPressed: boolean, currentTimeMs: number): void {
    if (!shootPressed) return;
    if (tank.shootCooldown > 0) return;
    if (tank.ammo <= 0) return;

    const cooldown = getEffectiveCooldown(tank);
    const bullets = createBulletsForShot(this, tank, currentTimeMs);
    for (const bullet of bullets) {
      this.bullets.push(bullet);
    }
    this.soundManager.shoot();
    tank.ammo--;
    tank.shootCooldown = cooldown;

    this.time.addEvent({
      delay: cooldown * 1000,
      callback: () => { tank.shootCooldown = 0; },
    });
  }

  private handleWeaponInput(
    tank: Tank,
    input: Pick<PlayerInput, 'shoot' | 'usePowerUp'>,
    currentTimeMs: number,
  ): void {
    const action = resolveWeaponAction({
      shoot: input.shoot,
      usePowerUp: input.usePowerUp,
      heldPowerUp: tank.heldPowerUp,
    });
    this.executeWeaponAction(tank, action, currentTimeMs);
  }

  private executeWeaponAction(
    tank: Tank,
    action: WeaponAction,
    currentTimeMs: number,
    activePowerUp?: PowerUpType,
  ): void {
    if (action === 'active') {
      this.handleUsePowerUp(tank, true, activePowerUp);
    } else if (action === 'standard') {
      this.handleShoot(tank, true, currentTimeMs);
    }
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
    this.soundManager.bounce();
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

  private eliminatePlayers(playerIds: number[]): void {
    if (this.roundState !== RoundState.PLAYING) return;

    for (const playerId of new Set(playerIds)) {
      this.deathRayCharges.delete(playerId);
      for (const missile of this.rcMissiles) {
        if (missile.ownerId === playerId) {
          missile.destroy();
          this.rcMissileWallCooldowns.delete(missile);
        }
      }
      this.rcMissiles = this.rcMissiles.filter(missile => missile.active);
      const tank = this.tanks.find(candidate => candidate.playerId === playerId);
      if (tank?.alive) tank.setAlive(false);
    }

    const result = evaluateRound(this.tanks.filter(tank => tank.alive).map(tank => tank.playerId));
    if (!result.roundOver) return;

    this.roundState = RoundState.ROUND_OVER;
    this.powerUpManager.clearAll();
    for (const rocket of this.rockets) rocket.destroy();
    this.rockets = [];
    for (const mine of this.mines) mine.destroy();
    this.mines = [];
    this.clearRCMissiles();
    if (this.laserGraphics) { this.laserGraphics.destroy(); this.laserGraphics = null; }
    if (result.draw) {
      this.statusText.setText('DRAW!');
    } else if (result.winnerId !== null) {
      this.scores[result.winnerId]++;
      this.statusText.setText(`${this.getPlayerLabel(result.winnerId)} Wins!`);
    }

    if (!result.draw) {
      this.soundManager.explosion();
    }

    this.updateScoreText();
    this.soundManager.victory();

    this.roundEndEvent = this.time.delayedCall(ROUND_END_DELAY * 1000, () => {
      this.roundEndEvent = null;
      const matchWinnerId = this.scores.findIndex(score => score >= SCORE_TO_WIN);
      if (matchWinnerId !== -1) {
        this.roundState = RoundState.MATCH_OVER;
        const winner = this.getPlayerLabel(matchWinnerId, true);
        this.statusText.setText(`${winner} Wins the Match!\n\nPress SPACE for Menu`);
        this.matchOverSpaceHandler = () => {
          this.matchOverSpaceHandler = null;
          this.scene.start('MenuScene');
        };
        this.input.keyboard!.once('keydown-SPACE', this.matchOverSpaceHandler);
      } else {
        this.startRound();
      }
    });
  }

  private getPlayerLabel(playerId: number, longForm = false): string {
    if (this.settings.mode === 'ai' && playerId === 1) {
      const diff = this.settings.aiDifficulty;
      return `AI (${diff.charAt(0).toUpperCase() + diff.slice(1)})`;
    }
    return longForm ? `Player ${playerId + 1}` : `P${playerId + 1}`;
  }

  private updateScoreText(): void {
    this.scoreText.setText(
      this.scores.map((score, playerId) => `${this.getPlayerLabel(playerId)}: ${score}`).join('  |  '),
    );
  }

  private handleUsePowerUp(tank: Tank, usePressed: boolean, activePowerUp?: PowerUpType): void {
    if (!usePressed) return;
    const type = activePowerUp ?? tank.heldPowerUp;
    if (!type) return;
    if (POWERUP_VISUALS[type].passive) return;

    if (activePowerUp === undefined) tank.heldPowerUp = null;

    switch (type) {
      case PowerUpType.Laser: {
        const result = fireLaser(this, tank, this.wallData, this.tanks, this.soundManager);
        this.laserGraphics = result.graphics;
        this.laserTimer = LASER_LIFETIME;
        this.laserHitPlayerId = result.hitPlayerId;
        break;
      }
      case PowerUpType.Rocket: {
        const rocket = fireRocket(this, tank);
        this.rockets.push(rocket);
        this.soundManager.rocketFire();
        break;
      }
      case PowerUpType.Mine: {
        const mine = placeMine(this, tank, this.mines.find(m => m.ownerId === tank.playerId && m.active) ?? null);
        this.mines.push(mine);
        this.soundManager.minePlace();
        break;
      }
      case PowerUpType.Shotgun: {
        const bullets = fireShotgun(this, tank, this.time.now);
        for (const b of bullets) this.bullets.push(b);
        this.soundManager.shotgunFire();
        break;
      }
      case PowerUpType.DeathRay: {
        const origin = tank.getBarrelTip();
        this.deathRayCharges.set(tank.playerId, {
          state: { elapsed: 0, fired: false },
          origin,
          direction: { x: Math.cos(tank.rotation), y: Math.sin(tank.rotation) },
        });
        break;
      }
      case PowerUpType.RCMissile: {
        const origin = tank.getBarrelTip();
        const missile = new RCMissile(
          this,
          origin.x,
          origin.y,
          Math.cos(tank.rotation) * RC_MISSILE_SPEED,
          Math.sin(tank.rotation) * RC_MISSILE_SPEED,
          tank.playerId,
        );
        this.rcMissiles.push(missile);
        this.rcMissileWallCooldowns.set(missile, new Map());
        this.soundManager.rocketFire();
        break;
      }
    }
  }

  private getPassiveMaxDuration(type: PowerUpType): number {
    switch (type) {
      case PowerUpType.Shield: return SHIELD_DURATION;
      case PowerUpType.RapidFire: return RAPID_FIRE_DURATION;
      case PowerUpType.DoubleShot: return DOUBLE_SHOT_DURATION;
      default: return 10;
    }
  }

  private drawPowerUpHUD(): void {
    for (const graphics of this.powerUpHudGraphics) graphics.clear();

    for (let playerId = 0; playerId < this.tanks.length; playerId++) {
      const tank = this.tanks[playerId];
      if (!tank.heldPowerUp) continue;

      const graphics = this.powerUpHudGraphics[playerId];
      const visual = POWERUP_VISUALS[tank.heldPowerUp];
      const x = playerId === 0 ? 10 : playerId === 1 ? GAME_WIDTH - 34 : GAME_WIDTH / 2 - 12;
      graphics.fillStyle(0x000000, 0.6);
      graphics.fillRect(x, 65, 24, 24);
      graphics.fillStyle(visual.color, 1);
      graphics.fillCircle(x + 12, 77, 8);
      graphics.lineStyle(1, 0xffffff, 0.5);
      graphics.strokeRect(x, 65, 24, 24);

      if (visual.passive && tank.passiveTimers.has(tank.heldPowerUp)) {
        const remaining = tank.passiveTimers.get(tank.heldPowerUp)!;
        const ratio = remaining / this.getPassiveMaxDuration(tank.heldPowerUp);
        graphics.fillStyle(0x333333, 1);
        graphics.fillRect(x, 90, 24, 4);
        graphics.fillStyle(visual.color, 1);
        graphics.fillRect(x, 90, 24 * ratio, 4);
      }
    }
  }

  private drawAIDebugPath(): void {
    if (!this.aiDebugGraphics || !this.aiController) return;

    this.aiDebugGraphics.clear();

    const waypoints = this.aiController.debugWaypoints;
    if (waypoints.length < 2) return;

    // Draw red dashed line through all waypoints
    this.aiDebugGraphics.lineStyle(2, 0xff0000, 0.8);

    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = waypoints[i];
      const to = waypoints[i + 1];
      this.drawDashedLine(from.x, from.y, to.x, to.y, 8, 6);
    }

    // Draw waypoint circles
    for (let i = 1; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const isFinal = i === waypoints.length - 1;
      const radius = isFinal ? 6 : 4;
      this.aiDebugGraphics.fillStyle(0xff0000, isFinal ? 0.8 : 0.5);
      this.aiDebugGraphics.fillCircle(wp.x, wp.y, radius);
    }
  }

  private drawDashedLine(x1: number, y1: number, x2: number, y2: number, dashLen: number, gapLen: number): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const totalLen = Math.sqrt(dx * dx + dy * dy);
    if (totalLen === 0) return;

    const steps = Math.floor(totalLen / (dashLen + gapLen));

    for (let i = 0; i <= steps; i++) {
      const t1 = (i * (dashLen + gapLen)) / totalLen;
      const t2 = Math.min((i * (dashLen + gapLen) + dashLen) / totalLen, 1);

      const sx = x1 + dx * t1;
      const sy = y1 + dy * t1;
      const ex = x1 + dx * t2;
      const ey = y1 + dy * t2;

      this.aiDebugGraphics!.beginPath();
      this.aiDebugGraphics!.moveTo(sx, sy);
      this.aiDebugGraphics!.lineTo(ex, ey);
      this.aiDebugGraphics!.strokePath();
    }
  }
}
