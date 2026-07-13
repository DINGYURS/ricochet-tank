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

  it('returns contact for an arbitrary-angle tangent', () => {
    expect(segmentCircleTOI(
      -10.031990400796413, 0.5993067647946363,
      9.952011732423145, 1.3990934485273194,
      0, 0, 1,
    )).toBeCloseTo(0.5);
  });

  it('rejects an arbitrary-angle path offset outward by 1e-6', () => {
    const startX = -10.031990400796413;
    const startY = 0.5993067647946363;
    const endX = 9.952011732423145;
    const endY = 1.3990934485273194;
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy);
    const normalX = -dy / length;
    const normalY = dx / length;
    const outwardSign = startX * normalX + startY * normalY >= 0 ? 1 : -1;
    const offsetX = normalX * outwardSign * 1e-6;
    const offsetY = normalY * outwardSign * 1e-6;

    expect(segmentCircleTOI(
      startX + offsetX, startY + offsetY,
      endX + offsetX, endY + offsetY,
      0, 0, 1,
    )).toBeNull();
  });

  it('preserves arbitrary-angle tangent and near-miss results after a large translation', () => {
    const translation = 1_000_000;
    const startX = -10.031990400796413;
    const startY = 0.5993067647946363;
    const endX = 9.952011732423145;
    const endY = 1.3990934485273194;
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy);
    const normalX = -dy / length;
    const normalY = dx / length;
    const outwardSign = startX * normalX + startY * normalY >= 0 ? 1 : -1;
    const offsetX = normalX * outwardSign * 1e-6;
    const offsetY = normalY * outwardSign * 1e-6;

    expect(segmentCircleTOI(
      startX + translation, startY + translation,
      endX + translation, endY + translation,
      translation, translation, 1,
    )).toBeCloseTo(0.5);
    expect(segmentCircleTOI(
      startX + offsetX + translation, startY + offsetY + translation,
      endX + offsetX + translation, endY + offsetY + translation,
      translation, translation, 1,
    )).toBeNull();
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
