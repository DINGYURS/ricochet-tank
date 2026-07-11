import { describe, expect, it } from 'vitest';
import { advanceDeathRayCharge, traceDeathRay } from '../../src/systems/DeathRay';

describe('advanceDeathRayCharge', () => {
  it('fires exactly once when the charge reaches its duration', () => {
    const first = advanceDeathRayCharge({ elapsed: 0, fired: false }, 0.6, 1);
    expect(first).toEqual({ state: { elapsed: 0.6, fired: false }, fire: false });

    const second = advanceDeathRayCharge(first.state, 0.4, 1);
    expect(second).toEqual({ state: { elapsed: 1, fired: true }, fire: true });

    expect(advanceDeathRayCharge(second.state, 1, 1)).toEqual({ state: second.state, fire: false });
  });
});

describe('traceDeathRay', () => {
  it('ends at the arena boundary in the firing direction', () => {
    const result = traceDeathRay(
      { x: 100, y: 100 },
      { x: 1, y: 0 },
      { x: 0, y: 0, width: 800, height: 600 },
      [],
    );
    expect(result.end).toEqual({ x: 800, y: 100 });
  });

  it('returns every intersected tank in distance order including the owner', () => {
    const result = traceDeathRay(
      { x: 0, y: 100 },
      { x: 1, y: 0 },
      { x: 0, y: 0, width: 800, height: 600 },
      [
        { playerId: 2, alive: true, x: 500, y: 100, radius: 16 },
        { playerId: 0, alive: true, x: 100, y: 100, radius: 16 },
        { playerId: 1, alive: true, x: 300, y: 100, radius: 16 },
        { playerId: 3, alive: false, x: 200, y: 100, radius: 16 },
      ],
    );
    expect(result.hitPlayerIds).toEqual([0, 1, 2]);
  });

  it('normalizes diagonal direction before finding the boundary', () => {
    const result = traceDeathRay(
      { x: 400, y: 300 },
      { x: 2, y: 2 },
      { x: 0, y: 0, width: 800, height: 600 },
      [],
    );
    expect(result.end.x).toBeCloseTo(700);
    expect(result.end.y).toBeCloseTo(600);
  });
});
