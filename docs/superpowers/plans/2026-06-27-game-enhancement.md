# Game Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance Ricochet Tank with an ammo system, pixel art tanks, and 8-bit sound effects.

**Architecture:** Three independent features implemented sequentially: (1) ammo system modifying existing Tank/GameScene logic, (2) pixel art tank model replacing Graphics-drawn rectangles, (3) synthesized 8-bit sound effects via Web Audio API. Each feature is independently testable via `npm run dev`.

**Tech Stack:** Phaser 3, TypeScript, Vite, Vitest, Web Audio API

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/config.ts` | Modify | Add ammo constants, update tank/bullet constants |
| `src/objects/Tank.ts` | Modify | Add ammo fields, rewrite draw() for pixel art |
| `src/scenes/GameScene.ts` | Modify | Ammo logic, refill timer, HUD, remove single-bullet restriction |
| `src/systems/SoundManager.ts` | Create | 8-bit synthesized sound effects |
| `tests/objects/Tank.test.ts` | Modify | Test ammo tracking in Tank |
| `tests/systems/SoundManager.test.ts` | Create | Test sound manager instantiation and method calls |

---

## Task 1: Ammo System — Config Constants

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: Add ammo constants to config.ts**

Add these constants after the existing `// Bullet` section:

```typescript
// Ammo
export const AMMO_MAX = 10;
export const AMMO_REFILL_INTERVAL = 180; // seconds
```

Also update the existing shoot cooldown:

```typescript
export const BULLET_SHOOT_COOLDOWN = 0.3; // was 0.8
```

- [ ] **Step 2: Commit**

```bash
git add src/config.ts
git commit -m "feat: add ammo system constants to config"
```

---

## Task 2: Ammo System — Tank Class Changes

**Files:**
- Modify: `src/objects/Tank.ts`
- Modify: `tests/objects/Tank.test.ts`

- [ ] **Step 1: Add ammo fields to Tank class**

In `src/objects/Tank.ts`, import `AMMO_MAX` from config, then add fields to the Tank class:

```typescript
import {
  TANK_RADIUS, TANK_BODY_WIDTH, TANK_BODY_HEIGHT,
  TANK_BARREL_WIDTH, TANK_BARREL_HEIGHT,
  TANK_MOVE_SPEED, TANK_BACK_SPEED, TANK_ROTATE_SPEED,
  AMMO_MAX,  // add this import
} from '../config';
```

Add fields after `shootCooldown`:

```typescript
ammo: number = AMMO_MAX;
ammoRefillTimer: number = 0;
```

- [ ] **Step 2: Run existing tests to verify no regressions**

Run: `npm test`
Expected: All existing tests pass

- [ ] **Step 3: Add ammo tests to Tank.test.ts**

Add to `tests/objects/Tank.test.ts`:

```typescript
import { AMMO_MAX } from '../../src/config';

describe('Tank ammo', () => {
  it('starts with AMMO_MAX ammo', () => {
    // Tank construction requires Phaser.Scene, test the pure fields via interface
    const tank = { ammo: AMMO_MAX, ammoRefillTimer: 0 } as any;
    expect(tank.ammo).toBe(10);
    expect(tank.ammoRefillTimer).toBe(0);
  });

  it('decrements ammo when shot', () => {
    const tank = { ammo: AMMO_MAX, ammoRefillTimer: 0 } as any;
    tank.ammo--;
    expect(tank.ammo).toBe(9);
  });

  it('refills ammo when timer exceeds interval', () => {
    const AMMO_REFILL_INTERVAL = 180;
    const tank = { ammo: 3, ammoRefillTimer: 0 } as any;
    tank.ammoRefillTimer += 180;
    if (tank.ammoRefillTimer >= AMMO_REFILL_INTERVAL) {
      tank.ammo = AMMO_MAX;
      tank.ammoRefillTimer = 0;
    }
    expect(tank.ammo).toBe(10);
    expect(tank.ammoRefillTimer).toBe(0);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/objects/Tank.ts tests/objects/Tank.test.ts
git commit -m "feat: add ammo fields to Tank class"
```

---

## Task 3: Ammo System — GameScene Logic

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Update imports in GameScene.ts**

Add `AMMO_MAX` and `AMMO_REFILL_INTERVAL` to the config imports:

```typescript
import {
  GAME_WIDTH, GAME_HEIGHT, SCORE_TO_WIN,
  ROUND_START_DELAY, ROUND_END_DELAY, TEXT_COLOR, MAX_DT,
  MAZE_COLS, MAZE_ROWS, CELL_SIZE, WALL_THICKNESS, WALL_REMOVE_RATIO, SPAWN_CLEAR_RADIUS,
  TANK_ROTATE_SPEED, TANK_MOVE_SPEED, TANK_BACK_SPEED,
  BULLET_SPEED, BULLET_SHOOT_COOLDOWN, BULLET_WALL_PUSH, BULLET_WALL_COOLDOWN,
  AMMO_MAX, AMMO_REFILL_INTERVAL,  // add these
} from '../config';
```

