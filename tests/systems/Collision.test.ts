import { describe, it, expect } from 'vitest';
import { separateCircleFromRect, sweptCircleRectOverlap } from '../../src/systems/Collision';

describe('separateCircleFromRect', () => {
  it('pushes circle out from the right side', () => {
    const result = separateCircleFromRect(12, 5, 5, 0, 0, 10, 10);
    expect(result.x).toBeCloseTo(15);
    expect(result.y).toBeCloseTo(5);
  });

  it('pushes circle out from the left side', () => {
    const result = separateCircleFromRect(-2, 5, 5, 0, 0, 10, 10);
    expect(result.x).toBeCloseTo(-5);
    expect(result.y).toBeCloseTo(5);
  });

  it('pushes circle out from the top', () => {
    const result = separateCircleFromRect(5, -2, 5, 0, 0, 10, 10);
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(-5);
  });

  it('pushes circle out from the bottom', () => {
    const result = separateCircleFromRect(5, 12, 5, 0, 0, 10, 10);
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(15);
  });

  it('returns original position when no overlap', () => {
    const result = separateCircleFromRect(20, 20, 5, 0, 0, 10, 10);
    expect(result.x).toBe(20);
    expect(result.y).toBe(20);
  });
});

describe('sweptCircleRectOverlap', () => {
  it('detects a circle crossing completely through a thin wall between endpoints', () => {
    expect(sweptCircleRectOverlap(80, 50, 96, 50, 2, 83, 0, 10, 100)).toBe(true);
  });

  it('does not report a parallel path outside the expanded wall bounds', () => {
    expect(sweptCircleRectOverlap(80, 110, 96, 110, 2, 83, 0, 10, 100)).toBe(false);
  });

  it('detects a stationary circle already overlapping the wall', () => {
    expect(sweptCircleRectOverlap(84, 50, 84, 50, 2, 83, 0, 10, 100)).toBe(true);
  });

  it('does not report a path through the square outside a rounded corner', () => {
    expect(sweptCircleRectOverlap(-3, -1.9, -1.9, -1.9, 2, 0, 0, 10, 10)).toBe(false);
  });

  it('detects a tangent to a rounded corner', () => {
    expect(sweptCircleRectOverlap(-3, -2, 1, -2, 2, 0, 0, 10, 10)).toBe(true);
  });

  it('detects a rounded-corner hit in reverse', () => {
    expect(sweptCircleRectOverlap(-1, -1, -3, -3, 2, 0, 0, 10, 10)).toBe(true);
  });

  it('rejects a stationary circle outside a rounded corner', () => {
    expect(sweptCircleRectOverlap(-1.9, -1.9, -1.9, -1.9, 2, 0, 0, 10, 10)).toBe(false);
  });
});
