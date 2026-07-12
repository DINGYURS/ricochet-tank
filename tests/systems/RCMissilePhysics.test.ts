import { describe, expect, it } from 'vitest';
import {
  advanceRCMissile,
  reflectRCMissile,
  isRCMissileOwnerSafe,
  type RCMissileState,
} from '../../src/systems/RCMissilePhysics';

const state = (): RCMissileState => ({
  x: 0,
  y: 0,
  vx: 100,
  vy: 0,
  age: 0,
  bounces: 0,
  active: true,
});

describe('advanceRCMissile', () => {
  it('moves at fixed speed and steers with bounded turn rate', () => {
    const result = advanceRCMissile(state(), 0.5, 1, 2, 5);
    expect(Math.hypot(result.vx, result.vy)).toBeCloseTo(100);
    expect(Math.atan2(result.vy, result.vx)).toBeCloseTo(1);
    expect(result.x).toBeCloseTo(Math.cos(1) * 50);
    expect(result.y).toBeCloseTo(Math.sin(1) * 50);
  });

  it('expires at the configured lifetime', () => {
    expect(advanceRCMissile(state(), 5, 0, 2, 5).active).toBe(false);
  });
});

describe('reflectRCMissile', () => {
  it('reflects from a vertical wall and increments bounce count', () => {
    const result = reflectRCMissile(state(), 'vertical', 3);
    expect(result.vx).toBe(-100);
    expect(result.vy).toBe(0);
    expect(result.bounces).toBe(1);
    expect(result.active).toBe(true);
  });

  it('deactivates after exceeding the bounce cap', () => {
    const current = { ...state(), bounces: 3 };
    expect(reflectRCMissile(current, 'horizontal', 3).active).toBe(false);
  });

  it('reflects both axes but counts a wall corner as one bounce event', () => {
    const current = { ...state(), vy: 50 };
    const result = reflectRCMissile(current, ['vertical', 'horizontal'], 3);
    expect(result.vx).toBe(-100);
    expect(result.vy).toBe(-50);
    expect(result.bounces).toBe(1);
  });
});

describe('isRCMissileOwnerSafe', () => {
  it('protects the owner only during launch safety', () => {
    expect(isRCMissileOwnerSafe(0.1, 0.2)).toBe(true);
    expect(isRCMissileOwnerSafe(0.2, 0.2)).toBe(false);
  });
});
