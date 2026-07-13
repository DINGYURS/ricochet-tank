# D4 Laser Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every held Laser a live reflected-path preview, fire the identical full route through every intersected tank, allow self-hits only after reflection, and resolve concurrent Laser effects deterministically.

**Architecture:** Add a Phaser-independent `LaserPath` module for rectangle-face reflection and ordered circle hits. Keep rendering in `PowerUpEffects`, while `GameScene` owns preview graphics, fired-effect timers, shield/death batching, and lifecycle cleanup. Migrate incrementally so every commit typechecks and tests independently.

**Tech Stack:** TypeScript 6, Phaser 3.90, Vitest 4, Vite 8.

## Global Constraints

- Preview and fired beam display the complete reflected route; tanks never truncate it.
- Every distinct tank touching the route is hit once per fired Laser.
- Segment 0 excludes the owner; segments 1 and later include the owner.
- Keep `LASER_LIFETIME = 0.3`, the existing Laser sound, and the existing formal beam styles.
- Use `LASER_MAX_BOUNCES = 8`, `LASER_MAX_SEGMENT_LENGTH = 2000`, `LASER_ORIGIN_NUDGE = 1`, and `LASER_GEOMETRY_EPSILON = 1e-6`.
- Use the normal of the rectangle face actually entered; do not use wall `orientation` for Laser reflection.
- Do not change power-up spawning, controls, AI decisions, damage strength, assets, or other weapons.
- Write a failing test before each behavior change, run the focused test to see the intended failure, then implement the minimum passing code.
- Keep every commit independently typecheckable and testable; do not leave a compatibility wrapper after final migration.
- Run all commands from the repository root unless a step explicitly says otherwise.

## File Map

- Create `src/systems/LaserPath.ts`: pure route tracing, constants, public Laser types, and ordered hit collection.
- Create `tests/systems/LaserPath.test.ts`: geometry, determinism, owner safety, tangent, and invalid-input tests.
- Modify `src/systems/PowerUpEffects.ts`: add `renderLaser()`, then remove the legacy combined `fireLaser()` implementation after scene migration.
- Modify `tests/systems/PowerUpEffects.test.ts`: replace single-target `fireLaser` assertions with rendering and accepted-command sound assertions.
- Modify `src/scenes/GameScene.ts`: preview ownership, current-frame route use, concurrent fired effects, batched damage, and cleanup entry points.
- Modify `tests/scenes/GameScene.test.ts`: Laser module mocks plus preview, concurrency, shield, pause, round, restart, shutdown, and destruction coverage.
- Modify `docs/superpowers/plans/2026-07-11-classic-weapons.md`: mark the three D4 Laser checklist items complete only after all acceptance checks pass.

---

### Task 1: Deterministic Laser Route Tracing

**Files:**
- Create: `src/systems/LaserPath.ts`
- Create: `tests/systems/LaserPath.test.ts`

**Interfaces:**
- Consumes: plain `{ x, y }` points and readonly axis-aligned wall rectangles.
- Produces: `traceLaserPath(origin, direction, walls): LaserSegment[]` plus the four exported geometry constants and public `LaserSegment`, `LaserWall`, and `LaserTarget` types.

- [ ] **Step 1: Add failing normalization, face-normal, corner, and ordering-independent route tests**

Create `tests/systems/LaserPath.test.ts` with these fixtures and assertions:

```ts
import { describe, expect, it } from 'vitest';
import {
  LASER_GEOMETRY_EPSILON,
  LASER_MAX_BOUNCES,
  traceLaserPath,
} from '../../src/systems/LaserPath';

const length = (segment: { x1: number; y1: number; x2: number; y2: number }) =>
  Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1);

describe('traceLaserPath', () => {
  it('returns one normalized 2000px terminal segment when no wall is ahead', () => {
    expect(traceLaserPath({ x: 10, y: 20 }, { x: 3, y: 4 }, [])).toEqual([
      { x1: 10, y1: 20, x2: 1210, y2: 1620 },
    ]);
  });

  it('reflects from the actual entered vertical face', () => {
    const segments = traceLaserPath(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      [{ x: 100, y: -100, width: 10, height: 200 }],
    );
    expect(segments[0]).toEqual({ x1: 0, y1: 0, x2: 100, y2: 0 });
    expect(segments[1].x1).toBeCloseTo(100);
    expect(segments[1].x2).toBeLessThan(100);
  });

  it('reflects from the short cap of a tall rectangle', () => {
    const segments = traceLaserPath(
      { x: 105, y: -50 },
      { x: 0, y: 1 },
      [{ x: 100, y: 0, width: 10, height: 200 }],
    );
    expect(segments[0]).toEqual({ x1: 105, y1: -50, x2: 105, y2: 0 });
    expect(segments[1].y2).toBeLessThan(0);
  });

  it('reflects both components at an exact corner independent of wall order', () => {
    const walls = [
      { x: 100, y: 100, width: 10, height: 100 },
      { x: 100, y: 100, width: 100, height: 10 },
    ];
    const forward = traceLaserPath({ x: 0, y: 0 }, { x: 1, y: 1 }, walls);
    const reversed = traceLaserPath({ x: 0, y: 0 }, { x: 1, y: 1 }, [...walls].reverse());
    expect(forward).toEqual(reversed);
    expect(forward[0].x2).toBeCloseTo(100);
    expect(forward[0].y2).toBeCloseTo(100);
    expect(forward[1].x2).toBeLessThan(100);
    expect(forward[1].y2).toBeLessThan(100);
  });

  it('joins visible segments while nudging only the next query origin', () => {
    const segments = traceLaserPath(
      { x: 50, y: 50 },
      { x: 1, y: 0 },
      [
        { x: 0, y: 0, width: 10, height: 100 },
        { x: 100, y: 0, width: 10, height: 100 },
      ],
    );
    expect(segments[1].x1).toBe(segments[0].x2);
    expect(segments[1].y1).toBe(segments[0].y2);
  });

  it('limits the route to eight reflections and nine visible segments', () => {
    const segments = traceLaserPath(
      { x: 50, y: 50 },
      { x: 1, y: 0 },
      [
        { x: 0, y: 0, width: 10, height: 100 },
        { x: 100, y: 0, width: 10, height: 100 },
      ],
    );
    expect(LASER_MAX_BOUNCES).toBe(8);
    expect(segments).toHaveLength(9);
    expect(segments.every(segment => length(segment) > LASER_GEOMETRY_EPSILON)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the route tests and verify the module-missing failure**

Run:

```powershell
npm test -- tests/systems/LaserPath.test.ts
```

Expected: FAIL because `src/systems/LaserPath.ts` does not exist.

- [ ] **Step 3: Add failing invalid-origin and wall-boundary tests**

Append inside the same `describe` block:

```ts
  it.each([
    [{ x: Number.NaN, y: 0 }, { x: 1, y: 0 }],
    [{ x: 0, y: 0 }, { x: Number.POSITIVE_INFINITY, y: 0 }],
    [{ x: 0, y: 0 }, { x: 0, y: 0 }],
    [{ x: 0, y: 0 }, { x: LASER_GEOMETRY_EPSILON, y: 0 }],
  ])('returns an empty route for invalid point or direction %#', (origin, direction) => {
    expect(traceLaserPath(origin, direction, [])).toEqual([]);
  });

  it('returns an empty route when the origin is strictly inside a wall', () => {
    expect(traceLaserPath(
      { x: 105, y: 50 },
      { x: 1, y: 0 },
      [{ x: 100, y: 0, width: 10, height: 100 }],
    )).toEqual([]);
  });

  it('reflects immediately from a boundary when pointing inward without a zero segment', () => {
    const segments = traceLaserPath(
      { x: 100, y: 50 },
      { x: 1, y: 0 },
      [{ x: 100, y: 0, width: 10, height: 100 }],
    );
    expect(segments[0].x1).toBe(100);
    expect(segments[0].x2).toBeLessThan(100);
    expect(segments.every(segment => length(segment) > LASER_GEOMETRY_EPSILON)).toBe(true);
  });

  it('ignores a boundary wall when pointing outward', () => {
    expect(traceLaserPath(
      { x: 100, y: 50 },
      { x: -1, y: 0 },
      [{ x: 100, y: 0, width: 10, height: 100 }],
    )).toEqual([{ x1: 100, y1: 50, x2: -1900, y2: 50 }]);
  });
