import { describe, it, expect } from 'vitest';
import { reflect, distanceSq, circleRectOverlap, circleCircleOverlap, clamp } from '../../src/utils/math';

describe('clamp', () => {
  it('clamps value within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('reflect', () => {
  it('reflects off vertical wall (reverse vx)', () => {
    const result = reflect(100, -200, 'vertical');
    expect(result.vx).toBe(-100);
    expect(result.vy).toBe(-200);
  });

  it('reflects off horizontal wall (reverse vy)', () => {
    const result = reflect(100, -200, 'horizontal');
    expect(result.vx).toBe(100);
    expect(result.vy).toBe(200);
  });
});

describe('distanceSq', () => {
  it('returns squared distance between two points', () => {
    expect(distanceSq(0, 0, 3, 4)).toBe(25);
    expect(distanceSq(1, 1, 1, 1)).toBe(0);
  });
});

describe('circleRectOverlap', () => {
  it('detects overlap when circle touches rect', () => {
    expect(circleRectOverlap(5, 5, 3, 0, 0, 10, 10)).toBe(true);
  });

  it('detects no overlap when circle is far', () => {
    expect(circleRectOverlap(20, 20, 3, 0, 0, 10, 10)).toBe(false);
  });

  it('detects overlap at rect edge', () => {
    expect(circleRectOverlap(12, 5, 3, 0, 0, 10, 10)).toBe(true);
  });

  it('detects no overlap just outside rect edge', () => {
    expect(circleRectOverlap(13.1, 5, 3, 0, 0, 10, 10)).toBe(false);
  });
});

describe('circleCircleOverlap', () => {
  it('detects overlap when circles touch', () => {
    expect(circleCircleOverlap(0, 0, 5, 8, 0, 5)).toBe(true);
  });

  it('detects no overlap when circles are apart', () => {
    expect(circleCircleOverlap(0, 0, 5, 20, 0, 5)).toBe(false);
  });
});
