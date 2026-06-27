# Power-Up System Design Spec

**Date:** 2026-06-27
**Status:** Approved
**Game:** Ricochet Tank (Phaser 3 + TypeScript)

---

## Overview

Add a full power-up (道具) system to Ricochet Tank, inspired by the classic Tank Trouble game. Power-ups spawn randomly in the maze, can be collected by driving over them, and grant temporary abilities or one-time-use weapons.

---

## Power-Up Types (7 total)

| # | Name | Chinese | Effect | Type | Duration |
|---|------|---------|--------|------|----------|
| 1 | Shield | 护盾 | Absorbs one hit, then breaks | Passive | Until hit or 15s |
| 2 | Rapid Fire | 快速射击 | Shoot cooldown halved (0.1s → 0.05s) | Passive | 10s |
| 3 | Double Shot | 双发 | Fires 2 bullets per shot (±8° spread) | Passive | 10s |
| 4 | Laser | 激光 | Instant beam, bounces off walls, kills on contact | Active | One use |
| 5 | Rocket | 追踪导弹 | Slow homing missile that tracks opponent | Active | One use |
| 6 | Mine | 地雷 | Place invisible mine at current position | Active | One use |
| 7 | Shotgun | 散弹 | Fires 5 bullets in 60° fan | Active | One use |

### Collection Rules

- Each player can hold **one power-up at a time**
- Picking up a new power-up **replaces** the old one
- **Passive** power-ups activate automatically on collection
- **Active** power-ups show in HUD; press dedicated use key to activate
  - P1 use key: `E`
  - P2 use key: `.` (period)

---

## Spawning System

- Every **8–15 seconds** (random interval), spawn a power-up at a random empty cell in the maze
- Maximum **2 uncollected** power-ups on the map at once
- Uncollected power-ups **disappear after 20 seconds**
- Spawn position must not overlap with walls, tanks, or other power-ups

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/config.ts` | Modify | Add power-up constants (spawn interval, max on map, durations) |
| `src/enums/PowerUpType.ts` | Create | `PowerUpType` enum |
| `src/objects/PowerUp.ts` | Create | Power-up game object (visual, position, type) |
| `src/systems/PowerUpManager.ts` | Create | Spawn logic, collision detection, lifecycle management |
| `src/systems/PowerUpEffects.ts` | Create | Effect implementation for each power-up type |
| `src/objects/Tank.ts` | Modify | Add power-up state fields (activePowerUp, shieldActive, passive timers) |
| `src/scenes/GameScene.ts` | Modify | Integrate PowerUpManager, add use-key input, update HUD |
| `src/systems/SoundManager.ts` | Modify | Add power-up sound effects |

---

## Detailed Behavior

### 🛡️ Shield

- On collection: blue ring appears around tank
- Absorbs **one** bullet hit — bullet disappears, shield breaks
- Auto-expires after **15 seconds** if not hit
- Breaking plays a glass-shatter sound effect

### ⚡ Rapid Fire

- Shoot cooldown reduced from `0.1s` to `0.05s`
- Lasts **10 seconds**
- No extra visual — faster shooting rate is its own feedback
- Can stack with Double Shot

### 🔫 Double Shot

- Each shot fires **2 bullets** at **±8°** offset from barrel direction
- Lasts **10 seconds**
- Can stack with Rapid Fire

### 🔴 Laser

- Fires a **red beam** from barrel tip
- Beam path: traces line from barrel, bouncing off walls (max 8 bounces)
- Any tank touching the beam path **dies instantly** (shield absorbs the hit if active)
- Beam visible for **0.3 seconds** then disappears
- Beam uses line-segment vs circle collision detection

### 🚀 Rocket (Heat-Seeking Missile)

- Fires from barrel tip, speed **200** (slower than normal bullet at 300)
- Each frame, rotates toward opponent at **2 rad/s** angular speed
- Does **NOT** bounce off walls — explodes on wall contact
- Damages opponent on contact
- Red/orange colored with smoke trail

### 💣 Mine

- Placed at the tank's **current position** (center of tank)
- **Semi-transparent** to the placer (50% alpha); opponent sees a **blinking red dot**
- Opponent tank proximity trigger: circle-circle overlap with mine radius 40 and opponent tank radius
- Explosion damages opponent
- Only **1 mine** per player at a time — new mine replaces old one
- Mine persists across the round until triggered or replaced

### 🔫 Shotgun

- Fires **5 bullets** in a **60° fan** (±30° from barrel direction, 15° intervals)
- Each bullet has normal speed (300) and normal bounce behavior
- Each bullet tracks independently

---

## Visual Design

### Map Power-Up Appearance

- **16×16 pixel** floating icons with simple geometric shapes
- Each type has a distinct color and icon:

| Type | Color | Icon |
|------|-------|------|
| Shield | Blue #4488ff | Circle outline |
| Rapid Fire | Yellow #ffff00 | Lightning bolt |
| Double Shot | Green #44ff44 | Two vertical lines |
| Laser | Red #ff0000 | Horizontal line |
| Rocket | Orange #ff8800 | Triangle |
| Mine | Purple #8844ff | Filled circle |
| Shotgun | Pink #ff4488 | Fan shape |

- Power-ups **float up and down** with a sine wave animation (amplitude 3px, period 1.5s)
- Power-ups **rotate slowly** (visual flair)

### HUD Display

- Bottom-left (P1) / bottom-right (P2) corner shows **collected power-up icon**
- Passive power-ups show a **remaining-time bar** below the icon
- On collection: **power-up name text** fades in and out at center screen (1 second)

---

## Sound Effects

| Event | Sound Description |
|-------|-------------------|
| Pickup | Ascending bleep (C5 → E5 → G5) |
| Shield break | Glass/crystal shatter (noise burst, high-pass filtered) |
| Laser fire | Sustained buzz (sawtooth, 440Hz, 0.2s) |
| Rocket fire | Low whoosh (noise, low-pass sweep, 0.3s) |
| Mine place | Click (short square pulse, 1000Hz, 0.02s) |
| Mine explode | Deep explosion (noise burst, longer decay than normal explosion) |
| Shotgun fire | Multi-layered burst (3 oscillators, staggered) |

---

## Config Additions

```typescript
// Power-ups
export const POWERUP_SPAWN_INTERVAL_MIN = 8;   // seconds
export const POWERUP_SPAWN_INTERVAL_MAX = 15;   // seconds
export const POWERUP_MAX_ON_MAP = 2;
export const POWERUP_DESPAWN_TIME = 20;         // seconds uncollected
export const POWERUP_RADIUS = 12;               // collision radius

