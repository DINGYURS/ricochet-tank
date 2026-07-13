# D4 Laser Correction Design

## 1. Background

The existing Laser implementation traces and draws reflected segments inside `PowerUpEffects.fireLaser()`. It has no held-item preview, always excludes the firing tank from damage, stores only one pending target, and keeps only one global beam effect in `GameScene`. Those constraints conflict with the approved classic-weapon behavior:

- holding Laser shows its reflected route;
- firing uses that same route;
- the route passes through tanks and damages every distinct tank it touches;
- the firing tank is safe on the initial segment but becomes vulnerable after the first reflection.

This change corrects Laser only. It does not change power-up spawning, AI decisions, sounds, damage strength, controls, or any other weapon.

## 2. Goals

1. Use one deterministic wall-reflection algorithm for preview and firing.
2. Render a live preview for every living tank currently holding Laser.
3. Damage every distinct living tank intersected by the full route.
4. Preserve initial launch safety while allowing reflected self-hits.
5. Support concurrent previews and concurrent fired beams without state overwrite.
6. Preserve the existing 0.3-second beam display and delayed damage resolution.
7. Clean up every preview, beam graphic, timer, and pending hit on all scene exit paths.

## 3. Non-goals

- Changing `LASER_LIFETIME`, Laser color, sound, spawn probability, or pickup duration.
- Stopping or truncating the route when it crosses a tank.
- Adding damage falloff, aim assistance, new settings, or new assets.
- Changing AI target selection or teaching AI to deliberately plan reflected Laser shots.
- Refactoring unrelated power-up or round-resolution behavior.

## 4. Confirmed Product Decisions

The following decisions are fixed for this milestone:

- Preview and fired beam display the complete wall-reflected route; tanks do not truncate it.
- Every distinct tank touching the route is hit once per fired Laser.
- Segment 0 cannot hit the firing tank. Segments 1 and later can hit it.
- Geometry tracing and hit collection are separate pure operations.
- Multiple players can preview or fire Laser concurrently.
- Damage remains deferred until the fired beam's 0.3-second display expires.

## 5. Pure Laser Geometry

Add `src/systems/LaserPath.ts` as a Phaser-independent module. It owns Laser route types and calculations.

### 5.1 Types

```ts
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
```

The module exposes two primary operations:

```ts
traceLaserPath(origin, direction, walls): LaserSegment[]
collectLaserHitPlayerIds(segments, targets, ownerId): number[]
```

The public contract uses plain numbers and records. Callers do not need to construct Phaser objects, and unit tests do not need a Phaser scene. Reflection and distance limits are fixed exported constants rather than caller-overridable options: `LASER_MAX_BOUNCES = 8`, `LASER_MAX_SEGMENT_LENGTH = 2000`, `LASER_ORIGIN_NUDGE = 1`, and `LASER_GEOMETRY_EPSILON = 1e-6`.

### 5.2 Route tracing

`traceLaserPath()` starts at the current barrel tip and follows the normalized tank direction. For each leg it selects the nearest positive wall intersection, appends a segment ending at that intersection, reflects the direction, and continues. If no wall is found, it appends one terminal segment in the current direction and stops.

Limits preserve the current behavior:

- at most 8 reflections, producing at most 9 segments;
- at most 2,000 pixels for each wall query or terminal segment;
- a 1-pixel outgoing-origin nudge after each reflection;
- therefore fewer than 18,008 visible traced pixels as a hard safety bound.

Intersection comparison uses an absolute geometry epsilon of `1e-6` pixels. Intersections at or behind the current query origin are ignored. After reflection, the next query origin advances 1 pixel in the outgoing direction, while the next visible segment still begins at the prior wall contact. Separating query origin from visible start prevents repeated zero-distance hits without drawing a gap.

Reflection uses the normal of the rectangle face actually entered, calculated by a slab-style ray/axis-aligned-rectangle intersection. It does not use the wall record's overall `orientation`, so hitting the short horizontal cap of a visually vertical wall correctly reflects the vertical direction component. When vertical and horizontal faces are reached at the same nearest distance, both direction components are reflected. Equal-distance candidates are grouped with the geometry epsilon, so a corner result does not depend on wall-array order.

Non-finite origins or directions, directions with magnitude at or below `1e-6`, and origins strictly inside any wall rectangle return an empty route. A wall-interior origin is invalid in normal play because the tank collision radius is larger than its 15-pixel barrel-tip offset; failing closed avoids inventing a route through solid geometry if that invariant is ever violated. An origin exactly on a wall boundary remains valid: if the direction points into the rectangle, it reflects immediately at that boundary, consumes one reflection, applies the outgoing nudge, and emits no zero-length segment; if the direction points outward, that rectangle is ignored. Corner starts apply the same rule to both inward components. The bounded loop and monotonic progress rule prevent infinite tracing or tracing through the wall to its opposite face.

