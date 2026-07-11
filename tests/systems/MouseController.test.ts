import { describe, expect, it, vi } from 'vitest';
import { computeMousePlayerInput, MouseController } from '../../src/systems/MouseController';

const baseState = {
  tankX: 0,
  tankY: 0,
  tankRotation: 0,
  pointerX: 100,
  pointerY: 0,
  pointerDown: false,
  previousPointerDown: false,
  useDown: false,
  previousUseDown: false,
};

describe('computeMousePlayerInput', () => {
  it('rotates right toward a pointer below the tank', () => {
    expect(computeMousePlayerInput({ ...baseState, pointerX: 0, pointerY: 100 }).rotateRight).toBe(true);
  });

  it('rotates left toward a pointer above the tank', () => {
    expect(computeMousePlayerInput({ ...baseState, pointerX: 0, pointerY: -100 }).rotateLeft).toBe(true);
  });

  it('does not move inside the pointer dead zone', () => {
    expect(computeMousePlayerInput({ ...baseState, pointerX: 5 }).forward).toBe(false);
  });

  it('moves forward when aligned outside the dead zone', () => {
    expect(computeMousePlayerInput(baseState).forward).toBe(true);
  });

  it('fires only on the left-button down edge', () => {
    expect(computeMousePlayerInput({ ...baseState, pointerDown: true }).shoot).toBe(true);
    expect(computeMousePlayerInput({ ...baseState, pointerDown: true, previousPointerDown: true }).shoot).toBe(false);
  });

  it('uses a power-up only on the right-button down edge', () => {
    expect(computeMousePlayerInput({ ...baseState, useDown: true }).usePowerUp).toBe(true);
    expect(computeMousePlayerInput({ ...baseState, useDown: true, previousUseDown: true }).usePowerUp).toBe(false);
  });

  it('takes the shortest rotation direction across the angle wrap boundary', () => {
    const input = computeMousePlayerInput({
      ...baseState,
      tankRotation: Math.PI - 0.05,
      pointerX: -100,
      pointerY: -20,
    });
    expect(input.rotateRight).toBe(true);
    expect(input.rotateLeft).toBe(false);
  });
});

describe('MouseController', () => {
  it('disables the context menu and tracks button edges between frames', () => {
    let leftDown = true;
    let rightDown = true;
    const disableContextMenu = vi.fn();
    const controller = new MouseController({
      input: {
        activePointer: {
          x: 100,
          y: 0,
          leftButtonDown: () => leftDown,
          rightButtonDown: () => rightDown,
        },
        mouse: { disableContextMenu },
      },
    } as any);

    expect(disableContextMenu).toHaveBeenCalledOnce();
    expect(controller.getInput({ x: 0, y: 0, rotation: 0 })).toMatchObject({
      shoot: true,
      usePowerUp: true,
    });
    expect(controller.getInput({ x: 0, y: 0, rotation: 0 })).toMatchObject({
      shoot: false,
      usePowerUp: false,
    });

    leftDown = false;
    rightDown = false;
    controller.getInput({ x: 0, y: 0, rotation: 0 });
    leftDown = true;
    expect(controller.getInput({ x: 0, y: 0, rotation: 0 }).shoot).toBe(true);
  });
});
