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

export function segmentCircleTOI(
  startX: number, startY: number, endX: number, endY: number,
  circleX: number, circleY: number, radius: number,
): number | null {
  const dx = endX - startX;
  const dy = endY - startY;
  const offsetX = startX - circleX;
  const offsetY = startY - circleY;
  const c = offsetX * offsetX + offsetY * offsetY - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (a === 0) return null;
  const b = 2 * (offsetX * dx + offsetY * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(Math.max(0, discriminant))) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

export function sweptCircleCircleTOI(
  startX: number, startY: number, endX: number, endY: number, movingRadius: number,
  circleX: number, circleY: number, circleRadius: number,
): number | null {
  return segmentCircleTOI(startX, startY, endX, endY, circleX, circleY, movingRadius + circleRadius);
}

export function sweptCircleRectTOI(
  startX: number, startY: number,
  endX: number, endY: number,
  radius: number,
  rectX: number, rectY: number, rectWidth: number, rectHeight: number,
): number | null {
  const dx = endX - startX;
  const dy = endY - startY;
  if (circleRectOverlap(startX, startY, radius, rectX, rectY, rectWidth, rectHeight)) return 0;

  const candidates: number[] = [];
  const addSide = (t: number, orthogonal: number, min: number, max: number): void => {
    if (t >= 0 && t <= 1 && orthogonal >= min && orthogonal <= max) candidates.push(t);
  };
  if (dx !== 0) {
    let t = (rectX - radius - startX) / dx;
    addSide(t, startY + dy * t, rectY, rectY + rectHeight);
    t = (rectX + rectWidth + radius - startX) / dx;
    addSide(t, startY + dy * t, rectY, rectY + rectHeight);
  }
  if (dy !== 0) {
    let t = (rectY - radius - startY) / dy;
    addSide(t, startX + dx * t, rectX, rectX + rectWidth);
    t = (rectY + rectHeight + radius - startY) / dy;
    addSide(t, startX + dx * t, rectX, rectX + rectWidth);
  }
  for (const [cornerX, cornerY] of [
    [rectX, rectY], [rectX + rectWidth, rectY],
    [rectX, rectY + rectHeight], [rectX + rectWidth, rectY + rectHeight],
  ]) {
    const t = segmentCircleTOI(startX, startY, endX, endY, cornerX, cornerY, radius);
    if (t !== null) candidates.push(t);
  }
  return candidates.length > 0 ? Math.min(...candidates) : null;
}

export function sweptCircleRectOverlap(
  startX: number, startY: number, endX: number, endY: number,
  radius: number,
  rectX: number, rectY: number, rectWidth: number, rectHeight: number,
): boolean {
  return sweptCircleRectTOI(startX, startY, endX, endY, radius, rectX, rectY, rectWidth, rectHeight) !== null;
}

export { circleRectOverlap, circleCircleOverlap };