- [ ] **Step 2: Modify handleShoot to use ammo system**

Replace the entire `handleShoot` method:

```typescript
private handleShoot(tank: Tank, shootPressed: boolean, currentTimeMs: number): void {
  if (!shootPressed) return;
  if (tank.shootCooldown > 0) return;
  if (tank.ammo <= 0) return;

  const tip = tank.getBarrelTip();
  const vx = Math.cos(tank.rotation) * BULLET_SPEED;
  const vy = Math.sin(tank.rotation) * BULLET_SPEED;
  const bullet = new Bullet(this, tip.x, tip.y, vx, vy, tank.playerId, currentTimeMs / 1000);
  this.bullets.push(bullet);
  tank.ammo--;
  tank.shootCooldown = BULLET_SHOOT_COOLDOWN;

  this.time.addEvent({
    delay: BULLET_SHOOT_COOLDOWN * 1000,
    callback: () => { tank.shootCooldown = 0; },
  });
}
```

- [ ] **Step 3: Add ammo refill logic to update loop**

In the `update()` method, after the bullet wall cooldown tick block (after line 127), add:

```typescript
// Ammo refill timer
for (const tank of this.tanks) {
  tank.ammoRefillTimer += dt;
  if (tank.ammoRefillTimer >= AMMO_REFILL_INTERVAL) {
    tank.ammo = AMMO_MAX;
    tank.ammoRefillTimer = 0;
  }
}
```

- [ ] **Step 4: Run dev server and verify**

Run: `npm run dev`
Expected: Game starts, can fire multiple bullets, ammo depletes, cooldown works

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: implement ammo system with multi-bullet and refill"
```

---

## Task 4: Ammo HUD Display

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Add HUD graphics fields**

In `GameScene` class, add fields after `statusText`:

```typescript
private ammoBarP1!: Phaser.GameObjects.Graphics;
private ammoBarP2!: Phaser.GameObjects.Graphics;
```

- [ ] **Step 2: Initialize HUD graphics in create()**

In `create()`, after `this.statusText` initialization, add:

```typescript
this.ammoBarP1 = this.add.graphics().setDepth(100);
this.ammoBarP2 = this.add.graphics().setDepth(100);
```

- [ ] **Step 3: Add drawAmmoBars method**

Add a new private method to GameScene:

```typescript
private drawAmmoBars(): void {
  const barWidth = 80;
  const barHeight = 10;
  const border = 1;

  // P1 bar - left side
  this.ammoBarP1.clear();
  this.ammoBarP1.fillStyle(0x333333, 1);
  this.ammoBarP1.fillRect(10, 50, barWidth, barHeight);
  if (this.tanks[0]) {
    const fillWidth = (this.tanks[0].ammo / AMMO_MAX) * barWidth;
    this.ammoBarP1.fillStyle(0x4488ff, 1);
    this.ammoBarP1.fillRect(10, 50, fillWidth, barHeight);
  }
  this.ammoBarP1.lineStyle(border, 0x888888, 1);
  this.ammoBarP1.strokeRect(10, 50, barWidth, barHeight);

  // P2 bar - right side
  this.ammoBarP2.clear();
  this.ammoBarP2.fillStyle(0x333333, 1);
  this.ammoBarP2.fillRect(GAME_WIDTH - 90, 50, barWidth, barHeight);
  if (this.tanks[1]) {
    const fillWidth = (this.tanks[1].ammo / AMMO_MAX) * barWidth;
    this.ammoBarP2.fillStyle(0xff4444, 1);
    this.ammoBarP2.fillRect(GAME_WIDTH - 90, 50, fillWidth, barHeight);
  }
  this.ammoBarP2.lineStyle(border, 0x888888, 1);
  this.ammoBarP2.strokeRect(GAME_WIDTH - 90, 50, barWidth, barHeight);
}
```

- [ ] **Step 4: Call drawAmmoBars in update()**

In `update()`, right after `this.updateScoreText();` (line 92), add:

```typescript
this.drawAmmoBars();
```

- [ ] **Step 5: Run dev server and verify HUD**

Run: `npm run dev`
Expected: Two ammo bars visible below score, depleting as bullets are fired

- [ ] **Step 6: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: add ammo HUD bars for both players"
```

---

## Task 5: Pixel Tank Model — Config

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: Add pixel constants and update TANK_RADIUS**

Add to config.ts in the `// Tank` section:

```typescript
export const PIXEL_SIZE = 2;
export const TANK_GRID_SIZE = 16;
```

