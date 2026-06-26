import Phaser from 'phaser';
import { GAME_WIDTH, TEXT_COLOR } from '../config';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;

    this.add.text(centerX, 120, 'RICOCHET TANK', {
      fontSize: '48px',
      color: TEXT_COLOR,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const startText = this.add.text(centerX, 300, 'Press SPACE to Start', {
      fontSize: '24px',
      color: TEXT_COLOR,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: startText,
      alpha: 0.2,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    const controlsY = 420;
    this.add.text(centerX, controlsY, 'Player 1: W/A/S/D + Space', {
      fontSize: '16px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(centerX, controlsY + 30, 'Player 2: Arrow Keys + Enter', {
      fontSize: '16px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(centerX, controlsY + 70, 'First to 3 wins!', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.input.keyboard!.once('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
  }
}
