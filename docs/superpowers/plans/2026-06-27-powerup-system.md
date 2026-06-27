# Power-Up System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full power-up system with 7 classic power-ups (Shield, Rapid Fire, Double Shot, Laser, Rocket, Mine, Shotgun) to Ricochet Tank.

**Architecture:** PowerUpManager handles spawning/lifecycle/collision. PowerUpEffects contains pure effect functions. Special projectiles (Rocket, Mine) are tracked as lightweight state objects in GameScene. Tank gains power-up state fields. All wired together in GameScene.

**Tech Stack:** Phaser 3, TypeScript, Vite, Vitest, Web Audio API

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/config.ts` | Modify | Add all power-up constants |
| `src/enums/PowerUpType.ts` | Create | `PowerUpType` enum and `POWERUP_VISUALS` map |
| `src/objects/PowerUp.ts` | Create | Map power-up game object (floating icon) |
| `src/objects/Rocket.ts` | Create | Homing missile projectile |
| `src/objects/Mine.ts` | Create | Placed mine with trigger detection |
| `src/systems/PowerUpManager.ts` | Create | Spawning, collection, lifecycle |
| `src/systems/PowerUpEffects.ts` | Create | Effect application functions |
| `src/objects/Tank.ts` | Modify | Add power-up state fields |
| `src/systems/InputManager.ts` | Modify | Add `usePowerUp` to `PlayerInput` |
| `src/systems/SoundManager.ts` | Modify | Add power-up sound methods |
| `src/scenes/GameScene.ts` | Modify | Integrate everything |
| `tests/enums/PowerUpType.test.ts` | Create | Test enum completeness |
| `tests/systems/PowerUpManager.test.ts` | Create | Test spawn/collection logic |
| `tests/systems/PowerUpEffects.test.ts` | Create | Test effect application |

---

## Task 1: Config Constants

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: Add power-up constants to config.ts**

Add after the `// Ammo` section:

```typescript
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
export const ROCKET_SPEED = 200;
export const ROCKET_TURN_SPEED = 2;
export const MINE_TRIGGER_RADIUS = 40;
export const SHOTGUN_COUNT = 5;
export const SHOTGUN_SPREAD = Math.PI / 3;
```

- [ ] **Step 2: Commit**

```bash
git add src/config.ts
git commit -m "feat: add power-up system constants to config"
```

---

## Task 2: PowerUpType Enum

**Files:**
- Create: `src/enums/PowerUpType.ts`
- Create: `tests/enums/PowerUpType.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/enums/PowerUpType.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/enums/PowerUpType.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create PowerUpType.ts**

```typescript
// src/enums/PowerUpType.ts
export enum PowerUpType {
  Shield = 'Shield',
  RapidFire = 'RapidFire',
  DoubleShot = 'DoubleShot',
  Laser = 'Laser',
  Rocket = 'Rocket',
  Mine = 'Mine',
  Shotgun = 'Shotgun',
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
};

export const ALL_POWERUP_TYPES = Object.values(PowerUpType);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/enums/PowerUpType.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/enums/PowerUpType.ts tests/enums/PowerUpType.test.ts
git commit -m "feat: add PowerUpType enum with visual config"
```

---

## Task 3: PowerUp Map Object

**Files:**
- Create: `src/objects/PowerUp.ts`

- [ ] **Step 1: Create PowerUp.ts**

```typescript
// src/objects/PowerUp.ts
import Phaser from 'phaser';
import { PowerUpType, POWERUP_VISUALS } from '../enums/PowerUpType';
import { POWERUP_RADIUS } from '../config';

export class PowerUp {
  type: PowerUpType;
  x: number;
  y: number;
  radius: number = POWERUP_RADIUS;
  age: number = 0;
  active: boolean = true;

  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private baseY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PowerUpType) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.type = type;

    this.graphics = scene.add.graphics();
    this.draw(0);
  }

  draw(time: number): void {
    this.graphics.clear();
    this.graphics.setPosition(this.x, this.y);

    const visual = POWERUP_VISUALS[this.type];
    const r = this.radius;

    // Floating animation
    const floatOffset = Math.sin(time / 1000 * Math.PI * 2 / 1.5) * 3;
    this.y = this.baseY + floatOffset;
    this.graphics.setPosition(this.x, this.y);

    // Background circle
    this.graphics.fillStyle(0x000000, 0.5);
    this.graphics.fillCircle(0, 0, r);

    // Icon based on type
    this.graphics.fillStyle(visual.color, 1);
    this.graphics.lineStyle(2, visual.color, 1);

    switch (this.type) {
      case PowerUpType.Shield:
        this.graphics.strokeCircle(0, 0, r * 0.6);
        break;
      case PowerUpType.RapidFire:
        // Lightning bolt
        this.graphics.lineBetween(-3, -6, 1, -1);
        this.graphics.lineBetween(1, -1, -2, 0);
        this.graphics.lineBetween(-2, 0, 2, 6);
        break;
      case PowerUpType.DoubleShot:
        // Two vertical lines
        this.graphics.fillRect(-4, -5, 2, 10);
        this.graphics.fillRect(2, -5, 2, 10);
        break;
      case PowerUpType.Laser:
        // Horizontal line
        this.graphics.fillRect(-7, -1, 14, 2);
        break;
      case PowerUpType.Rocket:
        // Triangle
        this.graphics.fillTriangle(0, -6, -5, 4, 5, 4);
        break;
      case PowerUpType.Mine:
        // Filled circle
        this.graphics.fillCircle(0, 0, r * 0.5);
        break;
      case PowerUpType.Shotgun:
        // Fan shape (3 lines from center)
        for (let i = -1; i <= 1; i++) {
          const angle = i * 0.5;
          this.graphics.lineBetween(0, 0, Math.cos(angle - Math.PI / 2) * 7, Math.sin(angle - Math.PI / 2) * 7);
        }
        break;
    }

    // Border
    this.graphics.lineStyle(1, 0xffffff, 0.6);
    this.graphics.strokeCircle(0, 0, r);
  }

  destroy(): void {
    this.active = false;
    this.graphics.destroy();
  }
}
```

- [ ] **Step 2: Run dev server to verify visual**

Run: `npm run dev`
Expected: No compile errors (PowerUp not placed yet, but file loads)

- [ ] **Step 3: Commit**

```bash
git add src/objects/PowerUp.ts
git commit -m "feat: add PowerUp map object with animated icons"
```

---

## Task 4: Tank Power-Up State

**Files:**
- Modify: `src/objects/Tank.ts`

- [ ] **Step 1: Add imports and state fields to Tank**

In `src/objects/Tank.ts`, add import:

```typescript
import { PowerUpType } from '../enums/PowerUpType';
```

Add fields to the `Tank` class after `ammoRefillTimer`:

```typescript
  // Power-up state
  heldPowerUp: PowerUpType | null = null;
  passiveEffects: Set<PowerUpType> = new Set();
  passiveTimers: Map<PowerUpType, number> = new Map();
  shieldActive: boolean = false;
