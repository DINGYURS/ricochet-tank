import { describe, expect, it } from 'vitest';
import {
  advanceFragBomb,
  createFragmentVelocities,
  shouldDetonateFragBomb,
  type FragBombState,
} from '../../src/systems/FragBombPhysics';

const state = (): FragBombState => ({ x: 0, y: 0, vx: 100, vy: 50, age: 0, active: true });

describe('advanceFragBomb', () => {
  it('advances position and age without changing velocity', () => {
    expect(advanceFragBomb(state(), 0.5)).toEqual({ x: 50, y: 25, vx: 100, vy: 50, age: 0.5, active: true });
  });
});

describe('shouldDetonateFragBomb', () => {
  it('detonates from a manual second trigger', () => {
    expect(shouldDetonateFragBomb({ manualTrigger: true, collision: false, age: 0 }, 4)).toBe(true);
  });

  it('detonates from collision or lifetime expiry', () => {
    expect(shouldDetonateFragBomb({ manualTrigger: false, collision: true, age: 0 }, 4)).toBe(true);
    expect(shouldDetonateFragBomb({ manualTrigger: false, collision: false, age: 4 }, 4)).toBe(true);
  });

  it('continues flying without a trigger', () => {
    expect(shouldDetonateFragBomb({ manualTrigger: false, collision: false, age: 3.9 }, 4)).toBe(false);
  });
});

describe('createFragmentVelocities', () => {
  it('creates deterministic evenly spaced radial fragments', () => {
    const fragments = createFragmentVelocities(4, 200);
    expect(fragments).toHaveLength(4);
    expect(fragments[0]).toEqual({ vx: 200, vy: 0 });
    expect(fragments[1].vx).toBeCloseTo(0);
    expect(fragments[1].vy).toBeCloseTo(200);
    expect(fragments[2].vx).toBeCloseTo(-200);
    expect(fragments[2].vy).toBeCloseTo(0);
    expect(fragments[3].vx).toBeCloseTo(0);
    expect(fragments[3].vy).toBeCloseTo(-200);
  });
});
