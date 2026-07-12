# Frag Bomb Collision Kernel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Frag Bomb launch placement and collision ordering numerically stable for tangencies, wall-adjacent tanks, and lifetime expiry.

**Architecture:** Keep collision math pure in `Collision.ts`, launch policy pure in `FragBombPhysics.ts`, and `GameScene` responsible for selecting the earliest event. Do not migrate other weapons.

**Tech Stack:** TypeScript 6, Phaser 3.90, Vitest 4, Vite 8.

## Global Constraints

- Only Frag Bomb behavior and reusable pure collision helpers may change.
- TOI helpers return the earliest normalized value in `[0, 1]`, or `null`.
- Near-zero negative discriminants use a scale-aware tolerance; real misses remain misses.
- A bomb may not spawn overlapping its owner or a wall. A failed launch retains the held item.
- Tank wins exact tank/wall ties. Lifetime wins only when strictly earlier.
- Pause and existing cleanup behavior remain unchanged.

### Task 1: Stabilize Segment-Circle TOI

**Files:** Modify `src/systems/Collision.ts`; test `tests/systems/Collision.test.ts`.

**Produces:** `segmentCircleTOI(...): number | null` with stable arbitrary-angle tangency.

- [ ] Add RED tests using the reviewed tangent `(-10.031990400796413, 0.5993067647946363) -> (9.952011732423145, 1.3990934485273194)` against `(0,0,r=1)`, plus a path offset by `1e-6` that must miss.
- [ ] Run `npm test -- --run tests/systems/Collision.test.ts`; confirm the exact tangent currently returns `null`.
- [ ] Scale tolerance from both quadratic terms:

```ts
const discriminantScale = Math.abs(b * b) + Math.abs(4 * a * c);
const tolerance = Number.EPSILON * discriminantScale * 8;
if (discriminant < -tolerance) return null;
const safeDiscriminant = Math.max(0, discriminant);
```

- [ ] Re-run the test and commit `fix: stabilize collision tangent detection`.

### Task 2: Resolve a Legal Launch Point

**Files:** Modify `src/config.ts`, `src/systems/FragBombPhysics.ts`, `src/scenes/GameScene.ts`; test `tests/systems/FragBombPhysics.test.ts`, `tests/scenes/GameScene.test.ts`.

**Produces:**

```ts
resolveFragBombLaunch(
  owner: Point,
  direction: Point,
  ownerRadius: number,
  bombRadius: number,
  desiredClearance: number,
  walls: Array<{ x: number; y: number; width: number; height: number }>,
): Point | null
```

- [ ] Add RED pure tests for open space, reduced clearance with a valid point, and a wall touching the owner with no valid point. Returned points must overlap neither owner nor wall.
- [ ] Run `npm test -- --run tests/systems/FragBombPhysics.test.ts`; confirm the missing export fails.
- [ ] Normalize direction; use `minimumDistance = ownerRadius + bombRadius + 1` and `desiredDistance = minimumDistance + desiredClearance`. Use earliest `sweptCircleRectTOI`, retreat one pixel, and return `null` below the minimum. Add `FRAG_BOMB_LAUNCH_CLEARANCE = 8`.
- [ ] Add RED scene tests proving a reduced-clearance launch is valid and an impossible launch creates no bomb while restoring `heldPowerUp = FragBomb`.
- [ ] Integrate the resolver before construction. On `null`, restore the item and produce no sound or object.
- [ ] Run both targeted suites and commit `fix: resolve safe frag bomb launch positions`.

### Task 3: Order Lifetime with Collision TOIs

**Files:** Modify `src/scenes/GameScene.ts`; test `tests/scenes/GameScene.test.ts`.

- [ ] Add a RED test with `age=3.99`, `dt=0.05`, and wall TOI `0.8`; expect detonation at lifetime TOI `0.2`.
- [ ] Capture age before update and calculate:

```ts
const lifetimeTOI = ageBeforeUpdate < FRAG_BOMB_MAX_LIFETIME && bomb.age >= FRAG_BOMB_MAX_LIFETIME
  ? (FRAG_BOMB_MAX_LIFETIME - ageBeforeUpdate) / dt
  : ageBeforeUpdate >= FRAG_BOMB_MAX_LIFETIME ? 0 : null;
```

- [ ] Select tank on exact tank/wall ties. Select lifetime only when strictly earlier, then place the bomb at the chosen event position.
- [ ] Run targeted tests, `npm run check`, and `git diff --check`.
- [ ] Commit `fix: order frag bomb lifetime by impact time` and request whole-branch review for `d6de5f7..HEAD`.
