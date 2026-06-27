import { describe, it, expect } from 'vitest';
import { PowerUpType, POWERUP_VISUALS } from '../../src/enums/PowerUpType';

describe('PowerUpType', () => {
  it('has 7 power-up types', () => {
    const types = Object.values(PowerUpType);
    expect(types).toHaveLength(7);
  });

  it('has visual config for every type', () => {
    for (const type of Object.values(PowerUpType)) {
      expect(POWERUP_VISUALS[type]).toBeDefined();
      expect(POWERUP_VISUALS[type].color).toBeTypeOf('number');
      expect(POWERUP_VISUALS[type].label).toBeTypeOf('string');
      expect(POWERUP_VISUALS[type].passive).toBeTypeOf('boolean');
    }
  });

  it('classifies passive vs active correctly', () => {
    expect(POWERUP_VISUALS[PowerUpType.Shield].passive).toBe(true);
    expect(POWERUP_VISUALS[PowerUpType.RapidFire].passive).toBe(true);
    expect(POWERUP_VISUALS[PowerUpType.DoubleShot].passive).toBe(true);
    expect(POWERUP_VISUALS[PowerUpType.Laser].passive).toBe(false);
    expect(POWERUP_VISUALS[PowerUpType.Rocket].passive).toBe(false);
    expect(POWERUP_VISUALS[PowerUpType.Mine].passive).toBe(false);
    expect(POWERUP_VISUALS[PowerUpType.Shotgun].passive).toBe(false);
  });
});
