# Unified Weapon Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make each player's primary fire input release a held active weapon before falling back to standard bullets, while retaining the legacy power-up keys as compatible aliases without double firing.

**Architecture:** Add a pure weapon-action resolver that converts `shoot`, legacy `usePowerUp`, and held-power-up metadata into exactly one action: `none`, `standard`, or `active`. `GameScene` executes that single action for each living tank. Passive pickups remain automatic and standard fire remains subject to existing ammo/cooldown rules.

**Tech Stack:** TypeScript 6, Phaser 3.90, Vitest 4, Vite 8.

## Constraints

- Primary fire uses an active held weapon and consumes it; it never also emits a standard bullet.
- Without an active weapon, primary fire emits a standard bullet.
- Legacy E, `.`, and P3 right-click activate only active weapons and do not emit standard bullets.
- Passive held effects never intercept primary standard fire.
- Dead players and paused gameplay execute no weapon action.
- All changes use red-green TDD and each commit requires `npm run check`.

### Task 1: Add the Pure Weapon Action Resolver

**Files:**
- Create: `src/systems/WeaponInputResolver.ts`
- Create: `tests/systems/WeaponInputResolver.test.ts`

**Interface:**

```ts
resolveWeaponAction({ shoot, usePowerUp, heldPowerUp }): 'none' | 'standard' | 'active'
```

- [ ] Add failing tests for no input, ordinary fire, active-weapon primary fire, legacy activation, simultaneous inputs, and passive pickup fallback.
- [ ] Determine active/passive behavior from `POWERUP_VISUALS`; return exactly one action.
- [ ] Run targeted tests and `npm run check`; commit:

```powershell
git commit -m "feat: add unified weapon action resolver"
```

### Task 2: Integrate One-Action Weapon Execution

**Files:**
- Modify: `src/scenes/GameScene.ts`
- Modify: `tests/scenes/GameScene.test.ts`

- [ ] Add failing scene tests proving primary fire with Laser calls active handling only, ordinary primary fire calls standard handling only, and simultaneous primary/legacy input still consumes once.
- [ ] Replace separate `handleShoot` and later `handleUsePowerUp` loops with one per-player `handleWeaponInput` call after movement.
- [ ] Resolve one action, then delegate to the existing standard or active implementation.
- [ ] Keep cooldown/ammo enforcement in the existing standard-shot method and held-item consumption in the active method.
- [ ] Run targeted tests and `npm run check`; commit:

```powershell
git commit -m "refactor: unify standard and power-up weapon firing"
```

### Task 3: Documentation, Browser Smoke, and Review

**Files:**
- Modify: `README.md`

- [ ] Update control documentation so Space, Enter, and left click are the primary weapon buttons; label E, `.`, and right-click as compatibility shortcuts.
- [ ] Browser smoke 2P, 3P, and AI entry; verify pause still blocks input and console has zero errors.
- [ ] Run `npm run check` and `git diff --check`.
- [ ] Request read-only review and fix all Critical/Important findings with regression tests.
- [ ] Commit documentation:

```powershell
git commit -m "docs: document unified weapon input"
```

- [ ] Finish, merge to `main`, rerun checks, fetch remote, and push only when `origin/main` has no divergent commits.
