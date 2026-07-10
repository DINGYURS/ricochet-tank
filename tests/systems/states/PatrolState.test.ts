import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatrolState } from '../../../src/systems/states/PatrolState';
import { AIStateType, type AIInput, type AIDifficultyConfig } from '../../../src/enums/AIState';

const mediumConfig: AIDifficultyConfig = {
  reactionDelay: 0.2,
  accuracyOffset: Math.PI / 12,
  bulletDetectionDistance: 250,
  collectWillingness: 0.6,
  fireRateCooldown: 0.4,
};

function makeInput(overrides: Partial<AIInput> = {}): AIInput {
  return {
    selfPosition: { x: 100, y: 100 },
    selfRotation: 0,
    enemyPosition: null,
    enemyRotation: 0,
    bullets: [],
    powerUps: [],
    walls: [],
    ammo: 10,
    heldPowerUp: null,
    ...overrides,
  };
}

describe('PatrolState', () => {
  let state: PatrolState;

  beforeEach(() => {
    state = new PatrolState();
  });

  it('has correct type', () => {
    expect(state.type).toBe(AIStateType.PATROL);
  });

  it('drives forward', () => {
    const output = state.execute(makeInput(), 0.016);
    expect(output.forward).toBe(true);
  });

  it('does not shoot', () => {
    const output = state.execute(makeInput(), 0.016);
    expect(output.shoot).toBe(false);
  });

  it('uses ray-casting to pick open direction when walls present', () => {
    const walls = [
      { x: 130, y: 50, width: 10, height: 100, orientation: 'vertical' },
    ];
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      selfRotation: 0,
      walls,
    });
    const output = state.execute(input, 0.016);
    expect(output.rotateLeft || output.rotateRight).toBe(true);
  });

  it('picks new direction periodically', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const state = new PatrolState();
    const input = makeInput();

    try {
      let changed = false;
      let lastLeft = false;
      let lastRight = false;
      for (let i = 0; i < 300; i++) {
        const output = state.execute(input, 0.016);
        if (i > 0 && (output.rotateLeft !== lastLeft || output.rotateRight !== lastRight)) {
          changed = true;
          break;
        }
        lastLeft = output.rotateLeft;
        lastRight = output.rotateRight;
      }
      expect(changed).toBe(true);
    } finally {
      random.mockRestore();
    }
  });
});
