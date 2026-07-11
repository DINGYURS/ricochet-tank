import Phaser from 'phaser';
import { GAME_WIDTH, TEXT_COLOR, type GameSettings } from '../config';

export const MENU_OPTIONS = [
  { key: 'local-2', label: '2 Players', settings: { mode: 'local', localPlayers: 2 } },
  { key: 'local-3', label: '3 Players', settings: { mode: 'local', localPlayers: 3 } },
  { key: 'ai', label: 'VS AI', settings: null },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  settings: GameSettings | null;
}>;

export class MenuScene extends Phaser.Scene {
  private selectedIndex = 0;
  private modeTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    this.selectedIndex = 0;
    this.modeTexts = [];

    // Title
    this.add.text(centerX, 100, 'RICOCHET TANK', {
      fontSize: '48px',
      color: TEXT_COLOR,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Mode options
    const modeStartY = 240;
    const modeSpacing = 50;

    for (let i = 0; i < MENU_OPTIONS.length; i++) {
      const y = modeStartY + i * modeSpacing;
      const label = MENU_OPTIONS[i].label;
      const text = this.add.text(centerX, y, label, {
        fontSize: '28px',
        color: TEXT_COLOR,
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.modeTexts.push(text);
    }

    // Controls info
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

    this.add.text(centerX, controlsY + 60, 'Player 3: Mouse (3 Players)', {
      fontSize: '16px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(centerX, controlsY + 90, 'First to 3 wins!', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Navigation hint
    this.add.text(centerX, 540, '↑/↓ to select    ENTER to confirm', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.updateSelection();

    // Keyboard input
    this.input.keyboard!.on('keydown-UP', () => {
      this.selectedIndex = (this.selectedIndex - 1 + MENU_OPTIONS.length) % MENU_OPTIONS.length;
      this.updateSelection();
    });

    this.input.keyboard!.on('keydown-DOWN', () => {
      this.selectedIndex = (this.selectedIndex + 1) % MENU_OPTIONS.length;
      this.updateSelection();
    });

    this.input.keyboard!.on('keydown-ENTER', () => {
      const selected = MENU_OPTIONS[this.selectedIndex];
      if (selected.settings === null) {
        this.scene.start('DifficultyScene');
      } else {
        this.scene.start('GameScene', selected.settings);
      }
    });
  }

  private updateSelection(): void {
    for (let i = 0; i < this.modeTexts.length; i++) {
      const isSelected = i === this.selectedIndex;
      this.modeTexts[i].setText(isSelected ? `> ${MENU_OPTIONS[i].label}` : `  ${MENU_OPTIONS[i].label}`);
      this.modeTexts[i].setColor(isSelected ? '#ffff00' : TEXT_COLOR);
    }
  }
}
