import { describe, expect, it } from 'vitest';
import { PowerUpType } from '../../src/enums/PowerUpType';
import { resolveWeaponAction } from '../../src/systems/WeaponInputResolver';

describe('resolveWeaponAction', () => {
  it('returns none without an input edge', () => {
    expect(resolveWeaponAction({ shoot: false, usePowerUp: false, heldPowerUp: null })).toBe('none');
  });

  it('fires a standard bullet without an active weapon', () => {
    expect(resolveWeaponAction({ shoot: true, usePowerUp: false, heldPowerUp: null })).toBe('standard');
  });

  it('uses a held active weapon from primary fire', () => {
    expect(resolveWeaponAction({ shoot: true, usePowerUp: false, heldPowerUp: PowerUpType.Laser })).toBe('active');
  });

  it('uses a held active weapon from the legacy shortcut', () => {
    expect(resolveWeaponAction({ shoot: false, usePowerUp: true, heldPowerUp: PowerUpType.Rocket })).toBe('active');
  });

  it('resolves simultaneous primary and legacy input to one active action', () => {
    expect(resolveWeaponAction({ shoot: true, usePowerUp: true, heldPowerUp: PowerUpType.Mine })).toBe('active');
  });

  it('lets primary fire pass through passive pickups to standard fire', () => {
    expect(resolveWeaponAction({ shoot: true, usePowerUp: false, heldPowerUp: PowerUpType.Shield })).toBe('standard');
  });

  it('does nothing when the legacy shortcut is pressed with no active weapon', () => {
    expect(resolveWeaponAction({ shoot: false, usePowerUp: true, heldPowerUp: PowerUpType.DoubleShot })).toBe('none');
  });

  it('detonates an active Frag Bomb from primary fire without a standard shot', () => {
    expect(resolveWeaponAction({
      shoot: true,
      usePowerUp: false,
      heldPowerUp: null,
      hasActiveFragBomb: true,
    })).toBe('detonate-frag-bomb');
  });

  it('does not detonate an active Frag Bomb from the legacy shortcut alone', () => {
    expect(resolveWeaponAction({
      shoot: false,
      usePowerUp: true,
      heldPowerUp: null,
      hasActiveFragBomb: true,
    })).toBe('none');
  });

  it('prioritizes primary Frag Bomb detonation over a newly held active weapon', () => {
    expect(resolveWeaponAction({
      shoot: true,
      usePowerUp: false,
      heldPowerUp: PowerUpType.Rocket,
      hasActiveFragBomb: true,
    })).toBe('detonate-frag-bomb');
  });
});