export const SHIELD_DURATION = 15;              // seconds
export const RAPID_FIRE_DURATION = 10;          // seconds
export const DOUBLE_SHOT_DURATION = 10;         // seconds
export const DOUBLE_SHOT_SPREAD = 0.14;         // radians (~8°)
export const LASER_LIFETIME = 0.3;              // seconds visible
export const ROCKET_SPEED = 200;                // px/s
export const ROCKET_TURN_SPEED = 2;             // rad/s
export const MINE_RADIUS = 40;                  // trigger radius
export const SHOTGUN_COUNT = 5;
export const SHOTGUN_SPREAD = Math.PI / 3;      // 60° total
```

---

## Input Changes

Extend `InputManager` to expose a new `usePowerUp` boolean:

- P1: `E` key
- P2: `.` (period) key

```typescript
interface PlayerInput {
  forward: boolean;
  backward: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
  shoot: boolean;
  usePowerUp: boolean;  // NEW
}
```

---

## Integration Points

1. **GameScene.create()** — Initialize `PowerUpManager`
2. **GameScene.update()** — Call `powerUpManager.update(dt)`, handle use-key input
3. **GameScene.handleShoot()** — Check passive effects (Rapid Fire cooldown, Double Shot multi-bullet)
4. **Bullet-tank collision** — Check shield before applying damage
5. **New round** — Clear all power-ups, mines, and passive effects
6. **resolveRound()** — Clear power-up state before next round

---

## Scope Boundaries

- **In scope:** All 7 power-ups, spawning system, HUD, sounds, pixel art icons
- **Out of scope:** AI opponents, network multiplayer, power-up configuration UI
