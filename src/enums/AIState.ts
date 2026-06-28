// ---------------------------------------------------------------------------
// AI State Machine Types
// ---------------------------------------------------------------------------

export enum AIStateType {
  PATROL = 'PATROL',
  CHASE = 'CHASE',
  ATTACK = 'ATTACK',
  DODGE = 'DODGE',
  COLLECT = 'COLLECT',
}

// ---------------------------------------------------------------------------
// Per-frame sensory input fed into state execution
// ---------------------------------------------------------------------------

export interface AIInput {
  selfPosition: { x: number; y: number };
  selfRotation: number;
  enemyPosition: { x: number; y: number } | null;
  enemyRotation: number;
  bullets: Array<{ x: number; y: number; vx: number; vy: number; ownerId: number }>;
  powerUps: Array<{ x: number; y: number; type: string }>;
  walls: Array<{ x: number; y: number; width: number; height: number; orientation: string }>;
  ammo: number;
  heldPowerUp: string | null;
}

// ---------------------------------------------------------------------------
// Output – identical shape to PlayerInput
// ---------------------------------------------------------------------------

export interface AIOutput {
  forward: boolean;
  backward: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
  shoot: boolean;
  usePowerUp: boolean;
}

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

export interface AIState {
  type: AIStateType;
  enter(): void;
  execute(input: AIInput, dt: number): AIOutput;
  exit(): void;
}

// ---------------------------------------------------------------------------
// Difficulty configuration
// ---------------------------------------------------------------------------

export interface AIDifficultyConfig {
  /** Delay in seconds before AI reacts to events */
  reactionDelay: number;
  /** Accuracy offset in radians - larger = less accurate */
  accuracyOffset: number;
  /** Distance in pixels at which AI detects incoming bullets */
  bulletDetectionDistance: number;
  /** 0-1 probability of collecting power-ups */
  collectWillingness: number;
  /** Seconds between shots */
  fireRateCooldown: number;
}

export const AI_DIFFICULTY_CONFIGS: Record<string, AIDifficultyConfig> = {
  easy: {
    reactionDelay: 0.4,
    accuracyOffset: Math.PI / 6,
    bulletDetectionDistance: 150,
    collectWillingness: 0.3,
    fireRateCooldown: 0.8,
  },
  medium: {
    reactionDelay: 0.2,
    accuracyOffset: Math.PI / 12,
    bulletDetectionDistance: 250,
    collectWillingness: 0.6,
    fireRateCooldown: 0.4,
  },
  hard: {
    reactionDelay: 0.05,
    accuracyOffset: Math.PI / 36,
    bulletDetectionDistance: 400,
    collectWillingness: 0.9,
    fireRateCooldown: 0.15,
  },
};
