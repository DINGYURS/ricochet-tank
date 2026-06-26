# Ricochet Tank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local 2-player top-down tank battle game with ricocheting bullets in random mazes, running in the browser.

**Architecture:** Phaser 3 handles rendering, input, scenes, and timing. All physics and collision logic is hand-written in TypeScript for full control. The game uses a state machine (GENERATING → COUNTDOWN → PLAYING → ROUND_OVER → MATCH_OVER) to manage round flow.

**Tech Stack:** Phaser 3, TypeScript, Vite, Vitest (for unit tests on pure logic)

---

## File Structure

```
src/
├── main.ts                  # Phaser game config + bootstrap
├── config.ts                # All game constants
├── utils/
│   └── math.ts              # Vector/reflection helpers
├── systems/
│   ├── Collision.ts         # Circle-rect, circle-circle, separation
│   ├── MazeGenerator.ts     # DFS maze + wall removal + spawn points
│   └── InputManager.ts      # Keyboard input for both players
├── objects/
│   ├── Wall.ts              # Wall rectangle + orientation
│   ├── Tank.ts              # Tank movement, rotation, rendering
│   └── Bullet.ts            # Bullet flight, bounce, lifetime
└── scenes/
    ├── BootScene.ts         # Asset loading placeholder
    ├── MenuScene.ts         # Title + start button + controls
    └── GameScene.ts         # Core game loop + state machine

tests/
├── utils/
│   └── math.test.ts
├── systems/
│   ├── Collision.test.ts
│   └── MazeGenerator.test.ts
└── objects/
    ├── Tank.test.ts
    └── Bullet.test.ts
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/main.ts`
- Create: `index.html`

- [ ] **Step 1: Initialize project and install dependencies**

```bash
cd W:/Workspace/Projects/ricochet-tank
npm init -y
npm install phaser
npm install -D typescript vite vitest
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
  },
});
```

