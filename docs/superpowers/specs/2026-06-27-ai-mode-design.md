# AI Mode Design Spec

**Date:** 2026-06-27
**Status:** Draft
**Game:** Ricochet Tank (Phaser 3 + TypeScript)

---

## Overview

Add a single-player AI mode to Ricochet Tank, allowing players to fight against an AI-controlled opponent. The AI uses a finite state machine (FSM) with 5 behavioral states, and difficulty is controlled through reaction speed and shooting accuracy parameters. The mode includes a dedicated menu for difficulty selection and match customization.

---

## Game Mode Selection & Menu Flow

### Main Menu (MenuScene modification)

Replace the current auto-start with a mode selection screen:

```
┌─────────────────────────────────────┐
│         RICOCHET TANK               │
│                                     │
│     > VS AI      (press ENTER)      │
│       VS Player  (press ENTER)      │
│                                     │
│     ↑↓ 选择    ENTER 确认           │
└─────────────────────────────────────┘
```

- `↑`/`↓` to switch between modes
- `ENTER` to confirm
- Selecting "VS Player" starts GameScene directly (existing behavior)
- Selecting "VS AI" opens the AI Settings screen

### AI Settings Screen (new scene or overlay)

```
┌─────────────────────────────────────┐
│          AI BATTLE SETUP            │
│                                     │
│  难 度:    < 简单 / 中等 / 困难 >   │
│  胜场数:    < 1 / 3 / 5 >          │
│  地 图:    < 小 / 中 / 大 >        │
│  道 具:    < 开 / 关 >             │
│                                     │
│  ENTER 开始    ESC 返回             │
└─────────────────────────────────────┘
```

- `↑`/`↓` to move between settings
- `←`/`→` to change values
- `ENTER` to start GameScene with selected settings
- `ESC` to return to main menu

### GameSettings Interface

```ts
interface GameSettings {
  mode: 'pvp' | 'ai';
  aiDifficulty: 'easy' | 'medium' | 'hard';
  winsToVictory: 1 | 3 | 5;
  mapSize: 'small' | 'medium' | 'large';
  powerUpsEnabled: boolean;
}
```

Passed to GameScene via `scene.start('GameScene', settings)`.

---

## AI Architecture

### Core Design Principle

AI produces the same `PlayerInput` interface as the human input system. GameScene does not distinguish between human and AI input — it only cares about the input data.

```
┌──────────────┐     PlayerInput      ┌──────────────┐
│ InputManager │ ──────────────────→   │              │
│  (P1 键盘)   │                       │  GameScene   │ ──→ Tank
└──────────────┘                       │              │
┌──────────────┐     PlayerInput      │              │
│ AIController │ ──────────────────→   │              │
│  (P2 AI)     │                       └──────────────┘
└──────────────┘
```

### File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/systems/AIController.ts` | **New** | AI state machine, decision logic, movement/shooting control |
| `src/scenes/MenuScene.ts` | **Modify** | Add mode selection + AI settings UI |
| `src/scenes/GameScene.ts` | **Modify** | Accept GameSettings, conditionally use AIController for P2 |
| `src/config.ts` | **Modify** | Add AI-related constants and difficulty parameter tables |
| `src/enums/AIState.ts` | **New** | AI state enum (Patrol, Chase, Attack, Dodge, Collect) |
| `src/objects/Tank.ts` | **Modify** | Add `color` parameter to support black AI tank |

---

## AI State Machine

### States (5 total)

| State | Chinese | Trigger | Behavior |
|-------|---------|---------|----------|
| Patrol | 巡逻 | Default / no threats | Random movement through corridors, avoid walls |
| Chase | 追击 | Opponent detected, no clear shot | Turn toward opponent, advance, seek line of sight |
| Attack | 攻击 | Opponent in range, aim aligned | Fire at opponent with difficulty-based accuracy offset |
| Dodge | 躲避 | Incoming bullet/rocket detected | Turn 90° away from projectile path, accelerate |
| Collect | 拾取 | Power-up on map, no urgent threat | Navigate toward nearest power-up |

