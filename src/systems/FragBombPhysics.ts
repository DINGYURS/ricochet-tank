export interface FragBombState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  active: boolean;
}

export interface FragBombTriggerState {
  manualTrigger: boolean;
  collision: boolean;
  age: number;
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

export function shouldDetonateFragBomb(trigger: FragBombTriggerState, maxLifetime: number): boolean {
  return trigger.manualTrigger || trigger.collision || trigger.age >= maxLifetime;
}

export function createFragmentVelocities(count: number, speed: number): Array<{ vx: number; vy: number }> {
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, index) => {
    const angle = index * Math.PI * 2 / count;
    return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
  });
}