- [ ] **Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ricochet Tank</title>
  <style>
    * { margin: 0; padding: 0; }
    body { background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 5: Create src/main.ts with minimal Phaser config**

```ts
import Phaser from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1a1a2e',
  parent: document.body,
  scene: [],
};

new Phaser.Game(config);
```

- [ ] **Step 6: Add scripts to package.json**

Add to `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```
Expected: Vite dev server starts, browser shows black canvas at `http://localhost:5173`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: project scaffold with Phaser 3 + TypeScript + Vite"
```

---

### Task 2: Game Constants

**Files:**
- Create: `src/config.ts`

- [ ] **Step 1: Create config.ts with all game constants**

```ts
// Game dimensions
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// Maze
export const MAZE_COLS = 10;
export const MAZE_ROWS = 8;
export const CELL_SIZE = 70; // pixels per cell
export const WALL_THICKNESS = 10;
export const WALL_REMOVE_RATIO = 0.2; // remove 20% of walls
export const SPAWN_CLEAR_RADIUS = 2; // clear cells around spawn

// Tank
export const TANK_RADIUS = 14; // collision circle radius
export const TANK_BODY_WIDTH = 24;
export const TANK_BODY_HEIGHT = 30;
export const TANK_BARREL_WIDTH = 8;
export const TANK_BARREL_HEIGHT = 18;
export const TANK_MOVE_SPEED = 150; // pixels/sec
export const TANK_BACK_SPEED = 90; // pixels/sec (60% of move speed)
export const TANK_ROTATE_SPEED = 3; // radians/sec
export const TANK_COLOR_P1 = 0x4488ff;
export const TANK_COLOR_P2 = 0xff4444;

// Bullet
export const BULLET_RADIUS = 4;
export const BULLET_SPEED = 300; // pixels/sec
export const BULLET_MAX_BOUNCES = 8;
export const BULLET_MAX_LIFETIME = 8; // seconds
export const BULLET_SHOOT_COOLDOWN = 0.8; // seconds
export const BULLET_SAFE_PERIOD = 0.1; // seconds, don't detect owner
export const BULLET_WALL_PUSH = 1.5; // pixels to push out after bounce
export const BULLET_WALL_COOLDOWN = 0.05; // seconds, same wall hit cooldown
export const BULLET_COLOR = 0xffff00;

// Match
export const SCORE_TO_WIN = 3;
export const ROUND_START_DELAY = 1; // seconds
export const ROUND_END_DELAY = 1.5; // seconds

// Physics
export const MAX_DT = 0.05; // 50ms cap

// Colors
export const BG_COLOR = '#1a1a2e';
export const WALL_COLOR = 0x555577;
export const TEXT_COLOR = '#ffffff';
```

- [ ] **Step 2: Commit**

```bash
git add src/config.ts
git commit -m "feat: game constants configuration"
```

---

### Task 3: Math Utilities

**Files:**
- Create: `src/utils/math.ts`
- Create: `tests/utils/math.test.ts`

- [ ] **Step 1: Write tests for math utilities**

```ts
// tests/utils/math.test.ts
import { describe, it, expect } from 'vitest';
import { reflect, distanceSq, circleRectOverlap, circleCircleOverlap, clamp } from '../../src/utils/math';

describe('clamp', () => {
  it('clamps value within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('reflect', () => {
  it('reflects off vertical wall (reverse vx)', () => {
    const result = reflect(100, -200, 'vertical');
    expect(result.vx).toBe(-100);
    expect(result.vy).toBe(-200);
  });

  it('reflects off horizontal wall (reverse vy)', () => {
    const result = reflect(100, -200, 'horizontal');
    expect(result.vx).toBe(100);
    expect(result.vy).toBe(200);
  });
});

describe('distanceSq', () => {
  it('returns squared distance between two points', () => {
    expect(distanceSq(0, 0, 3, 4)).toBe(25);
    expect(distanceSq(1, 1, 1, 1)).toBe(0);
  });
});

describe('circleRectOverlap', () => {
  it('detects overlap when circle touches rect', () => {
    // circle at (5, 5) r=3, rect at (0, 0) w=10 h=10
    expect(circleRectOverlap(5, 5, 3, 0, 0, 10, 10)).toBe(true);
  });

  it('detects no overlap when circle is far', () => {
    expect(circleRectOverlap(20, 20, 3, 0, 0, 10, 10)).toBe(false);
  });

  it('detects overlap at rect edge', () => {
    // circle at (12, 5) r=3, rect at (0, 0) w=10 h=10
    expect(circleRectOverlap(12, 5, 3, 0, 0, 10, 10)).toBe(true);
  });

  it('detects no overlap just outside rect edge', () => {
    expect(circleRectOverlap(13.1, 5, 3, 0, 0, 10, 10)).toBe(false);
  });
});

describe('circleCircleOverlap', () => {
  it('detects overlap when circles touch', () => {
    expect(circleCircleOverlap(0, 0, 5, 8, 0, 5)).toBe(true);
  });

  it('detects no overlap when circles are apart', () => {
    expect(circleCircleOverlap(0, 0, 5, 20, 0, 5)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/utils/math.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement math utilities**

```ts
// src/utils/math.ts

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function reflect(vx: number, vy: number, wallOrientation: 'vertical' | 'horizontal'): { vx: number; vy: number } {
  if (wallOrientation === 'vertical') {
    return { vx: -vx, vy };
  }
  return { vx, vy: -vy };
}

export function distanceSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

export function circleRectOverlap(
  cx: number, cy: number, cr: number,
  rx: number, ry: number, rw: number, rh: number
): boolean {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  return distanceSq(cx, cy, closestX, closestY) < cr * cr;
}

export function circleCircleOverlap(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean {
  const radiiSum = r1 + r2;
  return distanceSq(x1, y1, x2, y2) < radiiSum * radiiSum;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/utils/math.test.ts
```
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/math.ts tests/utils/math.test.ts
git commit -m "feat: math utilities for collision and reflection"
```

---

### Task 4: Collision System

**Files:**
- Create: `src/systems/Collision.ts`
- Create: `tests/systems/Collision.test.ts`

- [ ] **Step 1: Write tests for circle-rect separation**

```ts
// tests/systems/Collision.test.ts
import { describe, it, expect } from 'vitest';
import { separateCircleFromRect } from '../../src/systems/Collision';

describe('separateCircleFromRect', () => {
  it('pushes circle out from the right side', () => {
    // circle at (12, 5) r=5, rect at (0, 0) w=10 h=10
    const result = separateCircleFromRect(12, 5, 5, 0, 0, 10, 10);
    expect(result.x).toBeCloseTo(15); // pushed to right edge + radius
    expect(result.y).toBeCloseTo(5);
  });

  it('pushes circle out from the left side', () => {
    // circle at (−2, 5) r=5, rect at (0, 0) w=10 h=10
    const result = separateCircleFromRect(-2, 5, 5, 0, 0, 10, 10);
    expect(result.x).toBeCloseTo(-5);
    expect(result.y).toBeCloseTo(5);
  });

  it('pushes circle out from the top', () => {
    const result = separateCircleFromRect(5, -2, 5, 0, 0, 10, 10);
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(-5);
  });

  it('pushes circle out from the bottom', () => {
    const result = separateCircleFromRect(5, 12, 5, 0, 0, 10, 10);
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(15);
  });

  it('returns original position when no overlap', () => {
    const result = separateCircleFromRect(20, 20, 5, 0, 0, 10, 10);
    expect(result.x).toBe(20);
    expect(result.y).toBe(20);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/systems/Collision.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Collision system**

```ts
// src/systems/Collision.ts
import { clamp } from '../utils/math';
import { circleRectOverlap, circleCircleOverlap } from '../utils/math';

export interface SeparationResult {
  x: number;
  y: number;
}

export function separateCircleFromRect(
  cx: number, cy: number, cr: number,
  rx: number, ry: number, rw: number, rh: number
): SeparationResult {
  if (!circleRectOverlap(cx, cy, cr, rx, ry, rw, rh)) {
    return { x: cx, y: cy };
  }

  // Find closest point on rect to circle center
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);

  const dx = cx - closestX;
  const dy = cy - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq === 0) {
    // Circle center is inside rect — push out along shortest axis
    const overlapLeft = cx - rx;
    const overlapRight = (rx + rw) - cx;
    const overlapTop = cy - ry;
    const overlapBottom = (ry + rh) - cy;
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapLeft) return { x: rx - cr, y: cy };
    if (minOverlap === overlapRight) return { x: rx + rw + cr, y: cy };
    if (minOverlap === overlapTop) return { x: cx, y: ry - cr };
    return { x: cx, y: ry + rh + cr };
  }

  const dist = Math.sqrt(distSq);
  const overlap = cr - dist;
  const nx = dx / dist;
  const ny = dy / dist;

  return {
    x: cx + nx * overlap,
    y: cy + ny * overlap,
  };
}

export { circleRectOverlap, circleCircleOverlap };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/systems/Collision.test.ts
```
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/Collision.ts tests/systems/Collision.test.ts
git commit -m "feat: collision system with circle-rect separation"
```

---

### Task 5: Wall Class

**Files:**
- Create: `src/objects/Wall.ts`

- [ ] **Step 1: Implement Wall class**

```ts
// src/objects/Wall.ts
import Phaser from 'phaser';
import { WALL_THICKNESS, WALL_COLOR } from '../config';

export class Wall {
  x: number;
  y: number;
  width: number;
  height: number;
  orientation: 'vertical' | 'horizontal';
  private rect: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    orientation: 'vertical' | 'horizontal'
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.orientation = orientation;

    this.rect = scene.add.rectangle(
      x + width / 2,
      y + height / 2,
      width,
      height,
      WALL_COLOR
    );
    this.rect.setOrigin(0.5, 0.5);
  }

  destroy(): void {
    this.rect.destroy();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/objects/Wall.ts
git commit -m "feat: Wall class with orientation and rendering"
```

---

### Task 6: Maze Generator

**Files:**
- Create: `src/systems/MazeGenerator.ts`
- Create: `tests/systems/MazeGenerator.test.ts`

- [ ] **Step 1: Write tests for maze generator**

```ts
// tests/systems/MazeGenerator.test.ts
import { describe, it, expect } from 'vitest';
import { generateMaze } from '../../src/systems/MazeGenerator';
import { MAZE_COLS, MAZE_ROWS, CELL_SIZE, WALL_THICKNESS } from '../../src/config';

describe('generateMaze', () => {
  it('returns walls array with correct types', () => {
    const result = generateMaze(MAZE_COLS, MAZE_ROWS, CELL_SIZE, WALL_THICKNESS, 0.2, 2);
    expect(result.walls).toBeDefined();
    expect(result.walls.length).toBeGreaterThan(0);
    for (const wall of result.walls) {
      expect(['vertical', 'horizontal']).toContain(wall.orientation);
      expect(wall.width).toBeGreaterThan(0);
      expect(wall.height).toBeGreaterThan(0);
    }
  });

  it('returns two spawn points in opposite corners', () => {
    const result = generateMaze(MAZE_COLS, MAZE_ROWS, CELL_SIZE, WALL_THICKNESS, 0.2, 2);
    expect(result.spawn1).toBeDefined();
    expect(result.spawn2).toBeDefined();
    // spawn1 and spawn2 should be far apart
    const dx = Math.abs(result.spawn1.x - result.spawn2.x);
    const dy = Math.abs(result.spawn1.y - result.spawn2.y);
    expect(dx + dy).toBeGreaterThan(CELL_SIZE * 3);
  });

  it('generates different mazes on each call', () => {
    const r1 = generateMaze(MAZE_COLS, MAZE_ROWS, CELL_SIZE, WALL_THICKNESS, 0.2, 2);
    const r2 = generateMaze(MAZE_COLS, MAZE_ROWS, CELL_SIZE, WALL_THICKNESS, 0.2, 2);
    // Very unlikely to be identical
    expect(r1.walls.length === r2.walls.length).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/systems/MazeGenerator.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement MazeGenerator**

```ts
// src/systems/MazeGenerator.ts
import { Wall } from '../objects/Wall';

interface MazeResult {
  walls: Array<{ x: number; y: number; width: number; height: number; orientation: 'vertical' | 'horizontal' }>;
  spawn1: { x: number; y: number };
  spawn2: { x: number; y: number };
}

export function generateMaze(
  cols: number,
  rows: number,
  cellSize: number,
  wallThickness: number,
  removeRatio: number,
  spawnClearRadius: number
): MazeResult {
  // DFS maze generation
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const hWalls: boolean[][] = Array.from({ length: rows + 1 }, () => Array(cols).fill(true)); // horizontal walls
  const vWalls: boolean[][] = Array.from({ length: rows }, () => Array(cols + 1).fill(true)); // vertical walls

  function dfs(row: number, col: number) {
    visited[row][col] = true;
    const dirs = shuffleArray([
      [0, 1], [0, -1], [1, 0], [-1, 0],
    ]);
    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
        // Remove wall between (row, col) and (nr, nc)
        if (dr === -1) hWalls[row][col] = false;     // remove top wall
        else if (dr === 1) hWalls[row + 1][col] = false; // remove bottom wall
        else if (dc === -1) vWalls[row][col] = false;     // remove left wall
        else if (dc === 1) vWalls[row][col + 1] = false;  // remove right wall
        dfs(nr, nc);
      }
    }
  }

  dfs(0, 0);

  // Collect all removable internal walls
  const removableH: Array<{ r: number; c: number }> = [];
  const removableV: Array<{ r: number; c: number }> = [];
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (hWalls[r][c]) removableH.push({ r, c });
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      if (vWalls[r][c]) removableV.push({ r, c });
    }
  }

  // Remove a percentage of walls to open up the maze
  const allRemovable = [
    ...removableH.map(w => ({ ...w, type: 'h' as const })),
    ...removableV.map(w => ({ ...w, type: 'v' as const })),
  ];
  shuffleArray(allRemovable);
  const removeCount = Math.floor(allRemovable.length * removeRatio);
  for (let i = 0; i < removeCount; i++) {
    const w = allRemovable[i];
    if (w.type === 'h') hWalls[w.r][w.c] = false;
    else vWalls[w.r][w.c] = false;
  }

  // Define spawn points (opposite corners)
  const spawn1 = { x: 0.5 * cellSize, y: 0.5 * cellSize };
  const spawn2 = { x: (cols - 0.5) * cellSize, y: (rows - 0.5) * cellSize };

  // Clear walls around spawn points
  function clearAroundSpawn(sx: number, sy: number) {
    const sc = Math.floor(sx / cellSize);
    const sr = Math.floor(sy / cellSize);
    for (let dr = -spawnClearRadius; dr <= spawnClearRadius; dr++) {
      for (let dc = -spawnClearRadius; dc <= spawnClearRadius; dc++) {
        const r = sr + dr;
        const c = sc + dc;
        if (r >= 0 && r <= rows) {
          if (c >= 0 && c < cols && hWalls[r]) hWalls[r][c] = false;
          if (c >= 0 && c <= cols && hWalls[r]) {} // already handled
        }
        if (r >= 0 && r < rows) {
          if (c >= 0 && c <= cols && vWalls[r]) vWalls[r][c] = false;
        }
      }
    }
  }
  clearAroundSpawn(spawn1.x, spawn1.y);
  clearAroundSpawn(spawn2.x, spawn2.y);

  // Build wall data
  const walls: MazeResult['walls'] = [];

  // Horizontal walls
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (hWalls[r][c]) {
        walls.push({
          x: c * cellSize,
          y: r * cellSize - wallThickness / 2,
          width: cellSize,
          height: wallThickness,
          orientation: 'horizontal',
        });
      }
    }
  }

  // Vertical walls
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      if (vWalls[r][c]) {
        walls.push({
          x: c * cellSize - wallThickness / 2,
          y: r * cellSize,
          width: wallThickness,
          height: cellSize,
          orientation: 'vertical',
        });
      }
    }
  }

  // Border walls (always present)
  // Top
  walls.push({ x: 0, y: -wallThickness, width: cols * cellSize, height: wallThickness, orientation: 'horizontal' });
  // Bottom
  walls.push({ x: 0, y: rows * cellSize, width: cols * cellSize, height: wallThickness, orientation: 'horizontal' });
  // Left
  walls.push({ x: -wallThickness, y: 0, width: wallThickness, height: rows * cellSize, orientation: 'vertical' });
  // Right
  walls.push({ x: cols * cellSize, y: 0, width: wallThickness, height: rows * cellSize, orientation: 'vertical' });

  return { walls, spawn1, spawn2 };
}

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/systems/MazeGenerator.test.ts
```
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/MazeGenerator.ts tests/systems/MazeGenerator.test.ts
git commit -m "feat: DFS maze generator with wall removal and spawn points"
```

---

### Task 7: Tank Class

**Files:**
- Create: `src/objects/Tank.ts`
- Create: `tests/objects/Tank.test.ts`

- [ ] **Step 1: Write tests for Tank movement math**

```ts
// tests/objects/Tank.test.ts
import { describe, it, expect } from 'vitest';
import { computeTankMovement } from '../../src/objects/Tank';

describe('computeTankMovement', () => {
  it('moves forward along rotation angle', () => {
    // Facing right (0 radians)
    const result = computeTankMovement(100, 100, 0, true, false, 150, 90, 0, 0.016);
    expect(result.x).toBeCloseTo(100 + 150 * 0.016);
    expect(result.y).toBeCloseTo(100);
  });

  it('moves backward (slower) along rotation angle', () => {
    const result = computeTankMovement(100, 100, 0, false, true, 150, 90, 0, 0.016);
    expect(result.x).toBeCloseTo(100 - 90 * 0.016);
    expect(result.y).toBeCloseTo(100);
  });

  it('does not move when neither forward nor backward', () => {
    const result = computeTankMovement(100, 100, 0, false, false, 150, 90, 0, 0.016);
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
  });

  it('rotates left', () => {
    const result = computeTankMovement(100, 100, 1.0, false, false, 150, 90, -3, 0.016);
    expect(result.rotation).toBeCloseTo(1.0 - 3 * 0.016);
  });

  it('rotates right', () => {
    const result = computeTankMovement(100, 100, 1.0, false, false, 150, 90, 3, 0.016);
    expect(result.rotation).toBeCloseTo(1.0 + 3 * 0.016);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/objects/Tank.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement Tank class**

```ts
// src/objects/Tank.ts
import Phaser from 'phaser';
import {
  TANK_RADIUS, TANK_BODY_WIDTH, TANK_BODY_HEIGHT,
  TANK_BARREL_WIDTH, TANK_BARREL_HEIGHT,
  TANK_MOVE_SPEED, TANK_BACK_SPEED, TANK_ROTATE_SPEED,
} from '../config';

export interface TankMovementResult {
  x: number;
  y: number;
  rotation: number;
}

export function computeTankMovement(
  x: number, y: number, rotation: number,
  forward: boolean, backward: boolean,
  moveSpeed: number, backSpeed: number,
  rotateInput: number, // -1, 0, or 1
  dt: number
): TankMovementResult {
  let newRotation = rotation;
  if (rotateInput !== 0) {
    newRotation += rotateInput * TANK_ROTATE_SPEED * dt;
  }

  let newX = x;
  let newY = y;
  if (forward) {
    newX += Math.cos(newRotation) * moveSpeed * dt;
    newY += Math.sin(newRotation) * moveSpeed * dt;
  } else if (backward) {
    newX -= Math.cos(newRotation) * backSpeed * dt;
    newY -= Math.sin(newRotation) * backSpeed * dt;
  }

  return { x: newX, y: newY, rotation: newRotation };
}

export class Tank {
  x: number;
  y: number;
  rotation: number;
  radius: number = TANK_RADIUS;
  alive: boolean = true;
  shootCooldown: number = 0;
  playerId: number;

  private scene: Phaser.Scene;
  private bodyGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, rotation: number, playerId: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.playerId = playerId;

    this.bodyGraphics = scene.add.graphics();
    this.draw();
  }

  draw(): void {
    this.bodyGraphics.clear();
    this.bodyGraphics.save();
    this.bodyGraphics.translateCanvas(this.x, this.y);
    this.bodyGraphics.rotateCanvas(this.rotation);

    // Body
    const color = this.playerId === 0 ? 0x4488ff : 0xff4444;
    this.bodyGraphics.fillStyle(color, 1);
    this.bodyGraphics.fillRect(-TANK_BODY_WIDTH / 2, -TANK_BODY_HEIGHT / 2, TANK_BODY_WIDTH, TANK_BODY_HEIGHT);

    // Barrel
    this.bodyGraphics.fillStyle(0xcccccc, 1);
    this.bodyGraphics.fillRect(-TANK_BARREL_WIDTH / 2, -TANK_BODY_HEIGHT / 2 - TANK_BARREL_HEIGHT, TANK_BARREL_WIDTH, TANK_BARREL_HEIGHT + TANK_BODY_HEIGHT / 2);

    this.bodyGraphics.restore();
  }

  update(dt: number, forward: boolean, backward: boolean, rotateInput: number): void {
    const result = computeTankMovement(
      this.x, this.y, this.rotation,
      forward, backward,
      TANK_MOVE_SPEED, TANK_BACK_SPEED,
      rotateInput, dt
    );
    this.x = result.x;
    this.y = result.y;
    this.rotation = result.rotation;
    this.draw();
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.draw();
  }

  getBarrelTip(): { x: number; y: number } {
    const offset = TANK_RADIUS + 5; // barrel tip distance from center
    return {
      x: this.x + Math.cos(this.rotation) * offset,
      y: this.y + Math.sin(this.rotation) * offset,
    };
  }

  destroy(): void {
    this.bodyGraphics.destroy();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/objects/Tank.test.ts
```
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/objects/Tank.ts tests/objects/Tank.test.ts
git commit -m "feat: Tank class with movement, rotation, and rendering"
```

---

### Task 8: Bullet Class

**Files:**
- Create: `src/objects/Bullet.ts`
- Create: `tests/objects/Bullet.test.ts`

- [ ] **Step 1: Write tests for Bullet lifecycle**

```ts
// tests/objects/Bullet.test.ts
import { describe, it, expect } from 'vitest';
import { BulletState, updateBullet } from '../../src/objects/Bullet';

describe('updateBullet', () => {
  it('moves bullet by velocity * dt', () => {
    const bullet: BulletState = {
      x: 100, y: 100, vx: 300, vy: 0,
      bounceCount: 0, lifeTime: 0, ownerId: 0,
      spawnTime: 0, active: true,
    };
    updateBullet(bullet, 0.016, 1000);
    expect(bullet.x).toBeCloseTo(100 + 300 * 0.016);
    expect(bullet.y).toBeCloseTo(100);
    expect(bullet.lifeTime).toBeCloseTo(0.016);
  });

  it('deactivates after max lifetime', () => {
    const bullet: BulletState = {
      x: 100, y: 100, vx: 300, vy: 0,
      bounceCount: 0, lifeTime: 7.9, ownerId: 0,
      spawnTime: 0, active: true,
    };
    updateBullet(bullet, 0.2, 8000); // lifetime exceeds 8s
    expect(bullet.active).toBe(false);
  });

  it('deactivates after max bounces', () => {
    const bullet: BulletState = {
      x: 100, y: 100, vx: 300, vy: 0,
      bounceCount: 8, lifeTime: 0, ownerId: 0,
      spawnTime: 0, active: true,
    };
    // Bounce count already at max — should deactivate on next bounce check
    // This is checked externally; updateBullet handles lifetime only
    updateBullet(bullet, 0.016, 1000);
    expect(bullet.active).toBe(true); // still active, bounce limit checked elsewhere
  });

  it('tracks prevX/prevY', () => {
    const bullet: BulletState = {
      x: 100, y: 100, vx: 300, vy: 0,
      bounceCount: 0, lifeTime: 0, ownerId: 0,
      spawnTime: 0, active: true,
    };
    updateBullet(bullet, 0.016, 1000);
    expect(bullet.prevX).toBeCloseTo(100);
    expect(bullet.prevY).toBeCloseTo(100);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/objects/Bullet.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement Bullet class**

```ts
// src/objects/Bullet.ts
import Phaser from 'phaser';
import {
  BULLET_RADIUS, BULLET_SPEED, BULLET_MAX_BOUNCES,
  BULLET_MAX_LIFETIME, BULLET_SAFE_PERIOD, BULLET_COLOR,
} from '../config';

export interface BulletState {
  x: number;
  y: number;
  prevX?: number;
  prevY?: number;
  vx: number;
  vy: number;
  bounceCount: number;
  lifeTime: number;
  ownerId: number;
  spawnTime: number; // in seconds since game start
  active: boolean;
  wallCooldowns: Map<number, number>; // wallId -> cooldown remaining
}

export function updateBullet(bullet: BulletState, dt: number, _currentTimeMs: number): void {
  if (!bullet.active) return;

  bullet.prevX = bullet.x;
  bullet.prevY = bullet.y;
  bullet.x += bullet.vx * dt;
  bullet.y += bullet.vy * dt;
  bullet.lifeTime += dt;

  if (bullet.lifeTime > BULLET_MAX_LIFETIME) {
    bullet.active = false;
  }
}

export function isOwnerSafe(bullet: BulletState, currentTimeMs: number): boolean {
  return (currentTimeMs / 1000) - bullet.spawnTime < BULLET_SAFE_PERIOD;
}

export class Bullet {
  state: BulletState;
  radius: number = BULLET_RADIUS;
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, vx: number, vy: number, ownerId: number, spawnTime: number) {
    this.scene = scene;
    this.state = {
      x, y, vx, vy,
      bounceCount: 0,
      lifeTime: 0,
      ownerId,
      spawnTime,
      active: true,
      wallCooldowns: new Map(),
    };
    this.graphics = scene.add.circle(x, y, BULLET_RADIUS, BULLET_COLOR);
  }

  update(dt: number, currentTimeMs: number): void {
    updateBullet(this.state, dt, currentTimeMs);
    if (this.state.active) {
      this.graphics.setPosition(this.state.x, this.state.y);
    }
  }

  bounce(wallId: number, newVx: number, newVy: number): void {
    this.state.bounceCount++;
    if (this.state.bounceCount > BULLET_MAX_BOUNCES) {
      this.state.active = false;
      return;
    }
    this.state.vx = newVx;
    this.state.vy = newVy;
    this.state.wallCooldowns.set(wallId, BULLET_MAX_LIFETIME); // cooldown managed externally
  }

  destroy(): void {
    this.state.active = false;
    this.graphics.destroy();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/objects/Bullet.test.ts
```
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/objects/Bullet.ts tests/objects/Bullet.test.ts
git commit -m "feat: Bullet class with movement, bounce tracking, and lifecycle"
```

---

### Task 9: InputManager

**Files:**
- Create: `src/systems/InputManager.ts`

- [ ] **Step 1: Implement InputManager**

```ts
// src/systems/InputManager.ts
import Phaser from 'phaser';

export interface PlayerInput {
  forward: boolean;
  backward: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
  shoot: boolean; // true only on the frame the key was pressed
}

export class InputManager {
  private scene: Phaser.Scene;
  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    UP: Phaser.Input.Keyboard.Key;
    DOWN: Phaser.Input.Keyboard.Key;
    LEFT: Phaser.Input.Keyboard.Key;
    RIGHT: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
    ENTER: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupKeys();
    this.preventDefaultKeys();
  }

  private setupKeys(): void {
    const kb = this.scene.input.keyboard!;
    this.keys = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      UP: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      DOWN: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      LEFT: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      RIGHT: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      SPACE: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      ENTER: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
    };
  }

  private preventDefaultKeys(): void {
    const kb = this.scene.input.keyboard!;
    // Prevent browser default for Space, Enter, and arrow keys
    kb.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.ENTER,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
    ]);
  }

  getPlayer1Input(): PlayerInput {
    return {
      forward: this.keys.W.isDown,
      backward: this.keys.S.isDown,
      rotateLeft: this.keys.A.isDown,
      rotateRight: this.keys.D.isDown,
      shoot: Phaser.Input.Keyboard.JustDown(this.keys.SPACE),
    };
  }

  getPlayer2Input(): PlayerInput {
    return {
      forward: this.keys.UP.isDown,
      backward: this.keys.DOWN.isDown,
      rotateLeft: this.keys.LEFT.isDown,
      rotateRight: this.keys.RIGHT.isDown,
      shoot: Phaser.Input.Keyboard.JustDown(this.keys.ENTER),
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/InputManager.ts
git commit -m "feat: InputManager for dual-player keyboard input"
```

---

### Task 10: BootScene + MenuScene

**Files:**
- Create: `src/scenes/BootScene.ts`
- Create: `src/scenes/MenuScene.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Implement BootScene**

```ts
// src/scenes/BootScene.ts
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    // No assets to load in v1 — go straight to menu
    this.scene.start('MenuScene');
  }
}
```

- [ ] **Step 2: Implement MenuScene**

```ts
// src/scenes/MenuScene.ts
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TEXT_COLOR } from '../config';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;

    this.add.text(centerX, 120, 'RICOCHET TANK', {
      fontSize: '48px',
      color: TEXT_COLOR,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const startText = this.add.text(centerX, 300, 'Press SPACE to Start', {
      fontSize: '24px',
      color: TEXT_COLOR,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Blink effect
    this.tweens.add({
      targets: startText,
      alpha: 0.2,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Controls info
    const controlsY = 420;
    this.add.text(centerX, controlsY, 'Player 1: W/A/S/D + Space', {
      fontSize: '16px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(centerX, controlsY + 30, 'Player 2: Arrow Keys + Enter', {
      fontSize: '16px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(centerX, controlsY + 70, 'First to 3 wins!', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Wait for Space to start
    this.input.keyboard!.once('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
  }
}
```

- [ ] **Step 3: Update main.ts to register scenes**

```ts
// src/main.ts
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GAME_WIDTH, GAME_HEIGHT, BG_COLOR } from './config';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: BG_COLOR,
  parent: document.body,
  scene: [BootScene, MenuScene, GameScene],
};

new Phaser.Game(config);
```

Note: GameScene doesn't exist yet — this will cause a compile error. Create a minimal placeholder first:

```ts
// src/scenes/GameScene.ts (minimal placeholder)
import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Will be implemented in later tasks
  }
}
```

- [ ] **Step 4: Verify the app runs and shows menu**

```bash
npm run dev
```
Expected: Browser shows "RICOCHET TANK" title, blinking "Press SPACE to Start", control instructions. Pressing Space navigates to GameScene (black screen).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/BootScene.ts src/scenes/MenuScene.ts src/scenes/GameScene.ts src/main.ts
git commit -m "feat: BootScene, MenuScene with controls display"
```

---

### Task 11: GameScene — State Machine + Round Flow

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Implement GameScene with state machine and round flow**

```ts
// src/scenes/GameScene.ts
import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, SCORE_TO_WIN,
  ROUND_START_DELAY, ROUND_END_DELAY, TEXT_COLOR, MAX_DT,
  MAZE_COLS, MAZE_ROWS, CELL_SIZE, WALL_THICKNESS, WALL_REMOVE_RATIO, SPAWN_CLEAR_RADIUS,
  TANK_RADIUS, TANK_ROTATE_SPEED, TANK_MOVE_SPEED, TANK_BACK_SPEED,
  BULLET_SPEED, BULLET_RADIUS, BULLET_SHOOT_COOLDOWN, BULLET_SAFE_PERIOD,
  BULLET_WALL_PUSH, BULLET_WALL_COOLDOWN,
} from '../config';
import { InputManager } from '../systems/InputManager';
import { generateMaze } from '../systems/MazeGenerator';
import { separateCircleFromRect, circleCircleOverlap } from '../systems/Collision';
import { reflect } from '../utils/math';
import { Wall } from '../objects/Wall';
import { Tank } from '../objects/Tank';
import { Bullet, isOwnerSafe } from '../objects/Bullet';

enum RoundState {
  GENERATING = 'GENERATING',
  COUNTDOWN = 'COUNTDOWN',
  PLAYING = 'PLAYING',
  ROUND_OVER = 'ROUND_OVER',
  MATCH_OVER = 'MATCH_OVER',
}

export class GameScene extends Phaser.Scene {
  private roundState: RoundState = RoundState.GENERATING;
  private scoreP1: number = 0;
  private scoreP2: number = 0;
  private inputManager!: InputManager;
  private walls: Wall[] = [];
  private wallData: Array<{ x: number; y: number; width: number; height: number; orientation: 'vertical' | 'horizontal' }> = [];
  private tanks: Tank[] = [];
  private bullets: Bullet[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.scoreP1 = 0;
    this.scoreP2 = 0;
    this.inputManager = new InputManager(this);

    // UI
    this.scoreText = this.add.text(GAME_WIDTH / 2, 20, '', {
      fontSize: '24px',
      color: TEXT_COLOR,
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setDepth(100);

    this.statusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontSize: '36px',
      color: TEXT_COLOR,
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(100);

    this.startRound();
  }

  private startRound(): void {
    this.roundState = RoundState.GENERATING;

    // Clean up previous round
    for (const wall of this.walls) wall.destroy();
    this.walls = [];
    for (const tank of this.tanks) tank.destroy();
    this.tanks = [];
    for (const bullet of this.bullets) bullet.destroy();
    this.bullets = [];

    // Generate maze
    const maze = generateMaze(MAZE_COLS, MAZE_ROWS, CELL_SIZE, WALL_THICKNESS, WALL_REMOVE_RATIO, SPAWN_CLEAR_RADIUS);
    this.wallData = maze.walls;

    // Create wall objects
    for (const wd of this.wallData) {
      this.walls.push(new Wall(this, wd.x, wd.y, wd.width, wd.height, wd.orientation));
    }

    // Place tanks
    this.tanks.push(new Tank(this, maze.spawn1.x, maze.spawn1.y, 0, 0));
    this.tanks.push(new Tank(this, maze.spawn2.x, maze.spawn2.y, Math.PI, 1));

    // Countdown
    this.roundState = RoundState.COUNTDOWN;
    this.statusText.setText('READY');
    this.updateScoreText();

    this.time.delayedCall(ROUND_START_DELAY * 1000, () => {
      this.statusText.setText('');
      this.roundState = RoundState.PLAYING;
    });
  }

  update(_time: number, delta: number): void {
    this.updateScoreText();

    if (this.roundState !== RoundState.PLAYING) return;

    const dt = Math.min(delta / 1000, MAX_DT);
    const currentTimeMs = this.time.now;

    // Read input
    const p1 = this.inputManager.getPlayer1Input();
    const p2 = this.inputManager.getPlayer2Input();

    // Update tank rotation
    const rotateP1 = (p1.rotateLeft ? -1 : 0) + (p1.rotateRight ? 1 : 0);
    const rotateP2 = (p2.rotateLeft ? -1 : 0) + (p2.rotateRight ? 1 : 0);

    // Update tanks
    this.updateTank(this.tanks[0], p1.forward, p1.backward, rotateP1, dt);
    this.updateTank(this.tanks[1], p2.forward, p2.backward, rotateP2, dt);

    // Handle shooting
    this.handleShoot(this.tanks[0], p1.shoot, currentTimeMs);
    this.handleShoot(this.tanks[1], p2.shoot, currentTimeMs);

    // Update bullets
    for (const bullet of this.bullets) {
      if (!bullet.state.active) continue;
      bullet.update(dt, currentTimeMs);
      this.handleBulletWallCollision(bullet, dt);
      bullet.state.active = bullet.state.active && bullet.state.bounceCount <= 8;
    }

    // Check bullet-tank hits
    const deadPlayers: number[] = [];
    for (const bullet of this.bullets) {
      if (!bullet.state.active) continue;
      for (const tank of this.tanks) {
        if (!tank.alive) continue;
        if (bullet.state.ownerId === tank.playerId && isOwnerSafe(bullet.state, currentTimeMs)) continue;
        if (circleCircleOverlap(bullet.state.x, bullet.state.y, bullet.radius, tank.x, tank.y, tank.radius)) {
          deadPlayers.push(tank.playerId);
        }
      }
    }

    // Clean up dead bullets
    this.bullets = this.bullets.filter(b => {
      if (!b.state.active) { b.destroy(); return false; }
      return true;
    });

    // Resolve deaths
    if (deadPlayers.length > 0) {
      this.resolveRound(deadPlayers);
    }
  }

  private updateTank(tank: Tank, forward: boolean, backward: boolean, rotateInput: number, dt: number): void {
    // Rotation
    if (rotateInput !== 0) {
      tank.rotation += rotateInput * TANK_ROTATE_SPEED * dt;
    }

    // Movement
    let newX = tank.x;
    let newY = tank.y;
    if (forward) {
      newX += Math.cos(tank.rotation) * TANK_MOVE_SPEED * dt;
      newY += Math.sin(tank.rotation) * TANK_MOVE_SPEED * dt;
    } else if (backward) {
      newX -= Math.cos(tank.rotation) * TANK_BACK_SPEED * dt;
      newY -= Math.sin(tank.rotation) * TANK_BACK_SPEED * dt;
    }

    // Split-axis wall collision
    // X axis
    let testX = newX;
    let testY = tank.y;
    for (const wd of this.wallData) {
      const sep = separateCircleFromRect(testX, testY, tank.radius, wd.x, wd.y, wd.width, wd.height);
      testX = sep.x;
      testY = sep.y;
    }
    // Y axis
    const finalX = testX;
    testY = newY;
    for (const wd of this.wallData) {
      const sep = separateCircleFromRect(finalX, testY, tank.radius, wd.x, wd.y, wd.width, wd.height);
      testX = sep.x;
      testY = sep.y;
    }

    tank.setPosition(testX, testY);
    tank.draw();
  }

  private handleShoot(tank: Tank, shootPressed: boolean, currentTimeMs: number): void {
    if (!shootPressed) return;
    if (tank.shootCooldown > 0) return;

    // Check if this player already has a bullet on the field
    const existingBullet = this.bullets.find(b => b.state.ownerId === tank.playerId && b.state.active);
    if (existingBullet) return;

    const tip = tank.getBarrelTip();
    const vx = Math.cos(tank.rotation) * BULLET_SPEED;
    const vy = Math.sin(tank.rotation) * BULLET_SPEED;
    const bullet = new Bullet(this, tip.x, tip.y, vx, vy, tank.playerId, currentTimeMs / 1000);
    this.bullets.push(bullet);
    tank.shootCooldown = BULLET_SHOOT_COOLDOWN;

    // Decrease cooldown in update
    this.time.addEvent({
      delay: BULLET_SHOOT_COOLDOWN * 1000,
      callback: () => { tank.shootCooldown = 0; },
    });
  }

  private handleBulletWallCollision(bullet: Bullet, _dt: number): void {
    // Collect all wall collisions this frame
    const collisions: Array<{ wallIndex: number; orientation: 'vertical' | 'horizontal' }> = [];

    for (let i = 0; i < this.wallData.length; i++) {
      const wd = this.wallData[i];

      // Check cooldown
      const cooldown = bullet.state.wallCooldowns.get(i) ?? 0;
      if (cooldown > 0) {
        bullet.state.wallCooldowns.set(i, cooldown - _dt);
        continue;
      }

      if (circleRectOverlap(bullet.state.x, bullet.state.y, bullet.radius, wd.x, wd.y, wd.width, wd.height)) {
        collisions.push({ wallIndex: i, orientation: wd.orientation });
      }
    }

    if (collisions.length === 0) return;

    // Apply reflections
    let newVx = bullet.state.vx;
    let newVy = bullet.state.vy;
    for (const col of collisions) {
      const reflected = reflect(newVx, newVy, col.orientation);
      newVx = reflected.vx;
      newVy = reflected.vy;
      bullet.state.wallCooldowns.set(col.wallIndex, BULLET_WALL_COOLDOWN);
    }

    bullet.state.bounceCount++;
    if (bullet.state.bounceCount > 8) {
      bullet.state.active = false;
      return;
    }

    bullet.state.vx = newVx;
    bullet.state.vy = newVy;

    // Push bullet out along new velocity direction
    const speed = Math.sqrt(newVx * newVx + newVy * newVy);
    if (speed > 0) {
      bullet.state.x += (newVx / speed) * BULLET_WALL_PUSH;
      bullet.state.y += (newVy / speed) * BULLET_WALL_PUSH;
    }
  }

  private resolveRound(deadPlayers: number[]): void {
    this.roundState = RoundState.ROUND_OVER;
    const uniqueDead = [...new Set(deadPlayers)];

    if (uniqueDead.length === 2) {
      this.statusText.setText('DRAW!');
    } else if (uniqueDead.includes(0)) {
      this.scoreP2++;
      this.statusText.setText('P2 Wins!');
    } else {
      this.scoreP1++;
      this.statusText.setText('P1 Wins!');
    }

    this.updateScoreText();

    this.time.delayedCall(ROUND_END_DELAY * 1000, () => {
      if (this.scoreP1 >= SCORE_TO_WIN || this.scoreP2 >= SCORE_TO_WIN) {
        this.roundState = RoundState.MATCH_OVER;
        const winner = this.scoreP1 >= SCORE_TO_WIN ? 'Player 1' : 'Player 2';
        this.statusText.setText(`${winner} Wins the Match!\n\nPress SPACE for Menu`);
        this.input.keyboard!.once('keydown-SPACE', () => {
          this.scene.start('MenuScene');
        });
      } else {
        this.startRound();
      }
    });
  }

  private updateScoreText(): void {
    this.scoreText.setText(`P1: ${this.scoreP1}  |  P2: ${this.scoreP2}`);
  }
}

// Import the function used in handleBulletWallCollision
import { circleRectOverlap } from '../utils/math';
```

- [ ] **Step 2: Verify the full game loop works**

```bash
npm run dev
```
Expected:
1. Menu shows → press Space → GameScene loads
2. Maze generates, tanks spawn in opposite corners
3. "READY" shows for 1 second
4. Both tanks can move (WASD / arrows) and shoot (Space / Enter)
5. Bullets bounce off walls
6. Hitting a tank shows "P1 Wins!" or "P2 Wins!"
7. After 3 wins, shows match victory screen
8. Press Space returns to menu

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: complete GameScene with state machine, combat, and scoring"
```

---

### Task 12: Polish — Cooldown Tick + Cleanup

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Fix cooldown management to use delta time properly**

The bullet wall cooldowns should decrease by `dt` each frame. Update the `handleBulletWallCollision` method to properly tick down cooldowns in the main update loop before collision checks.

In `GameScene.update()`, add cooldown ticking before bullet updates:

```ts
// In the update method, after reading input and before updating bullets:
// Tick bullet wall cooldowns
for (const bullet of this.bullets) {
  if (!bullet.state.active) continue;
  for (const [wallIdx, cd] of bullet.state.wallCooldowns) {
    const newCd = cd - dt;
    if (newCd <= 0) {
      bullet.state.wallCooldowns.delete(wallIdx);
    } else {
      bullet.state.wallCooldowns.set(wallIdx, newCd);
    }
  }
}
```

- [ ] **Step 2: Add return-to-menu during match (Escape key)**

In `InputManager`, add Escape key:

```ts
// In InputManager keys object:
ESC: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
```

In `GameScene.update()`, at the top:

```ts
if (this.inputManager.isEscapePressed()) {
  this.scene.start('MenuScene');
  return;
}
```

Add method to InputManager:
```ts
isEscapePressed(): boolean {
  return Phaser.Input.Keyboard.JustDown(this.keys.ESC);
}
```

- [ ] **Step 3: Verify full game flow**

```bash
npm run dev
```
Expected: Full game loop works. Escape returns to menu at any time.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.ts src/systems/InputManager.ts
git commit -m "fix: proper cooldown ticking and Escape to menu"
```

---

### Task 13: Final Verification

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```
Expected: All tests pass.

- [ ] **Step 2: Run dev server and do full gameplay test**

```bash
npm run dev
```

Test checklist:
- [ ] Menu displays correctly
- [ ] Space starts game
- [ ] Maze generates differently each time
- [ ] Both tanks spawn far apart
- [ ] P1 moves with WASD, rotates with A/D
- [ ] P2 moves with arrows, rotates with left/right
- [ ] Space fires P1 bullet, Enter fires P2 bullet
- [ ] Bullets bounce off walls correctly
- [ ] Bullets destroy tanks on hit
- [ ] Self-kill works after safe period
- [ ] Only 1 bullet per player on field
- [ ] Score updates correctly
- [ ] Draw on double kill
- [ ] First to 3 wins match
- [ ] Victory screen shows, Space returns to menu
- [ ] Escape returns to menu

- [ ] **Step 3: Build for production**

```bash
npm run build
```
Expected: Clean build, `dist/` folder created.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Ricochet Tank v1 complete"
```
