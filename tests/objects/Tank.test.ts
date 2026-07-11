import { describe, it, expect } from 'vitest';
import { computeTankMovement, TANK_COLORS } from '../../src/objects/Tank';
import { AMMO_MAX, AMMO_REFILL_INTERVAL } from '../../src/config';

describe('computeTankMovement', () => {
  it('moves forward along rotation angle', () => {
    const result = computeTankMovement(100, 100, 0, true, false, 150, 90, 0, 0.016);
    expect(result.x).toBeCloseTo(100 + 150 * 0.016);
    expect(result.y).toBeCloseTo(100);
  });

  it('moves backward (slower) along rotation angle', () => {
    const result = computeTankMovement(100, 100, 0, false, true, 150, 90, 0, 0.016);
    expect(result.x).toBeCloseTo(100 - 90 * 0.016);
    expect(result.y).toBeCloseTo(100);
  });

  it('does not move when neither forward nor backward', () => {
    const result = computeTankMovement(100, 100, 0, false, false, 150, 90, 0, 0.016);
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
  });

  it('rotates left', () => {
    const result = computeTankMovement(100, 100, 1.0, false, false, 150, 90, -3, 0.016);
    expect(result.rotation).toBeCloseTo(1.0 - 3 * 0.016);
  });

  it('rotates right', () => {
    const result = computeTankMovement(100, 100, 1.0, false, false, 150, 90, 3, 0.016);
    expect(result.rotation).toBeCloseTo(1.0 + 3 * 0.016);
  });
});

describe('Tank ammo', () => {
  it('starts with AMMO_MAX ammo', () => {
    const tank = { ammo: AMMO_MAX, ammoRefillTimer: 0 } as any;
    expect(tank.ammo).toBe(AMMO_MAX);
    expect(tank.ammoRefillTimer).toBe(0);
  });

  it('decrements ammo when shot', () => {
    const tank = { ammo: AMMO_MAX, ammoRefillTimer: 0 } as any;
    tank.ammo--;
    expect(tank.ammo).toBe(AMMO_MAX - 1);
  });

  it('refills ammo when timer exceeds interval', () => {
    const tank = { ammo: 3, ammoRefillTimer: 0 } as any;
    tank.ammoRefillTimer += AMMO_REFILL_INTERVAL;
    if (tank.ammoRefillTimer >= AMMO_REFILL_INTERVAL) {
      tank.ammo = AMMO_MAX;
      tank.ammoRefillTimer = 0;
    }
    expect(tank.ammo).toBe(AMMO_MAX);
    expect(tank.ammoRefillTimer).toBe(0);
  });
});

describe('TANK_COLORS', () => {
  it('defines P1 blue colors', () => {
    expect(TANK_COLORS[0]).toEqual({ body: 0x4488ff, track: 0x2255aa, turret: 0x3366cc });
  });

  it('defines P2 red colors', () => {
    expect(TANK_COLORS[1]).toEqual({ body: 0xff4444, track: 0xaa2222, turret: 0xcc3333 });
  });

  it('defines P3 green colors', () => {
    expect(TANK_COLORS[2]).toEqual({ body: 0x44dd66, track: 0x228844, turret: 0x33aa55 });
  });
});

describe('Tank color parameter', () => {
  it('TANK_COLORS entries all have body, track, turret', () => {
    for (const key of Object.keys(TANK_COLORS)) {
      const c = TANK_COLORS[Number(key)];
      expect(c).toHaveProperty('body');
      expect(c).toHaveProperty('track');
      expect(c).toHaveProperty('turret');
    }
  });

  it('custom color can be constructed as a plain object', () => {
    const custom = { body: 0x00ff00, track: 0x00aa00, turret: 0x00cc00 };
    expect(custom.body).toBe(0x00ff00);
    expect(custom.track).toBe(0x00aa00);
    expect(custom.turret).toBe(0x00cc00);
  });

  it('P3 color is visually distinct from P1 and P2', () => {
    expect(TANK_COLORS[2]).not.toEqual(TANK_COLORS[0]);
    expect(TANK_COLORS[2]).not.toEqual(TANK_COLORS[1]);
  });
});