```

- [ ] **Step 4: Implement the pure public types, constants, and bounded trace loop**

Create `src/systems/LaserPath.ts` with these public declarations and private boundaries:

```ts
export const LASER_MAX_BOUNCES = 8;
export const LASER_MAX_SEGMENT_LENGTH = 2000;
export const LASER_ORIGIN_NUDGE = 1;
export const LASER_GEOMETRY_EPSILON = 1e-6;

export interface LaserSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface LaserWall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LaserTarget {
  playerId: number;
  x: number;
  y: number;
  radius: number;
}

interface Point { x: number; y: number }
interface WallHit { distance: number; reflectX: boolean; reflectY: boolean }

const finitePoint = (point: Readonly<Point>) =>
  Number.isFinite(point.x) && Number.isFinite(point.y);

const strictlyInside = (point: Readonly<Point>, wall: LaserWall) =>
  point.x > wall.x + LASER_GEOMETRY_EPSILON &&
  point.x < wall.x + wall.width - LASER_GEOMETRY_EPSILON &&
  point.y > wall.y + LASER_GEOMETRY_EPSILON &&
  point.y < wall.y + wall.height - LASER_GEOMETRY_EPSILON;
```

Add these complete slab and grouping helpers. They reject travel tangent along a wall face, use the face actually entered, merge equal-distance candidates, and detect only boundary directions that move into the rectangle interior:

```ts
interface AxisInterval { near: number; far: number }

function axisInterval(origin: number, direction: number, min: number, max: number): AxisInterval | null {
  if (Math.abs(direction) <= LASER_GEOMETRY_EPSILON) {
    if (origin < min - LASER_GEOMETRY_EPSILON || origin > max + LASER_GEOMETRY_EPSILON) return null;
    if (Math.abs(origin - min) <= LASER_GEOMETRY_EPSILON || Math.abs(origin - max) <= LASER_GEOMETRY_EPSILON) return null;
    return { near: Number.NEGATIVE_INFINITY, far: Number.POSITIVE_INFINITY };
  }
  const first = (min - origin) / direction;
  const second = (max - origin) / direction;
  return { near: Math.min(first, second), far: Math.max(first, second) };
}

function rayWallHit(origin: Readonly<Point>, direction: Readonly<Point>, wall: LaserWall): WallHit | null {
  const x = axisInterval(origin.x, direction.x, wall.x, wall.x + wall.width);
  const y = axisInterval(origin.y, direction.y, wall.y, wall.y + wall.height);
  if (!x || !y) return null;
  const enter = Math.max(x.near, y.near);
  const exit = Math.min(x.far, y.far);
  if (exit - enter <= LASER_GEOMETRY_EPSILON) return null;
  if (exit <= LASER_GEOMETRY_EPSILON || enter <= LASER_GEOMETRY_EPSILON) return null;
  if (enter > LASER_MAX_SEGMENT_LENGTH + LASER_GEOMETRY_EPSILON) return null;
  return {
    distance: enter,
    reflectX: Math.abs(x.near - enter) <= LASER_GEOMETRY_EPSILON,
    reflectY: Math.abs(y.near - enter) <= LASER_GEOMETRY_EPSILON,
  };
}

function boundaryReflection(origin: Readonly<Point>, direction: Readonly<Point>, walls: readonly LaserWall[]) {
  let reflectX = false;
  let reflectY = false;
  const probe = {
    x: origin.x + direction.x * LASER_GEOMETRY_EPSILON * 10,
    y: origin.y + direction.y * LASER_GEOMETRY_EPSILON * 10,
  };
  for (const wall of walls) {
    if (!strictlyInside(probe, wall)) continue;
    const right = wall.x + wall.width;
    const bottom = wall.y + wall.height;
    if (Math.abs(origin.x - wall.x) <= LASER_GEOMETRY_EPSILON || Math.abs(origin.x - right) <= LASER_GEOMETRY_EPSILON) reflectX = true;
    if (Math.abs(origin.y - wall.y) <= LASER_GEOMETRY_EPSILON || Math.abs(origin.y - bottom) <= LASER_GEOMETRY_EPSILON) reflectY = true;
  }
  return { reflectX, reflectY };
}

