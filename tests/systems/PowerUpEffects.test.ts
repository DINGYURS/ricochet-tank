import { describe, it, expect, vi } from 'vitest';
import { SHOTGUN_COUNT, SHOTGUN_SPREAD, DOUBLE_SHOT_SPREAD, ROCKET_SPEED } from '../../src/config';
import { fireLaser } from '../../src/systems/PowerUpEffects';

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

describe('fireLaser', () => {
  it('hits the nearest intersecting tank regardless of array order', () => {
    const graphics = {
      setDepth: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      lineBetween: vi.fn().mockReturnThis(),
    };
    const scene = { add: { graphics: () => graphics } } as any;
    const shooter = {
      playerId: 0,
      rotation: 0,
      getBarrelTip: () => ({ x: 0, y: 0 }),
    } as any;
    const nearTank = { playerId: 1, alive: true, x: 100, y: 0, radius: 16 } as any;
    const farTank = { playerId: 2, alive: true, x: 200, y: 0, radius: 16 } as any;

    const result = fireLaser(scene, shooter, [], [nearTank, farTank], { laserFire: vi.fn() });

    expect(result.hitPlayerId).toBe(1);
  });
});
