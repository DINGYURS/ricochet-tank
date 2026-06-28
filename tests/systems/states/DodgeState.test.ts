import { describe, it, expect, beforeEach } from 'vitest';
import { DodgeState } from '../../../src/systems/states/DodgeState';
import { AIStateType, type AIInput } from '../../../src/enums/AIState';

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

describe('DodgeState', () => {
  let state: DodgeState;

  beforeEach(() => {
    state = new DodgeState(0);
  });

  it('has correct type', () => {
    expect(state.type).toBe(AIStateType.DODGE);
  });

  it('drives forward when dodging', () => {
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      bullets: [
        { x: 200, y: 100, vx: -300, vy: 0, ownerId: 1 },
      ],
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.forward).toBe(true);
  });

  it('does not shoot while dodging', () => {
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      bullets: [
        { x: 200, y: 100, vx: -300, vy: 0, ownerId: 1 },
      ],
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.shoot).toBe(false);
  });

  it('predicts bullet bounce and dodges accordingly', () => {
    const walls = [
      { x: 250, y: 0, width: 10, height: 200, orientation: 'vertical' },
    ];
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      bullets: [
        { x: 200, y: 100, vx: 300, vy: 0, ownerId: 1 },
      ],
      walls,
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.forward).toBe(true);
    expect(output.rotateLeft || output.rotateRight).toBe(true);
  });

  it('uses walls as shelter when both perpendiculars blocked', () => {
    const walls = [
      { x: 50, y: 0, width: 10, height: 200, orientation: 'vertical' },
      { x: 150, y: 0, width: 10, height: 200, orientation: 'vertical' },
    ];
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      bullets: [
        { x: 300, y: 100, vx: -300, vy: 0, ownerId: 1 },
      ],
      walls,
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.forward).toBe(true);
  });

  it('returns idle after threat passes', () => {
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      bullets: [],
    });
    state.enter();
    for (let i = 0; i < 31; i++) {
      state.execute(input, 0.016);
    }
    const output = state.execute(input, 0.016);
    expect(output.forward).toBe(false);
  });
});
