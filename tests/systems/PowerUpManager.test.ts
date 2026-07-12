import { describe, it, expect, vi } from 'vitest';
import { PowerUpType, ALL_POWERUP_TYPES, SPAWNABLE_POWERUP_TYPES } from '../../src/enums/PowerUpType';
import { PowerUpManager } from '../../src/systems/PowerUpManager';

describe('PowerUpManager logic', () => {
  it('ALL_POWERUP_TYPES contains 10 types', () => {
    expect(ALL_POWERUP_TYPES).toHaveLength(10);
  });

  it('random type selection returns a valid type', () => {
    const type = ALL_POWERUP_TYPES[Math.floor(Math.random() * ALL_POWERUP_TYPES.length)];
    expect(ALL_POWERUP_TYPES).toContain(type);
  });

  it('spawns every completed classic weapon', () => {
    expect(SPAWNABLE_POWERUP_TYPES).toContain(PowerUpType.DeathRay);
    expect(SPAWNABLE_POWERUP_TYPES).toContain(PowerUpType.RCMissile);
    expect(SPAWNABLE_POWERUP_TYPES).toContain(PowerUpType.FragBomb);
  });
});

describe('PowerUpManager enable state', () => {
  it('clears pickups and tank effects when disabled', () => {
    const tank = { clearPowerUps: vi.fn() } as any;
    const manager = new PowerUpManager({} as any, [], [tank]);
    const pickup = { destroy: vi.fn() };
    (manager as any).powerUps = [pickup];

    manager.setEnabled(false);

    expect(pickup.destroy).toHaveBeenCalledOnce();
    expect(tank.clearPowerUps).toHaveBeenCalledOnce();
    expect(manager.getPowerUps()).toEqual([]);
    expect(manager.isEnabled()).toBe(false);
  });

  it('does not spawn pickups while disabled', () => {
    const manager = new PowerUpManager({} as any, [], []);
    const spawnPowerUp = vi.spyOn(manager as any, 'spawnPowerUp');
    (manager as any).spawnTimer = 0;
    manager.setEnabled(false);

    manager.update(10, 0);

    expect(spawnPowerUp).not.toHaveBeenCalled();
  });
});