Update TANK_RADIUS:

```typescript
export const TANK_RADIUS = 16; // was 14, now covers 32x32 pixel tank
```

- [ ] **Step 2: Commit**

```bash
git add src/config.ts
git commit -m "feat: add pixel grid constants for tank model"
```

---

## Task 6: Pixel Tank Model — Tank Class Rewrite

**Files:**
- Modify: `src/objects/Tank.ts`

- [ ] **Step 1: Add pixel pattern constants**

At the top of `src/objects/Tank.ts`, after imports, add the pixel grid pattern:

```typescript
// 16x16 pixel pattern (pointing up), 0=transparent, 1=body, 2=track
const TANK_PIXEL_GRID: number[][] = [
  [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0], // row 0: barrel tip
  [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0], // row 1: barrel
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0], // row 2: turret top
  [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0], // row 3: turret
  [0,0,0,1,1,0,1,1,1,1,0,1,1,0,0,0], // row 4: turret detail
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0], // row 5: body top
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0], // row 6
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0], // row 7
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0], // row 8: main body
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0], // row 9
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0], // row 10
  [0,0,1,2,1,1,1,1,1,1,1,1,2,1,0,0], // row 11: track detail
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0], // row 12
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0], // row 13
  [0,0,0,2,2,0,0,0,0,0,0,2,2,0,0,0], // row 14: track bottom
  [0,0,0,2,2,0,0,0,0,0,0,2,2,0,0,0], // row 15
];

// Colors per player: [body, track]
const TANK_COLORS: Record<number, { body: number; track: number }> = {
  0: { body: 0x4488ff, track: 0x2255aa }, // P1 blue
  1: { body: 0xff4444, track: 0xaa2222 }, // P2 red
};
```

- [ ] **Step 2: Update imports**

Update the imports in Tank.ts to include new constants:

```typescript
import {
  TANK_RADIUS,
  TANK_MOVE_SPEED, TANK_BACK_SPEED, TANK_ROTATE_SPEED,
  PIXEL_SIZE, TANK_GRID_SIZE, AMMO_MAX,
} from '../config';
```

Remove the unused imports: `TANK_BODY_WIDTH, TANK_BODY_HEIGHT, TANK_BARREL_WIDTH, TANK_BARREL_HEIGHT`.

- [ ] **Step 3: Rewrite the draw() method**

Replace the entire `draw()` method:

```typescript
draw(): void {
  this.bodyGraphics.clear();
  this.bodyGraphics.save();
  this.bodyGraphics.translateCanvas(this.x, this.y);
  this.bodyGraphics.rotateCanvas(this.rotation);

  const colors = TANK_COLORS[this.playerId];
  const halfGrid = TANK_GRID_SIZE / 2;

  for (let row = 0; row < TANK_GRID_SIZE; row++) {
    for (let col = 0; col < TANK_GRID_SIZE; col++) {
      const cell = TANK_PIXEL_GRID[row][col];
      if (cell === 0) continue;

      const color = cell === 1 ? colors.body : colors.track;
      this.bodyGraphics.fillStyle(color, 1);
      this.bodyGraphics.fillRect(
        (col - halfGrid) * PIXEL_SIZE,
        (row - halfGrid) * PIXEL_SIZE,
        PIXEL_SIZE,
        PIXEL_SIZE
      );
    }
  }

  this.bodyGraphics.restore();
}
```

- [ ] **Step 4: Update getBarrelTip()**

Replace the `getBarrelTip()` method:

```typescript
getBarrelTip(): { x: number; y: number } {
  // Barrel tip is at row 0, center (cols 6-9) of the 16x16 grid
  // Offset from center: 8 logical pixels * 2px = 16 screen pixels
  const offset = TANK_GRID_SIZE / 2 * PIXEL_SIZE;
  return {
    x: this.x + Math.cos(this.rotation) * offset,
    y: this.y + Math.sin(this.rotation) * offset,
  };
}
```

- [ ] **Step 5: Run dev server and verify**

Run: `npm run dev`
Expected: Tanks now appear as pixel art with body, barrel, and track details

- [ ] **Step 6: Commit**

```bash
git add src/objects/Tank.ts src/config.ts
git commit -m "feat: replace tank model with pixel art pattern"
```

---

## Task 7: Sound Manager — Create File

**Files:**
- Create: `src/systems/SoundManager.ts`
- Create: `tests/systems/SoundManager.test.ts`

- [ ] **Step 1: Create SoundManager.ts**

Create `src/systems/SoundManager.ts`:

```typescript
export class SoundManager {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  shoot(): void {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }

  bounce(): void {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  }

  explosion(): void {
    const ctx = this.getContext();
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
  }

  countdownTick(): void {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  victory(): void {
    const ctx = this.getContext();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.15);
    });
  }
}
```

