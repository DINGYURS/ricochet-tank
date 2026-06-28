import { describe, it, expect } from 'vitest';
import {
  AIStateType,
  AI_DIFFICULTY_CONFIGS,
  type AIInput,
  type AIOutput,
  type AIState,
  type AIDifficultyConfig,
} from '../../src/enums/AIState';

describe('AIStateType', () => {
  it('has 5 states', () => {
    const states = Object.values(AIStateType);
    expect(states).toHaveLength(5);
  });

  it('has correct enum values', () => {
    expect(AIStateType.PATROL).toBe('PATROL');
    expect(AIStateType.CHASE).toBe('CHASE');
    expect(AIStateType.ATTACK).toBe('ATTACK');
    expect(AIStateType.DODGE).toBe('DODGE');
    expect(AIStateType.COLLECT).toBe('COLLECT');
  });
});

describe('AIInput interface', () => {
  it('can be instantiated with all required fields', () => {
    const input: AIInput = {
      selfPosition: { x: 100, y: 200 },
      selfRotation: Math.PI / 2,
      enemyPosition: { x: 300, y: 400 },
      enemyRotation: 0,
      bullets: [
        { x: 50, y: 50, vx: 10, vy: 0, ownerId: 1 },
      ],
      powerUps: [
        { x: 200, y: 150, type: 'Shield' },
      ],
      walls: [
        { x: 0, y: 0, width: 10, height: 100, orientation: 'vertical' },
        { x: 0, y: 0, width: 100, height: 10, orientation: 'horizontal' },
      ],
      ammo: 5,
      heldPowerUp: 'Rocket',
    };
    expect(input.selfPosition).toEqual({ x: 100, y: 200 });
    expect(input.ammo).toBe(5);
  });

  it('allows null enemyPosition', () => {
    const input: AIInput = {
      selfPosition: { x: 0, y: 0 },
      selfRotation: 0,
      enemyPosition: null,
      enemyRotation: 0,
      bullets: [],
      powerUps: [],
      walls: [],
      ammo: 0,
      heldPowerUp: null,
    };
    expect(input.enemyPosition).toBeNull();
  });
});

describe('AIOutput interface', () => {
  it('can be instantiated with all boolean fields', () => {
    const output: AIOutput = {
      forward: true,
      backward: false,
      rotateLeft: false,
      rotateRight: true,
      shoot: true,
      usePowerUp: false,
    };
    expect(output.forward).toBe(true);
    expect(output.shoot).toBe(true);
    expect(output.usePowerUp).toBe(false);
  });
});

describe('AIState interface', () => {
  it('can be implemented by a class', () => {
    class TestState implements AIState {
      type = AIStateType.PATROL;
      enter() {}
      execute(_input: AIInput, _dt: number): AIOutput {
        return {
          forward: true,
          backward: false,
          rotateLeft: false,
          rotateRight: false,
          shoot: false,
          usePowerUp: false,
        };
      }
      exit() {}
    }
    const state = new TestState();
    expect(state.type).toBe(AIStateType.PATROL);
    expect(state.execute(null!, 0.016).forward).toBe(true);
  });
});

describe('AIDifficultyConfig', () => {
  it('has configs for easy, medium, hard', () => {
    expect(Object.keys(AI_DIFFICULTY_CONFIGS)).toEqual(['easy', 'medium', 'hard']);
  });

  it('has all required parameters', () => {
    const requiredKeys: (keyof AIDifficultyConfig)[] = [
      'reactionDelay',
      'accuracyOffset',
      'bulletDetectionDistance',
      'collectWillingness',
      'fireRateCooldown',
    ];
    for (const difficulty of Object.values(AI_DIFFICULTY_CONFIGS)) {
      for (const key of requiredKeys) {
        expect(difficulty[key]).toBeDefined();
        expect(difficulty[key]).toBeTypeOf('number');
      }
    }
  });

  it('easy has higher reaction delay than hard', () => {
    expect(AI_DIFFICULTY_CONFIGS.easy.reactionDelay).toBeGreaterThan(
      AI_DIFFICULTY_CONFIGS.medium.reactionDelay,
    );
    expect(AI_DIFFICULTY_CONFIGS.medium.reactionDelay).toBeGreaterThan(
      AI_DIFFICULTY_CONFIGS.hard.reactionDelay,
    );
  });

  it('easy has wider accuracy offset than hard', () => {
    expect(AI_DIFFICULTY_CONFIGS.easy.accuracyOffset).toBeGreaterThan(
      AI_DIFFICULTY_CONFIGS.medium.accuracyOffset,
    );
    expect(AI_DIFFICULTY_CONFIGS.medium.accuracyOffset).toBeGreaterThan(
      AI_DIFFICULTY_CONFIGS.hard.accuracyOffset,
    );
  });

  it('easy has shorter bullet detection distance than hard', () => {
    expect(AI_DIFFICULTY_CONFIGS.easy.bulletDetectionDistance).toBeLessThan(
      AI_DIFFICULTY_CONFIGS.medium.bulletDetectionDistance,
    );
    expect(AI_DIFFICULTY_CONFIGS.medium.bulletDetectionDistance).toBeLessThan(
      AI_DIFFICULTY_CONFIGS.hard.bulletDetectionDistance,
    );
  });

  it('easy has lower collect willingness than hard', () => {
    expect(AI_DIFFICULTY_CONFIGS.easy.collectWillingness).toBeLessThan(
      AI_DIFFICULTY_CONFIGS.medium.collectWillingness,
    );
    expect(AI_DIFFICULTY_CONFIGS.medium.collectWillingness).toBeLessThan(
      AI_DIFFICULTY_CONFIGS.hard.collectWillingness,
    );
  });

  it('easy has higher fire rate cooldown than hard', () => {
    expect(AI_DIFFICULTY_CONFIGS.easy.fireRateCooldown).toBeGreaterThan(
      AI_DIFFICULTY_CONFIGS.medium.fireRateCooldown,
    );
    expect(AI_DIFFICULTY_CONFIGS.medium.fireRateCooldown).toBeGreaterThan(
      AI_DIFFICULTY_CONFIGS.hard.fireRateCooldown,
    );
  });

  it('accuracy offsets match spec values', () => {
    expect(AI_DIFFICULTY_CONFIGS.easy.accuracyOffset).toBeCloseTo(Math.PI / 6);
    expect(AI_DIFFICULTY_CONFIGS.medium.accuracyOffset).toBeCloseTo(Math.PI / 12);
    expect(AI_DIFFICULTY_CONFIGS.hard.accuracyOffset).toBeCloseTo(Math.PI / 36);
  });
});
