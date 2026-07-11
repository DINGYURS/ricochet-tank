# Classic Weapons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for each milestone. Each milestone is implemented in its own branch and merged only after review.

**Goal:** Add Death Ray, RC Missile, and Frag Bomb, then restore the existing Laser, Homing Missile, and Mine behaviors that create the original game's ricochet and self-damage risk.

**Architecture:** Keep `GameScene` as lifecycle orchestrator, but move weapon geometry and state transitions into pure helpers and dedicated objects. Extend the unified weapon command with weapon-owned states instead of adding more ad-hoc booleans. Each milestone is independently releasable and preserves P0–P1-C behavior.

**Tech Stack:** TypeScript 6, Phaser 3.90, Vitest 4, Vite 8.

## Global Constraints

- Add `DeathRay`, `RCMissile`, and `FragBomb` to `PowerUpType`, visuals, map spawning, HUD, and AI-held metadata.
- Every weapon can affect all eligible tanks, including its owner when its path returns to the owner.
- Pausing freezes charging, projectile lifetime, control handoff, and detonation timers.
- Round restart and scene shutdown destroy every weapon object and cancel weapon-owned timers/listeners.
- Simultaneous eliminations continue to use the frame-level aggregation added in P1-A.
- Each milestone uses red-green TDD, `npm run check`, browser smoke, read-only review, and a clean fast-forward push.

## Milestone D1: Death Ray

### Task 1: Register Classic Weapon Types

**Files:** `src/enums/PowerUpType.ts`, `src/objects/PowerUp.ts`, enum/manager tests.

- [ ] Add failing tests requiring 10 total power-up types and active visuals for Death Ray, RC Missile, and Frag Bomb.
- [ ] Add distinct colors/labels and pixel icons without changing passive classification.
- [ ] Run `npm run check`; commit `feat: register classic weapon power-ups`.

### Task 2: Add Pure Death Ray Geometry and Charge State

**Files:** create `src/systems/DeathRay.ts`, `tests/systems/DeathRay.test.ts`, modify config.

**Interfaces:**

```ts
advanceDeathRayCharge(state, dt): { state; fire: boolean }
traceDeathRay(origin, direction, arenaBounds, tanks): { end; hitPlayerIds }
```

- [ ] Test charging below/at threshold, one-shot fire transition, arena-boundary intersection, internal-wall independence, ordered multi-target hits, and owner eligibility.
- [ ] Add explicit charge duration and beam lifetime config.
- [ ] Implement pure state/geometry; commit `feat: add death ray state and geometry`.

### Task 3: Integrate Death Ray Lifecycle

**Files:** `src/scenes/GameScene.ts`, scene tests.

- [ ] Add per-player Death Ray charge state and beam graphics cleanup.
- [ ] Firing starts charge and consumes the weapon; charging tanks cannot move, rotate, or fire.
- [ ] Charge advances only during PLAYING update; completion draws the beam and adds every unshielded hit to frame eliminations.
- [ ] Shield absorbs the hit consistently; restart/shutdown clears charge and graphics.
- [ ] Run full checks and commit `feat: integrate charging death ray`.

### Task 4: D1 Documentation, Browser Smoke, and Review

- [ ] Document Death Ray behavior and control lock.
- [ ] Browser smoke pickup injection/development fixture: charge, lock, beam, multi-target round resolution, pause freeze, restart cleanup, zero console errors.
- [ ] Read-only review; fix Critical/Important findings with tests.
- [ ] Merge, recheck clean `main`, fetch, and push only without remote divergence.

## Milestone D2: RC Missile

- [ ] Create pure RC missile steering, lifetime, bounce, and ownership state tests.
- [ ] Add `RCMissile` object with player steering input and outer/maze-wall reflection.
- [ ] While active, lock owner tank movement and weapon input; route that player's left/right input to missile steering.
- [ ] Allow collision with every tank, including owner after a safe launch period.
- [ ] Destroy on tank hit, lifetime, or bounce cap; clean up on pause/restart/shutdown.
- [ ] Commit in state/object/integration slices, browser-test all control schemes, review, merge, and safely push.

## Milestone D3: Frag Bomb

- [ ] Create pure bomb flight/detonation state and radial fragment velocity tests.
- [ ] First primary input launches; second input detonates the owner's active bomb.
- [ ] Detonation also occurs on configured hit/timeout conditions and emits deterministic fragment count/spread.
- [ ] Fragments stop on walls and damage every tank including owner; aggregate same-frame deaths.
- [ ] Clean bomb/fragments on round reset and shutdown.
- [ ] Commit in state/object/integration slices, browser-test, review, merge, and safely push.

## Milestone D4: Existing Classic Weapon Corrections

### Laser

- [ ] Extract preview/beam path tracing into one tested function.
- [ ] Render preview while held; formal beam uses identical segments.
- [ ] Permit owner hit after a reflected segment while retaining initial launch safety.

### Homing Missile

- [ ] Add free-flight lock delay, nearest-target selection, dynamic retargeting, owner eligibility after safety, wall reflection, lifetime, and bounce cap.
- [ ] Replace current wall explosion and fixed first-opponent targeting.

### Mine

- [ ] Support up to three mines per owner instead of replacing one.
- [ ] Hide armed mines from opponents according to local visibility limits and reveal on trigger.
- [ ] Detonate into wall-stopped fragments; allow owner trigger/damage after arming safety.

### Completion

- [ ] Add cross-weapon restart/pause/simultaneous-death scene tests.
- [ ] Run complete browser matrix for 2P, 3P, and AI.
- [ ] Update README and development workflow status.
- [ ] Read-only security/correctness review, full `npm run check`, clean merge, fetch, and non-force push.