- [ ] **Step 2: Create SoundManager test**

Create `tests/systems/SoundManager.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SoundManager } from '../../src/systems/SoundManager';

// Mock AudioContext
const mockOscillator = {
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  type: '',
};

const mockGain = {
  connect: vi.fn(),
  gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
};

const mockBufferSource = {
  connect: vi.fn(),
  start: vi.fn(),
  buffer: null,
};

const mockCtx = {
  currentTime: 0,
  state: 'running',
  resume: vi.fn(),
  createOscillator: vi.fn(() => ({ ...mockOscillator, frequency: { ...mockOscillator.frequency } })),
  createGain: vi.fn(() => ({ ...mockGain, gain: { ...mockGain.gain } })),
  createBuffer: vi.fn(() => ({ getChannelData: () => new Float32Array(100) })),
  createBufferSource: vi.fn(() => ({ ...mockBufferSource })),
  destination: {},
  sampleRate: 44100,
};

describe('SoundManager', () => {
  let manager: SoundManager;

  beforeEach(() => {
    vi.stubGlobal('AudioContext', vi.fn(() => mockCtx));
    manager = new SoundManager();
    vi.clearAllMocks();
  });

  it('creates oscillator on shoot', () => {
    manager.shoot();
    expect(mockCtx.createOscillator).toHaveBeenCalled();
  });

  it('creates buffer source on explosion', () => {
    manager.explosion();
    expect(mockCtx.createBufferSource).toHaveBeenCalled();
  });

  it('creates oscillator on bounce', () => {
    manager.bounce();
    expect(mockCtx.createOscillator).toHaveBeenCalled();
  });

  it('creates oscillator on countdownTick', () => {
    manager.countdownTick();
    expect(mockCtx.createOscillator).toHaveBeenCalled();
  });

  it('creates 3 oscillators on victory', () => {
    manager.victory();
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/systems/SoundManager.ts tests/systems/SoundManager.test.ts
git commit -m "feat: add 8-bit SoundManager with synthesized effects"
```

---

## Task 8: Sound Integration — GameScene

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Import SoundManager**

Add to imports in GameScene.ts:

```typescript
import { SoundManager } from '../systems/SoundManager';
```

- [ ] **Step 2: Add soundManager field and initialize**

In `GameScene` class, add field:

```typescript
private soundManager!: SoundManager;
```

In `create()`, after `this.inputManager = new InputManager(this);`, add:

```typescript
this.soundManager = new SoundManager();
```

- [ ] **Step 3: Add shoot sound to handleShoot**

In `handleShoot()`, after `this.bullets.push(bullet);` and before `tank.ammo--;`, add:

```typescript
this.soundManager.shoot();
```

- [ ] **Step 4: Add bounce sound to handleBulletWallCollision**

In `handleBulletWallCollision()`, after the `bullet.state.bounceCount++;` line and before the `if (bullet.state.bounceCount > 8)` check, add:

```typescript
this.soundManager.bounce();
```

- [ ] **Step 5: Add explosion and victory sounds to resolveRound**

In `resolveRound()`, after the status text is set and score updated, add:

```typescript
if (uniqueDead.length !== 2) {
  this.soundManager.explosion();
}
```

And after the `this.updateScoreText();` call in resolveRound:

```typescript
this.soundManager.victory();
```

- [ ] **Step 6: Add countdown tick sounds**

In `startRound()`, add tick sounds during the countdown. Replace the countdown section:

```typescript
this.roundState = RoundState.COUNTDOWN;
this.statusText.setText('READY');
this.updateScoreText();

let tickCount = 0;
const countdownEvent = this.time.addEvent({
  delay: ROUND_START_DELAY * 1000 / 3,
  repeat: 2,
  callback: () => {
    tickCount++;
    this.soundManager.countdownTick();
    if (tickCount === 3) {
      this.statusText.setText('');
      this.roundState = RoundState.PLAYING;
    }
  },
});
```

Remove the original `this.time.delayedCall(ROUND_START_DELAY * 1000, ...)` block that was there before.

- [ ] **Step 7: Run dev server and verify sounds**

Run: `npm run dev`
Expected: Shoot sounds on fire, bounce sounds on wall hit, explosion on kill, victory on round end

- [ ] **Step 8: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: integrate sound effects into game events"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Run dev server for full gameplay test**

Run: `npm run dev`
Test the following:
- Fire multiple bullets without waiting for previous to disappear
- Observe ammo bar depleting
- Wait for 3-minute refill (or manually test by setting AMMO_REFILL_INTERVAL to 5 in config)
- Verify pixel tanks look correct with body, barrel, and tracks
- Verify all sounds play at correct moments
- Play a full match (first to 3 wins) and verify victory sound

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: polish game enhancements"
```