```

- [ ] **Step 2: Add clearPowerUps method to Tank**

Add a new method to the Tank class:

```typescript
  clearPowerUps(): void {
    this.heldPowerUp = null;
    this.passiveEffects.clear();
    this.passiveTimers.clear();
    this.shieldActive = false;
  }
```

- [ ] **Step 3: Add shield drawing to draw()**

In the `draw()` method, after `this.bodyGraphics.restore();` and before the closing `}`, add:

```typescript
    // Draw shield ring if active
    if (this.shieldActive) {
      this.bodyGraphics.lineStyle(2, 0x4488ff, 0.7);
      this.bodyGraphics.strokeCircle(0, 0, this.radius + 4);
    }
```

- [ ] **Step 4: Update draw() to use translation for shield**

The shield drawing above uses (0,0) which only works inside the save/restore block. Move the shield draw to be **inside** the save/restore block, right before `this.bodyGraphics.restore();`:

Replace the draw method to include the shield inside the transform:

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

        const colorMap: Record<number, number> = { 1: colors.body, 2: colors.track, 3: colors.turret };
        const color = colorMap[cell];
        if (!color) continue;
        this.bodyGraphics.fillStyle(color, 1);
        this.bodyGraphics.fillRect(
          (col - halfGrid) * PIXEL_SIZE,
          (row - halfGrid) * PIXEL_SIZE,
          PIXEL_SIZE,
          PIXEL_SIZE
        );
      }
    }

    // Draw shield ring if active (inside transform so it rotates with tank)
    if (this.shieldActive) {
      this.bodyGraphics.lineStyle(2, 0x4488ff, 0.7);
      this.bodyGraphics.strokeCircle(0, 0, this.radius + 4);
    }

    this.bodyGraphics.restore();
  }
```

- [ ] **Step 5: Run existing tests**

Run: `npx vitest run`
Expected: All existing tests pass

- [ ] **Step 6: Commit**

```bash
git add src/objects/Tank.ts
git commit -m "feat: add power-up state fields and shield visual to Tank"
```

---

## Task 5: InputManager — Add usePowerUp Key

**Files:**
- Modify: `src/systems/InputManager.ts`

- [ ] **Step 1: Add E and PERIOD keys and usePowerUp field**

Update `PlayerInput` interface:

```typescript
export interface PlayerInput {
  forward: boolean;
  backward: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
  shoot: boolean;
  usePowerUp: boolean;
}
```

Add keys to the `keys` object in constructor:

```typescript
    E: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    PERIOD: kb.addKey(Phaser.Input.Keyboard.KeyCodes.PERIOD),
```

Update `getPlayer1Input()`:

```typescript
  getPlayer1Input(): PlayerInput {
    return {
      forward: this.keys.W.isDown,
      backward: this.keys.S.isDown,
      rotateLeft: this.keys.A.isDown,
      rotateRight: this.keys.D.isDown,
      shoot: Phaser.Input.Keyboard.JustDown(this.keys.SPACE),
      usePowerUp: Phaser.Input.Keyboard.JustDown(this.keys.E),
    };
  }
```

Update `getPlayer2Input()`:

```typescript
  getPlayer2Input(): PlayerInput {
    return {
      forward: this.keys.UP.isDown,
      backward: this.keys.DOWN.isDown,
      rotateLeft: this.keys.LEFT.isDown,
      rotateRight: this.keys.RIGHT.isDown,
      shoot: Phaser.Input.Keyboard.JustDown(this.keys.ENTER),
      usePowerUp: Phaser.Input.Keyboard.JustDown(this.keys.PERIOD),
    };
  }
```

- [ ] **Step 2: Run dev server**

Run: `npm run dev`
Expected: No compile errors

- [ ] **Step 3: Commit**

```bash
git add src/systems/InputManager.ts
git commit -m "feat: add usePowerUp input (E for P1, period for P2)"
```

---

## Task 6: SoundManager — Power-Up Sounds

**Files:**
- Modify: `src/systems/SoundManager.ts`

- [ ] **Step 1: Add power-up sound methods**

Add these methods to the `SoundManager` class:

```typescript
  powerUpPickup(): void {
    const ctx = this.getContext();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.06 + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.06);
      osc.stop(ctx.currentTime + i * 0.06 + 0.1);
    });
  }

  shieldBreak(): void {
    const ctx = this.getContext();
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    // High-pass effect via playback rate
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
  }

  laserFire(): void {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  rocketFire(): void {
    const ctx = this.getContext();
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
  }

  minePlace(): void {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.02);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.02);
  }

  mineExplode(): void {
    const ctx = this.getContext();
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
  }

  shotgunFire(): void {
    const ctx = this.getContext();
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(600 + i * 200, ctx.currentTime + i * 0.02);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.02 + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.02);
      osc.stop(ctx.currentTime + i * 0.02 + 0.08);
    }
  }
```

