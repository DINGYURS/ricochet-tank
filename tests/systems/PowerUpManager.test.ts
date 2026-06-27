import { describe, it, expect } from 'vitest';
import { PowerUpType, ALL_POWERUP_TYPES } from '../../src/enums/PowerUpType';

describe('PowerUpManager logic', () => {
  it('ALL_POWERUP_TYPES contains 7 types', () => {
    expect(ALL_POWERUP_TYPES).toHaveLength(7);
  });

  it('random type selection returns a valid type', () => {
    const type = ALL_POWERUP_TYPES[Math.floor(Math.random() * ALL_POWERUP_TYPES.length)];
    expect(ALL_POWERUP_TYPES).toContain(type);
  });
});
