import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXT_COLOR, type AIDifficulty, type GameSettings } from '../config';

export interface DifficultyOption {
  key: AIDifficulty;
  label: string;
  description: string;
}

export const DIFFICULTIES: DifficultyOption[] = [
  {
    key: 'easy',
    label: 'Easy',
    description: 'Slow reactions, inaccurate shots, rarely dodges',
  },
  {
    key: 'medium',
    label: 'Medium',
    description: 'Balanced reactions and accuracy, moderate dodging',
  },
  {
    key: 'hard',
    label: 'Hard',
    description: 'Fast reactions, precise shots, aggressive dodging',
  },
];

export class DifficultyScene extends Phaser.Scene {
  static readonly KEY = 'DifficultyScene';

  private selectedIndex: number = 0;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private descriptionText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: DifficultyScene.KEY });
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;

    this.add.text(centerX, 80, 'SELECT AI DIFFICULTY', {
      fontSize: '36px',
      color: TEXT_COLOR,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.optionTexts = [];
    const startY = 200;
    const spacing = 80;

    for (let i = 0; i < DIFFICULTIES.length; i++) {
      const opt = DIFFICULTIES[i];
      const y = startY + i * spacing;

      const text = this.add.text(centerX, y, opt.label, {
        fontSize: '28px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.optionTexts.push(text);
    }

    this.descriptionText = this.add.text(centerX, startY + DIFFICULTIES.length * spacing + 20, '', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.controlsText = this.add.text(centerX, GAME_HEIGHT - 60, '↑/↓ Select   ENTER Start   Press ESC to return', {
      fontSize: '16px',
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.selectedIndex = 0;
    this.updateSelection();

    this.input.keyboard!.on('keydown-UP', () => {
      this.selectedIndex = (this.selectedIndex - 1 + DIFFICULTIES.length) % DIFFICULTIES.length;
      this.updateSelection();
    });

    this.input.keyboard!.on('keydown-DOWN', () => {
      this.selectedIndex = (this.selectedIndex + 1) % DIFFICULTIES.length;
      this.updateSelection();
    });

    this.input.keyboard!.once('keydown-ENTER', () => {
      const selected = DIFFICULTIES[this.selectedIndex];
      const settings: GameSettings = {
        mode: 'ai',
        aiDifficulty: selected.key,
      };
      this.scene.start('GameScene', settings);
    });

    this.input.keyboard!.once('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }

  private updateSelection(): void {
    for (let i = 0; i < this.optionTexts.length; i++) {
      const isSelected = i === this.selectedIndex;
      this.optionTexts[i].setColor(isSelected ? TEXT_COLOR : '#aaaaaa');
      this.optionTexts[i].setText(isSelected ? `> ${DIFFICULTIES[i].label} <` : DIFFICULTIES[i].label);
    }
    this.descriptionText.setText(DIFFICULTIES[this.selectedIndex].description);
  }
}
