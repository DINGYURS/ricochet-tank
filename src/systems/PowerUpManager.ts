import Phaser from 'phaser';
import { PowerUp } from '../objects/PowerUp';
import { PowerUpType, SPAWNABLE_POWERUP_TYPES, POWERUP_VISUALS } from '../enums/PowerUpType';
import {
  POWERUP_SPAWN_INTERVAL_MIN, POWERUP_SPAWN_INTERVAL_MAX,
  POWERUP_MAX_ON_MAP, POWERUP_DESPAWN_TIME,
  POWERUP_RADIUS, MAZE_COLS, MAZE_ROWS, CELL_SIZE,
  SHIELD_DURATION, RAPID_FIRE_DURATION, DOUBLE_SHOT_DURATION,
} from '../config';
import { Tank } from '../objects/Tank';
import { circleCircleOverlap } from '../utils/math';

export class PowerUpManager {
  private scene: Phaser.Scene;
  private powerUps: PowerUp[] = [];
  private spawnTimer: number;
  private wallData: Array<{ x: number; y: number; width: number; height: number }>;
  private tanks: Tank[];
  private enabled = true;

  constructor(scene: Phaser.Scene, wallData: PowerUpManager['wallData'], tanks: Tank[]) {
    this.scene = scene;
    this.wallData = wallData;
    this.tanks = tanks;
    this.spawnTimer = this.randomInterval();
  }

  private randomInterval(): number {
    return POWERUP_SPAWN_INTERVAL_MIN + Math.random() * (POWERUP_SPAWN_INTERVAL_MAX - POWERUP_SPAWN_INTERVAL_MIN);
  }

  update(dt: number, time: number): void {
    if (!this.enabled) return;
    // Spawn timer
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.powerUps.length < POWERUP_MAX_ON_MAP) {
      this.spawnPowerUp(time);
      this.spawnTimer = this.randomInterval();
    }

    // Update and despawn
    for (const pu of this.powerUps) {
      if (!pu.active) continue;
      pu.age += dt;
      if (pu.age >= POWERUP_DESPAWN_TIME) {
        pu.destroy();
        continue;
      }
      pu.draw(time);
    }

    // Clean destroyed
    this.powerUps = this.powerUps.filter(p => p.active);

    // Check collection
    this.checkCollections();
  }

  private spawnPowerUp(time: number): void {
    const pos = this.findEmptyPosition();
    if (!pos) return;

    const type = SPAWNABLE_POWERUP_TYPES[Math.floor(Math.random() * SPAWNABLE_POWERUP_TYPES.length)];
    const pu = new PowerUp(this.scene, pos.x, pos.y, type);
    this.powerUps.push(pu);
  }

  private findEmptyPosition(): { x: number; y: number } | null {
    const margin = CELL_SIZE * 0.5;
    for (let attempt = 0; attempt < 30; attempt++) {
      const col = Math.floor(Math.random() * MAZE_COLS);
      const row = Math.floor(Math.random() * MAZE_ROWS);
      const x = col * CELL_SIZE + CELL_SIZE / 2;
      const y = row * CELL_SIZE + CELL_SIZE / 2;

      // Check not overlapping walls
      let overlapsWall = false;
      for (const wd of this.wallData) {
        const closestX = Math.max(wd.x, Math.min(x, wd.x + wd.width));
        const closestY = Math.max(wd.y, Math.min(y, wd.y + wd.height));
        const dx = x - closestX;
        const dy = y - closestY;
        if (dx * dx + dy * dy < (POWERUP_RADIUS + margin) * (POWERUP_RADIUS + margin)) {
          overlapsWall = true;
          break;
        }
      }
      if (overlapsWall) continue;

      // Check not overlapping tanks
      let overlapsTank = false;
      for (const tank of this.tanks) {
        if (!tank.alive) continue;
        if (circleCircleOverlap(x, y, POWERUP_RADIUS, tank.x, tank.y, tank.radius + 20)) {
          overlapsTank = true;
          break;
        }
      }
      if (overlapsTank) continue;

      // Check not overlapping other power-ups
      let overlapsPowerUp = false;
      for (const pu of this.powerUps) {
        if (!pu.active) continue;
        if (circleCircleOverlap(x, y, POWERUP_RADIUS, pu.x, pu.y, POWERUP_RADIUS * 2)) {
          overlapsPowerUp = true;
          break;
        }
      }
      if (overlapsPowerUp) continue;

      return { x, y };
    }
    return null;
  }

  private checkCollections(): void {
    for (const pu of this.powerUps) {
      if (!pu.active) continue;
      for (const tank of this.tanks) {
        if (!tank.alive) continue;
        if (circleCircleOverlap(pu.x, pu.y, pu.radius, tank.x, tank.y, tank.radius)) {
          this.collect(tank, pu);
        }
      }
    }
  }

  private collect(tank: Tank, pu: PowerUp): void {
    // Replace existing passive effect if any
    if (tank.heldPowerUp && POWERUP_VISUALS[tank.heldPowerUp].passive) {
      tank.passiveEffects.delete(tank.heldPowerUp);
      tank.passiveTimers.delete(tank.heldPowerUp);
    }
    if (tank.heldPowerUp === PowerUpType.Shield) {
      tank.shieldActive = false;
    }

    tank.heldPowerUp = pu.type;
    pu.destroy();

    // Auto-apply passive effects
    if (POWERUP_VISUALS[pu.type].passive) {
      this.applyPassive(tank, pu.type);
    }

    // Emit pickup event for sound/HUD
    this.scene.events.emit('powerup-collected', { playerId: tank.playerId, type: pu.type });
  }

  private applyPassive(tank: Tank, type: PowerUpType): void {
    tank.passiveEffects.add(type);

    let duration = 0;
    switch (type) {
      case PowerUpType.Shield:
        tank.shieldActive = true;
        duration = SHIELD_DURATION;
        break;
      case PowerUpType.RapidFire:
        duration = RAPID_FIRE_DURATION;
        break;
      case PowerUpType.DoubleShot:
        duration = DOUBLE_SHOT_DURATION;
        break;
    }
    tank.passiveTimers.set(type, duration);
  }

  updatePassiveTimers(tank: Tank, dt: number): void {
    const expired: PowerUpType[] = [];
    for (const [type, remaining] of tank.passiveTimers) {
      const newTime = remaining - dt;
      if (newTime <= 0) {
        expired.push(type);
      } else {
        tank.passiveTimers.set(type, newTime);
      }
    }
    for (const type of expired) {
      tank.passiveEffects.delete(type);
      tank.passiveTimers.delete(type);
      if (type === PowerUpType.Shield) {
        tank.shieldActive = false;
      }
      if (tank.heldPowerUp === type) {
        tank.heldPowerUp = null;
      }
    }
  }

  getPowerUps(): PowerUp[] {
    return this.powerUps;
  }

  clearAll(): void {
    for (const pu of this.powerUps) pu.destroy();
    this.powerUps = [];
    for (const tank of this.tanks) {
      tank.clearPowerUps();
    }
    this.spawnTimer = this.randomInterval();
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) this.clearAll();
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