### 5.3 Hit collection

`collectLaserHitPlayerIds()` checks circle-to-segment intersection against every living target snapshot:

- segment 0 skips `ownerId`;
- segments 1 and later treat `ownerId` like every other target;
- targets remain transparent and never shorten the route;
- a `Set` deduplicates a target intersected by more than one segment;
- returned IDs follow first contact order along the route, independent of input target order.

First-contact ordering is defined by segment index, distance from that segment's start, and finally ascending `playerId` for contacts equal within the geometry epsilon. Although damage is simultaneous, deterministic ordering keeps tests, logs, and future consumers stable.

## 6. Rendering and Scene State

### 6.1 Preview graphics

`GameScene` owns a preview graphic per player, keyed by `playerId`. During an active round, after tank movement and rotation are updated, each living tank holding Laser gets a current route snapshot. Its reusable graphic is cleared and redrawn with width 1, color `0xff0000`, alpha `0.35`, and depth 49, so it is distinguishable from a fired beam.

The preview is updated from the current barrel tip and rotation every simulation frame. A preview is destroyed immediately when its tank fires, loses the item, dies, or is removed. Other players' previews are unaffected.

### 6.2 Fired beam graphics

`PowerUpEffects` no longer traces walls. Its `renderLaser(scene, segments, soundManager)` helper receives the already calculated `LaserSegment[]`, draws the existing bright red formal beam, plays the existing Laser sound, and returns `Phaser.GameObjects.Graphics | null`. The formal graphic retains depth 50 and the existing two drawing passes: width 3/color `0xff0000`/alpha `0.9`, followed by width 8/color `0xff0000`/alpha `0.3` for glow. An empty segment list still plays the accepted-command sound but returns `null` without creating a graphic.

`GameScene` replaces the single `laserGraphics`, `laserTimer`, and `laserHitPlayerId` fields with an active collection. Each fired Laser record contains:

```ts
interface ActiveLaserEffect {
  graphics: Phaser.GameObjects.Graphics;
  remaining: number;
  hitPlayerIds: number[];
}
```

This prevents a second same-frame shot from overwriting the first shot's graphics, timer, or pending targets. `GameScene` adds an active record only when `renderLaser()` returns a graphic; an empty route therefore has no no-op timer record.

### 6.3 Preview-to-fire consistency

Preview and firing both call `traceLaserPath()` with the same current pose and wall snapshot. In a frame that contains firing input, the route is calculated after movement/rotation and is used for the formal beam and hit collection. The preview is removed in that same frame, producing a direct visual transition to identical formal segments rather than reusing a previous-frame cache.

## 7. Damage and Round Resolution

Each active Laser counts down from `LASER_LIFETIME` using simulation time. Pause stops scene simulation, so preview updates and beam countdowns freeze without special wall-clock compensation.

`hitPlayerIds` is calculated once from the firing-frame tank snapshots and then frozen in the active record. A target cannot dodge the already-fired instantaneous beam during the 0.3-second display, and a tank that later enters the graphic is not retroactively hit. Shield and alive state are checked at resolution time.

When one or more beams expire in the same update:

1. destroy all expired beam graphics;
2. count expired Laser hits per living player, with at most one hit from each Laser record;
3. let an active shield absorb one hit and consume the shield;
4. mark the player dead if any hits remain after shield absorption;
5. apply all marked deaths together through the existing same-frame elimination and round-resolution flow.

Consequences are explicit:

- one looping Laser cannot hit the same player twice;
- one Laser removes a shield but does not kill that shielded player;
- two concurrently expiring Lasers kill a player who began the batch with one shield;
- player iteration order cannot change who survives or wins.

Beams with different remaining times resolve in their own update batches. Existing non-Laser weapon semantics are unchanged.

## 8. Lifecycle and Cleanup

`GameScene` provides three idempotent cleanup helpers:

- `clearLaserPreview(playerId)` destroys and removes one player's held-item preview;
- `clearLaserPreviews()` destroys and clears only held-item preview graphics;
- `clearLasers()` calls `clearLaserPreviews()`, destroys all active beam graphics, and empties the active collection.

`clearLasers()` is called by `clearAsyncTasks()`. Each `create()` registers the existing one-shot `shutdown` cleanup. A private boolean guard registers a one-shot Phaser `destroy` cleanup only once for the lifetime of the scene instance, preventing listener accumulation across shutdown/restart cycles. Repeated cleanup is safe. `startRound()` already calls `clearAsyncTasks()`, and round completion calls `clearLasers()` directly before scheduling the next round.

