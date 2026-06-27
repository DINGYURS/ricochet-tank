import Phaser from 'phaser';
import { PowerUpType, POWERUP_VISUALS } from '../enums/PowerUpType';
import { POWERUP_RADIUS } from '../config';

export class PowerUp {
  type: PowerUpType;
  x: number;
  y: number;
  radius: number = POWERUP_RADIUS;
  age: number = 0;
  active: boolean = true;

  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private baseY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PowerUpType) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.type = type;

    this.graphics = scene.add.graphics();
    this.draw(0);
  }

  draw(time: number): void {
    this.graphics.clear();
    this.graphics.setPosition(this.x, this.y);

    const visual = POWERUP_VISUALS[this.type];
    const r = this.radius;

    // Floating animation
    const floatOffset = Math.sin(time / 1000 * Math.PI * 2 / 1.5) * 3;
    this.y = this.baseY + floatOffset;
    this.graphics.setPosition(this.x, this.y);

    // Background circle
    this.graphics.fillStyle(0x000000, 0.5);
    this.graphics.fillCircle(0, 0, r);

    // Icon based on type
    this.graphics.fillStyle(visual.color, 1);
    this.graphics.lineStyle(2, visual.color, 1);

    switch (this.type) {
      case PowerUpType.Shield:
        this.graphics.strokeCircle(0, 0, r * 0.6);
        break;
      case PowerUpType.RapidFire:
        // Lightning bolt
        this.graphics.lineBetween(-3, -6, 1, -1);
        this.graphics.lineBetween(1, -1, -2, 0);
        this.graphics.lineBetween(-2, 0, 2, 6);
        break;
      case PowerUpType.DoubleShot:
        // Two vertical lines
        this.graphics.fillRect(-4, -5, 2, 10);
        this.graphics.fillRect(2, -5, 2, 10);
        break;
      case PowerUpType.Laser:
        // Horizontal line
        this.graphics.fillRect(-7, -1, 14, 2);
        break;
      case PowerUpType.Rocket:
        // Triangle
        this.graphics.fillTriangle(0, -6, -5, 4, 5, 4);
        break;
      case PowerUpType.Mine:
        // Filled circle
        this.graphics.fillCircle(0, 0, r * 0.5);
        break;
      case PowerUpType.Shotgun:
        // Fan shape (3 lines from center)
        for (let i = -1; i <= 1; i++) {
          const angle = i * 0.5;
          this.graphics.lineBetween(0, 0, Math.cos(angle - Math.PI / 2) * 7, Math.sin(angle - Math.PI / 2) * 7);
        }
        break;
    }

    // Border
    this.graphics.lineStyle(1, 0xffffff, 0.6);
    this.graphics.strokeCircle(0, 0, r);
  }

  destroy(): void {
    this.active = false;
    this.graphics.destroy();
  }
}