- [ ] **Step 2: Run dev server**

Run: `npm run dev`
Expected: No compile errors

- [ ] **Step 3: Commit**

```bash
git add src/systems/SoundManager.ts
git commit -m "feat: add power-up sound effects to SoundManager"
```

---

## Task 7: Rocket Object

**Files:**
- Create: `src/objects/Rocket.ts`

- [ ] **Step 1: Create Rocket.ts**

```typescript
// src/objects/Rocket.ts
import Phaser from 'phaser';
import { BULLET_RADIUS } from '../config';

export class Rocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: number;
  active: boolean = true;
  radius: number = BULLET_RADIUS;

  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, vx: number, vy: number, ownerId: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.ownerId = ownerId;
    this.graphics = scene.add.circle(x, y, BULLET_RADIUS, 0xff4400);
  }

  update(dt: number, targetX: number, targetY: number, turnSpeed: number): void {
    if (!this.active) return;

    // Calculate desired angle to target
    const desiredAngle = Math.atan2(targetY - this.y, targetX - this.x);
    const currentAngle = Math.atan2(this.vy, this.vx);

    // Shortest angle difference
    let angleDiff = desiredAngle - currentAngle;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    // Clamp turn rate
    const maxTurn = turnSpeed * dt;
    const turn = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
    const newAngle = currentAngle + turn;

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    this.vx = Math.cos(newAngle) * speed;
    this.vy = Math.sin(newAngle) * speed;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.graphics.setPosition(this.x, this.y);
  }

  destroy(): void {
    this.active = false;
    this.graphics.destroy();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/objects/Rocket.ts
git commit -m "feat: add Rocket homing missile object"
```

---

## Task 8: Mine Object

**Files:**
- Create: `src/objects/Mine.ts`

- [ ] **Step 1: Create Mine.ts**

```typescript
// src/objects/Mine.ts
import Phaser from 'phaser';
import { MINE_TRIGGER_RADIUS } from '../config';

export class Mine {
  x: number;
  y: number;
  ownerId: number;
  active: boolean = true;
  triggerRadius: number = MINE_TRIGGER_RADIUS;

  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private age: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, ownerId: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.ownerId = ownerId;
    this.graphics = scene.add.graphics();
    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    // Visible to opponent: blinking red dot
    this.graphics.setPosition(this.x, this.y);
    this.graphics.fillStyle(0xff0000, 0.8);
    this.graphics.fillCircle(0, 0, 5);
    this.graphics.lineStyle(1, 0xff0000, 0.4);
    this.graphics.strokeCircle(0, 0, this.triggerRadius);
  }

  update(dt: number): void {
    if (!this.active) return;
    this.age += dt;
    // Blink effect
    const blink = Math.sin(this.age * 6) > 0 ? 0.8 : 0.3;
    this.graphics.clear();
    this.graphics.setPosition(this.x, this.y);
    this.graphics.fillStyle(0xff0000, blink);
    this.graphics.fillCircle(0, 0, 5);
    this.graphics.lineStyle(1, 0xff0000, 0.2);
    this.graphics.strokeCircle(0, 0, this.triggerRadius);
  }

  setAlphaForOwner(isOwner: boolean): void {
    this.graphics.setAlpha(isOwner ? 0.3 : 1);
  }

  destroy(): void {
    this.active = false;
    this.graphics.destroy();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/objects/Mine.ts
git commit -m "feat: add Mine object with blink and trigger radius"
```

---

## Task 9: PowerUpManager — Spawning & Lifecycle

**Files:**
- Create: `src/systems/PowerUpManager.ts`
- Create: `tests/systems/PowerUpManager.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/systems/PowerUpManager.test.ts
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
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run tests/systems/PowerUpManager.test.ts`
Expected: PASS (tests only validate enum data, not Phaser-dependent logic)

- [ ] **Step 3: Create PowerUpManager.ts**

