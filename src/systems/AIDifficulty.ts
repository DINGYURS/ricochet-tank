import { AIDifficultyConfig } from '../enums/AIState';

const DEG_TO_RAD = Math.PI / 180;

export const AI_DIFFICULTY_PRESETS: Record<string, AIDifficultyConfig> = {
  easy: {
    reactionDelay: 800,
    shootingAccuracyOffset: 30 * DEG_TO_RAD,
    bulletDetectionDistance: 100,
    collectWillingness: 0.3,
    fireRateCooldown: 2.0,
    dodgeProbability: 0.4,
    moveSpeedMultiplier: 0.8,
    rotateSpeedMultiplier: 0.8,
  },
  medium: {
    reactionDelay: 400,
    shootingAccuracyOffset: 15 * DEG_TO_RAD,
    bulletDetectionDistance: 180,
    collectWillingness: 0.6,
    fireRateCooldown: 0.8,
    dodgeProbability: 0.7,
    moveSpeedMultiplier: 1.0,
    rotateSpeedMultiplier: 1.0,
  },
  hard: {
    reactionDelay: 100,
    shootingAccuracyOffset: 5 * DEG_TO_RAD,
    bulletDetectionDistance: 280,
    collectWillingness: 0.9,
    fireRateCooldown: 0.15,
    dodgeProbability: 0.95,
    moveSpeedMultiplier: 1.1,
    rotateSpeedMultiplier: 1.1,
  },
};

export const AI_DODGE_THRESHOLD = 0.6;

export function getDifficultyConfig(difficulty: string): AIDifficultyConfig {
  const config = AI_DIFFICULTY_PRESETS[difficulty];
  if (!config) {
    throw new Error(`Unknown difficulty: "${difficulty}". Valid options: ${Object.keys(AI_DIFFICULTY_PRESETS).join(', ')}`);
  }
  return config;
}
