# P0 Engineering Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a type-safe, testable, buildable Ricochet Tank baseline with production-safe AI debugging, project checks, release documentation, and a clean browser smoke test.

**Architecture:** Keep `src/config.ts` as the only source of game settings, keep `src/enums/AIState.ts` as the only source of AI runtime configuration, and turn the legacy `AIDifficulty` module into a compatibility facade. Gate AI path rendering behind a constant that defaults to false. Finish P0 with a single reproducible `npm run check` command and a browser smoke pass.

**Tech Stack:** TypeScript 6, Phaser 3.90, Vite 8, Vitest 4, Playwright browser automation.

## Global Constraints

- Preserve the existing local two-player and AI gameplay behavior.
- Do not add P1 player, pause, or weapon behavior in this plan.
- Use test-first development for source behavior changes.
- Do not commit unless targeted tests, full tests, typecheck, build, diff checks, and required browser smoke checks pass.
- Keep each commit limited to one independently reviewable outcome.

---

## File Map

- `src/config.ts`: canonical `AIDifficulty`, `GameSettings`, default settings, and debug flag.
- `src/enums/AIState.ts`: canonical `AIDifficultyConfig` and runtime difficulty values.
- `src/systems/AIDifficulty.ts`: compatibility names backed by canonical AI configuration.
- `src/systems/AIController.ts`: typed state map.
- `src/scenes/GameScene.ts`: consume canonical settings and honor the debug flag.
- `tests/scenes/GameScene.test.ts`: compile-time settings ownership and scene debug behavior.
- `tests/systems/AIDifficulty.test.ts`: compatibility facade behavior using canonical fields.
- `package.json`: repeatable typecheck and aggregate checks.
- `README.md`: setup, commands, modes, and controls.
- `public/favicon.svg`: project favicon.
- `index.html`: favicon declaration and page metadata.

### Task 1: Canonicalize Game and AI Configuration

**Files:**
- Modify: `tests/scenes/GameScene.test.ts`
- Modify: `tests/systems/AIDifficulty.test.ts`
- Modify: `src/scenes/GameScene.ts`
- Modify: `src/systems/AIDifficulty.ts`
- Modify: `src/systems/AIController.ts`
- Verify: `src/config.ts`
- Verify: `src/enums/AIState.ts`

**Interfaces:**
- Consumes: `GameSettings`, `DEFAULT_GAME_SETTINGS`, and `AIDifficulty` from `src/config.ts`.
- Consumes: `AIDifficultyConfig` and `AI_DIFFICULTY_CONFIGS` from `src/enums/AIState.ts`.
- Produces: `AI_DIFFICULTY_PRESETS` as an alias of `AI_DIFFICULTY_CONFIGS` and `getDifficultyConfig(difficulty: AIDifficulty): AIDifficultyConfig`.

- [ ] **Step 1: Update the settings tests to require the canonical config type**

Replace the `GameScene` type import with:

```ts
import { GameScene } from '../../src/scenes/GameScene';
import { DEFAULT_GAME_SETTINGS, type GameSettings } from '../../src/config';
```

Replace old `difficulty` and `pvp` assertions with:

```ts
it('uses the canonical local defaults', () => {
  expect(DEFAULT_GAME_SETTINGS).toEqual({ mode: 'local', aiDifficulty: 'medium' });
});

it('accepts local settings without an explicit difficulty', () => {
  const settings: GameSettings = { mode: 'local' };
  expect(settings.aiDifficulty).toBeUndefined();
});
```

- [ ] **Step 2: Update the legacy AI difficulty tests to require canonical fields**

Use these required keys:

```ts
const requiredKeys: (keyof AIDifficultyConfig)[] = [
  'reactionDelay',
  'accuracyOffset',
  'bulletDetectionDistance',
  'collectWillingness',
  'fireRateCooldown',
];
```

Assert `reactionDelay` is expressed in seconds and assert the canonical alias:

```ts
expect(config.reactionDelay).toBeGreaterThan(0);
expect(config.reactionDelay).toBeLessThanOrEqual(2);
expect(AI_DIFFICULTY_PRESETS).toBe(AI_DIFFICULTY_CONFIGS);
```

