# Frag Bomb Collision Kernel Design

## Scope

This refactor is limited to Frag Bomb launch placement and continuous collision ordering. It does not change other weapons, controls, damage rules, visuals, or tuning values.

## Decision

Use one tolerance-aware time-of-impact (TOI) kernel for moving circles, rounded rectangles, tanks, walls, and lifetime expiry. Resolve a legal launch position before creating a bomb.

Two alternatives were rejected:

- Adding more call-site exceptions would preserve duplicated collision semantics and leave ordering bugs likely.
- Migrating every weapon to the new kernel would expand P1-D3 beyond its approved milestone.

## Collision Kernel

Pure collision helpers return the earliest normalized TOI in `[0, 1]`, or `null` when no contact occurs.

- Segment-circle solving uses a scale-aware discriminant tolerance. A small negative value within tolerance is clamped to zero so mathematically tangent paths remain hits; values below the tolerance remain misses.
- Rounded-rectangle TOI remains the union of horizontal and vertical face bands plus four corner circles.
- Starting overlap returns TOI `0`.
- Boolean overlap facades delegate to the TOI helpers so callers cannot diverge mathematically.

Tests cover forward and reverse paths, stationary overlap and miss, axis-aligned and arbitrary-angle tangency, near misses, corner contact, and large-coordinate scaling.

## Legal Launch Placement

The desired Frag Bomb origin remains in front of the tank at `tank.radius + bomb.radius + safetyGap`.

Before construction, trace from the tank centre toward the desired origin against walls. If the desired origin overlaps or crosses a wall, move the bomb back to the furthest non-overlapping point between the tank and wall. If no position can fit outside both the owner and the wall, do not spawn the bomb and do not consume the held power-up; the input is safely ignored for that frame.

This makes wall-adjacent firing deterministic without spawning a bomb inside geometry or moving it through a wall.

## Frame Event Ordering

For each active bomb, calculate candidate TOIs for:

1. eligible tank contact;
2. wall contact;
3. lifetime expiry within the frame.

Choose the smallest TOI. Tank wins exact ties with walls to preserve the existing explicit collision priority; lifetime wins only when strictly earlier. Place the bomb at the event position, using a tiny path-relative retreat only for wall contact before emitting fragments.

Fragments compare their earliest tank and wall TOIs in the same way. Tank wins exact ties. Shield consumption and frame-level elimination aggregation remain unchanged.

## Lifecycle and Pause

The refactor does not add timers or listeners. Simulation advances only in `GameScene.update` while the round is `PLAYING`; pause therefore freezes TOI and lifetime progression. Existing owner elimination, round reset, round over, and scene shutdown cleanup remains authoritative.

## Verification

- Pure collision tests for numerical tolerance and TOI ordering.
- Scene tests using real collision helpers for wall-adjacent launch success or safe refusal.
- Scene test where lifetime expiry precedes a later wall contact in the same frame.
- Existing Frag Bomb input, self-damage, shield, simultaneous elimination, restart, shutdown, and browser smoke coverage must remain green.
- Required gates: targeted RED/GREEN evidence, `npm run check`, `git diff --check`, final read-only review, clean fast-forward merge, fetch/divergence check, and non-force push.