The existing player-elimination helper calls `clearLaserPreview(playerId)` before marking each player dead. This removes the preview in the same update even when a three-player round continues with two survivors. Per-frame preview reconciliation remains a defensive cleanup for any held-item change that occurs outside the known entry points.

When `setPowerUpsEnabled(false)` delegates to `PowerUpManager.setEnabled(false)` and clears held items, it also calls `clearLaserPreviews()` synchronously. This is required even while the simulation is paused, because no update frame is available to notice the removed held items. Fired beams remain frozen and resume normally; disabling future power-up pickups does not cancel an already-fired weapon.

Together these entry points clear all Laser-owned graphics and pending state on:

- normal beam expiration;
- tank death for that tank's held-item preview;
- round completion;
- round restart;
- scene shutdown or destruction.

Cleanup is idempotent: destroying an already absent preview or draining an empty active collection is a no-op. No pending Laser damage may cross into a new round.

## 9. Error Handling and Edge Cases

- Empty route: no graphic, active timer, or hits are created; the active item is still consumed and the Laser sound still plays because the firing command was accepted.
- No wall ahead: the route ends with one 2,000-pixel terminal segment.
- Wall corner: equal-distance perpendicular faces reflect both components once.
- Tangent target contact: contact counts as a hit within the shared geometry epsilon.
- Dead or inactive tanks: excluded before creating the pure target snapshot and ignored again during delayed resolution.
- Target crossed on several reflected segments: one hit for that Laser.
- Simultaneous firing: every shot owns independent graphics, time, and hit IDs.
- Pause: neither route preview nor beam lifetime advances until simulation resumes.

## 10. Test Strategy

Implementation follows red-green-refactor.

### 10.1 Pure unit tests

Add focused tests for:

- straight route with no walls;
- single and multiple reflections;
- vertical, horizontal, and exact-corner reflection;
- short-cap reflection based on the actual struck rectangle face;
- invariance under wall-array reordering;
- wall-origin epsilon progress and absence of zero-length loops;
- reflection count and distance bounds;
- invalid and near-zero direction handling;
- wall-interior origins fail closed, while boundary origins reflect inward directions and ignore outward directions without zero-length segments;
- all intersected targets returned regardless of target-array order;
- deterministic first-contact ordering, including equal-distance `playerId` tie-breaking;
- deduplication across segments;
- owner excluded on segment 0 and included after reflection;
- tangent hits and clear near misses.

### 10.2 Scene and integration tests

Extend `GameScene` and effect tests to prove:

- a held Laser creates and updates its player's preview;
- previews for multiple players coexist;
- firing removes only the firing player's preview;
- eliminating one Laser holder in a continuing three-player round removes only that player's preview in the same update;
- preview and fired beam receive identical current-frame segments;
- concurrent beams retain independent graphics and timers;
- one beam hits all route targets once;
- shield absorption and multi-beam same-frame death follow the batch rules;
- pause freezes active Laser state;
- disabling power-ups while paused synchronously removes held-Laser previews without cancelling fired beams;
- round completion, restart, shutdown, and scene destruction clear all Laser resources.

Existing `PowerUpEffects` and `GameScene` test mocks migrate from `fireLaser()` / `hitPlayerId` to `traceLaserPath()`, `collectLaserHitPlayerIds()`, `renderLaser()`, and `hitPlayerIds`. No compatibility wrapper for the removed single-target API remains.

### 10.3 Browser acceptance

Run the production-like game in a real browser and verify:

- picking up Laser immediately shows a reflected preview;
- the preview continuously follows tank rotation;
- firing replaces the preview with the same bright route for the configured 0.3 seconds;
- multiple targets can be hit by one route;
- the owner is safe before reflection and vulnerable afterward;
- pause/resume and restart leave no stale lines;
- the browser console has no errors or warnings.

Finally run the complete repository check: all Vitest tests, TypeScript type checking, and Vite production build.

## 11. Acceptance Criteria

D4 Laser correction is complete when:

1. preview and formal beam use the same pure path tracer;
2. every living Laser holder has an independent live preview;
3. firing damages every distinct route target without truncating the drawing;
4. the owner is excluded only from the initial segment;
5. concurrent beams and simultaneous deaths are deterministic;
6. pause and every round/scene cleanup path preserve no stale Laser state;
7. focused tests, the full repository check, and browser acceptance all pass;
8. review finds no unresolved critical or important defects.