Rename all `shootingAccuracyOffset` assertions to `accuracyOffset` and remove assertions for deleted fields `dodgeProbability`, `moveSpeedMultiplier`, and `rotateSpeedMultiplier`.

- [ ] **Step 3: Run the compiler and confirm the red state**

Run:

```powershell
npx tsc --noEmit
```

Expected: failure caused by the duplicate `GameSettings`, stale `mode: 'pvp'`, incompatible `AIDifficulty` object fields, and untyped heterogeneous AI state map.

- [ ] **Step 4: Make `GameScene` consume canonical settings**

Add to the config import:

```ts
DEFAULT_GAME_SETTINGS,
type GameSettings,
```

Delete the local `GameSettings` interface and initialize settings with:

```ts
private settings: GameSettings = { ...DEFAULT_GAME_SETTINGS };
```

In `create`, use:

```ts
this.settings = settings ?? { ...DEFAULT_GAME_SETTINGS };
```

- [ ] **Step 5: Turn `AIDifficulty.ts` into a compatibility facade**

Replace its configuration objects with:

```ts
import type { AIDifficulty } from '../config';
import {
  AI_DIFFICULTY_CONFIGS,
  type AIDifficultyConfig,
} from '../enums/AIState';

export const AI_DIFFICULTY_PRESETS = AI_DIFFICULTY_CONFIGS;
export const AI_DODGE_THRESHOLD = 0.6;

export function getDifficultyConfig(difficulty: AIDifficulty): AIDifficultyConfig {
  const config = AI_DIFFICULTY_PRESETS[difficulty];
  if (!config) {
    throw new Error(
      `Unknown difficulty: "${difficulty}". Valid options: ${Object.keys(AI_DIFFICULTY_PRESETS).join(', ')}`,
    );
  }
  return config;
}
```

The runtime guard remains even though normal TypeScript callers are restricted to `AIDifficulty`; invalid-input tests call it through a cast.

- [ ] **Step 6: Type the AI state map explicitly**

Use:

```ts
this.states = new Map<AIStateType, AIState>([
  [AIStateType.PATROL, new PatrolState()],
  [AIStateType.CHASE, new ChaseState(this.config)],
  [AIStateType.ATTACK, new AttackState(this.config, tank.playerId)],
  [AIStateType.DODGE, new DodgeState(tank.playerId)],
  [AIStateType.COLLECT, new CollectState()],
]);
```

- [ ] **Step 7: Verify targeted and full checks**

Run:

```powershell
npx vitest run tests/scenes/GameScene.test.ts tests/systems/AIDifficulty.test.ts tests/systems/AIController.test.ts tests/enums/AIState.test.ts
npx tsc --noEmit
npm test
npm run build
```

Expected: all commands exit 0, 21 test files pass, and the production bundle is generated.

- [ ] **Step 8: Commit the build repair**

```powershell
git add src/config.ts src/enums/AIState.ts src/systems/AIDifficulty.ts src/systems/AIController.ts src/scenes/GameScene.ts tests/scenes/GameScene.test.ts tests/systems/AIDifficulty.test.ts
git diff --cached --check
git commit -m "fix: restore type-safe production build"
```

### Task 2: Disable AI Debug Rendering by Default

**Files:**
- Modify: `tests/scenes/GameScene.test.ts`
- Modify: `src/config.ts`
- Modify: `src/scenes/GameScene.ts`

**Interfaces:**
- Produces: `DEBUG_AI_PATHS: boolean`, defaulting to `false`.
- Consumes: existing `AIController.debugWaypoints` without changing AI behavior.

- [ ] **Step 1: Add a failing scene test**

Add:

```ts
it('does not create AI debug graphics when debug paths are disabled', () => {
  const scene = new GameScene();
  (scene as any).create({ mode: 'ai', aiDifficulty: 'easy' });
  expect((scene as any).aiDebugGraphics).toBeNull();
});
```

- [ ] **Step 2: Run the test and confirm it fails for the expected reason**

Run:

```powershell
npx vitest run tests/scenes/GameScene.test.ts
```

Expected: failure because AI mode currently creates a graphics object unconditionally.

- [ ] **Step 3: Add the production debug flag**

In `src/config.ts` add:

```ts
export const DEBUG_AI_PATHS = false;
```

In `GameScene.startRound`, create debug graphics only when the flag is true:

```ts
this.aiDebugGraphics?.destroy();
this.aiDebugGraphics = null;

if (DEBUG_AI_PATHS) {
  this.aiDebugGraphics = this.add.graphics().setDepth(99);
}
```

In `update`, call `drawAIDebugPath()` only when `DEBUG_AI_PATHS` is true.

- [ ] **Step 4: Verify the test and build**

Run:

```powershell
npx vitest run tests/scenes/GameScene.test.ts
npx tsc --noEmit
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit the production-safe debug behavior**

```powershell
git add src/config.ts src/scenes/GameScene.ts tests/scenes/GameScene.test.ts
git diff --cached --check
git commit -m "fix: hide AI path debugging by default"
```

### Task 3: Add Repeatable Project Checks and Release Documentation

**Files:**
- Modify: `package.json`
- Create: `README.md`
- Create: `public/favicon.svg`
- Modify: `index.html`

**Interfaces:**
- Produces: `npm run typecheck` and `npm run check` developer commands.
- Produces: `/favicon.svg` as the browser icon.

- [ ] **Step 1: Establish the current browser red state**

Start the development server, open the main menu in a browser, and inspect the console/network log.

Expected: `/favicon.ico` returns 404 before the favicon change.

- [ ] **Step 2: Add project scripts**

Set scripts to:

```json
{
  "dev": "vite",
  "typecheck": "tsc --noEmit",
  "build": "tsc && vite build",
  "test": "vitest run",
  "test:watch": "vitest",
  "check": "npm run typecheck && npm test && npm run build"
}
```

- [ ] **Step 3: Add the favicon and declaration**

Create `public/favicon.svg` as a small blue tank icon on the existing dark background. Add to `index.html`:

```html
<meta name="description" content="A local multiplayer ricochet tank game inspired by Tank Trouble 2.">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
```

- [ ] **Step 4: Add the project README**

Document:

- Node.js/npm prerequisites.
- `npm install`, `npm run dev`, `npm run check`, and `npm run build`.
- VS Player and VS AI modes.
- P1 `W/A/S/D`, Space, and E compatibility key.
- P2 arrow keys, Enter, and Period compatibility key.
- Escape return behavior as it exists in P0.
- Current first-to-three rule and power-up behavior.

- [ ] **Step 5: Run the aggregate check**

Run:

```powershell
npm run check
```

Expected: typecheck, 21 test files, 156 or more tests, and Vite production build all pass.

- [ ] **Step 6: Run the browser smoke test**

Verify:

1. Main menu renders with VS Player and VS AI.
2. VS Player enters a match and shows two tanks.
3. Escape returns to the menu.
4. VS AI opens the difficulty screen.
5. Easy starts an AI match.
6. AI debug paths are absent.
7. Browser console has no errors and `/favicon.svg` loads successfully.

- [ ] **Step 7: Commit checks and release documentation**

```powershell
git add package.json README.md public/favicon.svg index.html
git diff --cached --check
git commit -m "chore: add project checks and release documentation"
```

### Task 4: P0 Final Review and Handoff

**Files:**
- Verify: `docs/P0-P1-DEVELOPMENT-WORKFLOW.md`
- Verify: all files changed since commit `41b85eb`

**Interfaces:**
- Produces: a clean, committed P0 baseline suitable for P1-A work.

- [ ] **Step 1: Re-run every required check from a clean process**

Run:

```powershell
npm run check
git diff --check
git status --short
```

Expected: checks exit 0 and the worktree contains no uncommitted source changes.

- [ ] **Step 2: Review the complete P0 diff**

Run:

```powershell
git log --oneline 41b85eb..HEAD
git diff --stat 41b85eb..HEAD
git diff 41b85eb..HEAD
```

Review against the P0 requirements in `docs/P0-P1-DEVELOPMENT-WORKFLOW.md`. Fix Critical and Important findings with a failing regression test before proceeding.

- [ ] **Step 3: Repeat browser smoke after review fixes**

Repeat the seven browser checks from Task 3 and confirm there are no application console errors.

- [ ] **Step 4: Record the P0 result**

Report exact test counts, build result, browser paths exercised, commit SHAs, and any deferred P1 work. Do not begin P1-A until the P0 result is verified and committed.
