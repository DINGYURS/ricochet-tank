import { describe, it, expect } from 'vitest';
import { SHOTGUN_COUNT, SHOTGUN_SPREAD, DOUBLE_SHOT_SPREAD, ROCKET_SPEED } from '../../src/config';

describe('PowerUpEffects constants', () => {
  it('shotgun fires 5 bullets in 60 degree spread', () => {
    expect(SHOTGUN_COUNT).toBe(5);
    expect(SHOTGUN_SPREAD).toBeCloseTo(Math.PI / 3, 5);
  });

  it('double shot spread is ~8 degrees', () => {
    expect(DOUBLE_SHOT_SPREAD).toBeCloseTo(0.14, 2);
  });

  it('rocket speed is slower than bullet (300)', () => {
    expect(ROCKET_SPEED).toBeLessThan(300);
    expect(ROCKET_SPEED).toBe(200);
  });
});
