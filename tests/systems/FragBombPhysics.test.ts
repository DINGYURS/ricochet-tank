import { describe, expect, it } from 'vitest';
import {
  advanceFragBomb,
  createFragmentVelocities,
  resolveFragBombLaunch,
  shouldDetonateFragBomb,
  type FragBombState,
} from '../../src/systems/FragBombPhysics';
import { circleCircleOverlap, circleRectOverlap } from '../../src/systems/Collision';

const state = (): FragBombState => ({ x: 0, y: 0, vx: 100, vy: 50, age: 0, active: true });

describe('resolveFragBombLaunch', () => {
  const owner = { x: 100, y: 100 };
  const ownerRadius = 16;
  const bombRadius = 6;

  it('uses the desired clearance in open space with a normalized direction', () => {
    const launch = resolveFragBombLaunch(owner, { x: 3, y: 4 }, ownerRadius, bombRadius, 8, []);

    expect(launch).toEqual({ x: 118.6, y: 124.8 });
    expect(circleCircleOverlap(launch!.x, launch!.y, bombRadius, owner.x, owner.y, ownerRadius)).toBe(false);
  });

  it('reduces clearance to remain legal before a wall', () => {
    const wall = { x: 132, y: 80, width: 10, height: 40 };
    const launch = resolveFragBombLaunch(owner, { x: 10, y: 0 }, ownerRadius, bombRadius, 8, [wall]);

    expect(launch).toEqual({ x: 125, y: 100 });
    expect(circleCircleOverlap(launch!.x, launch!.y, bombRadius, owner.x, owner.y, ownerRadius)).toBe(false);
    expect(circleRectOverlap(launch!.x, launch!.y, bombRadius, wall.x, wall.y, wall.width, wall.height)).toBe(false);
  });

  it('returns null when a wall touching the owner leaves no legal launch point', () => {
    const wall = { x: 116, y: 80, width: 10, height: 40 };

    expect(resolveFragBombLaunch(owner, { x: 1, y: 0 }, ownerRadius, bombRadius, 8, [wall])).toBeNull();
  });
});

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