### State Priority (highest first)

```
Dodge > Attack > Collect > Chase > Patrol
```

### State Transition Logic

Each frame, the AI evaluates conditions top-down:

```
1. threat = detectIncomingProjectile()
   → if (threat && threat.distance < dodgeThreshold[diffficulty]) → DODGE

2. opponent = detectOpponent()
   → if (opponent && aimAligned(opponent) && inRange(opponent)) → ATTACK

3. powerUp = nearestPowerUp()
   → if (powerUp && randomRoll() < collectWillingness[difficulty]) → COLLECT

4. opponent = detectOpponent()
   → if (opponent) → CHASE

5. → PATROL
```

### State Behaviors

**Patrol:**
- Cast rays in 8 directions, pick the longest open corridor
- Occasionally (every 2-4s) add random direction change
- Maintain forward movement, avoid hitting walls

**Chase:**
- Calculate angle to opponent
- Rotate toward opponent, move forward
- If blocked by wall, use ray-casting to find alternative path
- Fire opportunistically when aim is close enough

**Attack:**
- Apply accuracy offset: `targetAngle ± random(0, accuracyOffset[difficulty])`
- Respect fire rate cooldown
- Check if shot is clear (no wall between AI and target)
- After firing, transition back to Chase or Dodge

**Dodge:**
- Calculate perpendicular escape direction (away from projectile trajectory)
- Prefer escape routes that have open corridors (ray-cast check)
- If no good escape, try to get behind a wall
- After threat passes (bullet destroyed or far enough), return to previous state

**Collect:**
- Navigate toward the power-up position
- Use ray-casting for pathfinding around walls
- After collecting, immediately evaluate whether to use active power-up

### Anti-Stuck Mechanism

- Track position every 1 second
- If displacement < 5px for 2 consecutive checks → force random rotation + forward
- If stuck in corner (3+ wall contacts in 1 second) → reverse + random turn

---

## Difficulty Parameters

### Core Parameters

| Parameter | Easy (简单) | Medium (中等) | Hard (困难) |
|-----------|-------------|---------------|-------------|
| Reaction delay | 800ms | 400ms | 100ms |
| Shooting accuracy offset | ±30° | ±15° | ±5° |
| Bullet detection distance | 100px | 180px | 280px |
| Collect willingness | 30% | 60% | 95% |
| Fire rate cooldown | 2.0s | 0.8s | 0.15s |
| Dodge behavior | Often ignores | Reactive | Predicts bullet path |
| Path prediction | None | Simple | Full trajectory calculation |

### Reaction Delay Implementation

- AI decisions are not applied immediately
- A timer accumulates; when it exceeds `reactionDelay[difficulty]`, the decision is committed
- Higher difficulty = shorter delay = faster reactions
- This prevents instant perfect tracking and makes the AI feel more "human"

### Shooting Accuracy

When the AI fires, the actual bullet direction is:
```
aimAngle = atan2(target.y - ai.y, target.x - ai.x)
actualAngle = aimAngle + random(-accuracyOffset, +accuracyOffset)
```

- Easy: ±30° spread means most shots miss at medium range
- Medium: ±15° means roughly half hit at medium range
- Hard: ±5° means most shots hit if line of sight is clear

---

## AI Power-Up Strategy

### Collection Priority

Higher value = higher priority to collect:

| Priority | Power-Up | Reason |
|----------|----------|--------|
| 1 (highest) | Shield (护盾) | Defensive, always useful |
| 2 | Rocket (追踪导弹) | Homing, hard to miss |
| 3 | Laser (激光) | Instant hit, bounces |
| 4 | Shotgun (散弹) | Close range area denial |
| 5 | Rapid Fire (连射) | Increases DPS |
| 6 | Double Shot (双发) | Increases hit chance |
| 7 (lowest) | Mine (地雷) | Situational |

### Active Power-Up Usage

