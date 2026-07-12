export interface RCMissileState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  bounces: number;
  active: boolean;
}

export function advanceRCMissile(
  state: RCMissileState,
  dt: number,
  steerInput: number,
  turnSpeed: number,
  maxLifetime: number,
): RCMissileState {
  if (!state.active) return state;
  const speed = Math.hypot(state.vx, state.vy);
  const angle = Math.atan2(state.vy, state.vx) + Math.max(-1, Math.min(1, steerInput)) * turnSpeed * dt;
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  const age = state.age + dt;
  return {
    ...state,
    x: state.x + vx * dt,
    y: state.y + vy * dt,
    vx,
    vy,
    age,
    active: age < maxLifetime,
  };
}

export function reflectRCMissile(
  state: RCMissileState,
  orientation: 'vertical' | 'horizontal' | Array<'vertical' | 'horizontal'>,
  maxBounces: number,
): RCMissileState {
  if (!state.active) return state;
  const orientations = new Set(Array.isArray(orientation) ? orientation : [orientation]);
  const bounces = state.bounces + 1;
  return {
    ...state,
    vx: orientations.has('vertical') ? -state.vx : state.vx,
    vy: orientations.has('horizontal') ? -state.vy : state.vy,
    bounces,
    active: bounces <= maxBounces,
  };
}

export function isRCMissileOwnerSafe(age: number, safetyDuration: number): boolean {
  return age < safetyDuration;
}
