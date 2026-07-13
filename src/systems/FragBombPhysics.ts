import { sweptCircleRectTOI } from './Collision';

export interface Point {
  x: number;
  y: number;
}

export interface FragBombState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  active: boolean;
}

export type FragBombEvent = {
  type: 'tank' | 'wall' | 'lifetime';
  toi: number;
};

export function selectFragBombEvent(
  tankTOI: number | null,
  wallTOI: number | null,
  lifetimeTOI: number | null,
): FragBombEvent | null {
  const collision: FragBombEvent | null = tankTOI !== null && (wallTOI === null || tankTOI <= wallTOI)
    ? { type: 'tank', toi: tankTOI }
    : wallTOI !== null
      ? { type: 'wall', toi: wallTOI }
      : null;

  if (lifetimeTOI !== null && (collision === null || lifetimeTOI < collision.toi)) {
    return { type: 'lifetime', toi: lifetimeTOI };
  }
  return collision;
}

export function resolveFragBombLaunch(
  owner: Point,
  direction: Point,
  ownerRadius: number,
  bombRadius: number,
  desiredClearance: number,
  walls: Array<{ x: number; y: number; width: number; height: number }>,
): Point | null {
  const directionLength = Math.hypot(direction.x, direction.y);
  if (directionLength === 0) return null;

  const unitX = direction.x / directionLength;
  const unitY = direction.y / directionLength;
  const minimumDistance = ownerRadius + bombRadius + 1;
  const desiredDistance = minimumDistance + desiredClearance;
  const desired = {
    x: owner.x + unitX * desiredDistance,
    y: owner.y + unitY * desiredDistance,
  };

  let earliestTOI: number | null = null;
  for (const wall of walls) {
    const toi = sweptCircleRectTOI(
      owner.x, owner.y, desired.x, desired.y, bombRadius,
      wall.x, wall.y, wall.width, wall.height,
    );
    if (toi !== null && (earliestTOI === null || toi < earliestTOI)) earliestTOI = toi;
  }

  const launchDistance = earliestTOI === null
    ? desiredDistance
    : desiredDistance * earliestTOI - 1;
  if (launchDistance < minimumDistance) return null;
  return {
    x: owner.x + unitX * launchDistance,
    y: owner.y + unitY * launchDistance,
  };
}

export function advanceFragBomb(state: FragBombState, dt: number): FragBombState {
  if (!state.active) return state;
  return {
    ...state,
    x: state.x + state.vx * dt,
    y: state.y + state.vy * dt,
    age: state.age + dt,
  };
}

export function createFragmentVelocities(count: number, speed: number): Array<{ vx: number; vy: number }> {
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, index) => {
    const angle = index * Math.PI * 2 / count;
    return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
  });
}
