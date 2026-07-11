import Phaser from 'phaser';
import type { Tank } from '../objects/Tank';
import { MouseController } from './MouseController';

export interface PlayerInput {
  forward: boolean;
  backward: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
  shoot: boolean;
  usePowerUp: boolean;
}

export class InputManager {
  private readonly mouseController: MouseController;
  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    UP: Phaser.Input.Keyboard.Key;
    DOWN: Phaser.Input.Keyboard.Key;
    LEFT: Phaser.Input.Keyboard.Key;
    RIGHT: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
    ENTER: Phaser.Input.Keyboard.Key;
    ESC: Phaser.Input.Keyboard.Key;
    E: Phaser.Input.Keyboard.Key;
    PERIOD: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.keys = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      UP: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      DOWN: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      LEFT: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      RIGHT: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      SPACE: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      ENTER: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      ESC: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
      E: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      PERIOD: kb.addKey(Phaser.Input.Keyboard.KeyCodes.PERIOD),
    };

    kb.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.ENTER,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
    ]);

    this.mouseController = new MouseController(scene);
  }

  getPlayer1Input(): PlayerInput {
    return {
      forward: this.keys.W.isDown,
      backward: this.keys.S.isDown,
      rotateLeft: this.keys.A.isDown,
      rotateRight: this.keys.D.isDown,
      shoot: Phaser.Input.Keyboard.JustDown(this.keys.SPACE),
      usePowerUp: Phaser.Input.Keyboard.JustDown(this.keys.E),
    };
  }

  getPlayer2Input(): PlayerInput {
    return {
      forward: this.keys.UP.isDown,
      backward: this.keys.DOWN.isDown,
      rotateLeft: this.keys.LEFT.isDown,
      rotateRight: this.keys.RIGHT.isDown,
      shoot: Phaser.Input.Keyboard.JustDown(this.keys.ENTER),
      usePowerUp: Phaser.Input.Keyboard.JustDown(this.keys.PERIOD),
    };
  }

  getPlayer3Input(tank: Pick<Tank, 'x' | 'y' | 'rotation'>): PlayerInput {
    return this.mouseController.getInput(tank);
  }

  isEscapePressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keys.ESC);
  }
}
