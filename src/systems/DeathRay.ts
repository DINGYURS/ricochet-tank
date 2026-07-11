export interface DeathRayChargeState {
  elapsed: number;
  fired: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface ArenaBounds extends Point {
  width: number;
  height: number;
}

export interface DeathRayTarget extends Point {
  playerId: number;
  alive: boolean;
  radius: number;
}

export function advanceDeathRayCharge(
  state: DeathRayChargeState,
  dt: number,
  duration: number,
): { state: DeathRayChargeState; fire: boolean } {
  if (state.fired) return { state, fire: false };
  const elapsed = Math.min(duration, state.elapsed + dt);
  const fired = elapsed >= duration;
  return { state: { elapsed, fired }, fire: fired };
}

export function traceDeathRay(
  origin: Point,
  direction: Point,
  bounds: ArenaBounds,
  tanks: DeathRayTarget[],
): { end: Point; hitPlayerIds: number[] } {
  const magnitude = Math.hypot(direction.x, direction.y);
  if (magnitude === 0) return { end: { ...origin }, hitPlayerIds: [] };

  const dx = direction.x / magnitude;
  const dy = direction.y / magnitude;
  const maxX = bounds.x + bounds.width;
  const maxY = bounds.y + bounds.height;
  const tx = dx > 0 ? (maxX - origin.x) / dx : dx < 0 ? (bounds.x - origin.x) / dx : Infinity;
  const ty = dy > 0 ? (maxY - origin.y) / dy : dy < 0 ? (bounds.y - origin.y) / dy : Infinity;
  const distance = Math.min(tx, ty);
  const end = { x: origin.x + dx * distance, y: origin.y + dy * distance };

  const hits = tanks
    .filter(tank => tank.alive)
    .map(tank => ({
      playerId: tank.playerId,
      distance: firstCircleIntersectionDistance(origin, end, tank),
    }))
    .filter((hit): hit is { playerId: number; distance: number } => hit.distance !== null)
    .sort((a, b) => a.distance - b.distance)
    .map(hit => hit.playerId);

  return { end, hitPlayerIds: hits };
}

function firstCircleIntersectionDistance(origin: Point, end: Point, target: DeathRayTarget): number | null {
  const dx = end.x - origin.x;
  const dy = end.y - origin.y;
  const fx = origin.x - target.x;
  const fy = origin.y - target.y;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - target.radius * target.radius;
  const discriminant = b * b - 4 * a * c;
  if (a === 0 || discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  const values = [(-b - root) / (2 * a), (-b + root) / (2 * a)].filter(t => t >= 0 && t <= 1);
  return values.length === 0 ? null : Math.min(...values) * Math.sqrt(a);
}
