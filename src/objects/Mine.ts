// src/objects/Mine.ts
import Phaser from 'phaser';
import { MINE_TRIGGER_RADIUS } from '../config';

export class Mine {
  x: number;
  y: number;
  ownerId: number;
  active: boolean = true;
  triggerRadius: number = MINE_TRIGGER_RADIUS;

  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private age: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, ownerId: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.ownerId = ownerId;
    this.graphics = scene.add.graphics();
    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    // Visible to opponent: blinking red dot
    this.graphics.setPosition(this.x, this.y);
    this.graphics.fillStyle(0xff0000, 0.8);
    this.graphics.fillCircle(0, 0, 5);
    this.graphics.lineStyle(1, 0xff0000, 0.4);
    this.graphics.strokeCircle(0, 0, this.triggerRadius);
  }

  update(dt: number): void {
    if (!this.active) return;
    this.age += dt;
    // Blink effect
    const blink = Math.sin(this.age * 6) > 0 ? 0.8 : 0.3;
    this.graphics.clear();
    this.graphics.setPosition(this.x, this.y);
    this.graphics.fillStyle(0xff0000, blink);
    this.graphics.fillCircle(0, 0, 5);
    this.graphics.lineStyle(1, 0xff0000, 0.2);
    this.graphics.strokeCircle(0, 0, this.triggerRadius);
  }

  setAlphaForOwner(isOwner: boolean): void {
    this.graphics.setAlpha(isOwner ? 0.3 : 1);
  }

  destroy(): void {
    this.active = false;
    this.graphics.destroy();
  }
}
