import type Phaser from 'phaser';
import type { Tank } from '../objects/Tank';
import type { PlayerInput } from './InputManager';

const POINTER_DEAD_ZONE = 24;
const ROTATION_TOLERANCE = 0.1;

export interface MouseInputState {
  tankX: number;
  tankY: number;
  tankRotation: number;
  pointerX: number;
  pointerY: number;
  pointerDown: boolean;
  previousPointerDown: boolean;
  useDown: boolean;
  previousUseDown: boolean;
}

export type MouseInputResult = PlayerInput;

export interface PointerLike {
  x: number;
  y: number;
  leftButtonDown(): boolean;
  rightButtonDown(): boolean;
}

function normalizeAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function computeMousePlayerInput(state: MouseInputState): MouseInputResult {
  const dx = state.pointerX - state.tankX;
  const dy = state.pointerY - state.tankY;
  const distance = Math.hypot(dx, dy);
  const targetRotation = Math.atan2(dy, dx);
  const angleDifference = normalizeAngle(targetRotation - state.tankRotation);
  const aligned = Math.abs(angleDifference) <= ROTATION_TOLERANCE;

  return {
    forward: distance > POINTER_DEAD_ZONE && aligned,
    backward: false,
    rotateLeft: angleDifference < -ROTATION_TOLERANCE,
    rotateRight: angleDifference > ROTATION_TOLERANCE,
    shoot: state.pointerDown && !state.previousPointerDown,
    usePowerUp: state.useDown && !state.previousUseDown,
  };
}

export class MouseController {
  private readonly pointer: PointerLike;
  private previousPointerDown = false;
  private previousUseDown = false;

  constructor(scene: Phaser.Scene) {
    this.pointer = scene.input.activePointer;
    scene.input.mouse?.disableContextMenu();
  }

  getInput(tank: Pick<Tank, 'x' | 'y' | 'rotation'>): PlayerInput {
    const pointerDown = this.pointer.leftButtonDown();
    const useDown = this.pointer.rightButtonDown();
    const input = computeMousePlayerInput({
      tankX: tank.x,
      tankY: tank.y,
      tankRotation: tank.rotation,
      pointerX: this.pointer.x,
      pointerY: this.pointer.y,
      pointerDown,
      previousPointerDown: this.previousPointerDown,
      useDown,
      previousUseDown: this.previousUseDown,
    });

    this.previousPointerDown = pointerDown;
    this.previousUseDown = useDown;
    return input;
  }
}