```typescript
// src/systems/PowerUpManager.ts
import Phaser from 'phaser';
import { PowerUp } from '../objects/PowerUp';
import { PowerUpType, ALL_POWERUP_TYPES, POWERUP_VISUALS } from '../enums/PowerUpType';
import {
  POWERUP_SPAWN_INTERVAL_MIN, POWERUP_SPAWN_INTERVAL_MAX,
  POWERUP_MAX_ON_MAP, POWERUP_DESPAWN_TIME,
  POWERUP_RADIUS, MAZE_COLS, MAZE_ROWS, CELL_SIZE,
} from '../config';
import { Tank } from '../objects/Tank';
import { circleCircleOverlap } from '../utils/math';

export class PowerUpManager {
  private scene: Phaser.Scene;
  private powerUps: PowerUp[] = [];
  private spawnTimer: number;
  private wallData: Array<{ x: number; y: number; width: number; height: number }>;
  private tanks: Tank[];

  constructor(scene: Phaser.Scene, wallData: PowerUpManager['wallData'], tanks: Tank[]) {
    this.scene = scene;
    this.wallData = wallData;
    this.tanks = tanks;
    this.spawnTimer = this.randomInterval();
  }

  private randomInterval(): number {
    return POWERUP_SPAWN_INTERVAL_MIN + Math.random() * (POWERUP_SPAWN_INTERVAL_MAX - POWERUP_SPAWN_INTERVAL_MIN);
  }

  update(dt: number, time: number): void {
    // Spawn timer
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.powerUps.length < POWERUP_MAX_ON_MAP) {
      this.spawnPowerUp(time);
      this.spawnTimer = this.randomInterval();
    }

    // Update and despawn
    for (const pu of this.powerUps) {
      if (!pu.active) continue;
      pu.age += dt;
      if (pu.age >= POWERUP_DESPAWN_TIME) {
        pu.destroy();
        continue;
      }
      pu.draw(time);
    }

    // Clean destroyed
    this.powerUps = this.powerUps.filter(p => p.active);

    // Check collection
    this.checkCollections();
  }

  private spawnPowerUp(time: number): void {
    const pos = this.findEmptyPosition();
    if (!pos) return;

    const type = ALL_POWERUP_TYPES[Math.floor(Math.random() * ALL_POWERUP_TYPES.length)];
    const pu = new PowerUp(this.scene, pos.x, pos.y, type);
    this.powerUps.push(pu);
  }

  private findEmptyPosition(): { x: number; y: number } | null {
    const margin = CELL_SIZE * 0.5;
    for (let attempt = 0; attempt < 30; attempt++) {
      const col = Math.floor(Math.random() * MAZE_COLS);
      const row = Math.floor(Math.random() * MAZE_ROWS);
      const x = col * CELL_SIZE + CELL_SIZE / 2;
      const y = row * CELL_SIZE + CELL_SIZE / 2;

      // Check not overlapping walls
      let overlapsWall = false;
      for (const wd of this.wallData) {
        const closestX = Math.max(wd.x, Math.min(x, wd.x + wd.width));
        const closestY = Math.max(wd.y, Math.min(y, wd.y + wd.height));
        const dx = x - closestX;
        const dy = y - closestY;
        if (dx * dx + dy * dy < (POWERUP_RADIUS + margin) * (POWERUP_RADIUS + margin)) {
          overlapsWall = true;
          break;
        }
      }
      if (overlapsWall) continue;

      // Check not overlapping tanks
      let overlapsTank = false;
      for (const tank of this.tanks) {
        if (!tank.alive) continue;
        if (circleCircleOverlap(x, y, POWERUP_RADIUS, tank.x, tank.y, tank.radius + 20)) {
          overlapsTank = true;
          break;
        }
      }
      if (overlapsTank) continue;

      // Check not overlapping other power-ups
      let overlapsPowerUp = false;
      for (const pu of this.powerUps) {
        if (!pu.active) continue;
        if (circleCircleOverlap(x, y, POWERUP_RADIUS, pu.x, pu.y, POWERUP_RADIUS * 2)) {
          overlapsPowerUp = true;
          break;
        }
      }
      if (overlapsPowerUp) continue;

      return { x, y };
    }
    return null;
  }

  private checkCollections(): void {
    for (const pu of this.powerUps) {
      if (!pu.active) continue;
      for (const tank of this.tanks) {
        if (!tank.alive) continue;
        if (circleCircleOverlap(pu.x, pu.y, pu.radius, tank.x, tank.y, tank.radius)) {
          this.collect(tank, pu);
        }
      }
    }
  }

  private collect(tank: Tank, pu: PowerUp): void {
    // Replace existing passive effect if any
    if (tank.heldPowerUp && POWERUP_VISUALS[tank.heldPowerUp].passive) {
      tank.passiveEffects.delete(tank.heldPowerUp);
      tank.passiveTimers.delete(tank.heldPowerUp);
    }
    if (tank.heldPowerUp === PowerUpType.Shield) {
      tank.shieldActive = false;
    }

    tank.heldPowerUp = pu.type;
    pu.destroy();

    // Auto-apply passive effects
    if (POWERUP_VISUALS[pu.type].passive) {
      this.applyPassive(tank, pu.type);
    }

    // Emit pickup event for sound/HUD
    this.scene.events.emit('powerup-collected', { playerId: tank.playerId, type: pu.type });
  }

  private applyPassive(tank: Tank, type: PowerUpType): void {
    tank.passiveEffects.add(type);

    let duration = 0;
    switch (type) {
      case PowerUpType.Shield:
        tank.shieldActive = true;
        duration = 15;
        break;
      case PowerUpType.RapidFire:
        duration = 10;
        break;
      case PowerUpType.DoubleShot:
        duration = 10;
        break;
    }
    tank.passiveTimers.set(type, duration);
  }

  updatePassiveTimers(tank: Tank, dt: number): void {
    const expired: PowerUpType[] = [];
    for (const [type, remaining] of tank.passiveTimers) {
      const newTime = remaining - dt;
      if (newTime <= 0) {
        expired.push(type);
      } else {
        tank.passiveTimers.set(type, newTime);
      }
    }
    for (const type of expired) {
      tank.passiveEffects.delete(type);
      tank.passiveTimers.delete(type);
      if (type === PowerUpType.Shield) {
        tank.shieldActive = false;
      }
      if (tank.heldPowerUp === type) {
        tank.heldPowerUp = null;
      }
    }
  }

  getPowerUps(): PowerUp[] {
    return this.powerUps;
  }

  clearAll(): void {
    for (const pu of this.powerUps) pu.destroy();
    this.powerUps = [];
    for (const tank of this.tanks) {
      tank.clearPowerUps();
    }
    this.spawnTimer = this.randomInterval();
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/systems/PowerUpManager.ts tests/systems/PowerUpManager.test.ts
git commit -m "feat: add PowerUpManager with spawn, collect, and lifecycle"
```

---

## Task 10: PowerUpEffects — All Effect Functions

