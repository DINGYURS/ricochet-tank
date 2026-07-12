import Phaser from 'phaser';
import { advanceFragBomb } from '../systems/FragBombPhysics';

export class FragBomb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age = 0;
  ownerId: number;
  active = true;

  private graphics: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, vx: number, vy: number, ownerId: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.ownerId = ownerId;
    this.graphics = scene.add.circle(x, y, 6, 0xffcc33);
  }

  update(dt: number): void {
    const next = advanceFragBomb(this, dt);
    this.x = next.x;
    this.y = next.y;
    this.age = next.age;
    if (this.active) this.graphics.setPosition(this.x, this.y);
  }

  destroy(): void {
    if (!this.active) return;
    this.active = false;
    this.graphics.destroy();
  }
}

export class FragFragment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: number;
  active = true;

  private graphics: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, vx: number, vy: number, ownerId: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.ownerId = ownerId;
    this.graphics = scene.add.circle(x, y, 2, 0xffcc33);
  }

  update(dt: number): void {
    if (!this.active) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.graphics.setPosition(this.x, this.y);
  }

  destroy(): void {
    if (!this.active) return;
    this.active = false;
    this.graphics.destroy();
  }
}
