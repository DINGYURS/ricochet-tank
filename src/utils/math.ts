export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function reflect(vx: number, vy: number, wallOrientation: 'vertical' | 'horizontal'): { vx: number; vy: number } {
  if (wallOrientation === 'vertical') {
    return { vx: -vx, vy };
  }
  return { vx, vy: -vy };
}

export function distanceSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

export function circleRectOverlap(
  cx: number, cy: number, cr: number,
  rx: number, ry: number, rw: number, rh: number
): boolean {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  return distanceSq(cx, cy, closestX, closestY) < cr * cr;
}

export function circleCircleOverlap(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean {
  const radiiSum = r1 + r2;
  return distanceSq(x1, y1, x2, y2) < radiiSum * radiiSum;
}
