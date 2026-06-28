import { describe, it, expect, beforeEach } from 'vitest';
import { ChaseState } from '../../../src/systems/states/ChaseState';
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
    enemyPosition: { x: 400, y: 100 },
    enemyRotation: Math.PI,
    bullets: [],
    powerUps: [],
    walls: [],
    ammo: 10,
    heldPowerUp: null,
    ...overrides,
  };
}

describe('ChaseState', () => {
  let state: ChaseState;

  beforeEach(() => {
    state = new ChaseState(mediumConfig);
  });

  it('has correct type', () => {
    expect(state.type).toBe(AIStateType.CHASE);
  });

  it('drives forward toward enemy', () => {
    const output = state.execute(makeInput(), 0.016);
    expect(output.forward).toBe(true);
  });

  it('rotates toward enemy', () => {
    const input = makeInput({
      selfRotation: 0,
      enemyPosition: { x: 200, y: 300 },
    });
    const output = state.execute(input, 0.016);
    expect(output.rotateRight).toBe(true);
  });

  it('finds alternative path when wall blocks direct route', () => {
    const walls = [
      { x: 180, y: 50, width: 10, height: 100, orientation: 'vertical' },
    ];
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      enemyPosition: { x: 400, y: 100 },
      walls,
    });
    const output = state.execute(input, 0.016);
    expect(output.forward).toBe(true);
  });

  it('does not fire when line of sight is blocked', () => {
    const walls = [
      { x: 180, y: 50, width: 10, height: 100, orientation: 'vertical' },
    ];
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      selfRotation: 0,
      enemyPosition: { x: 400, y: 100 },
      walls,
      ammo: 10,
    });
    const output = state.execute(input, 0.016);
    expect(output.shoot).toBe(false);
  });

  it('fires opportunistically when aim aligned and line clear', () => {
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      selfRotation: 0,
      enemyPosition: { x: 400, y: 100 },
      walls: [],
      ammo: 10,
    });
    const output = state.execute(input, 0.016);
    expect(output.shoot).toBe(true);
  });

  it('returns idle when no enemy', () => {
    const input = makeInput({ enemyPosition: null });
    const output = state.execute(input, 0.016);
    expect(output.forward).toBe(false);
    expect(output.shoot).toBe(false);
  });
});