| Power-Up | When to Use | Difficulty Behavior |
|----------|-------------|---------------------|
| Rocket | Opponent within forward 90° cone | Easy: fire directly; Hard: lead the target |
| Laser | Opponent on line-of-sight (consider bounces) | Easy: straight shot; Hard: calculate wall bounces |
| Mine | Channel entrance or opponent's chase path | Easy: random placement; Hard: strategic chokepoints |
| Shotgun | Opponent within close range (<150px) | All difficulties: same (wide spread covers area) |

### Passive Power-Ups

- Shield, Rapid Fire, Double Shot: no action needed, they activate automatically
- AI adjusts fire rate when Rapid Fire is active (cooldown parameter updated)
- AI does not need special logic for Double Shot (handled by PowerUpEffects)

---

## AI Visual Design

### Tank Color

- AI tank uses **black** (`0x000000`) as primary color
- Modify `Tank.ts` to accept a `color` parameter (default: blue for P1, red for P2, black for AI)

### State Indicator

- Display current AI state as text above the tank
- Text format: `[巡視]` / `[追撃]` / `[攻撃]` / `[躲避]` / `[拾取]`
- Uses Phaser `Text` object, positioned 20px above tank center
- Follows tank movement, updates when state changes
- Semi-transparent background for readability

### HUD Label

- P2 label changes from "P2" to "AI" + difficulty name (e.g., "AI [简单]")

---

## Map Size Variants

| Size | Columns × Rows | Cell Size | Canvas Area | Wall Removal |
|------|---------------|-----------|-------------|-------------|
| Small (小) | 7 × 5 | 70px | 490 × 350 | 20% |
| Medium (中) | 10 × 8 | 70px | 700 × 560 | 20% |
| Large (大) | 12 × 10 | 70px | 840 × 700 | 20% |

- Canvas size stays 800×600; smaller maps are centered, larger maps are scaled to fit
- Spawn points remain at opposite corners (top-left for P1, bottom-right for P2)
- AI ray-casting distance automatically scales with map size

---

## GameScene Integration

### Initialization

```ts
create(data: GameSettings) {
  this.settings = data || { mode: 'pvp', ...defaults };

  if (this.settings.mode === 'ai') {
    this.aiController = new AIController(this, this.tank2, this.tank1, this.settings.aiDifficulty);
    // tank2 color = black
  }
  // ... existing setup
}
```

### Update Loop

```ts
update(time: number, delta: number) {
  const p1Input = this.inputManager.getPlayer1Input();
  const p2Input = this.settings.mode === 'ai'
    ? this.aiController.getInput(delta, time)
    : this.inputManager.getPlayer2Input();

  this.updateTank(this.tank1, p1Input, delta);
  this.updateTank(this.tank2, p2Input, delta);
  // ... rest of game loop
}
```

### Power-Up Handling

When AI collects a power-up, the `usePowerUp` field in `PlayerInput` controls activation (just like a human player pressing the key).

---

## Testing Strategy

### Unit Tests

| Test Target | Coverage |
|-------------|----------|
| AIController state transitions | All 5 states, transition conditions |
| Accuracy offset | Verify random offset is within difficulty bounds |
| Reaction delay | Timer correctly delays decision application |
| Anti-stuck mechanism | Position tracking and forced rotation |
| Power-up priority | Correct sorting of available power-ups |
| Dodge direction | Perpendicular escape angle calculation |
| Ray-casting | Correct distance calculation in all 8 directions |

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Opponent dies mid-state | Reset to Patrol |
| No path to target | Random exploration until path found |
| Ammo depleted | Prioritize Patrol/Dodge, avoid Attack state |
| Two power-ups simultaneously | Pick closer one |
| Power-up despawns while navigating | Re-evaluate and switch to next priority |
| Map variant (small/large) | Ray-cast distances scale with map |

---

## Out of Scope (YAGNI)

- AI vs AI spectator mode
- AI learning / adaptive difficulty
- AI performance statistics / replay
- Online multiplayer AI
- A* pathfinding (ray-casting is sufficient for this maze density)
- Custom AI personalities
