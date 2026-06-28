/**
 * Normalise angle to the range (-PI, PI].
 */
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle <= -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Shortest angular difference from `a` to `b`, in (-PI, PI].
 * Positive means b is clockwise from a.
 */
export function angleDiff(a: number, b: number): number {
  return normalizeAngle(b - a);
}

/**
 * Euclidean distance between two points.
 */
export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Check whether line segment (ax,ay)->(bx,by) intersects an axis-aligned rectangle.
 */
export function segmentIntersectsRect(
  ax: number, ay: number, bx: number, by: number,
  rect: { x: number; y: number; width: number; height: number },
): boolean {
  const { x: rx, y: ry, width: rw, height: rh } = rect;

  if (ax >= rx && ax <= rx + rw && ay >= ry && ay <= ry + rh) return true;
  if (bx >= rx && bx <= rx + rw && by >= ry && by <= ry + rh) return true;

  return (
    segmentsIntersect(ax, ay, bx, by, rx, ry, rx + rw, ry) ||
    segmentsIntersect(ax, ay, bx, by, rx + rw, ry, rx + rw, ry + rh) ||
    segmentsIntersect(ax, ay, bx, by, rx, ry + rh, rx + rw, ry + rh) ||
    segmentsIntersect(ax, ay, bx, by, rx, ry, rx, ry + rh)
  );
}

function segmentsIntersect(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): boolean {
  const d1 = cross(cx, cy, dx, dy, ax, ay);
  const d2 = cross(cx, cy, dx, dy, bx, by);
  const d3 = cross(ax, ay, bx, by, cx, cy);
  const d4 = cross(ax, ay, bx, by, dx, dy);

  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

function cross(
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  p3x: number, p3y: number,
): number {
  return (p2x - p1x) * (p3y - p1y) - (p2y - p1y) * (p3x - p1x);
}

/**
 * True when no wall rectangle intersects the line between `from` and `to`.
 */
export function hasLineOfSight(
  from: { x: number; y: number },
  to: { x: number; y: number },
  walls: Array<{ x: number; y: number; width: number; height: number }>,
): boolean {
  for (const wall of walls) {
    if (segmentIntersectsRect(from.x, from.y, to.x, to.y, wall)) {
      return false;
    }
  }
  return true;
}

/**
 * Predict where a bullet will hit a wall and what its reflected velocity will be.
 * Returns null if no wall is hit within maxDist.
 */
export function predictBulletBounce(
  bullet: { x: number; y: number; vx: number; vy: number },
  walls: Array<{ x: number; y: number; width: number; height: number; orientation: string }>,
  maxDist: number,
): { x: number; y: number; vx: number; vy: number } | null {
  const speed = Math.hypot(bullet.vx, bullet.vy);
  if (speed === 0) return null;

  const dx = bullet.vx / speed;
  const dy = bullet.vy / speed;

  let closestT = Infinity;
  let closestWall: typeof walls[0] | null = null;

  for (const wall of walls) {
    const t = rayIntersectsRect(bullet.x, bullet.y, dx, dy, wall);
    if (t !== null && t > 1 && t < closestT && t < maxDist) {
      closestT = t;
      closestWall = wall;
    }
  }

  if (!closestWall) return null;

  const hitX = bullet.x + dx * closestT;
  const hitY = bullet.y + dy * closestT;

  let newVx = bullet.vx;
  let newVy = bullet.vy;
  if (closestWall.orientation === 'vertical') {
    newVx = -bullet.vx;
  } else {
    newVy = -bullet.vy;
  }

  return { x: hitX, y: hitY, vx: newVx, vy: newVy };
}

/**
 * Slab-method ray-AABB intersection.
 * Returns the distance `t` along the ray where it first enters the rect,
 * or null if no intersection.
 */
export function rayIntersectsRect(
  ox: number, oy: number,
  dx: number, dy: number,
  rect: { x: number; y: number; width: number; height: number },
): number | null {
  const minX = rect.x;
  const maxX = rect.x + rect.width;
  const minY = rect.y;
  const maxY = rect.y + rect.height;

  let tmin = -Infinity;
  let tmax = Infinity;

  if (dx !== 0) {
    let t1 = (minX - ox) / dx;
    let t2 = (maxX - ox) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  } else {
    if (ox < minX || ox > maxX) return null;
  }

  if (dy !== 0) {
    let t1 = (minY - oy) / dy;
    let t2 = (maxY - oy) / dy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  } else {
    if (oy < minY || oy > maxY) return null;
  }

  return tmin >= 0 ? tmin : null;
}
