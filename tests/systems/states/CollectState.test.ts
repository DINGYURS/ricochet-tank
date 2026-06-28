import { describe, it, expect, beforeEach } from 'vitest';
import { CollectState } from '../../../src/systems/states/CollectState';
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

describe('CollectState', () => {
  let state: CollectState;

  beforeEach(() => {
    state = new CollectState();
  });

  it('has correct type', () => {
    expect(state.type).toBe(AIStateType.COLLECT);
  });

  it('moves toward nearest power-up', () => {
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      powerUps: [
        { x: 200, y: 100, type: 'shield' },
      ],
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.forward).toBe(true);
  });

  it('does not shoot', () => {
    const input = makeInput({
      powerUps: [
        { x: 200, y: 100, type: 'shield' },
      ],
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.shoot).toBe(false);
  });

  it('returns idle when no power-ups', () => {
    const input = makeInput({ powerUps: [] });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.forward).toBe(false);
  });

  it('uses wall-aware pathfinding', () => {
    const walls = [
      { x: 150, y: 50, width: 10, height: 100, orientation: 'vertical' },
    ];
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      powerUps: [
        { x: 200, y: 100, type: 'shield' },
      ],
      walls,
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.forward).toBe(true);
  });

  it('signals exit when incoming bullet detected', () => {
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      powerUps: [
        { x: 200, y: 100, type: 'shield' },
      ],
      bullets: [
        { x: 200, y: 100, vx: -300, vy: 0, ownerId: 1 },
      ],
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.forward).toBe(false);
  });
});
