import Phaser from 'phaser';
import { WALL_COLOR } from '../config';

export class Wall {
  x: number;
  y: number;
  width: number;
  height: number;
  orientation: 'vertical' | 'horizontal';
  private rect: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    orientation: 'vertical' | 'horizontal'
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.orientation = orientation;

    this.rect = scene.add.rectangle(
      x + width / 2,
      y + height / 2,
      width,
      height,
      WALL_COLOR
    );
    this.rect.setOrigin(0.5, 0.5);
  }

  destroy(): void {
    this.rect.destroy();
  }
}