**Files:**
- Create: `src/systems/PowerUpEffects.ts`
- Create: `tests/systems/PowerUpEffects.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/systems/PowerUpEffects.test.ts
import { describe, it, expect } from 'vitest';
import { SHOTGUN_COUNT, SHOTGUN_SPREAD, DOUBLE_SHOT_SPREAD, ROCKET_SPEED } from '../../src/config';

describe('PowerUpEffects constants', () => {
  it('shotgun fires 5 bullets in 60 degree spread', () => {
    expect(SHOTGUN_COUNT).toBe(5);
    expect(SHOTGUN_SPREAD).toBeCloseTo(Math.PI / 3, 5);
  });

  it('double shot spread is ~8 degrees', () => {
    expect(DOUBLE_SHOT_SPREAD).toBeCloseTo(0.14, 2);
  });

  it('rocket speed is slower than bullet (300)', () => {
    expect(ROCKET_SPEED).toBeLessThan(300);
    expect(ROCKET_SPEED).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run tests/systems/PowerUpEffects.test.ts`
Expected: PASS

- [ ] **Step 3: Create PowerUpEffects.ts**

```typescript
// src/systems/PowerUpEffects.ts
import Phaser from 'phaser';
import {
  BULLET_SPEED, BULLET_SHOOT_COOLDOWN,
  DOUBLE_SHOT_SPREAD, LASER_LIFETIME,
  ROCKET_SPEED, ROCKET_TURN_SPEED,
  SHOTGUN_COUNT, SHOTGUN_SPREAD,
} from '../config';
import { Tank } from '../objects/Tank';
import { Bullet } from '../objects/Bullet';
import { Rocket } from '../objects/Rocket';
import { Mine } from '../objects/Mine';
import { circleRectOverlap, circleCircleOverlap, reflect } from '../utils/math';
import { PowerUpType } from '../enums/PowerUpType';

export interface LaserSegment {
  x1: number; y1: number;
  x2: number; y2: number;
}

export function getEffectiveCooldown(tank: Tank): number {
  if (tank.passiveEffects.has(PowerUpType.RapidFire)) {
    return BULLET_SHOOT_COOLDOWN / 2;
  }
  return BULLET_SHOOT_COOLDOWN;
}

export function createBulletsForShot(
  scene: Phaser.Scene,
  tank: Tank,
  currentTimeMs: number
): Bullet[] {
  const tip = tank.getBarrelTip();
  const baseAngle = tank.rotation;
  const bullets: Bullet[] = [];

  if (tank.passiveEffects.has(PowerUpType.DoubleShot)) {
    // Two bullets at ±spread
    for (const offset of [-DOUBLE_SHOT_SPREAD, DOUBLE_SHOT_SPREAD]) {
      const angle = baseAngle + offset;
      const vx = Math.cos(angle) * BULLET_SPEED;
      const vy = Math.sin(angle) * BULLET_SPEED;
      bullets.push(new Bullet(scene, tip.x, tip.y, vx, vy, tank.playerId, currentTimeMs / 1000));
    }
  } else {
    const vx = Math.cos(baseAngle) * BULLET_SPEED;
    const vy = Math.sin(baseAngle) * BULLET_SPEED;
    bullets.push(new Bullet(scene, tip.x, tip.y, vx, vy, tank.playerId, currentTimeMs / 1000));
  }

  return bullets;
}

export function fireLaser(
  scene: Phaser.Scene,
  tank: Tank,
  wallData: Array<{ x: number; y: number; width: number; height: number; orientation: 'vertical' | 'horizontal' }>,
  tanks: Tank[],
  soundManager: { laserFire(): void }
): { graphics: Phaser.GameObjects.Graphics; segments: LaserSegment[]; hitPlayerId: number | null } {
  const tip = tank.getBarrelTip();
  const segments: LaserSegment[] = [];
  let x = tip.x;
  let y = tip.y;
  let vx = Math.cos(tank.rotation);
  let vy = Math.sin(tank.rotation);
  let hitPlayerId: number | null = null;

  const maxBounces = 8;
  const maxLength = 2000;

  for (let bounce = 0; bounce <= maxBounces; bounce++) {
    let nearestDist = maxLength;
    let nearestX = x + vx * maxLength;
    let nearestY = y + vy * maxLength;
    let hitOrientation: 'vertical' | 'horizontal' | null = null;

    // Check wall intersections
    for (const wd of wallData) {
      const result = lineRectIntersection(x, y, vx, vy, wd.x, wd.y, wd.width, wd.height);
      if (result && result.dist < nearestDist) {
        nearestDist = result.dist;
        nearestX = result.x;
        nearestY = result.y;
        hitOrientation = wd.orientation;
      }
    }

    segments.push({ x1: x, y1: y, x2: nearestX, y2: nearestY });

    // Check tank hits along this segment
    if (hitPlayerId === null) {
      for (const t of tanks) {
        if (!t.alive || t.playerId === tank.playerId) continue;
        if (lineCircleIntersect(x, y, nearestX, nearestY, t.x, t.y, t.radius)) {
          hitPlayerId = t.playerId;
        }
      }
    }

    if (!hitOrientation) break;

    // Reflect
    const reflected = reflect(vx, vy, hitOrientation);
    vx = reflected.vx;
    vy = reflected.vy;
    x = nearestX + vx * 1;
    y = nearestY + vy * 1;
  }

  // Draw laser
  const graphics = scene.add.graphics().setDepth(50);
  graphics.lineStyle(3, 0xff0000, 0.9);
  for (const seg of segments) {
    graphics.lineBetween(seg.x1, seg.y1, seg.x2, seg.y2);
  }
  // Glow
  graphics.lineStyle(8, 0xff0000, 0.3);
  for (const seg of segments) {
    graphics.lineBetween(seg.x1, seg.y1, seg.x2, seg.y2);
  }

  soundManager.laserFire();

  return { graphics, segments, hitPlayerId };
}

export function fireRocket(
  scene: Phaser.Scene,
  tank: Tank
): Rocket {
  const tip = tank.getBarrelTip();
  const vx = Math.cos(tank.rotation) * ROCKET_SPEED;
  const vy = Math.sin(tank.rotation) * ROCKET_SPEED;
  return new Rocket(scene, tip.x, tip.y, vx, vy, tank.playerId);
}

export function placeMine(
  scene: Phaser.Scene,
  tank: Tank,
  existingMine: Mine | null
): Mine {
  if (existingMine && existingMine.active) {
    existingMine.destroy();
  }
  return new Mine(scene, tank.x, tank.y, tank.playerId);
}

export function fireShotgun(
  scene: Phaser.Scene,
  tank: Tank,
  currentTimeMs: number
): Bullet[] {
  const tip = tank.getBarrelTip();
  const baseAngle = tank.rotation;
  const bullets: Bullet[] = [];

  for (let i = 0; i < SHOTGUN_COUNT; i++) {
    const offset = -SHOTGUN_SPREAD / 2 + (SHOTGUN_SPREAD / (SHOTGUN_COUNT - 1)) * i;
    const angle = baseAngle + offset;
    const vx = Math.cos(angle) * BULLET_SPEED;
    const vy = Math.sin(angle) * BULLET_SPEED;
    bullets.push(new Bullet(scene, tip.x, tip.y, vx, vy, tank.playerId, currentTimeMs / 1000));
  }

  return bullets;
}

// --- Math helpers ---

function lineRectIntersection(
  ox: number, oy: number, dx: number, dy: number,
  rx: number, ry: number, rw: number, rh: number
): { x: number; y: number; dist: number } | null {
  let minDist = Infinity;
  let result: { x: number; y: number; dist: number } | null = null;

  // Check all 4 edges
  const edges = [
    { x1: rx, y1: ry, x2: rx + rw, y2: ry },         // top
    { x1: rx, y1: ry + rh, x2: rx + rw, y2: ry + rh }, // bottom
    { x1: rx, y1: ry, x2: rx, y2: ry + rh },           // left
    { x1: rx + rw, y1: ry, x2: rx + rw, y2: ry + rh }, // right
  ];

  for (const edge of edges) {
    const hit = lineLineIntersection(ox, oy, ox + dx, oy + dy, edge.x1, edge.y1, edge.x2, edge.y2);
    if (hit) {
      const dist = Math.sqrt((hit.x - ox) ** 2 + (hit.y - oy) ** 2);
      if (dist > 0.1 && dist < minDist) {
        minDist = dist;
        result = { x: hit.x, y: hit.y, dist };
      }
    }
  }

  return result;
}

function lineLineIntersection(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): { x: number; y: number } | null {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.0001) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  }
  return null;
}

function lineCircleIntersect(
  x1: number, y1: number, x2: number, y2: number,
  cx: number, cy: number, r: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;

  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return false;

  discriminant = Math.sqrt(discriminant);
  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);

  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/systems/PowerUpEffects.ts tests/systems/PowerUpEffects.test.ts
git commit -m "feat: add PowerUpEffects with all 7 power-up implementations"
```

