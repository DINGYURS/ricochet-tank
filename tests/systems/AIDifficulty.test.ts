import { describe, it, expect } from 'vitest';
import { AI_DIFFICULTY_PRESETS, AI_DODGE_THRESHOLD, getDifficultyConfig } from '../../src/systems/AIDifficulty';
import { AI_DIFFICULTY_PRESETS as ConfigPresets, AI_DODGE_THRESHOLD as ConfigThreshold } from '../../src/config';
import { AI_DIFFICULTY_CONFIGS, type AIDifficultyConfig } from '../../src/enums/AIState';

describe('AIDifficulty', () => {
  describe('difficulty presets', () => {
    it('defines all 3 difficulty presets: easy, medium, hard', () => {
      expect(AI_DIFFICULTY_PRESETS).toHaveProperty('easy');
      expect(AI_DIFFICULTY_PRESETS).toHaveProperty('medium');
      expect(AI_DIFFICULTY_PRESETS).toHaveProperty('hard');
      expect(Object.keys(AI_DIFFICULTY_PRESETS)).toHaveLength(3);
    });

    it('each preset is a valid AIDifficultyConfig', () => {
      const requiredKeys: (keyof AIDifficultyConfig)[] = [
        'reactionDelay',
        'accuracyOffset',
        'bulletDetectionDistance',
        'collectWillingness',
        'fireRateCooldown',
      ];

      for (const [name, config] of Object.entries(AI_DIFFICULTY_PRESETS)) {
        for (const key of requiredKeys) {
          expect(config, `${name} should have ${key}`).toHaveProperty(key);
        }
      }
    });

    it('parameters are within valid ranges', () => {
      for (const [name, config] of Object.entries(AI_DIFFICULTY_PRESETS)) {
        // reactionDelay: positive seconds value
        expect(config.reactionDelay, `${name}.reactionDelay`).toBeGreaterThan(0);
        expect(config.reactionDelay, `${name}.reactionDelay`).toBeLessThanOrEqual(2);

        // accuracyOffset: 0 to PI radians (0 to 180 degrees)
        expect(config.accuracyOffset, `${name}.accuracyOffset`).toBeGreaterThanOrEqual(0);
        expect(config.accuracyOffset, `${name}.accuracyOffset`).toBeLessThanOrEqual(Math.PI);

        // bulletDetectionDistance: positive pixels
        expect(config.bulletDetectionDistance, `${name}.bulletDetectionDistance`).toBeGreaterThan(0);

        // collectWillingness: 0 to 1
        expect(config.collectWillingness, `${name}.collectWillingness`).toBeGreaterThanOrEqual(0);
        expect(config.collectWillingness, `${name}.collectWillingness`).toBeLessThanOrEqual(1);

        // fireRateCooldown: positive seconds
        expect(config.fireRateCooldown, `${name}.fireRateCooldown`).toBeGreaterThan(0);

      }
    });

    it('difficulty scales correctly from easy to hard', () => {
      const easy = AI_DIFFICULTY_PRESETS.easy;
      const medium = AI_DIFFICULTY_PRESETS.medium;
      const hard = AI_DIFFICULTY_PRESETS.hard;

      // reactionDelay: easy > medium > hard (faster reactions = harder)
      expect(easy.reactionDelay).toBeGreaterThan(medium.reactionDelay);
      expect(medium.reactionDelay).toBeGreaterThan(hard.reactionDelay);

      // accuracyOffset: easy > medium > hard (less offset = harder)
      expect(easy.accuracyOffset).toBeGreaterThan(medium.accuracyOffset);
      expect(medium.accuracyOffset).toBeGreaterThan(hard.accuracyOffset);

      // bulletDetectionDistance: easy < medium < hard (more detection = harder)
      expect(easy.bulletDetectionDistance).toBeLessThan(medium.bulletDetectionDistance);
      expect(medium.bulletDetectionDistance).toBeLessThan(hard.bulletDetectionDistance);

      // collectWillingness: easy < medium < hard
      expect(easy.collectWillingness).toBeLessThan(medium.collectWillingness);
      expect(medium.collectWillingness).toBeLessThan(hard.collectWillingness);

      // fireRateCooldown: easy > medium > hard (lower cooldown = harder)
      expect(easy.fireRateCooldown).toBeGreaterThan(medium.fireRateCooldown);
      expect(medium.fireRateCooldown).toBeGreaterThan(hard.fireRateCooldown);

    });
  });

  describe('getDifficultyConfig', () => {
    it('returns easy config for "easy"', () => {
      const config = getDifficultyConfig('easy');
      expect(config).toBe(AI_DIFFICULTY_PRESETS.easy);
    });

    it('returns medium config for "medium"', () => {
      const config = getDifficultyConfig('medium');
      expect(config).toBe(AI_DIFFICULTY_PRESETS.medium);
    });

    it('returns hard config for "hard"', () => {
      const config = getDifficultyConfig('hard');
      expect(config).toBe(AI_DIFFICULTY_PRESETS.hard);
    });

    it('throws for unknown difficulty', () => {
      expect(() => getDifficultyConfig('impossible' as never)).toThrow('Unknown difficulty');
      expect(() => getDifficultyConfig('' as never)).toThrow('Unknown difficulty');
    });
  });

  describe('config re-exports', () => {
    it('AI_DIFFICULTY_PRESETS is available from config.ts', () => {
      expect(ConfigPresets).toBe(AI_DIFFICULTY_PRESETS);
      expect(AI_DIFFICULTY_PRESETS).toBe(AI_DIFFICULTY_CONFIGS);
    });

    it('AI_DODGE_THRESHOLD is available from config.ts', () => {
      expect(ConfigThreshold).toBe(AI_DODGE_THRESHOLD);
    });
  });

  describe('AI_DODGE_THRESHOLD', () => {
    it('is a number between 0 and 1', () => {
      expect(typeof AI_DODGE_THRESHOLD).toBe('number');
      expect(AI_DODGE_THRESHOLD).toBeGreaterThanOrEqual(0);
      expect(AI_DODGE_THRESHOLD).toBeLessThanOrEqual(1);
    });
  });
});
