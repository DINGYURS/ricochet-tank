import { clamp } from '../utils/math';
import { circleRectOverlap, circleCircleOverlap } from '../utils/math';

export interface SeparationResult {
  x: number;
  y: number;
}

export function separateCircleFromRect(
  cx: number, cy: number, cr: number,
  rx: number, ry: number, rw: number, rh: number
): SeparationResult {
  if (!circleRectOverlap(cx, cy, cr, rx, ry, rw, rh)) {
    return { x: cx, y: cy };
  }

  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);

  const dx = cx - closestX;
  const dy = cy - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq === 0) {
    const overlapLeft = cx - rx;
    const overlapRight = (rx + rw) - cx;
    const overlapTop = cy - ry;
    const overlapBottom = (ry + rh) - cy;
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapLeft) return { x: rx - cr, y: cy };
    if (minOverlap === overlapRight) return { x: rx + rw + cr, y: cy };
    if (minOverlap === overlapTop) return { x: cx, y: ry - cr };
    return { x: cx, y: ry + rh + cr };
  }

  const dist = Math.sqrt(distSq);
  const overlap = cr - dist;
  const nx = dx / dist;
  const ny = dy / dist;

  return {
    x: cx + nx * overlap,
    y: cy + ny * overlap,
  };
}

export function sweptCircleRectOverlap(
  startX: number, startY: number,
  endX: number, endY: number,
  radius: number,
  rectX: number, rectY: number, rectWidth: number, rectHeight: number,
): boolean {
  const minX = rectX - radius;
  const maxX = rectX + rectWidth + radius;
  const minY = rectY - radius;
  const maxY = rectY + rectHeight + radius;
  const dx = endX - startX;
  const dy = endY - startY;
  let enter = 0;
  let exit = 1;

  for (const [start, delta, min, max] of [
    [startX, dx, minX, maxX],
    [startY, dy, minY, maxY],
  ]) {
    if (delta === 0) {
      if (start < min || start > max) return false;
      continue;
    }
    const t1 = (min - start) / delta;
    const t2 = (max - start) / delta;
    enter = Math.max(enter, Math.min(t1, t2));
    exit = Math.min(exit, Math.max(t1, t2));
    if (enter > exit) return false;
  }
  return true;
}

export { circleRectOverlap, circleCircleOverlap };
