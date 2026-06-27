// src/objects/Rocket.ts
import Phaser from 'phaser';
import { BULLET_RADIUS } from '../config';

export class Rocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: number;
  active: boolean = true;
  radius: number = BULLET_RADIUS;

  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, vx: number, vy: number, ownerId: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.ownerId = ownerId;
    this.graphics = scene.add.circle(x, y, BULLET_RADIUS, 0xff4400);
  }

  update(dt: number, targetX: number, targetY: number, turnSpeed: number): void {
    if (!this.active) return;

    // Calculate desired angle to target
    const desiredAngle = Math.atan2(targetY - this.y, targetX - this.x);
    const currentAngle = Math.atan2(this.vy, this.vx);

    // Shortest angle difference
    let angleDiff = desiredAngle - currentAngle;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    // Clamp turn rate
    const maxTurn = turnSpeed * dt;
    const turn = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
    const newAngle = currentAngle + turn;

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    this.vx = Math.cos(newAngle) * speed;
    this.vy = Math.sin(newAngle) * speed;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.graphics.setPosition(this.x, this.y);
  }

  destroy(): void {
    this.active = false;
    this.graphics.destroy();
  }
}