---

## Task 11: GameScene Integration — Core Wiring

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Add imports**

Add to the imports in GameScene.ts:

```typescript
import { PowerUpType, POWERUP_VISUALS } from '../enums/PowerUpType';
import { PowerUpManager } from '../systems/PowerUpManager';
import { getEffectiveCooldown, createBulletsForShot, fireLaser, fireRocket, placeMine, fireShotgun } from '../systems/PowerUpEffects';
import { Rocket } from '../objects/Rocket';
import { Mine } from '../objects/Mine';
import {
  SHIELD_DURATION, RAPID_FIRE_DURATION, DOUBLE_SHOT_DURATION,
  ROCKET_TURN_SPEED, LASER_LIFETIME, POWERUP_RADIUS,
} from '../config';
```

- [ ] **Step 2: Add state fields to GameScene class**

Add after `private soundManager!: SoundManager;`:

```typescript
  private powerUpManager!: PowerUpManager;
  private rockets: Rocket[] = [];
  private mines: Mine[] = [];
  private laserGraphics: Phaser.GameObjects.Graphics | null = null;
  private laserTimer: number = 0;
  private laserHitPlayerId: number | null = null;
  private collectionText!: Phaser.GameObjects.Text;
```

- [ ] **Step 3: Initialize in create()**

After `this.ammoBarP2 = this.add.graphics().setDepth(100);`, add:

```typescript
    this.collectionText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, '', {
      fontSize: '20px',
      color: '#ffff00',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    this.rockets = [];
    this.mines = [];
    this.laserGraphics = null;
    this.laserTimer = 0;
```

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: add power-up imports and state fields to GameScene"
```

---

## Task 12: GameScene Integration — PowerUpManager Init & Update

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Initialize PowerUpManager in startRound()**

In `startRound()`, after the tanks are created (after `this.tanks.push(new Tank(this, maze.spawn2.x, maze.spawn2.y, Math.PI, 1));`), add:

```typescript
    this.powerUpManager = new PowerUpManager(this, this.wallData, this.tanks);
```

Also in `startRound()`, before the tank creation, clean up old rockets/mines/lasers:

After the bullet cleanup loop, add:

```typescript
    for (const rocket of this.rockets) rocket.destroy();
    this.rockets = [];
    for (const mine of this.mines) mine.destroy();
    this.mines = [];
    if (this.laserGraphics) { this.laserGraphics.destroy(); this.laserGraphics = null; }
    this.laserTimer = 0;
