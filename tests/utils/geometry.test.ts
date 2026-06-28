import { describe, it, expect } from 'vitest';
import {
  normalizeAngle,
  angleDiff,
  dist,
  hasLineOfSight,
  segmentIntersectsRect,
  predictBulletBounce,
  findBlockingWall,
  getWallEdgePoint,
} from '../../src/utils/geometry';

describe('normalizeAngle', () => {
  it('returns angle in (-PI, PI]', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(2 * Math.PI)).toBeCloseTo(0);
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-3 * Math.PI)).toBeCloseTo(Math.PI);
  });
});

describe('angleDiff', () => {
  it('returns 0 for same angles', () => {
    expect(angleDiff(1, 1)).toBeCloseTo(0);
  });

  it('returns PI for opposite angles', () => {
    expect(angleDiff(0, Math.PI)).toBeCloseTo(Math.PI);
    expect(angleDiff(Math.PI, 0)).toBeCloseTo(Math.PI);
  });

  it('handles wraparound correctly', () => {
    expect(angleDiff(-Math.PI + 0.01, Math.PI - 0.01)).toBeCloseTo(-0.02, 5);
  });
});

describe('dist', () => {
  it('returns 0 for same point', () => {
    expect(dist(0, 0, 0, 0)).toBe(0);
  });

  it('returns correct distance', () => {
    expect(dist(0, 0, 3, 4)).toBe(5);
    expect(dist(100, 100, 103, 104)).toBe(5);
  });
});

describe('segmentIntersectsRect', () => {
  it('returns true when segment crosses rect', () => {
    const rect = { x: 50, y: 0, width: 10, height: 100 };
    expect(segmentIntersectsRect(0, 50, 100, 50, rect)).toBe(true);
  });

  it('returns false when segment misses rect', () => {
    const rect = { x: 50, y: 0, width: 10, height: 100 };
    expect(segmentIntersectsRect(0, 200, 100, 200, rect)).toBe(false);
  });

  it('returns false when segment ends before rect', () => {
    const rect = { x: 50, y: 0, width: 10, height: 100 };
    expect(segmentIntersectsRect(0, 50, 40, 50, rect)).toBe(false);
  });
});

describe('hasLineOfSight', () => {
  it('returns true when no walls block', () => {
    expect(hasLineOfSight({ x: 0, y: 50 }, { x: 100, y: 50 }, [])).toBe(true);
  });

  it('returns false when wall blocks', () => {
    const walls = [{ x: 50, y: 0, width: 10, height: 100, orientation: 'vertical' }];
    expect(hasLineOfSight({ x: 0, y: 50 }, { x: 100, y: 50 }, walls)).toBe(false);
  });

  it('returns true when wall is beside the line', () => {
    const walls = [{ x: 50, y: 0, width: 10, height: 100, orientation: 'vertical' }];
    expect(hasLineOfSight({ x: 0, y: 200 }, { x: 100, y: 200 }, walls)).toBe(true);
  });
});

describe('predictBulletBounce', () => {
  it('returns null when no wall hit', () => {
    const bullet = { x: 0, y: 50, vx: 100, vy: 0 };
    const walls: any[] = [];
    expect(predictBulletBounce(bullet, walls, 1000)).toBeNull();
  });

  it('predicts horizontal bounce off vertical wall', () => {
    const bullet = { x: 0, y: 50, vx: 300, vy: 0 };
    const walls = [{ x: 80, y: 0, width: 10, height: 100, orientation: 'vertical' }];
    const result = predictBulletBounce(bullet, walls, 200);
    expect(result).not.toBeNull();
    expect(result!.vx).toBeCloseTo(-300);
    expect(result!.vy).toBeCloseTo(0);
  });

  it('predicts vertical bounce off horizontal wall', () => {
    const bullet = { x: 50, y: 0, vx: 0, vy: 300 };
    const walls = [{ x: 0, y: 80, width: 100, height: 10, orientation: 'horizontal' }];
    const result = predictBulletBounce(bullet, walls, 200);
    expect(result).not.toBeNull();
    expect(result!.vx).toBeCloseTo(0);
    expect(result!.vy).toBeCloseTo(-300);
  });
});

describe('findBlockingWall', () => {
  it('returns null when no wall blocks', () => {
    const walls = [{ x: 200, y: 0, width: 10, height: 100, orientation: 'vertical' }];
    const result = findBlockingWall({ x: 0, y: 50 }, Math.PI / 2, walls); // shooting upward, wall is to the right
    expect(result).toBeNull();
  });

  it('finds the blocking wall', () => {
    const wall = { x: 80, y: 0, width: 10, height: 100, orientation: 'vertical' };
    const result = findBlockingWall({ x: 0, y: 50 }, 0, [wall]);
    expect(result).not.toBeNull();
    expect(result!.wall).toBe(wall);
    expect(result!.distance).toBeCloseTo(80);
  });

  it('finds the closest wall when multiple block', () => {
    const near = { x: 50, y: 0, width: 10, height: 100, orientation: 'vertical' };
    const far = { x: 200, y: 0, width: 10, height: 100, orientation: 'vertical' };
    const result = findBlockingWall({ x: 0, y: 50 }, 0, [far, near]);
    expect(result).not.toBeNull();
    expect(result!.wall).toBe(near);
  });
});

describe('getWallEdgePoint', () => {
  it('returns top edge for vertical wall when target is above', () => {
    const wall = { x: 50, y: 100, width: 10, height: 100, orientation: 'vertical' };
    const self = { x: 0, y: 150 };
    const target = { x: 100, y: 50 }; // above the wall
    const point = getWallEdgePoint(wall, self, target);
    expect(point.y).toBeLessThan(wall.y); // should be above the wall
  });

  it('returns bottom edge for vertical wall when target is below', () => {
    const wall = { x: 50, y: 100, width: 10, height: 100, orientation: 'vertical' };
    const self = { x: 0, y: 150 };
    const target = { x: 100, y: 250 }; // below the wall
    const point = getWallEdgePoint(wall, self, target);
    expect(point.y).toBeGreaterThan(wall.y + wall.height); // should be below the wall
  });

  it('returns left edge for horizontal wall when target is to the left', () => {
    const wall = { x: 100, y: 50, width: 100, height: 10, orientation: 'horizontal' };
    const self = { x: 150, y: 0 };
    const target = { x: 50, y: 100 }; // left of the wall
    const point = getWallEdgePoint(wall, self, target);
    expect(point.x).toBeLessThan(wall.x); // should be left of the wall
  });

  it('returns right edge for horizontal wall when target is to the right', () => {
    const wall = { x: 100, y: 50, width: 100, height: 10, orientation: 'horizontal' };
    const self = { x: 150, y: 0 };
    const target = { x: 250, y: 100 }; // right of the wall
    const point = getWallEdgePoint(wall, self, target);
    expect(point.x).toBeGreaterThan(wall.x + wall.width); // should be right of the wall
  });
});
