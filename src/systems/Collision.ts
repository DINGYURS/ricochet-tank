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
  const dx = endX - startX;
  const dy = endY - startY;

  const segmentIntersectsRect = (minX: number, minY: number, maxX: number, maxY: number): boolean => {
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
  };

  if (segmentIntersectsRect(rectX, rectY - radius, rectX + rectWidth, rectY + rectHeight + radius) ||
      segmentIntersectsRect(rectX - radius, rectY, rectX + rectWidth + radius, rectY + rectHeight)) {
    return true;
  }

  const segmentTouchesPoint = (pointX: number, pointY: number): boolean => {
    const lengthSq = dx * dx + dy * dy;
    const projection = lengthSq === 0 ? 0 : ((pointX - startX) * dx + (pointY - startY) * dy) / lengthSq;
    const t = Math.max(0, Math.min(1, projection));
    const closestX = startX + dx * t;
    const closestY = startY + dy * t;
    const offsetX = closestX - pointX;
    const offsetY = closestY - pointY;
    return offsetX * offsetX + offsetY * offsetY <= radius * radius;
  };

  return segmentTouchesPoint(rectX, rectY) ||
    segmentTouchesPoint(rectX + rectWidth, rectY) ||
    segmentTouchesPoint(rectX, rectY + rectHeight) ||
    segmentTouchesPoint(rectX + rectWidth, rectY + rectHeight);
}

export { circleRectOverlap, circleCircleOverlap };
