import Phaser from 'phaser';
import {
  TANK_RADIUS,
  TANK_MOVE_SPEED, TANK_BACK_SPEED, TANK_ROTATE_SPEED,
  PIXEL_SIZE, TANK_GRID_SIZE, AMMO_MAX,
} from '../config';

// 16x16 pixel pattern (pointing right), 0=transparent, 1=body, 2=track
// Rotation = 0 in trig = right (+X), so barrel points right by default
const TANK_PIXEL_GRID: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 0
  [0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0], // row 1: body
  [0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0], // row 2
  [0,0,0,0,0,1,1,1,1,1,1,1,1,2,2,0], // row 3: body + track
  [0,0,0,0,0,1,1,1,1,1,1,1,1,2,2,0], // row 4
  [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0], // row 5: turret
  [0,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1], // row 6: turret + barrel
  [0,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1], // row 7: turret + barrel
  [0,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1], // row 8: turret + barrel
  [0,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1], // row 9: turret + barrel
  [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0], // row 10: turret
  [0,0,0,0,0,1,1,1,1,1,1,1,1,2,2,0], // row 11: body + track
  [0,0,0,0,0,1,1,1,1,1,1,1,1,2,2,0], // row 12
  [0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0], // row 13: body
  [0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0], // row 14
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 15
];

// Colors per player: [body, track]
const TANK_COLORS: Record<number, { body: number; track: number }> = {
  0: { body: 0x4488ff, track: 0x2255aa }, // P1 blue
  1: { body: 0xff4444, track: 0xaa2222 }, // P2 red
};

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
  ammo: number = AMMO_MAX;
  ammoRefillTimer: number = 0;
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

    const colors = TANK_COLORS[this.playerId];
    const halfGrid = TANK_GRID_SIZE / 2;

    for (let row = 0; row < TANK_GRID_SIZE; row++) {
      for (let col = 0; col < TANK_GRID_SIZE; col++) {
        const cell = TANK_PIXEL_GRID[row][col];
        if (cell === 0) continue;

        const color = cell === 1 ? colors.body : colors.track;
        this.bodyGraphics.fillStyle(color, 1);
        this.bodyGraphics.fillRect(
          (col - halfGrid) * PIXEL_SIZE,
          (row - halfGrid) * PIXEL_SIZE,
          PIXEL_SIZE,
          PIXEL_SIZE
        );
      }
    }

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
    // Barrel tip is at cols 14-15, center rows (6-9) of the 16x16 grid
    // Offset from center: 7 pixels (col 14.5 - col 7.5 center = 7)
    const offset = 7;
    return {
      x: this.x + Math.cos(this.rotation) * offset,
      y: this.y + Math.sin(this.rotation) * offset,
    };
  }

  destroy(): void {
    this.bodyGraphics.destroy();
  }
}
