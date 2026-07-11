# Three-Player Local Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a selectable three-player local match with mouse-controlled Player 3, three spawn points, dynamic scoring, and last-tank-standing round resolution while preserving two-player and AI modes.

**Architecture:** Model settings as a discriminated union so local player count and AI difficulty cannot form invalid combinations. Add pure mouse-input and match-resolution functions with unit tests, then make `GameScene` orchestrate player arrays rather than fixed P1/P2 branches. Preserve existing weapon behavior; P1-B and P1-C remain out of scope.

**Tech Stack:** TypeScript 6, Phaser 3.90, Vite 8, Vitest 4, Playwright browser automation.

## Global Constraints

- Preserve VS AI and two-player local behavior.
- Local mode supports exactly 2 or 3 players.
- Player 3 rotates toward the pointer, moves only outside a dead zone, fires on the left-button down edge, and uses a held power-up on the right-button down edge.
- A three-player round continues after the first elimination and ends when one or zero tanks remain alive.
- All behavior changes use a verified red-green TDD cycle.
- Every code commit requires `npm run check`; visible changes additionally require browser smoke testing.

---

### Task 1: Add Typed Local Match Options

**Files:**
- Modify: `src/config.ts`
- Modify: `src/scenes/MenuScene.ts`
- Modify: `src/scenes/DifficultyScene.ts`
- Modify: `tests/scenes/MenuScene.test.ts`
- Modify: `tests/scenes/DifficultyScene.test.ts`
- Modify: `tests/scenes/GameScene.test.ts`

**Interfaces:**
- Produces: `LocalPlayerCount = 2 | 3`.
- Produces: `GameSettings = { mode: 'local'; localPlayers: LocalPlayerCount } | { mode: 'ai'; aiDifficulty: AIDifficulty }`.
- Produces: exported `MENU_OPTIONS` entries carrying complete `GameSettings` or an AI-selection action.

- [ ] Write tests that require three menu options and valid discriminated settings:

```ts
expect(MENU_OPTIONS.map(option => option.label)).toEqual(['2 Players', '3 Players', 'VS AI']);
expect(MENU_OPTIONS[0].settings).toEqual({ mode: 'local', localPlayers: 2 });
expect(MENU_OPTIONS[1].settings).toEqual({ mode: 'local', localPlayers: 3 });
expect(DEFAULT_GAME_SETTINGS).toEqual({ mode: 'local', localPlayers: 2 });
```

- [ ] Run targeted tests and `npx tsc --noEmit`; confirm failure because `localPlayers` and `MENU_OPTIONS` do not exist.

- [ ] Implement the discriminated union and menu options:

```ts
export type LocalPlayerCount = 2 | 3;
export type GameSettings =
  | { mode: 'local'; localPlayers: LocalPlayerCount }
  | { mode: 'ai'; aiDifficulty: AIDifficulty };

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  mode: 'local',
  localPlayers: 2,
};
```

```ts
export const MENU_OPTIONS = [
  { key: 'local-2', label: '2 Players', settings: { mode: 'local', localPlayers: 2 } },
  { key: 'local-3', label: '3 Players', settings: { mode: 'local', localPlayers: 3 } },
  { key: 'ai', label: 'VS AI', settings: null },
] as const;
```

- [ ] Update `DifficultyScene` to continue creating `{ mode: 'ai', aiDifficulty }`; update all stale settings fixtures.

- [ ] Run targeted tests, `npm run check`, inspect the diff, and commit:

```powershell
git commit -m "feat: add typed local match options"
```

### Task 2: Add Three Spawn Points and Player 3 Visual Identity

**Files:**
- Modify: `src/systems/MazeGenerator.ts`
- Modify: `src/objects/Tank.ts`
- Modify: `tests/systems/MazeGenerator.test.ts`
- Modify: `tests/objects/Tank.test.ts`

**Interfaces:**
- Produces: `MazeResult.spawns: Array<{ x: number; y: number }>` with three entries.
- Preserves: `spawn1` and `spawn2` compatibility fields during P1-A.
- Produces: green `TANK_COLORS[2]` for local Player 3.

- [ ] Add failing tests:

```ts
expect(result.spawns).toHaveLength(3);
expect(result.spawns[0]).toEqual(result.spawn1);
expect(result.spawns[1]).toEqual(result.spawn2);
expect(new Set(result.spawns.map(p => `${p.x},${p.y}`)).size).toBe(3);
```

```ts
expect(TANK_COLORS[2]).toEqual({ body: 0x44dd66, track: 0x228844, turret: 0x33aa55 });
```

- [ ] Run targeted tests and confirm the missing `spawns` field and old dark color fail.

- [ ] Add the top-right third spawn, clear walls around all spawns, return `spawns`, and update Player 3 colors.

- [ ] Run targeted tests and `npm run check`, inspect the diff, and commit:

```powershell
git commit -m "feat: add third spawn and player color"
```

### Task 3: Add Deterministic Mouse Player Input

**Files:**
- Create: `tests/systems/MouseController.test.ts`
- Create: `src/systems/MouseController.ts`
- Modify: `src/systems/InputManager.ts`
- Modify: `tests/scenes/GameScene.test.ts` mocks

**Interfaces:**
- Produces: `computeMousePlayerInput(state: MouseInputState): MouseInputResult`.
- Produces: `MouseController.getInput(tank: Pick<Tank, 'x' | 'y' | 'rotation'>): PlayerInput`.
- Uses: pointer coordinates plus left/right-button state from a small `PointerLike` interface.

- [ ] Write failing tests for right/left rotation, movement dead zone, forward movement after alignment, and independent left/right click edges:

```ts
expect(computeMousePlayerInput({ tankX: 0, tankY: 0, tankRotation: 0, pointerX: 0, pointerY: 100, pointerDown: false, previousPointerDown: false }).rotateRight).toBe(true);
expect(computeMousePlayerInput({ tankX: 0, tankY: 0, tankRotation: 0, pointerX: 5, pointerY: 0, pointerDown: false, previousPointerDown: false }).forward).toBe(false);
expect(computeMousePlayerInput({ tankX: 0, tankY: 0, tankRotation: 0, pointerX: 100, pointerY: 0, pointerDown: true, previousPointerDown: false }).shoot).toBe(true);
expect(computeMousePlayerInput({ tankX: 0, tankY: 0, tankRotation: 0, pointerX: 100, pointerY: 0, pointerDown: true, previousPointerDown: true }).shoot).toBe(false);
expect(computeMousePlayerInput({ tankX: 0, tankY: 0, tankRotation: 0, pointerX: 100, pointerY: 0, pointerDown: false, previousPointerDown: false, useDown: true, previousUseDown: false }).usePowerUp).toBe(true);
```

- [ ] Run the new test and confirm failure because the module is missing.

- [ ] Implement a 24-pixel dead zone, normalized angle difference, 0.1-radian rotation tolerance, and independent button down-edge detection: left click sets `shoot`, right click sets `usePowerUp`. Suppress the game canvas context menu so right-click gameplay is uninterrupted. P1-C later unifies the weapon model without causing a double-fire regression.

- [ ] Construct `MouseController` inside `InputManager` and expose:

```ts
getPlayer3Input(tank: Pick<Tank, 'x' | 'y' | 'rotation'>): PlayerInput
```

- [ ] Run targeted tests and `npm run check`, inspect the diff, and commit:

```powershell
git commit -m "feat: add mouse controller for player three"
```

### Task 4: Add Dynamic Match Resolution

**Files:**
- Create: `tests/systems/MatchRules.test.ts`
- Create: `src/systems/MatchRules.ts`
- Modify: `src/objects/Tank.ts`
- Modify: `src/scenes/GameScene.ts`
- Modify: `tests/scenes/GameScene.test.ts`

**Interfaces:**
- Produces: `evaluateRound(alivePlayerIds: number[]): { roundOver: boolean; winnerId: number | null; draw: boolean }`.
- Produces: `Tank.setAlive(alive: boolean): void` to hide eliminated tanks.
- Changes: `GameScene` scores to `number[]`, inputs to `PlayerInput[]`, and power-up HUD graphics to an array.

- [ ] Write failing pure match-rule tests:

```ts
expect(evaluateRound([0, 1, 2])).toEqual({ roundOver: false, winnerId: null, draw: false });
expect(evaluateRound([1, 2])).toEqual({ roundOver: false, winnerId: null, draw: false });
expect(evaluateRound([2])).toEqual({ roundOver: true, winnerId: 2, draw: false });
expect(evaluateRound([])).toEqual({ roundOver: true, winnerId: null, draw: true });
```

- [ ] Run tests and confirm the missing module fails.

- [ ] Implement `evaluateRound` as a pure function.

- [ ] Add a failing `Tank.setAlive(false)` test that asserts `alive === false` and the graphics visibility is disabled; implement it with `setVisible`.

- [ ] Refactor `GameScene` initialization:

```ts
private scores: number[] = [];
private powerUpHudGraphics: Phaser.GameObjects.Graphics[] = [];

const playerCount = this.settings.mode === 'local' ? this.settings.localPlayers : 2;
this.scores = Array(playerCount).fill(0);
```

- [ ] Spawn two or three tanks from `maze.spawns`. Build inputs as an array: P1 keyboard, P2 keyboard or AI, and optional P3 mouse. Skip movement and firing for dead tanks.

- [ ] Replace immediate two-player `resolveRound(deadPlayers)` calls with `eliminatePlayers(playerIds)`: mark unique tanks dead, then call `evaluateRound` on remaining IDs. Continue a three-player round when two tanks remain; score and reset only when the result is over.

- [ ] Render score text from the scores array (`P1`, `P2`/AI label, `P3`) and draw held-power-up HUD entries for every tank.

- [ ] Add scene tests for three tanks, three scores, first elimination continuing the round, last survivor scoring, and all-dead draw.

- [ ] Run targeted tests and `npm run check`, inspect the diff, and commit:

```powershell
git commit -m "feat: support three-player round resolution"
```

### Task 5: Documentation, Browser Smoke, and Review

**Files:**
- Modify: `README.md`
- Verify: all changes since the P1-A branch base

- [ ] Update README modes and controls with 2 Players, 3 Players, VS AI, and Player 3 mouse behavior.

- [ ] Run `npm run check` as a standalone command and require exit 0.

- [ ] Browser smoke test:
  1. Menu shows 2 Players, 3 Players, VS AI.
  2. 2 Players creates two tanks and preserves keyboard controls.
  3. 3 Players creates blue, red, and green tanks with three score entries.
  4. Pointer movement rotates/moves Player 3, left click fires once per press, and right click uses a held power-up without opening a context menu.
  5. Eliminating one of three players does not reset the round.
  6. VS AI difficulty selection and AI match still work.
  7. Console has zero application errors.

- [ ] Request a read-only code review over the complete branch range. Fix all Critical and Important findings with regression tests.

- [ ] Re-run `npm run check`, `git diff --check`, and browser smoke after review fixes.

- [ ] Commit documentation:

```powershell
git commit -m "docs: document three-player local mode"
```

- [ ] Finish the branch using `superpowers:finishing-a-development-branch`.
