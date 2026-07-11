import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TEXT_COLOR, type GameSettings } from '../config';

export interface PauseStatus {
  settings: GameSettings;
  soundEnabled: boolean;
  powerUpsEnabled: boolean;
}

interface PauseGameController {
  getPauseStatus(): PauseStatus;
  setSoundEnabled(enabled: boolean): void;
  setPowerUpsEnabled(enabled: boolean): void;
  restartMatch(): void;
}

export const PAUSE_ACTIONS = [
  { key: 'resume', label: 'Resume' },
  { key: 'restart', label: 'Restart Match' },
  { key: 'sound', label: 'Sound' },
  { key: 'powerups', label: 'Power-ups' },
  { key: 'menu', label: 'Main Menu' },
] as const;

export function getPauseActionLabels(status: Pick<PauseStatus, 'soundEnabled' | 'powerUpsEnabled'>): string[] {
  return [
    'Resume',
    'Restart Match',
    `Sound: ${status.soundEnabled ? 'ON' : 'OFF'}`,
    `Power-ups: ${status.powerUpsEnabled ? 'ON' : 'OFF'}`,
    'Main Menu',
  ];
}

export function getControlLines(settings: GameSettings): string[] {
  const lines = ['P1: W/A/S/D + Space · E power-up'];
  if (settings.mode === 'ai') {
    const difficulty = settings.aiDifficulty[0].toUpperCase() + settings.aiDifficulty.slice(1);
    lines.push(`P2: AI (${difficulty})`);
  } else {
    lines.push('P2: Arrow Keys + Enter · . power-up');
    if (settings.localPlayers === 3) {
      lines.push('P3: Mouse move + Left click · Right click power-up');
    }
  }
  return lines;
}

export class PauseScene extends Phaser.Scene {
  static readonly KEY = 'PauseScene';

  private selectedIndex = 0;
  private actionTexts: Phaser.GameObjects.Text[] = [];
  private gameController!: PauseGameController;

  constructor() {
    super({ key: PauseScene.KEY });
  }

  create(): void {
    this.gameController = this.scene.get('GameScene') as unknown as PauseGameController;
    this.selectedIndex = 0;
    this.actionTexts = [];

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x080812, 0.92).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 70, 'PAUSED', {
      fontSize: '42px',
      color: TEXT_COLOR,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const startY = 150;
    for (let index = 0; index < PAUSE_ACTIONS.length; index++) {
      const text = this.add.text(GAME_WIDTH / 2, startY + index * 42, '', {
        fontSize: '24px',
        color: TEXT_COLOR,
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.actionTexts.push(text);
    }

    const controls = getControlLines(this.gameController.getPauseStatus().settings);
    this.add.text(GAME_WIDTH / 2, 400, ['CONTROLS', ...controls].join('\n'), {
      fontSize: '15px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5, 0);
    this.add.text(GAME_WIDTH / 2, 560, '↑/↓ Select · ENTER Confirm · ESC Resume', {
      fontSize: '14px',
      color: '#777777',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.refreshActions();
    this.input.keyboard!.on('keydown-UP', () => {
      this.selectedIndex = (this.selectedIndex - 1 + PAUSE_ACTIONS.length) % PAUSE_ACTIONS.length;
      this.refreshActions();
    });
    this.input.keyboard!.on('keydown-DOWN', () => {
      this.selectedIndex = (this.selectedIndex + 1) % PAUSE_ACTIONS.length;
      this.refreshActions();
    });
    this.input.keyboard!.on('keydown-ENTER', () => this.activateSelectedAction());
    this.input.keyboard!.once('keydown-ESC', () => this.resumeGame());
  }

  private refreshActions(): void {
    const labels = getPauseActionLabels(this.gameController.getPauseStatus());
    for (let index = 0; index < this.actionTexts.length; index++) {
      const selected = index === this.selectedIndex;
      this.actionTexts[index].setText(selected ? `> ${labels[index]} <` : labels[index]);
      this.actionTexts[index].setColor(selected ? '#ffff00' : TEXT_COLOR);
    }
  }

  private activateSelectedAction(): void {
    const action = PAUSE_ACTIONS[this.selectedIndex].key;
    const status = this.gameController.getPauseStatus();
    switch (action) {
      case 'resume':
        this.resumeGame();
        break;
      case 'restart':
        this.gameController.restartMatch();
        this.resumeGame();
        break;
      case 'sound':
        this.gameController.setSoundEnabled(!status.soundEnabled);
        this.refreshActions();
        break;
      case 'powerups':
        this.gameController.setPowerUpsEnabled(!status.powerUpsEnabled);
        this.refreshActions();
        break;
      case 'menu':
        this.scene.stop('GameScene');
        this.scene.start('MenuScene');
        break;
    }
  }

  private resumeGame(): void {
    this.scene.stop(PauseScene.KEY);
    this.scene.resume('GameScene');
  }
}
