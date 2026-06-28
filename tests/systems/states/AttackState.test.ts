import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AttackState } from '../../../src/systems/states/AttackState';
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
    enemyPosition: { x: 300, y: 100 },
    enemyRotation: Math.PI,
    bullets: [],
    powerUps: [],
    walls: [],
    ammo: 10,
    heldPowerUp: null,
    ...overrides,
  };
}

describe('AttackState', () => {
  let state: AttackState;

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    state = new AttackState(mediumConfig, 0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct type', () => {
    expect(state.type).toBe(AIStateType.ATTACK);
  });

  it('shoots when aim aligned, line clear, ammo available', () => {
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      selfRotation: 0,
      enemyPosition: { x: 300, y: 100 },
      walls: [],
      ammo: 10,
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.shoot).toBe(true);
  });

  it('does not shoot when line of sight blocked', () => {
    const walls = [
      { x: 180, y: 50, width: 10, height: 100, orientation: 'vertical' },
    ];
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      selfRotation: 0,
      enemyPosition: { x: 300, y: 100 },
      walls,
      ammo: 10,
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.shoot).toBe(false);
  });

  it('does not shoot when ammo is zero', () => {
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      selfRotation: 0,
      enemyPosition: { x: 300, y: 100 },
      walls: [],
      ammo: 0,
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.shoot).toBe(false);
  });

  it('rotates to aim at enemy', () => {
    const input = makeInput({
      selfRotation: 0,
      enemyPosition: { x: 200, y: 300 },
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.rotateRight).toBe(true);
  });

  it('signals exit after firing', () => {
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      selfRotation: 0,
      enemyPosition: { x: 300, y: 100 },
      walls: [],
      ammo: 10,
    });
    state.enter();
    state.execute(input, 0.016);
    expect(state.shouldExit()).toBe(true);
  });

  it('signals exit when enemy lost', () => {
    const input = makeInput({ enemyPosition: null });
    state.enter();
    state.execute(input, 0.016);
    expect(state.shouldExit()).toBe(true);
  });

  it('signals exit when incoming bullet detected', () => {
    const input = makeInput({
      bullets: [
        { x: 200, y: 100, vx: -300, vy: 0, ownerId: 1 },
      ],
    });
    state.enter();
    state.execute(input, 0.016);
    expect(state.shouldExit()).toBe(true);
  });
});
