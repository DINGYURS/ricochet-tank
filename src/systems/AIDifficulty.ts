import type { AIDifficulty } from '../config';
import {
  AI_DIFFICULTY_CONFIGS,
  type AIDifficultyConfig,
} from '../enums/AIState';

export const AI_DIFFICULTY_PRESETS = AI_DIFFICULTY_CONFIGS;

export const AI_DODGE_THRESHOLD = 0.6;

export function getDifficultyConfig(difficulty: AIDifficulty): AIDifficultyConfig {
  const config = AI_DIFFICULTY_PRESETS[difficulty];
  if (!config) {
    throw new Error(`Unknown difficulty: "${difficulty}". Valid options: ${Object.keys(AI_DIFFICULTY_PRESETS).join(', ')}`);
  }
  return config;
}
