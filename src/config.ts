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
export const TANK_BODY_WIDTH = 24;
export const TANK_BODY_HEIGHT = 30;
export const TANK_BARREL_WIDTH = 8;
export const TANK_BARREL_HEIGHT = 18;
export const TANK_MOVE_SPEED = 150;
export const TANK_BACK_SPEED = 90;
export const TANK_ROTATE_SPEED = 3;
export const TANK_COLOR_P1 = 0x4488ff;
export const TANK_COLOR_P2 = 0xff4444;

// Bullet
export const BULLET_RADIUS = 4;
export const BULLET_SPEED = 300;
export const BULLET_MAX_BOUNCES = 8;
export const BULLET_MAX_LIFETIME = 8;
export const BULLET_SHOOT_COOLDOWN = 0.3;
export const BULLET_SAFE_PERIOD = 0.1;
export const BULLET_WALL_PUSH = 1.5;
export const BULLET_WALL_COOLDOWN = 0.05;
export const BULLET_COLOR = 0xffff00;

// Ammo
export const AMMO_MAX = 10;
export const AMMO_REFILL_INTERVAL = 180; // seconds

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
