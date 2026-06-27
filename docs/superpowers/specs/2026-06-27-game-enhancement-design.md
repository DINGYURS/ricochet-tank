# Ricochet Tank — Game Enhancement Design

## Overview

Enhance the existing Ricochet Tank game with three features: ammo system, pixel art tanks, and 8-bit sound effects. Implemented incrementally in order: bullet/ammo → tank model → sound.

---

## 1. Bullet / Ammo System

### Requirements

- Each tank starts each round with 10 bullets
- Multiple bullets can be active simultaneously (remove single-bullet-per-player restriction)
- Shooting cooldown between consecutive shots: 0.3 seconds
- Every 3 minutes (180 seconds), ammo refills to 10 regardless of current count
- HUD displays ammo count as an energy bar

### Config Changes (`src/config.ts`)

| Constant | Value | Notes |
|----------|-------|-------|
| `AMMO_MAX` | 10 | Max bullets per tank per refill cycle |
| `AMMO_REFILL_INTERVAL` | 180 | Seconds between auto-refills |
| `BULLET_SHOOT_COOLDOWN` | 0.3 | Reduced from 0.8 |

### Tank Class Changes (`src/objects/Tank.ts`)

- Add `ammo: number = AMMO_MAX` field
- Add `ammoRefillTimer: number = 0` field (tracks elapsed time since last refill)

### GameScene Changes (`src/scenes/GameScene.ts`)

**handleShoot modifications:**
1. Remove the check: `const existingBullet = this.bullets.find(b => b.state.ownerId === tank.playerId && b.state.active); if (existingBullet) return;`
2. Add check: if `tank.ammo <= 0`, return
3. After firing: `tank.ammo--`

**update loop additions:**
1. Increment each tank's `ammoRefillTimer` by `dt`
2. When `ammoRefillTimer >= AMMO_REFILL_INTERVAL`: reset timer, set `ammo = AMMO_MAX`
3. Refill timer resets at round start (already handled by tank re-creation)

**HUD display:**
- Position: below score text, left side for P1, right side for P2
- Style: horizontal energy bar
  - Full ammo: colored bar (P1 blue, P2 red)
  - Used ammo: bar shortens proportionally
  - Empty: bar fully depleted (gray)
- Implementation: two `Graphics` objects drawn each frame based on current `tank.ammo / AMMO_MAX`

---

## 2. Tank Pixel Model

### Requirements

- Classic pixel art style, similar to NES/GBA Battle City
- 16x16 logical pixel grid, each pixel = 2x2 screen pixels
- Total tank size: ~32x32 screen pixels
- Simplified design: body, barrel, track distinction only
- Code-drawn using Phaser Graphics API (`fillRect` for each pixel block)
- Rotation via `rotateCanvas()` on a single base pattern (pointing up)

### Config Changes (`src/config.ts`)

| Constant | Value | Notes |
|----------|-------|-------|
| `PIXEL_SIZE` | 2 | Screen pixels per logical pixel |
| `TANK_GRID_SIZE` | 16 | Logical pixels per side |
| `TANK_RADIUS` | 14 | Keep existing collision radius |

Remove or mark as unused: `TANK_BODY_WIDTH`, `TANK_BODY_HEIGHT`, `TANK_BARREL_WIDTH`, `TANK_BARREL_HEIGHT`

### Tank Class Changes (`src/objects/Tank.ts`)

**Base pixel pattern** (16x16 grid, pointing up, origin at center):

