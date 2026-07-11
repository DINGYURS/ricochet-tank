import { POWERUP_VISUALS, type PowerUpType } from '../enums/PowerUpType';

export type WeaponAction = 'none' | 'standard' | 'active';

export interface WeaponInputState {
  shoot: boolean;
  usePowerUp: boolean;
  heldPowerUp: PowerUpType | null;
}

export function resolveWeaponAction(state: WeaponInputState): WeaponAction {
  const hasActiveWeapon = state.heldPowerUp !== null && !POWERUP_VISUALS[state.heldPowerUp].passive;
  if (hasActiveWeapon && (state.shoot || state.usePowerUp)) return 'active';
  if (state.shoot) return 'standard';
  return 'none';
}