function nearestWallHit(origin: Readonly<Point>, direction: Readonly<Point>, walls: readonly LaserWall[]): WallHit | null {
  const candidates = walls
    .map(wall => rayWallHit(origin, direction, wall))
    .filter((hit): hit is WallHit => hit !== null);
  if (candidates.length === 0) return null;
  const distance = Math.min(...candidates.map(hit => hit.distance));
  const nearest = candidates.filter(hit => Math.abs(hit.distance - distance) <= LASER_GEOMETRY_EPSILON);
  return {
    distance,
    reflectX: nearest.some(hit => hit.reflectX),
    reflectY: nearest.some(hit => hit.reflectY),
  };
}
```

Use this exact loop contract:

```ts
export function traceLaserPath(
  origin: Readonly<Point>,
  initialDirection: Readonly<Point>,
  walls: readonly LaserWall[],
): LaserSegment[] {
  const magnitude = Math.hypot(initialDirection.x, initialDirection.y);
  if (!finitePoint(origin) || !finitePoint(initialDirection) || magnitude <= LASER_GEOMETRY_EPSILON) return [];
  if (walls.some(wall => strictlyInside(origin, wall))) return [];

  let direction = {
    x: initialDirection.x / magnitude,
    y: initialDirection.y / magnitude,
  };
  let visibleStart = { ...origin };
  let queryOrigin = { ...origin };
  let reflections = 0;
  const segments: LaserSegment[] = [];

  while (segments.length <= LASER_MAX_BOUNCES) {
    const boundary = boundaryReflection(queryOrigin, direction, walls);
    if (boundary.reflectX || boundary.reflectY) {
      if (reflections >= LASER_MAX_BOUNCES) break;
      if (boundary.reflectX) direction.x *= -1;
      if (boundary.reflectY) direction.y *= -1;
      reflections++;
      queryOrigin = {
        x: visibleStart.x + direction.x * LASER_ORIGIN_NUDGE,
        y: visibleStart.y + direction.y * LASER_ORIGIN_NUDGE,
      };
      continue;
    }

    const hit = nearestWallHit(queryOrigin, direction, walls);
    if (!hit) {
      segments.push({
        x1: visibleStart.x,
        y1: visibleStart.y,
        x2: queryOrigin.x + direction.x * LASER_MAX_SEGMENT_LENGTH,
        y2: queryOrigin.y + direction.y * LASER_MAX_SEGMENT_LENGTH,
      });
      break;
    }

    const contact = {
      x: queryOrigin.x + direction.x * hit.distance,
      y: queryOrigin.y + direction.y * hit.distance,
    };
    if (Math.hypot(contact.x - visibleStart.x, contact.y - visibleStart.y) > LASER_GEOMETRY_EPSILON) {
      segments.push({ x1: visibleStart.x, y1: visibleStart.y, x2: contact.x, y2: contact.y });
    }
    if (reflections >= LASER_MAX_BOUNCES) break;

    if (hit.reflectX) direction.x *= -1;
    if (hit.reflectY) direction.y *= -1;
    reflections++;
    visibleStart = contact;
    queryOrigin = {
      x: contact.x + direction.x * LASER_ORIGIN_NUDGE,
      y: contact.y + direction.y * LASER_ORIGIN_NUDGE,
    };
  }

  return segments;
}
```

- [ ] **Step 5: Run the focused route tests and correct only the pure tracer until green**

Run:

```powershell
npm test -- tests/systems/LaserPath.test.ts
```

Expected: all `traceLaserPath` tests PASS; no Phaser environment is loaded.

- [ ] **Step 6: Run type checking and commit the route tracer**

Run:

```powershell
npm run typecheck
git diff --check
git add src/systems/LaserPath.ts tests/systems/LaserPath.test.ts
git commit -m "feat: add deterministic laser path tracing"
```

Expected: typecheck PASS, no whitespace errors, and one commit containing only the two listed files.

---

### Task 2: Ordered Multi-target Hits and Formal Beam Rendering

**Files:**
- Modify: `src/systems/LaserPath.ts`
- Modify: `tests/systems/LaserPath.test.ts`
- Modify: `src/systems/PowerUpEffects.ts`
- Modify: `tests/systems/PowerUpEffects.test.ts`

**Interfaces:**
- Consumes: `readonly LaserSegment[]`, living `readonly LaserTarget[]`, and `ownerId`.
- Produces: `collectLaserHitPlayerIds(...): number[]` and `renderLaser(scene, segments, soundManager): Phaser.GameObjects.Graphics | null`.
- Preserves temporarily: legacy `fireLaser()` remains until Task 4 so this commit stays compatible with `GameScene`.

- [ ] **Step 1: Add failing ordered-hit tests**

Add a second describe block to `tests/systems/LaserPath.test.ts`:

```ts
import { collectLaserHitPlayerIds } from '../../src/systems/LaserPath';