```
Row 0:  . . . . . . ■ ■ ■ ■ . . . . . .   ← barrel tip
Row 1:  . . . . . . ■ ■ ■ ■ . . . . . .   ← barrel
Row 2:  . . . . ■ ■ ■ ■ ■ ■ ■ ■ . . . .
Row 3:  . . . ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ . . .   ← turret
Row 4:  . . . ■ ■ . ■ ■ ■ ■ . ■ ■ . . .
Row 5:  . . ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ . .
Row 6:  . . ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ . .
Row 7:  . ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ .
Row 8:  . ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ .   ← main body
Row 9:  . ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ .
Row 10: . . ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ . .
Row 11: . . ■ □ ■ ■ ■ ■ ■ ■ ■ ■ □ ■ . .   ← track detail
Row 12: . . ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ . .
Row 13: . . ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ . .
Row 14: . . . □ □ . . . . . . □ □ . . .   ← track bottom
Row 15: . . . □ □ . . . . . . □ □ . . .
```

**Legend:**
- `■` = body color (P1: blue `#4488ff`, P2: red `#ff4444`)
- `□` = track color (darker shade: P1: `#2255aa`, P2: `#aa2222`)
- `.` = transparent

**Barrel:** rows 0-1, columns 6-9 (4 pixels wide, 2 pixels tall)
**Turret:** rows 2-4, larger area with lighter center
**Body:** rows 5-10, widest section
**Tracks:** rows 11-14, sides with darker color

**draw() method rewrite:**
1. Clear graphics
2. Translate to tank position
3. Rotate by `this.rotation`
4. Iterate over 16x16 grid, call `fillRect()` for each non-transparent pixel
5. Use different colors for body vs track pixels based on `playerId`

### Barrel Tip Calculation

Update `getBarrelTip()` to match new pixel grid:
- Barrel tip is at grid row 0, center (columns 6-9)
- Offset from center: approximately 14 pixels up (7 logical pixels × 2px)
- Use the same rotation math as before: `x + cos(rotation) * offset, y + sin(rotation) * offset`

---

## 3. Sound System

### Requirements

- 8-bit style synthesized sounds using Web Audio API
- No external audio files needed
- 5 sound types: shoot, bounce, explosion, countdown tick, round victory

### New File: `src/systems/SoundManager.ts`

```
class SoundManager {
  private ctx: AudioContext

  constructor() // lazily create AudioContext on first user interaction

  shoot(): void
    - Square wave, frequency sweep 800Hz → 200Hz
    - Duration: 0.1s
    - Quick "pew" sound

  bounce(): void
    - Square wave, single tone 440Hz
    - Duration: 0.05s
    - Short "tick" sound

  explosion(): void
    - White noise (random samples)
    - Exponential decay envelope
    - Duration: 0.3s
    - "Boom" with rumble

  countdownTick(): void
    - Square wave, ascending 400Hz → 600Hz
    - Duration: 0.15s
    - "Beep" alert sound

  victory(): void
    - Three ascending square wave tones: C5→E5→G5
    - Quick succession (0.1s each)
    - Triumphant chord
}
```

### Audio Context Handling

- Create `AudioContext` lazily on first sound call
- Check for `AudioContext` suspend state, call `resume()` if needed
- Each sound creates temporary oscillator/noise nodes, connects to destination, schedules stop

### Integration Points

| Event | Method | Location in GameScene |
|-------|--------|----------------------|
| Player shoots | `soundManager.shoot()` | `handleShoot()` after bullet creation |
| Bullet hits wall | `soundManager.bounce()` | `handleBulletWallCollision()` on collision |
| Tank destroyed | `soundManager.explosion()` | `resolveRound()` when player dies |
| Countdown tick | `soundManager.countdownTick()` | Countdown phase timer events |
| Round victory | `soundManager.victory()` | `resolveRound()` after score update |

### GameScene Changes

- Add `private soundManager: SoundManager` field
- Initialize in `create()`
- Add sound calls at each integration point listed above

---

## Implementation Order

1. **Bullet/Ammo System** — `config.ts`, `Tank.ts`, `GameScene.ts`
2. **Tank Pixel Model** — `Tank.ts`, `config.ts`, `GameScene.ts` (barrel tip)
3. **Sound System** — new `SoundManager.ts`, `GameScene.ts`

Each step is independently testable by running `npm run dev`.
