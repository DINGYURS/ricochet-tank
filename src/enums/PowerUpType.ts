export enum PowerUpType {
  Shield = 'Shield',
  RapidFire = 'RapidFire',
  DoubleShot = 'DoubleShot',
  Laser = 'Laser',
  Rocket = 'Rocket',
  Mine = 'Mine',
  Shotgun = 'Shotgun',
  DeathRay = 'DeathRay',
  RCMissile = 'RCMissile',
  FragBomb = 'FragBomb',
}

export interface PowerUpVisual {
  color: number;
  label: string;
  passive: boolean;
}

export const POWERUP_VISUALS: Record<PowerUpType, PowerUpVisual> = {
  [PowerUpType.Shield]:     { color: 0x4488ff, label: 'Shield',     passive: true },
  [PowerUpType.RapidFire]:  { color: 0xffff00, label: 'Rapid Fire', passive: true },
  [PowerUpType.DoubleShot]: { color: 0x44ff44, label: 'Double Shot', passive: true },
  [PowerUpType.Laser]:      { color: 0xff0000, label: 'Laser',      passive: false },
  [PowerUpType.Rocket]:     { color: 0xff8800, label: 'Rocket',     passive: false },
  [PowerUpType.Mine]:       { color: 0x8844ff, label: 'Mine',       passive: false },
  [PowerUpType.Shotgun]:    { color: 0xff4488, label: 'Shotgun',    passive: false },
  [PowerUpType.DeathRay]:   { color: 0x00eeff, label: 'Death Ray',  passive: false },
  [PowerUpType.RCMissile]:  { color: 0x99ff33, label: 'RC Missile', passive: false },
  [PowerUpType.FragBomb]:   { color: 0xffcc33, label: 'Frag Bomb',  passive: false },
};

export const ALL_POWERUP_TYPES = Object.values(PowerUpType);

export const SPAWNABLE_POWERUP_TYPES: PowerUpType[] = ALL_POWERUP_TYPES.filter(
  type => type !== PowerUpType.FragBomb,
);
