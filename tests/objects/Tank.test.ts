import { describe, it, expect } from 'vitest';
import { computeTankMovement } from '../../src/objects/Tank';

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
