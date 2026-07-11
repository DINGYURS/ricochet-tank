# Pause and Match Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the immediate Esc-to-menu behavior with a real pause overlay that can resume, restart the current match, return to the menu, toggle sound and power-ups, and show complete controls without advancing gameplay timers.

**Architecture:** Launch an independent `PauseScene` over a paused `GameScene`. Phaser scene pausing freezes `GameScene.update` and its clock events, while the overlay remains interactive. Match-local option state stays in `GameScene`; `PauseScene` calls a small public API instead of using a global store. `SoundManager` and `PowerUpManager` receive explicit enable/disable controls.

**Tech Stack:** TypeScript 6, Phaser 3.90, Vite 8, Vitest 4, Chrome DevTools browser automation.

## Global Constraints

- Esc pauses from countdown or active play and no longer exits directly.
- Pausing freezes tanks, projectiles, AI, power-up timers, countdown, and delayed round transitions through Phaser's paused scene clock.
- Restart resets all scores and starts a fresh round with the same mode and current sound/power-up choices.
- Returning to the menu stops both scenes and does not leave a paused `GameScene` behind.
- Sound and power-up choices apply only to the current match; a newly entered match starts enabled.
- Every behavior change follows red-green TDD and every code commit requires `npm run check`.

### Task 1: Add Explicit Sound and Power-Up Enable Controls

**Files:**
- Modify: `src/systems/SoundManager.ts`
- Modify: `src/systems/PowerUpManager.ts`
- Modify: `tests/systems/SoundManager.test.ts`
- Modify: `tests/systems/PowerUpManager.test.ts`

**Interfaces:**
- Produces: `SoundManager.setEnabled(enabled: boolean)` and `isEnabled()`.
- Produces: `PowerUpManager.setEnabled(enabled: boolean)` and `isEnabled()`.
- Disabled sound methods allocate no AudioContext or audio nodes.
- Disabling power-ups clears map pickups and tank-held effects; disabled updates do not spawn or tick pickups.

- [ ] Add failing tests proving disabled `SoundManager.shoot()` creates no oscillator and re-enabling restores sound.
- [ ] Add failing tests with minimal scene/tank mocks proving `PowerUpManager.setEnabled(false)` clears active pickups and held effects, and `update` does not spawn while disabled.
- [ ] Implement the smallest explicit enable APIs and guards.
- [ ] Run targeted tests, `npm run check`, inspect the diff, and commit:

```powershell
git commit -m "feat: add match sound and power-up toggles"
```

### Task 2: Build the Pause Overlay Scene

**Files:**
- Create: `src/scenes/PauseScene.ts`
- Create: `tests/scenes/PauseScene.test.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Produces: `PauseScene.KEY = 'PauseScene'`.
- Produces: exported `PAUSE_ACTIONS` keys `resume`, `restart`, `sound`, `powerups`, `menu`.
- Consumes a `GameScene` public pause API: status snapshot, toggle methods, and restart.
- Shows mode-specific controls for P1, P2/AI, and optional P3.

- [ ] Add failing scene tests for registration key, five actions, dynamic ON/OFF labels, and mode-specific control lines.
- [ ] Implement overlay graphics/text, Up/Down selection, Enter activation, and Esc resume.
- [ ] Resume: stop overlay then resume `GameScene`.
- [ ] Restart: call `GameScene.restartMatch()`, stop overlay, then resume `GameScene`.
- [ ] Menu: stop overlay and `GameScene`, then start `MenuScene`.
- [ ] Sound/power-up actions toggle state in place and redraw their labels.
- [ ] Register `PauseScene` after `GameScene` in `src/main.ts`.
- [ ] Run targeted tests, `npm run check`, inspect the diff, and commit:

```powershell
git commit -m "feat: add pause overlay scene"
```

### Task 3: Integrate Match-Local Pause State into GameScene

**Files:**
- Modify: `src/scenes/GameScene.ts`
- Modify: `tests/scenes/GameScene.test.ts`

**Interfaces:**
- Produces: `PauseStatus = { settings: GameSettings; soundEnabled: boolean; powerUpsEnabled: boolean }`.
- Produces: `getPauseStatus()`, `setSoundEnabled()`, `setPowerUpsEnabled()`, and `restartMatch()`.
- Esc executes `scene.pause(GameScene.KEY)` then `scene.launch(PauseScene.KEY)`.

- [ ] Add failing tests that Esc pauses/launches instead of starting the menu.
- [ ] Add failing tests for toggle delegation and restart resetting all scores while preserving mode/options.
- [ ] Give `GameScene` a static key and match-local option fields initialized to `true` in `create`.
- [ ] Apply option state to every newly created `PowerUpManager`; delegate sound state to `SoundManager`.
- [ ] Implement `restartMatch` by zeroing the existing score array and starting a fresh round, preserving settings and option fields.
- [ ] Launch the overlay from countdown or play; ensure repeated Esc cannot launch duplicate overlays.
- [ ] Run targeted tests and `npm run check`, inspect the diff, and commit:

```powershell
git commit -m "feat: pause and restart active matches"
```

### Task 4: Documentation, Browser Timing Smoke, and Review

**Files:**
- Modify: `README.md`
- Verify: all changes since the P1-B branch base

- [ ] Update README: Esc opens pause, list overlay actions, document match-local sound/power-up behavior.
- [ ] Run `npm run check` and `git diff --check` as standalone commands.
- [ ] Browser smoke test:
  1. Enter 2 Players and pause during countdown; READY remains frozen for at least one countdown duration.
  2. Resume and verify countdown/play continues without a jump.
  3. Pause active play and verify tank/projectile positions remain unchanged while paused.
  4. Toggle sound and power-ups; labels update and no context/menu error appears.
  5. Restart resets displayed scores and creates a new maze without changing mode.
  6. Return to menu, then enter 3 Players and VS AI to verify their control help and normal startup.
  7. Console contains zero application errors.
- [ ] Request read-only review over the complete branch. Fix all Critical and Important findings with regression tests.
- [ ] Re-run full checks and browser smoke after fixes.
- [ ] Commit documentation:

```powershell
git commit -m "docs: document pause and match settings"
```

- [ ] Finish the branch using `superpowers:finishing-a-development-branch`.