```

- [ ] **Step 2: Add power-up update logic to update()**

In the `update()` method, after the `this.drawAmmoBars();` call, add:

```typescript
    // Power-up manager
    this.powerUpManager.update(dt, this.time.now);

    // Passive timer tick
    for (const tank of this.tanks) {
      this.powerUpManager.updatePassiveTimers(tank, dt);
    }

    // Laser timer
    if (this.laserTimer > 0) {
      this.laserTimer -= dt;
      if (this.laserTimer <= 0 && this.laserGraphics) {
        this.laserGraphics.destroy();
        this.laserGraphics = null;
        // Apply laser damage
        if (this.laserHitPlayerId !== null) {
          const target = this.tanks.find(t => t.playerId === this.laserHitPlayerId);
          if (target && target.alive) {
            if (target.shieldActive) {
              target.shieldActive = false;
              target.passiveEffects.delete(PowerUpType.Shield);
              target.passiveTimers.delete(PowerUpType.Shield);
              this.soundManager.shieldBreak();
            } else {
              this.resolveRound([this.laserHitPlayerId]);
            }
          }
          this.laserHitPlayerId = null;
        }
      }
    }

    // Update rockets
    for (const rocket of this.rockets) {
      if (!rocket.active) continue;
      const target = this.tanks.find(t => t.alive && t.playerId !== rocket.ownerId);
      if (target) {
        rocket.update(dt, target.x, target.y, ROCKET_TURN_SPEED);
      }
    }

    // Rocket-wall collision (explode on contact)
    this.rockets = this.rockets.filter(rocket => {
      if (!rocket.active) { rocket.destroy(); return false; }
      for (const wd of this.wallData) {
        if (circleRectOverlap(rocket.x, rocket.y, rocket.radius, wd.x, wd.y, wd.width, wd.height)) {
          rocket.destroy();
          this.soundManager.explosion();
          return false;
        }
      }
      return true;
    });

    // Rocket-tank collision
    this.rockets = this.rockets.filter(rocket => {
      if (!rocket.active) { rocket.destroy(); return false; }
      for (const tank of this.tanks) {
        if (!tank.alive || tank.playerId === rocket.ownerId) continue;
        if (circleCircleOverlap(rocket.x, rocket.y, rocket.radius, tank.x, tank.y, tank.radius)) {
          if (tank.shieldActive) {
            tank.shieldActive = false;
            tank.passiveEffects.delete(PowerUpType.Shield);
            tank.passiveTimers.delete(PowerUpType.Shield);
            this.soundManager.shieldBreak();
            rocket.destroy();
            return false;
          }
          this.resolveRound([tank.playerId]);
          rocket.destroy();
          return false;
        }
      }
      return true;
    });

    // Update mines
    for (const mine of this.mines) {
      if (!mine.active) continue;
      mine.update(dt);
      // Check trigger (only for opponent)
      for (const tank of this.tanks) {
        if (!tank.alive || tank.playerId === mine.ownerId) continue;
        if (circleCircleOverlap(mine.x, mine.y, mine.triggerRadius, tank.x, tank.y, tank.radius)) {
          if (tank.shieldActive) {
            tank.shieldActive = false;
            tank.passiveEffects.delete(PowerUpType.Shield);
            tank.passiveTimers.delete(PowerUpType.Shield);
            this.soundManager.shieldBreak();
          } else {
            this.soundManager.mineExplode();
            this.resolveRound([tank.playerId]);
          }
          mine.destroy();
        }
      }
    }
    this.mines = this.mines.filter(m => m.active);

    // Handle use-power-up input
    this.handleUsePowerUp(this.tanks[0], p1.usePowerUp);
    this.handleUsePowerUp(this.tanks[1], p2.usePowerUp);
```

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: integrate PowerUpManager, rockets, mines into update loop"
```

---

## Task 13: GameScene Integration — Use PowerUp & Modified Shoot

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Add handleUsePowerUp method**

Add this private method to GameScene:

```typescript
  private handleUsePowerUp(tank: Tank, usePressed: boolean): void {
    if (!usePressed) return;
    if (!tank.heldPowerUp) return;
    if (POWERUP_VISUALS[tank.heldPowerUp].passive) return; // passive don't need use key

    const type = tank.heldPowerUp;
    tank.heldPowerUp = null;

    switch (type) {
      case PowerUpType.Laser: {
        const result = fireLaser(this, tank, this.wallData, this.tanks, this.soundManager);
        this.laserGraphics = result.graphics;
        this.laserTimer = LASER_LIFETIME;
        this.laserHitPlayerId = result.hitPlayerId;
        break;
      }
      case PowerUpType.Rocket: {
        const rocket = fireRocket(this, tank);
        this.rockets.push(rocket);
        this.soundManager.rocketFire();
        break;
      }
      case PowerUpType.Mine: {
        const mine = placeMine(this, tank, this.mines.find(m => m.ownerId === tank.playerId && m.active) ?? null);
        this.mines.push(mine);
        mine.setAlphaForOwner(true);
        this.soundManager.minePlace();
        break;
      }
      case PowerUpType.Shotgun: {
        const bullets = fireShotgun(this, tank, this.time.now);
        for (const b of bullets) this.bullets.push(b);
        this.soundManager.shotgunFire();
        break;
      }
    }
  }
```

- [ ] **Step 2: Modify handleShoot to use passive effects**

Replace the `handleShoot` method:

```typescript
  private handleShoot(tank: Tank, shootPressed: boolean, currentTimeMs: number): void {
    if (!shootPressed) return;
    if (tank.shootCooldown > 0) return;
    if (tank.ammo <= 0) return;

    const cooldown = getEffectiveCooldown(tank);
    const bullets = createBulletsForShot(this, tank, currentTimeMs);
    for (const bullet of bullets) {
      this.bullets.push(bullet);
    }
    this.soundManager.shoot();
    tank.ammo--;
    tank.shootCooldown = cooldown;

    this.time.addEvent({
      delay: cooldown * 1000,
      callback: () => { tank.shootCooldown = 0; },
    });
  }
```

- [ ] **Step 3: Modify bullet-tank collision to check shield**

In the `update()` method, find the bullet-tank collision loop and replace the `deadPlayers.push(tank.playerId);` line with:

