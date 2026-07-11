import Phaser from 'phaser';
import {
  TANK_RADIUS,
  TANK_MOVE_SPEED, TANK_BACK_SPEED, TANK_ROTATE_SPEED,
  PIXEL_SIZE, TANK_GRID_SIZE, AMMO_MAX,
} from '../config';
import { PowerUpType } from '../enums/PowerUpType';

// 16x16 pixel tank, 0=transparent, 1=body, 2=track, 3=turret
// At rotation=0 (right/+X), HEAD points right (track side), TAIL points left (barrel side)
//
// Visual layout (rotation=0, facing right):
//   T = track(head), B = body, t = turret, G = barrel(gun/tail)
//
//   . . . . . . . . . . . . . . . .
//   . . . . . t t t . . . . . . . .
//   G G G G . t t t t t t t . . . .
//   G G G . . B B B B B t t . . . .
//   G G . B B B B B B B B B B B . T
//   G G . B B B B B B B B B B B . T
//   G G . B B B B B B B B B B B . T
//   . . . B B B B B B B B B B B . T
//   . . . B B B B B B B B B B B . T
//   G G . B B B B B B B B B B B . T
//   G G . B B B B B B B B B B B . T
//   G G . B B B B B B B B B B B . T
//   G G G . . B B B B B t t . . . .
//   G G G G . t t t t t t t . . . .
//   . . . . . t t t . . . . . . . .
//   . . . . . . . . . . . . . . . .
const TANK_PIXEL_GRID: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0],
  [1,1,1,1,0,3,3,3,3,3,3,3,0,0,0,0],
  [1,1,1,0,0,1,1,1,1,1,3,3,0,0,0,0],
  [1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,2],
  [1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,2],
  [1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,2],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,2],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,2],
  [1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,2],
  [1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,2],
  [1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,2],
  [1,1,1,0,0,1,1,1,1,1,3,3,0,0,0,0],
  [1,1,1,1,0,3,3,3,3,3,3,3,0,0,0,0],
  [0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// Colors per player: body, track, turret
export const TANK_COLORS: Record<number, { body: number; track: number; turret: number }> = {
  0: { body: 0x4488ff, track: 0x2255aa, turret: 0x3366cc }, // P1 blue
  1: { body: 0xff4444, track: 0xaa2222, turret: 0xcc3333 }, // P2 red
  2: { body: 0x44dd66, track: 0x228844, turret: 0x33aa55 }, // P3 green
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

  // Power-up state
  heldPowerUp: PowerUpType | null = null;
  passiveEffects: Set<PowerUpType> = new Set();
  passiveTimers: Map<PowerUpType, number> = new Map();
  shieldActive: boolean = false;

  playerId: number;
  color: { body: number; track: number; turret: number };

  private scene: Phaser.Scene;
  private bodyGraphics: Phaser.GameObjects.Graphics;
  private stateText: Phaser.GameObjects.Text | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    rotation: number,
    playerId: number,
    color?: { body: number; track: number; turret: number },
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.playerId = playerId;
    this.color = color ?? TANK_COLORS[playerId] ?? TANK_COLORS[0];

    this.bodyGraphics = scene.add.graphics();
    this.draw();
  }

  draw(): void {
    this.bodyGraphics.clear();
    this.bodyGraphics.save();
    this.bodyGraphics.translateCanvas(this.x, this.y);
    this.bodyGraphics.rotateCanvas(this.rotation);

    const colors = this.color;
    const halfGrid = TANK_GRID_SIZE / 2;

    for (let row = 0; row < TANK_GRID_SIZE; row++) {
      for (let col = 0; col < TANK_GRID_SIZE; col++) {
        const cell = TANK_PIXEL_GRID[row][col];
        if (cell === 0) continue;

        const colorMap: Record<number, number> = { 1: colors.body, 2: colors.track, 3: colors.turret };
        const color = colorMap[cell];
        if (!color) continue;
        this.bodyGraphics.fillStyle(color, 1);
        this.bodyGraphics.fillRect(
          (col - halfGrid) * PIXEL_SIZE,
          (row - halfGrid) * PIXEL_SIZE,
          PIXEL_SIZE,
          PIXEL_SIZE
        );
      }
    }

    // Draw shield ring if active (inside transform so it rotates with tank)
    if (this.shieldActive) {
      this.bodyGraphics.lineStyle(2, 0x4488ff, 0.7);
      this.bodyGraphics.strokeCircle(0, 0, this.radius + 4);
    }

    this.bodyGraphics.restore();

    // Update state indicator position
    if (this.stateText) {
      this.stateText.setPosition(this.x, this.y - 20);
    }
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
    // Barrel extends to col 15 in the rotated grid (rows 7-8)
    // Center of grid is at col 7.5, so offset = (15 - 7.5) * 2px = 15
    const offset = 15;
    return {
      x: this.x + Math.cos(this.rotation) * offset,
      y: this.y + Math.sin(this.rotation) * offset,
    };
  }

  clearPowerUps(): void {
    this.heldPowerUp = null;
    this.passiveEffects.clear();
    this.passiveTimers.clear();
    this.shieldActive = false;
  }

  setStateIndicator(text: string): void {
    if (!this.stateText) {
      this.stateText = this.scene.add.text(this.x, this.y - 20, text, {
        fontSize: '10px',
        color: '#ffffff',
        align: 'center',
      }).setOrigin(0.5);
    } else {
      this.stateText.setText(text);
    }
  }

  destroy(): void {
    this.bodyGraphics.destroy();
    if (this.stateText) {
      this.stateText.destroy();
      this.stateText = null;
    }
  }
}
