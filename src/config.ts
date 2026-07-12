// Game dimensions
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// Maze
export const MAZE_COLS = 10;
export const MAZE_ROWS = 8;
export const CELL_SIZE = 70;
export const WALL_THICKNESS = 10;
export const WALL_REMOVE_RATIO = 0.2;
export const SPAWN_CLEAR_RADIUS = 2;

// Tank
export const PIXEL_SIZE = 2;
export const TANK_GRID_SIZE = 16;
export const TANK_RADIUS = 16; // was 14, now covers 32x32 pixel tank
export const TANK_MOVE_SPEED = 150;
export const TANK_BACK_SPEED = 90;
export const TANK_ROTATE_SPEED = 4;

// Bullet
export const BULLET_RADIUS = 4;
export const BULLET_SPEED = 300;
export const BULLET_MAX_BOUNCES = 8;
export const BULLET_MAX_LIFETIME = 8;
export const BULLET_SHOOT_COOLDOWN = 0.1;
export const BULLET_SAFE_PERIOD = 0.1;
export const BULLET_WALL_PUSH = 1.5;
export const BULLET_WALL_COOLDOWN = 0.05;
export const BULLET_COLOR = 0xffff00;

// Ammo
export const AMMO_MAX = 10;
export const AMMO_REFILL_INTERVAL = 60; // seconds

// Power-ups
export const POWERUP_SPAWN_INTERVAL_MIN = 8;
export const POWERUP_SPAWN_INTERVAL_MAX = 15;
export const POWERUP_MAX_ON_MAP = 2;
export const POWERUP_DESPAWN_TIME = 20;
export const POWERUP_RADIUS = 12;

export const SHIELD_DURATION = 15;
export const RAPID_FIRE_DURATION = 10;
export const DOUBLE_SHOT_DURATION = 10;
export const DOUBLE_SHOT_SPREAD = 0.14;
export const LASER_LIFETIME = 0.3;
export const DEATH_RAY_CHARGE_DURATION = 1;
export const DEATH_RAY_BEAM_LIFETIME = 0.35;
export const ROCKET_SPEED = 200;
export const ROCKET_TURN_SPEED = 2;
export const RC_MISSILE_SPEED = 240;
export const RC_MISSILE_TURN_SPEED = 3;
export const RC_MISSILE_MAX_LIFETIME = 8;
export const RC_MISSILE_MAX_BOUNCES = 8;
export const RC_MISSILE_OWNER_SAFE_PERIOD = 0.25;
export const FRAG_BOMB_SPEED = 200;
export const FRAG_BOMB_RADIUS = 6;
export const FRAG_BOMB_MAX_LIFETIME = 4;
export const FRAG_BOMB_FRAGMENT_COUNT = 12;
export const FRAG_BOMB_FRAGMENT_SPEED = 320;
export const MINE_TRIGGER_RADIUS = 40;
export const SHOTGUN_COUNT = 5;
export const SHOTGUN_SPREAD = Math.PI / 3;

// Match
export const SCORE_TO_WIN = 3;
export const ROUND_START_DELAY = 1;
export const ROUND_END_DELAY = 1.5;

// Physics
export const MAX_DT = 0.05;

// Colors
export const BG_COLOR = '#1a1a2e';
export const WALL_COLOR = 0x555577;
export const TEXT_COLOR = '#ffffff';

// AI Difficulty
export { AI_DIFFICULTY_PRESETS, AI_DODGE_THRESHOLD } from './systems/AIDifficulty';

// Game Settings
export type AIDifficulty = 'easy' | 'medium' | 'hard';

export type LocalPlayerCount = 2 | 3;

export type GameSettings =
  | { mode: 'local'; localPlayers: LocalPlayerCount }
  | { mode: 'ai'; aiDifficulty: AIDifficulty };

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  mode: 'local',
  localPlayers: 2,
};

// Development diagnostics
export const DEBUG_AI_PATHS = false;