```typescript
          if (tank.shieldActive) {
            tank.shieldActive = false;
            tank.passiveEffects.delete(PowerUpType.Shield);
            tank.passiveTimers.delete(PowerUpType.Shield);
            bullet.state.active = false;
            this.soundManager.shieldBreak();
          } else {
            deadPlayers.push(tank.playerId);
          }
```

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: add usePowerUp handler and passive effect integration"
```

---

## Task 14: GameScene Integration — HUD & Sound Events

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Add power-up HUD drawing method**

Add this private method to GameScene:

```typescript
  private drawPowerUpHUD(): void {
    const drawForPlayer = (tank: Tank, x: number) => {
      if (!tank.heldPowerUp) return;
      const visual = POWERUP_VISUALS[tank.heldPowerUp];

      // Icon background
      this.ammoBarP1.fillStyle(0x000000, 0.6);
      this.ammoBarP1.fillRect(x, 65, 24, 24);
      this.ammoBarP1.fillStyle(visual.color, 1);
      this.ammoBarP1.fillCircle(x + 12, 77, 8);
      this.ammoBarP1.lineStyle(1, 0xffffff, 0.5);
      this.ammoBarP1.strokeRect(x, 65, 24, 24);

      // Timer bar for passive effects
      if (visual.passive && tank.passiveTimers.has(tank.heldPowerUp)) {
        const remaining = tank.passiveTimers.get(tank.heldPowerUp)!;
        const maxDuration = tank.heldPowerUp === PowerUpType.Shield ? SHIELD_DURATION :
                           RAPID_FIRE_DURATION;
        const ratio = remaining / maxDuration;
        this.ammoBarP1.fillStyle(0x333333, 1);
        this.ammoBarP1.fillRect(x, 90, 24, 4);
        this.ammoBarP1.fillStyle(visual.color, 1);
        this.ammoBarP1.fillRect(x, 90, 24 * ratio, 4);
      }
    };

    // P1 - reuse ammoBarP1 graphics (it's already cleared in drawAmmoBars)
    if (this.tanks[0]) drawForPlayer(this.tanks[0], 10);

    // P2 - reuse ammoBarP2 graphics
    if (this.tanks[1]) {
      const tank = this.tanks[1];
      if (tank.heldPowerUp) {
        const visual = POWERUP_VISUALS[tank.heldPowerUp];
        const x = GAME_WIDTH - 34;
        this.ammoBarP2.fillStyle(0x000000, 0.6);
        this.ammoBarP2.fillRect(x, 65, 24, 24);
        this.ammoBarP2.fillStyle(visual.color, 1);
        this.ammoBarP2.fillCircle(x + 12, 77, 8);
        this.ammoBarP2.lineStyle(1, 0xffffff, 0.5);
        this.ammoBarP2.strokeRect(x, 65, 24, 24);

        if (visual.passive && tank.passiveTimers.has(tank.heldPowerUp!)) {
          const remaining = tank.passiveTimers.get(tank.heldPowerUp!)!;
          const maxDuration = tank.heldPowerUp === PowerUpType.Shield ? SHIELD_DURATION :
                             RAPID_FIRE_DURATION;
          const ratio = remaining / maxDuration;
          this.ammoBarP2.fillStyle(0x333333, 1);
          this.ammoBarP2.fillRect(x, 90, 24, 4);
          this.ammoBarP2.fillStyle(visual.color, 1);
          this.ammoBarP2.fillRect(x, 90, 24 * ratio, 4);
        }
      }
    }
  }
```

- [ ] **Step 2: Call drawPowerUpHUD in update()**

In the `drawAmmoBars()` method, at the end, add a call to draw the power-up HUD. Actually, simpler: call `this.drawPowerUpHUD()` right after `this.drawAmmoBars()` in `update()`:

After `this.drawAmmoBars();`, add:

```typescript
    this.drawPowerUpHUD();
```

- [ ] **Step 3: Add collection event listener for sound and text**

In `create()`, after `this.soundManager = new SoundManager();`, add:

```typescript
    this.events.on('powerup-collected', (data: { playerId: number; type: PowerUpType }) => {
      this.soundManager.powerUpPickup();
      const visual = POWERUP_VISUALS[data.type];
      this.collectionText.setText(visual.label);
      this.collectionText.setColor('#' + visual.color.toString(16).padStart(6, '0'));
      this.collectionText.setAlpha(1);
      this.time.delayedCall(1000, () => {
        this.collectionText.setAlpha(0);
      });
    });
```

- [ ] **Step 4: Clear power-ups on round resolve**

In `resolveRound()`, after `this.roundState = RoundState.ROUND_OVER;`, add:

```typescript
    this.powerUpManager.clearAll();
    for (const rocket of this.rockets) rocket.destroy();
    this.rockets = [];
    for (const mine of this.mines) mine.destroy();
    this.mines = [];
    if (this.laserGraphics) { this.laserGraphics.destroy(); this.laserGraphics = null; }
```

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: add power-up HUD, sound events, and round cleanup"
```

---

## Task 15: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run dev server for gameplay test**

Run: `npm run dev`
Test the following:
- Power-ups spawn every 8-15 seconds in the maze
- Driving over a power-up collects it (hear pickup sound)
- Passive effects work: shield absorbs hit, rapid fire speeds up shooting, double shot fires 2 bullets
- Active effects work: press E (P1) or . (P2) to use laser/rocket/mine/shotgun
- Laser beam visible for 0.3s, kills on contact
- Rocket homes toward opponent, explodes on wall
- Mine placed behind tank, triggers when opponent drives over
- Shotgun fires 5 bullets in fan pattern
- HUD shows collected power-up icon and timer for passives
- Collection text fades in/out at center
- Power-ups clear between rounds
- All 7 sound effects play correctly

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: polish power-up system"
```
