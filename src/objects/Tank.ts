import Phaser from 'phaser';
import {
  TANK_RADIUS, TANK_BODY_WIDTH, TANK_BODY_HEIGHT,
  TANK_BARREL_WIDTH, TANK_BARREL_HEIGHT,
  TANK_MOVE_SPEED, TANK_BACK_SPEED, TANK_ROTATE_SPEED,
} from '../config';

export interface TankMovementResult {
  x: number;
  y: number;
  rotation: number;
}

export function computeTankMovement(
  x: number, y: number, rotation: number,
  forward: boolean, backward: boolean,
  moveSpeed: number, backSpeed: number,
  rotateInput: number,
  dt: number
): TankMovementResult {
  let newRotation = rotation;
  if (rotateInput !== 0) {
    newRotation += rotateInput * dt;
  }

  let newX = x;
  let newY = y;
  if (forward) {
    newX += Math.cos(newRotation) * moveSpeed * dt;
    newY += Math.sin(newRotation) * moveSpeed * dt;
  } else if (backward) {
    newX -= Math.cos(newRotation) * backSpeed * dt;
    newY -= Math.sin(newRotation) * backSpeed * dt;
  }

  return { x: newX, y: newY, rotation: newRotation };
}

export class Tank {
  x: number;
  y: number;
  rotation: number;
  radius: number = TANK_RADIUS;
  alive: boolean = true;
  shootCooldown: number = 0;
  playerId: number;

  private scene: Phaser.Scene;
  private bodyGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, rotation: number, playerId: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.playerId = playerId;

    this.bodyGraphics = scene.add.graphics();
    this.draw();
  }

  draw(): void {
    this.bodyGraphics.clear();
    this.bodyGraphics.save();
    this.bodyGraphics.translateCanvas(this.x, this.y);
    this.bodyGraphics.rotateCanvas(this.rotation);

    const color = this.playerId === 0 ? 0x4488ff : 0xff4444;
    this.bodyGraphics.fillStyle(color, 1);
    this.bodyGraphics.fillRect(-TANK_BODY_WIDTH / 2, -TANK_BODY_HEIGHT / 2, TANK_BODY_WIDTH, TANK_BODY_HEIGHT);

    this.bodyGraphics.fillStyle(0xcccccc, 1);
    this.bodyGraphics.fillRect(-TANK_BARREL_WIDTH / 2, -TANK_BODY_HEIGHT / 2 - TANK_BARREL_HEIGHT, TANK_BARREL_WIDTH, TANK_BARREL_HEIGHT + TANK_BODY_HEIGHT / 2);

    this.bodyGraphics.restore();
  }

  update(dt: number, forward: boolean, backward: boolean, rotateInput: number): void {
    const result = computeTankMovement(
      this.x, this.y, this.rotation,
      forward, backward,
      TANK_MOVE_SPEED, TANK_BACK_SPEED,
      rotateInput, dt
    );
    this.x = result.x;
    this.y = result.y;
    this.rotation = result.rotation;
    this.draw();
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.draw();
  }

  getBarrelTip(): { x: number; y: number } {
    const offset = TANK_RADIUS + 5;
    return {
      x: this.x + Math.cos(this.rotation) * offset,
      y: this.y + Math.sin(this.rotation) * offset,
    };
  }

  destroy(): void {
    this.bodyGraphics.destroy();
  }
}