describe('collectLaserHitPlayerIds', () => {
  const forward = [{ x1: 0, y1: 0, x2: 100, y2: 0 }];

  it('returns every target in first-contact order regardless of input order', () => {
    const targets = [
      { playerId: 2, x: 80, y: 0, radius: 5 },
      { playerId: 1, x: 20, y: 0, radius: 5 },
    ];
    expect(collectLaserHitPlayerIds(forward, targets, 0)).toEqual([1, 2]);
    expect(collectLaserHitPlayerIds(forward, [...targets].reverse(), 0)).toEqual([1, 2]);
  });

  it('breaks equal-distance ties by ascending playerId', () => {
    const targets = [
      { playerId: 2, x: 50, y: 5, radius: 5 },
      { playerId: 1, x: 50, y: -5, radius: 5 },
    ];
    expect(collectLaserHitPlayerIds(forward, targets, 0)).toEqual([1, 2]);
  });

  it('skips the owner on segment zero and includes it after reflection', () => {
    const segments = [
      { x1: 0, y1: 0, x2: 100, y2: 0 },
      { x1: 100, y1: 0, x2: 0, y2: 0 },
    ];
    expect(collectLaserHitPlayerIds(
      segments,
      [{ playerId: 0, x: 50, y: 0, radius: 16 }],
      0,
    )).toEqual([0]);
  });

  it('deduplicates a target touched by several segments', () => {
    const segments = [
      { x1: 0, y1: 0, x2: 100, y2: 0 },
      { x1: 100, y1: 0, x2: 0, y2: 0 },
    ];
    expect(collectLaserHitPlayerIds(
      segments,
      [{ playerId: 1, x: 50, y: 0, radius: 16 }],
      0,
    )).toEqual([1]);
  });

  it('counts a tangent and rejects a near miss beyond epsilon', () => {
    expect(collectLaserHitPlayerIds(
      forward,
      [{ playerId: 1, x: 50, y: 16, radius: 16 }],
      0,
    )).toEqual([1]);
    expect(collectLaserHitPlayerIds(
      forward,
      [{ playerId: 1, x: 50, y: 16 + 2 * LASER_GEOMETRY_EPSILON, radius: 16 }],
      0,
    )).toEqual([]);
  });

  it('does not mutate segment or target inputs', () => {
    const segments = [{ x1: 0, y1: 0, x2: 100, y2: 0 }];
    const targets = [{ playerId: 1, x: 50, y: 0, radius: 16 }];
    const segmentSnapshot = structuredClone(segments);
    const targetSnapshot = structuredClone(targets);
    collectLaserHitPlayerIds(segments, targets, 0);
    expect(segments).toEqual(segmentSnapshot);
    expect(targets).toEqual(targetSnapshot);
  });
});
```

- [ ] **Step 2: Run the focused suite and verify the missing-export failure**

Run `npm test -- tests/systems/LaserPath.test.ts`.

Expected: FAIL because `collectLaserHitPlayerIds` is not exported.

- [ ] **Step 3: Implement deterministic per-segment hit collection**

In `LaserPath.ts`, add this normalized projection helper. It treats `radius + LASER_GEOMETRY_EPSILON` as the effective radius, returns `0` when the segment starts inside the circle, and returns `null` for a zero-length segment or contact outside the closed segment:

```ts
function firstCircleContactDistance(segment: LaserSegment, target: LaserTarget): number | null {
  if (target.radius < 0) return null;
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const segmentLength = Math.hypot(dx, dy);
  if (segmentLength <= LASER_GEOMETRY_EPSILON) return null;

  const ux = dx / segmentLength;
  const uy = dy / segmentLength;
  const toCenterX = target.x - segment.x1;
  const toCenterY = target.y - segment.y1;
  const projection = toCenterX * ux + toCenterY * uy;
  const centerDistanceSquared = toCenterX * toCenterX + toCenterY * toCenterY;
  const perpendicularSquared = Math.max(0, centerDistanceSquared - projection * projection);
  const effectiveRadius = target.radius + LASER_GEOMETRY_EPSILON;
  const chordSquared = effectiveRadius * effectiveRadius - perpendicularSquared;
  if (chordSquared < 0) return null;

  const halfChord = Math.sqrt(chordSquared);
  const entry = projection - halfChord;
  const exit = projection + halfChord;
  if (exit < -LASER_GEOMETRY_EPSILON || entry > segmentLength + LASER_GEOMETRY_EPSILON) return null;
  return Math.min(segmentLength, Math.max(0, entry));
}
```

Add the public collector with this exact ordering contract:

```ts
export function collectLaserHitPlayerIds(
  segments: readonly LaserSegment[],
  targets: readonly LaserTarget[],
  ownerId: number,
): number[] {
  const hit = new Set<number>();
  const ordered: number[] = [];

  segments.forEach((segment, segmentIndex) => {
    const contacts = targets
      .filter(target => !hit.has(target.playerId) && !(segmentIndex === 0 && target.playerId === ownerId))
      .map(target => ({
        playerId: target.playerId,
        distance: firstCircleContactDistance(segment, target),
      }))
      .filter((contact): contact is { playerId: number; distance: number } => contact.distance !== null)
      .sort((a, b) => {
        const delta = a.distance - b.distance;
        return Math.abs(delta) > LASER_GEOMETRY_EPSILON ? delta : a.playerId - b.playerId;
      });

    for (const contact of contacts) {
      hit.add(contact.playerId);
      ordered.push(contact.playerId);
    }
  });

  return ordered;
}
```

- [ ] **Step 4: Run hit tests until green**

Run `npm test -- tests/systems/LaserPath.test.ts`.

Expected: all tracer and collector tests PASS.

- [ ] **Step 5: Replace the old PowerUpEffects test with failing renderer tests while leaving production `fireLaser()` intact**

In `tests/systems/PowerUpEffects.test.ts`, import `renderLaser`, remove the old `describe('fireLaser')`, and add:

```ts
describe('renderLaser', () => {
  it('plays sound without allocating graphics for an empty accepted route', () => {
    const scene = { add: { graphics: vi.fn() } } as any;
    const soundManager = { laserFire: vi.fn() };
    expect(renderLaser(scene, [], soundManager)).toBeNull();
    expect(soundManager.laserFire).toHaveBeenCalledOnce();
    expect(scene.add.graphics).not.toHaveBeenCalled();
  });

  it('draws every segment with the existing core and glow styles', () => {
    const graphics = {
      setDepth: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      lineBetween: vi.fn().mockReturnThis(),
    };
    const scene = { add: { graphics: vi.fn(() => graphics) } } as any;
    const soundManager = { laserFire: vi.fn() };
    const segments = [
      { x1: 0, y1: 0, x2: 100, y2: 0 },
      { x1: 100, y1: 0, x2: 100, y2: 100 },
    ];
    expect(renderLaser(scene, segments, soundManager)).toBe(graphics);
    expect(graphics.setDepth).toHaveBeenCalledWith(50);
    expect(graphics.lineStyle.mock.calls).toEqual([
      [3, 0xff0000, 0.9],
      [8, 0xff0000, 0.3],
    ]);
    expect(graphics.lineBetween.mock.calls).toEqual([
      [0, 0, 100, 0],
      [100, 0, 100, 100],
      [0, 0, 100, 0],
      [100, 0, 100, 100],
    ]);
    expect(soundManager.laserFire).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 6: Run the renderer test and verify the missing-export failure**

Run `npm test -- tests/systems/PowerUpEffects.test.ts`.

Expected: FAIL because `renderLaser` is not exported.

- [ ] **Step 7: Add `renderLaser()` without removing the legacy API**

Import `type LaserSegment` from `./LaserPath` and add:

```ts
export function renderLaser(
  scene: Phaser.Scene,
  segments: readonly LaserSegment[],
  soundManager: { laserFire(): void },
): Phaser.GameObjects.Graphics | null {
  soundManager.laserFire();
  if (segments.length === 0) return null;

  const graphics = scene.add.graphics().setDepth(50);
  graphics.lineStyle(3, 0xff0000, 0.9);
  for (const segment of segments) graphics.lineBetween(segment.x1, segment.y1, segment.x2, segment.y2);
  graphics.lineStyle(8, 0xff0000, 0.3);
  for (const segment of segments) graphics.lineBetween(segment.x1, segment.y1, segment.x2, segment.y2);
  return graphics;
}
```

Keep the local legacy `LaserSegment`, `fireLaser()`, and its private helpers only until Task 4; avoid exporting two `LaserSegment` declarations by renaming the temporary local type to `LegacyLaserSegment`.

- [ ] **Step 8: Run both focused suites, typecheck, and commit**

Run:

```powershell
npm test -- tests/systems/LaserPath.test.ts tests/systems/PowerUpEffects.test.ts
npm run typecheck
git diff --check
git add src/systems/LaserPath.ts tests/systems/LaserPath.test.ts src/systems/PowerUpEffects.ts tests/systems/PowerUpEffects.test.ts
git commit -m "refactor: separate laser hits and rendering"
```

Expected: focused tests and typecheck PASS; commit contains the pure collector and additive renderer only.

---

### Task 3: Live Per-player Laser Previews

**Files:**
- Modify: `src/scenes/GameScene.ts`
- Modify: `tests/scenes/GameScene.test.ts`

**Interfaces:**
- Consumes: `traceLaserPath()` and current tank barrel pose.
- Produces: `laserPreviews: Map<number, Graphics>`, `updateLaserPreviews()`, `clearLaserPreview()`, and `clearLaserPreviews()`.
- Preserves temporarily: the existing single fired-Laser fields and `fireLaser()` call until Task 4.

- [ ] **Step 1: Add the LaserPath mock and failing preview creation/update tests**

Before importing `GameScene`, add:

```ts
const mockLaserSegments = vi.hoisted(() => ([
  { x1: 115, y1: 100, x2: 300, y2: 100 },
]));

vi.mock('../../src/systems/LaserPath', () => ({
  traceLaserPath: vi.fn(() => mockLaserSegments.map(segment => ({ ...segment }))),
  collectLaserHitPlayerIds: vi.fn(() => []),
}));
```

Import `traceLaserPath` after the mocks, then add a `describe('Laser scene integration')` block:

```ts
it('creates and redraws a held Laser preview from the current tank pose', () => {
  const scene = new GameScene();
  (scene as any).create({ mode: 'local', localPlayers: 2 });
  const tank = (scene as any).tanks[0];
  tank.heldPowerUp = 'Laser';
  tank.rotation = Math.PI / 2;
  (scene as any).roundState = 'PLAYING';

  (scene as any).updateLaserPreviews();

  expect(traceLaserPath).toHaveBeenCalledWith(
    tank.getBarrelTip(),
    { x: Math.cos(tank.rotation), y: Math.sin(tank.rotation) },
    (scene as any).wallData,
  );
  const preview = (scene as any).laserPreviews.get(tank.playerId);
  expect(preview.setDepth).toHaveBeenCalledWith(49);
  expect(preview.lineStyle).toHaveBeenCalledWith(1, 0xff0000, 0.35);
  expect(preview.lineBetween).toHaveBeenCalledWith(115, 100, 300, 100);
});

it('keeps independent previews for multiple Laser holders', () => {
  const scene = new GameScene();
  (scene as any).create({ mode: 'local', localPlayers: 3 });
  (scene as any).roundState = 'PLAYING';
  (scene as any).tanks[0].heldPowerUp = 'Laser';
  (scene as any).tanks[2].heldPowerUp = 'Laser';
  (scene as any).updateLaserPreviews();
  expect([...((scene as any).laserPreviews.keys())]).toEqual([0, 2]);
});
```

- [ ] **Step 2: Run the scene suite and verify failure on missing preview state/methods**

Run `npm test -- tests/scenes/GameScene.test.ts`.

Expected: FAIL because `updateLaserPreviews()` and `laserPreviews` do not exist.

- [ ] **Step 3: Implement preview state and drawing**

Import `traceLaserPath` and add:

```ts
private laserPreviews = new Map<number, Phaser.GameObjects.Graphics>();
private destroyCleanupRegistered = false;

private clearLaserPreview(playerId: number): void {
  const graphics = this.laserPreviews.get(playerId);
  if (!graphics) return;
  graphics.destroy();
  this.laserPreviews.delete(playerId);
}

private clearLaserPreviews(): void {
  for (const graphics of this.laserPreviews.values()) graphics.destroy();
  this.laserPreviews.clear();
}

private updateLaserPreviews(): void {
  if (this.roundState !== RoundState.PLAYING) {
    this.clearLaserPreviews();
    return;
  }
  const visible = new Set<number>();
  for (const tank of this.tanks) {
    if (!tank.alive || tank.heldPowerUp !== PowerUpType.Laser) continue;
    visible.add(tank.playerId);
    let graphics = this.laserPreviews.get(tank.playerId);
    if (!graphics) {
      graphics = this.add.graphics().setDepth(49);
      this.laserPreviews.set(tank.playerId, graphics);
    }
    graphics.clear();
    graphics.lineStyle(1, 0xff0000, 0.35);
    const tip = tank.getBarrelTip();
    const segments = traceLaserPath(
      tip,
      { x: Math.cos(tank.rotation), y: Math.sin(tank.rotation) },
      this.wallData,
    );
    for (const segment of segments) graphics.lineBetween(segment.x1, segment.y1, segment.x2, segment.y2);
  }
  for (const playerId of [...this.laserPreviews.keys()]) {
    if (!visible.has(playerId)) this.clearLaserPreview(playerId);
  }
}
```

Call `updateLaserPreviews()` once after tank movement/rotation and once after active weapons, elimination, and power-up collection are resolved. The first call makes same-frame fire visually match the current pose; the final reconciliation creates same-frame pickup previews and removes fired/dead previews before rendering.

- [ ] **Step 4: Add failing lifecycle tests for fire, disable, elimination, restart, shutdown, and destroy registration**

Add tests that directly retain preview graphics and assert their `destroy` calls:

```ts
it('removes only the eliminated holder preview while a three-player round continues', () => {
  const scene = new GameScene();
  (scene as any).create({ mode: 'local', localPlayers: 3 });
  const [owner, , survivor] = (scene as any).tanks;
  owner.heldPowerUp = 'Laser';
  survivor.heldPowerUp = 'Laser';
  (scene as any).roundState = 'PLAYING';
  (scene as any).updateLaserPreviews();
  const ownerPreview = (scene as any).laserPreviews.get(owner.playerId);
  const survivorPreview = (scene as any).laserPreviews.get(survivor.playerId);
  (scene as any).eliminatePlayers([owner.playerId]);
  expect(ownerPreview.destroy).toHaveBeenCalledOnce();
  expect(survivorPreview.destroy).not.toHaveBeenCalled();
  expect((scene as any).roundState).toBe('PLAYING');
});

it('removes held previews synchronously when power-ups are disabled', () => {
  const scene = new GameScene();
  (scene as any).create({ mode: 'local', localPlayers: 2 });
  (scene as any).roundState = 'PLAYING';
  (scene as any).tanks[0].heldPowerUp = 'Laser';
  (scene as any).updateLaserPreviews();
  const preview = (scene as any).laserPreviews.get(0);
  scene.setPowerUpsEnabled(false);
  expect(preview.destroy).toHaveBeenCalledOnce();
  expect((scene as any).laserPreviews.size).toBe(0);
});
```

Add these remaining lifecycle cases in the same describe block:

```ts
it('removes the firing player preview and creates a same-frame pickup preview', () => {
  const scene = new GameScene();
  (scene as any).create({ mode: 'local', localPlayers: 2 });
  const tank = (scene as any).tanks[0];
  (scene as any).roundState = 'PLAYING';
  tank.heldPowerUp = 'Laser';
  (scene as any).updateLaserPreviews();
  const firedPreview = (scene as any).laserPreviews.get(0);
  (scene as any).handleWeaponInput(tank, { shoot: true, usePowerUp: false }, 0);
  expect(firedPreview.destroy).toHaveBeenCalledOnce();
  expect((scene as any).laserPreviews.has(0)).toBe(false);

  vi.spyOn((scene as any).powerUpManager, 'update').mockImplementation(() => {
    tank.heldPowerUp = 'Laser';
  });
  scene.update(0, 16);
  expect((scene as any).laserPreviews.has(0)).toBe(true);
});

it('cleans previews on restart and async shutdown cleanup', () => {
  const scene = new GameScene();
  (scene as any).create({ mode: 'local', localPlayers: 2 });
  (scene as any).roundState = 'PLAYING';
  (scene as any).tanks[0].heldPowerUp = 'Laser';
  (scene as any).updateLaserPreviews();
  const restartPreview = (scene as any).laserPreviews.get(0);
  scene.restartMatch();
  expect(restartPreview.destroy).toHaveBeenCalledOnce();

  (scene as any).roundState = 'PLAYING';
  (scene as any).tanks[0].heldPowerUp = 'Laser';
  (scene as any).updateLaserPreviews();
  const shutdownPreview = (scene as any).laserPreviews.get(0);
  (scene as any).clearAsyncTasks();
  expect(shutdownPreview.destroy).toHaveBeenCalledOnce();
});

it('registers destroy cleanup once and the registered handler clears previews', () => {
  const scene = new GameScene();
  (scene as any).create({ mode: 'local', localPlayers: 2 });
  (scene as any).create({ mode: 'local', localPlayers: 2 });
  const destroyCalls = (scene as any).events.once.mock.calls
    .filter((call: any[]) => call[0] === 'destroy');
  expect(destroyCalls).toHaveLength(1);

  (scene as any).roundState = 'PLAYING';
  (scene as any).tanks[0].heldPowerUp = 'Laser';
  (scene as any).updateLaserPreviews();
  const preview = (scene as any).laserPreviews.get(0);
  const [, handler, context] = destroyCalls[0];
  handler.call(context);
  expect(preview.destroy).toHaveBeenCalledOnce();
});
```

- [ ] **Step 5: Wire every preview cleanup entry point**

Make these exact changes:

```ts
// create()
this.events.once('shutdown', this.clearAsyncTasks, this);
if (!this.destroyCleanupRegistered) {
  this.events.once('destroy', this.clearAsyncTasks, this);
  this.destroyCleanupRegistered = true;
}

// setPowerUpsEnabled()
this.powerUpManager.setEnabled(enabled);
if (!enabled) this.clearLaserPreviews();

// clearAsyncTasks()
this.clearLaserPreviews();

// eliminatePlayers(), before setAlive(false)
this.clearLaserPreview(playerId);

// round-over branch
this.clearLaserPreviews();

// legacy Laser firing branch, before fireLaser()
this.clearLaserPreview(tank.playerId);
```

Do not clear a fired Laser when only one player dies in a continuing three-player round.

- [ ] **Step 6: Run focused scene and pause-setting regressions**

Run:

```powershell
npm test -- tests/scenes/GameScene.test.ts tests/scenes/PauseScene.test.ts tests/systems/PowerUpManager.test.ts
npm run typecheck
```

Expected: all focused tests and typecheck PASS, including existing same-frame pickup/weapon-slot tests.

- [ ] **Step 7: Commit the independently working preview slice**

Run:

```powershell
git diff --check
git add src/scenes/GameScene.ts tests/scenes/GameScene.test.ts
git commit -m "feat: preview held laser paths"
```

Expected: commit contains preview and preview-only lifecycle behavior; the legacy fired Laser still works.

---

### Task 4: Concurrent Full-route Laser Damage and Legacy Removal

**Files:**
- Modify: `src/scenes/GameScene.ts`
- Modify: `tests/scenes/GameScene.test.ts`
- Modify: `src/systems/PowerUpEffects.ts`
- Modify: `tests/systems/PowerUpEffects.test.ts`

**Interfaces:**
- Consumes: `traceLaserPath()`, `collectLaserHitPlayerIds()`, `renderLaser()`, and `LASER_LIFETIME`.
- Produces: `activeLasers: ActiveLaserEffect[]`, `updateLasers(dt, eliminatedThisFrame)`, full-route frozen `hitPlayerIds`, and batched shield/death resolution.
- Removes: `fireLaser()`, `laserGraphics`, `laserTimer`, `laserHitPlayerId`, legacy private line helpers, and the old scene test mock.

- [ ] **Step 1: Migrate the scene mocks and add failing formal-route tests**

Change the `PowerUpEffects` mock to export `renderLaser: vi.fn(() => null)` instead of `fireLaser`. Import `collectLaserHitPlayerIds` and `renderLaser` after mocks, and add `LASER_LIFETIME` to the existing config import used by the test file.

Add:

```ts
it('passes the fired route to hit collection and formal rendering', () => {
  const scene = new GameScene();
  (scene as any).create({ mode: 'local', localPlayers: 2 });
  const tank = (scene as any).tanks[0];
  tank.heldPowerUp = 'Laser';
  (scene as any).handleWeaponInput(tank, { shoot: true, usePowerUp: false }, 0);
  expect(collectLaserHitPlayerIds).toHaveBeenCalledWith(
    expect.arrayContaining(mockLaserSegments),
    expect.arrayContaining([expect.objectContaining({ playerId: 0 }), expect.objectContaining({ playerId: 1 })]),
    tank.playerId,
  );
  expect(renderLaser).toHaveBeenCalledWith(scene, expect.arrayContaining(mockLaserSegments), (scene as any).soundManager);
});

it('does not create an active record for an empty route', () => {
  vi.mocked(traceLaserPath).mockReturnValueOnce([]);
  const scene = new GameScene();
  (scene as any).create({ mode: 'local', localPlayers: 2 });
  const tank = (scene as any).tanks[0];
  tank.heldPowerUp = 'Laser';
  (scene as any).handleWeaponInput(tank, { shoot: true, usePowerUp: false }, 0);
  expect(renderLaser).toHaveBeenCalledWith(scene, [], (scene as any).soundManager);
  expect((scene as any).activeLasers).toEqual([]);
});

it('uses the same current-frame pose for preview and formal path tracing', () => {
  const scene = new GameScene();
  (scene as any).create({ mode: 'local', localPlayers: 2 });
  const tank = (scene as any).tanks[0];
  tank.heldPowerUp = 'Laser';
  tank.rotation = Math.PI / 2;
  (scene as any).roundState = 'PLAYING';
  mockPlayer1Input.shoot = true;
  vi.mocked(traceLaserPath).mockClear();
  scene.update(0, 16);
  const calls = vi.mocked(traceLaserPath).mock.calls;
  expect(calls).toHaveLength(2);
  expect(calls[0]).toEqual(calls[1]);
  expect(renderLaser).toHaveBeenCalledWith(
    scene,
    mockLaserSegments,
    (scene as any).soundManager,
  );
});
```

- [ ] **Step 2: Run the scene test and verify failure on missing new formal API/state**

Run `npm test -- tests/scenes/GameScene.test.ts`.

Expected: FAIL because `GameScene` still imports/calls `fireLaser()` and has no `activeLasers`.

- [ ] **Step 3: Add concurrent active state and migrate the Laser firing branch**

Add:

```ts
interface ActiveLaserEffect {
  graphics: Phaser.GameObjects.Graphics;
  remaining: number;
  hitPlayerIds: number[];
}

private activeLasers: ActiveLaserEffect[] = [];
```

Replace the Laser case with:

```ts
case PowerUpType.Laser: {
  const tip = tank.getBarrelTip();
  const segments = traceLaserPath(
    tip,
    { x: Math.cos(tank.rotation), y: Math.sin(tank.rotation) },
    this.wallData,
  );
  this.clearLaserPreview(tank.playerId);
  const targets = this.tanks
    .filter(candidate => candidate.alive)
    .map(candidate => ({
      playerId: candidate.playerId,
      x: candidate.x,
      y: candidate.y,
      radius: candidate.radius,
    }));
  const hitPlayerIds = collectLaserHitPlayerIds(segments, targets, tank.playerId);
  const graphics = renderLaser(this, segments, this.soundManager);
  if (graphics) this.activeLasers.push({ graphics, remaining: LASER_LIFETIME, hitPlayerIds });
  break;
}
```

Remove the three legacy single-Laser fields and their create/start-round assignments.

- [ ] **Step 4: Add failing batching, shield, frozen-hit, concurrency, and pause tests**

Use direct active records for deterministic timers:

```ts
it('deduplicates one expired Laser before consuming a shield', () => {
  const scene = new GameScene();
  (scene as any).create({ mode: 'local', localPlayers: 2 });
  const target = (scene as any).tanks[1];
  target.shieldActive = true;
  const graphics = { destroy: vi.fn() };
  (scene as any).activeLasers = [{ graphics, remaining: 0.1, hitPlayerIds: [1, 1, 1] }];
  const eliminated = new Set<number>();
  (scene as any).updateLasers(0.1, eliminated);
  expect(target.shieldActive).toBe(false);
  expect(eliminated).not.toContain(1);
  expect(graphics.destroy).toHaveBeenCalledOnce();
});

it('kills a shielded player hit by two Lasers expiring in one batch', () => {
  const scene = new GameScene();
  (scene as any).create({ mode: 'local', localPlayers: 2 });
  const target = (scene as any).tanks[1];
  target.shieldActive = true;
  (scene as any).activeLasers = [
    { graphics: { destroy: vi.fn() }, remaining: 0.1, hitPlayerIds: [1] },
    { graphics: { destroy: vi.fn() }, remaining: 0.1, hitPlayerIds: [1] },
  ];
  const eliminated = new Set<number>();
  (scene as any).updateLasers(0.1, eliminated);
  expect(target.shieldActive).toBe(false);
  expect(eliminated).toContain(1);
});

it('freezes active Laser time when Escape pauses before simulation', () => {
  const scene = new GameScene();
  (scene as any).create({ mode: 'local', localPlayers: 2 });
  (scene as any).roundState = 'PLAYING';
  const effect = { graphics: { destroy: vi.fn() }, remaining: 0.3, hitPlayerIds: [] };
  (scene as any).activeLasers = [effect];
  mockEscapePressed.value = true;
  scene.update(0, 1000);
  expect(effect.remaining).toBe(0.3);
  expect(effect.graphics.destroy).not.toHaveBeenCalled();
});
```

Add the remaining concurrency, frozen-snapshot, round, and setting cases:

```ts
it('retains concurrent non-expired Lasers with independent timers', () => {
  const scene = new GameScene();
  (scene as any).create({ mode: 'local', localPlayers: 2 });
  const first = { graphics: { destroy: vi.fn() }, remaining: 0.3, hitPlayerIds: [] };
  const second = { graphics: { destroy: vi.fn() }, remaining: 0.2, hitPlayerIds: [] };
  (scene as any).activeLasers = [first, second];
  (scene as any).updateLasers(0.1, new Set<number>());
  expect((scene as any).activeLasers).toEqual([first, second]);
  expect(first.remaining).toBeCloseTo(0.2);
  expect(second.remaining).toBeCloseTo(0.1);
});

it('keeps firing-frame hit IDs frozen while a target moves during display', () => {
  const beam = { destroy: vi.fn() };
  vi.mocked(collectLaserHitPlayerIds).mockReturnValueOnce([1]);
  vi.mocked(renderLaser).mockReturnValueOnce(beam as any);
  const scene = new GameScene();
  (scene as any).create({ mode: 'local', localPlayers: 2 });
  const [owner, target] = (scene as any).tanks;
  owner.heldPowerUp = 'Laser';
  (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
  target.x += 400;
  target.y += 400;
  const eliminated = new Set<number>();
  (scene as any).updateLasers(0.3, eliminated);
  expect(eliminated).toContain(target.playerId);
});

it('aggregates simultaneous Laser deaths into one draw resolution', () => {
  const scene = new GameScene();
  (scene as any).create({ mode: 'local', localPlayers: 2 });
  (scene as any).roundState = 'PLAYING';
  (scene as any).activeLasers = [
    { graphics: { destroy: vi.fn() }, remaining: MAX_DT, hitPlayerIds: [0] },
    { graphics: { destroy: vi.fn() }, remaining: MAX_DT, hitPlayerIds: [1] },
  ];
  scene.update(0, 1000);
  expect((scene as any).tanks.every((tank: any) => !tank.alive)).toBe(true);
  expect((scene as any).statusText.setText).toHaveBeenCalledWith('DRAW!');
});

it('disables held previews without cancelling an already-fired Laser', () => {
  const scene = new GameScene();
  (scene as any).create({ mode: 'local', localPlayers: 2 });
  (scene as any).roundState = 'PLAYING';
  (scene as any).tanks[0].heldPowerUp = 'Laser';
  (scene as any).updateLaserPreviews();
  const preview = (scene as any).laserPreviews.get(0);
  const effect = { graphics: { destroy: vi.fn() }, remaining: 0.3, hitPlayerIds: [] };
  (scene as any).activeLasers = [effect];
  scene.setPowerUpsEnabled(false);
  expect(preview.destroy).toHaveBeenCalledOnce();
  expect((scene as any).activeLasers).toEqual([effect]);
  expect(effect.graphics.destroy).not.toHaveBeenCalled();
});

it('does not tick a Laser during its firing update', () => {
  const beam = { destroy: vi.fn() };
  vi.mocked(renderLaser).mockReturnValueOnce(beam as any);
  const scene = new GameScene();
  (scene as any).create({ mode: 'local', localPlayers: 2 });
  (scene as any).roundState = 'PLAYING';
  (scene as any).tanks[0].heldPowerUp = 'Laser';
  mockPlayer1Input.shoot = true;
  scene.update(0, 1000);
  expect((scene as any).activeLasers).toHaveLength(1);
  expect((scene as any).activeLasers[0].remaining).toBe(LASER_LIFETIME);
});

it('clears active Lasers on round over, restart, shutdown, and destruction', () => {
  const attach = (scene: GameScene) => {
    const effect = { graphics: { destroy: vi.fn() }, remaining: 0.3, hitPlayerIds: [] };
    (scene as any).activeLasers = [effect];
    return effect;
  };

  const roundScene = new GameScene();
  (roundScene as any).create({ mode: 'local', localPlayers: 2 });
  (roundScene as any).roundState = 'PLAYING';
  const roundEffect = attach(roundScene);
  (roundScene as any).eliminatePlayers([0]);
  expect(roundEffect.graphics.destroy).toHaveBeenCalledOnce();

  const restartScene = new GameScene();
  (restartScene as any).create({ mode: 'local', localPlayers: 2 });
  const restartEffect = attach(restartScene);
  restartScene.restartMatch();
  expect(restartEffect.graphics.destroy).toHaveBeenCalledOnce();

  const shutdownScene = new GameScene();
  (shutdownScene as any).create({ mode: 'local', localPlayers: 2 });
  const shutdownEffect = attach(shutdownScene);
  (shutdownScene as any).clearAsyncTasks();
  expect(shutdownEffect.graphics.destroy).toHaveBeenCalledOnce();

  const destroyScene = new GameScene();
  (destroyScene as any).create({ mode: 'local', localPlayers: 2 });
  const destroyEffect = attach(destroyScene);
  const destroyCall = (destroyScene as any).events.once.mock.calls
    .find((call: any[]) => call[0] === 'destroy');
  destroyCall[1].call(destroyCall[2]);
  expect(destroyEffect.graphics.destroy).toHaveBeenCalledOnce();
});
```

- [ ] **Step 5: Implement one batched update method before active-weapon execution**

Add:

```ts
private updateLasers(dt: number, eliminatedThisFrame: Set<number>): void {
  const expired: ActiveLaserEffect[] = [];
  const active: ActiveLaserEffect[] = [];
  for (const laser of this.activeLasers) {
    laser.remaining -= dt;
    (laser.remaining <= 0 ? expired : active).push(laser);
  }
  this.activeLasers = active;
  for (const laser of expired) laser.graphics.destroy();

  const hitCounts = new Map<number, number>();
  for (const laser of expired) {
    for (const playerId of new Set(laser.hitPlayerIds)) {
      hitCounts.set(playerId, (hitCounts.get(playerId) ?? 0) + 1);
    }
  }

  for (const [playerId, count] of hitCounts) {
    const target = this.tanks.find(candidate => candidate.playerId === playerId);
    if (!target?.alive) continue;
    let remainingHits = count;
    if (target.shieldActive && remainingHits > 0) {
      target.shieldActive = false;
      target.passiveEffects.delete(PowerUpType.Shield);
      target.passiveTimers.delete(PowerUpType.Shield);
      this.soundManager.shieldBreak();
      remainingHits--;
    }
    if (remainingHits > 0) eliminatedThisFrame.add(playerId);
  }
}
```

Call `updateLasers(dt, eliminatedThisFrame)` at the old Laser timer location, before rockets/mines and before the loop that executes new active weapon commands. A newly fired Laser must retain the full 0.3 seconds until the next update.

- [ ] **Step 6: Extend unified cleanup without cancelling effects on a continuing single-player elimination**

Add:

```ts
private clearLasers(): void {
  this.clearLaserPreviews();
  for (const laser of this.activeLasers) laser.graphics.destroy();
  this.activeLasers = [];
}
```

Replace the preview-only cleanup call in `clearAsyncTasks()` with `clearLasers()`, and call `clearLasers()` from the round-over branch. Keep `clearLaserPreview(playerId)`—not `clearLasers()`—inside the per-player elimination loop. Remove all direct legacy `laserGraphics` cleanup.

- [ ] **Step 7: Remove the legacy combined implementation and old mocks**

From `PowerUpEffects.ts`, remove the legacy local segment type, `fireLaser()`, `lineRectIntersection()`, `lineLineIntersection()`, `lineCircleIntersectionDistance()`, and the now-unused `reflect` and `LASER_LIFETIME` imports. From `PowerUpEffects.test.ts`, ensure only `renderLaser` tests remain for Laser. From `GameScene.test.ts`, ensure the mock exposes `renderLaser` and no `fireLaser` compatibility wrapper.

- [ ] **Step 8: Run focused tests, typecheck, and commit the formal migration**

Run:

```powershell
npm test -- tests/systems/LaserPath.test.ts tests/systems/PowerUpEffects.test.ts tests/scenes/GameScene.test.ts tests/scenes/PauseScene.test.ts tests/systems/PowerUpManager.test.ts
npm run typecheck
git diff --check
git add src/scenes/GameScene.ts tests/scenes/GameScene.test.ts src/systems/PowerUpEffects.ts tests/systems/PowerUpEffects.test.ts
git commit -m "feat: resolve concurrent laser hits"
```

Expected: all focused tests and typecheck PASS; `rg -n "fireLaser|laserHitPlayerId|laserTimer|laserGraphics" src tests` returns no legacy matches.

---

### Task 5: Full Verification, Browser Acceptance, and Milestone Status

**Files:**
- Modify: `docs/superpowers/plans/2026-07-11-classic-weapons.md`

**Interfaces:**
- Consumes: the completed D4 implementation and repository scripts.
- Produces: browser evidence, a green full check, reviewed milestone status, a clean feature branch, and a non-force GitHub update after integration.

- [ ] **Step 1: Run the complete automated verification from a clean process state**

Run:

```powershell
npm run check
```

Expected: TypeScript PASS; all Vitest files/tests PASS; Vite production build PASS. Record the exact file/test counts in the implementation handoff.

- [ ] **Step 2: Run an independent diff review before browser acceptance**

Review the feature-branch diff against its base and reject the branch for any unresolved Critical or Important issue. The review must explicitly inspect:

- slab/corner/boundary geometry and wall-order independence;
- owner safety only on segment 0;
- target ordering and per-shot deduplication;
- new-beam timer ordering;
- shield batching and same-frame deaths;
- single-player elimination versus whole-round cleanup;
- pause-time disable and scene destruction paths;
- removal of every legacy single-Laser field/helper/mock.

Expected: Critical 0, Important 0. Fix findings with a failing regression test and a separate atomic commit before continuing.

- [ ] **Step 3: Start the local production-like server for real-browser acceptance**

Run:

```powershell
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local `http://127.0.0.1:<port>/` URL and stays running in the background for the next step.

- [ ] **Step 4: Execute the approved browser acceptance matrix**

In a real browser at the Vite URL:

1. Start a three-player local match and confirm the console begins with zero errors and zero warnings.
2. Acquire Laser for one tank; verify a thin translucent red route appears immediately and includes wall reflections.
3. Rotate the tank; verify the preview follows continuously and never leaves 1-pixel gaps at reflections.
4. Fire; verify the preview is replaced by the same route using the bright core/glow style for the configured 0.3 seconds.
5. Arrange a route through two tanks; verify both are resolved from one shot without truncating the graphic.
6. Fire a direct segment through the owner; verify segment 0 does not hit the owner.
7. Arrange a reflected return through the owner; verify the owner is a valid hit after reflection.
8. Pause while a beam is visible; wait longer than 0.3 wall-clock seconds, resume, and verify the beam still has its remaining simulation lifetime.
9. While paused with a held Laser, disable power-ups; verify the preview disappears immediately while an already-fired beam remains.
10. Restart the match; verify no preview, beam, pending hit, or stale console message crosses into the new round.
11. Recheck the console: zero errors and zero warnings.

Expected: every item passes. Save a reflected preview screenshot to `.playwright-mcp/d4-laser-preview.png` and the matching formal route to `.playwright-mcp/d4-laser-fired.png`; this directory is already ignored by Git.

- [ ] **Step 5: Mark only the completed D4 Laser checklist items**

In `docs/superpowers/plans/2026-07-11-classic-weapons.md`, change exactly these three boxes from `[ ]` to `[x]`:

```markdown
- [x] Extract preview/beam path tracing into one tested function.
- [x] Render preview while held; formal beam uses identical segments.
- [x] Permit owner hit after a reflected segment while retaining initial launch safety.
```

Do not mark Homing Missile or Mine items.

- [ ] **Step 6: Re-run final checks after the documentation-only edit and commit**

Run:

```powershell
npm run check
git diff --check
git status --short --branch
git add docs/superpowers/plans/2026-07-11-classic-weapons.md
git commit -m "docs: mark laser correction complete"
```

Expected: full check PASS, the final commit contains only the three checkbox changes, and the feature branch is clean.

- [ ] **Step 7: Fast-forward main, verify again, and push without force**

From the primary repository worktree after confirming `origin/main` has not diverged:

```powershell
git fetch origin
git checkout main
git merge --ff-only codex/d4-laser
npm run check
git push origin main
git ls-remote origin refs/heads/main
git status --short --branch
```

Expected: fast-forward merge succeeds; the post-merge full check passes; `git push` reports a normal main update; `ls-remote` matches local `HEAD`; status is clean and synchronized. Never use `--force` or `--force-with-lease`.
