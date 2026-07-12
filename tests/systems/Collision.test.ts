import { describe, it, expect } from 'vitest';
import {
  segmentCircleTOI,
  separateCircleFromRect,
  sweptCircleCircleTOI,
  sweptCircleRectOverlap,
  sweptCircleRectTOI,
} from '../../src/systems/Collision';

describe('segmentCircleTOI', () => {
  it('returns first contact for a forward crossing', () => {
    expect(segmentCircleTOI(0, 0, 10, 0, 5, 0, 1)).toBeCloseTo(0.4);
  });

  it('returns first contact for a reverse crossing', () => {
    expect(segmentCircleTOI(10, 0, 0, 0, 5, 0, 1)).toBeCloseTo(0.4);
  });

  it('returns the tangent contact', () => {
    expect(segmentCircleTOI(0, 1, 10, 1, 5, 0, 1)).toBeCloseTo(0.5);
  });

  it('rejects a near miss', () => {
    expect(segmentCircleTOI(0, 1.001, 10, 1.001, 5, 0, 1)).toBeNull();
  });

  it('returns zero for a stationary overlapping point and null otherwise', () => {
    expect(segmentCircleTOI(0.5, 0, 0.5, 0, 0, 0, 1)).toBe(0);
    expect(segmentCircleTOI(2, 0, 2, 0, 0, 0, 1)).toBeNull();
  });
});

describe('sweptCircleCircleTOI', () => {
  it('adds both radii when finding first contact', () => {
    expect(sweptCircleCircleTOI(0, 0, 10, 0, 1, 6, 0, 2)).toBeCloseTo(0.3);
  });
});

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

describe('sweptCircleRectTOI', () => {
  it('returns first side contact in either direction', () => {
    expect(sweptCircleRectTOI(0, 5, 20, 5, 2, 10, 0, 5, 10)).toBeCloseTo(0.4);
    expect(sweptCircleRectTOI(20, 5, 0, 5, 2, 10, 0, 5, 10)).toBeCloseTo(0.15);
  });

  it('returns an exact rounded-corner tangent and rejects a near miss', () => {
    expect(sweptCircleRectTOI(-3, -2, 1, -2, 2, 0, 0, 10, 10)).toBeCloseTo(0.75);
    expect(sweptCircleRectTOI(-3, -2.001, 1, -2.001, 2, 0, 0, 10, 10)).toBeNull();
  });
});
