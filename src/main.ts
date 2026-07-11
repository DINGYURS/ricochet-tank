import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { DifficultyScene } from './scenes/DifficultyScene';
import { GameScene } from './scenes/GameScene';
import { PauseScene } from './scenes/PauseScene';
import { GAME_WIDTH, GAME_HEIGHT, BG_COLOR } from './config';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: BG_COLOR,
  parent: document.body,
  scene: [BootScene, MenuScene, DifficultyScene, GameScene, PauseScene],
};

new Phaser.Game(config);
