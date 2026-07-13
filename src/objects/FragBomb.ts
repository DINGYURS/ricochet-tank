import Phaser from 'phaser';
import { advanceFragBomb } from '../systems/FragBombPhysics';
import { FRAG_BOMB_RADIUS } from '../config';

export class FragBomb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  previousX: number;
  previousY: number;
  age = 0;
  ownerId: number;
  active = true;
  readonly radius = FRAG_BOMB_RADIUS;

  private graphics: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, vx: number, vy: number, ownerId: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.previousX = x;
    this.previousY = y;
    this.ownerId = ownerId;
    this.graphics = scene.add.circle(x, y, this.radius, 0xffcc33);
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.graphics.setPosition(x, y);
  }

  update(dt: number): void {
    this.previousX = this.x;
    this.previousY = this.y;
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
