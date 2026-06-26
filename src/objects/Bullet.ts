import Phaser from 'phaser';
import {
  BULLET_RADIUS, BULLET_SPEED, BULLET_MAX_BOUNCES,
  BULLET_MAX_LIFETIME, BULLET_SAFE_PERIOD, BULLET_COLOR,
} from '../config';

export interface BulletState {
  x: number;
  y: number;
  prevX?: number;
  prevY?: number;
  vx: number;
  vy: number;
  bounceCount: number;
  lifeTime: number;
  ownerId: number;
  spawnTime: number;
  active: boolean;
  wallCooldowns: Map<number, number>;
}

export function updateBullet(bullet: BulletState, dt: number, _currentTimeMs: number): void {
  if (!bullet.active) return;

  bullet.prevX = bullet.x;
  bullet.prevY = bullet.y;
  bullet.x += bullet.vx * dt;
  bullet.y += bullet.vy * dt;
  bullet.lifeTime += dt;

  if (bullet.lifeTime > BULLET_MAX_LIFETIME) {
    bullet.active = false;
  }
}

export function isOwnerSafe(bullet: BulletState, currentTimeMs: number): boolean {
  return (currentTimeMs / 1000) - bullet.spawnTime < BULLET_SAFE_PERIOD;
}

export class Bullet {
  state: BulletState;
  radius: number = BULLET_RADIUS;
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, vx: number, vy: number, ownerId: number, spawnTime: number) {
    this.scene = scene;
    this.state = {
      x, y, vx, vy,
      bounceCount: 0,
      lifeTime: 0,
      ownerId,
      spawnTime,
      active: true,
      wallCooldowns: new Map(),
    };
    this.graphics = scene.add.circle(x, y, BULLET_RADIUS, BULLET_COLOR);
  }

  update(dt: number, currentTimeMs: number): void {
    updateBullet(this.state, dt, currentTimeMs);
    if (this.state.active) {
      this.graphics.setPosition(this.state.x, this.state.y);
    }
  }

  bounce(wallId: number, newVx: number, newVy: number): void {
    this.state.bounceCount++;
    if (this.state.bounceCount > BULLET_MAX_BOUNCES) {
      this.state.active = false;
      return;
    }
    this.state.vx = newVx;
    this.state.vy = newVy;
    this.state.wallCooldowns.set(wallId, BULLET_MAX_LIFETIME);
  }

  destroy(): void {
    this.state.active = false;
    this.graphics.destroy();
  }
}
