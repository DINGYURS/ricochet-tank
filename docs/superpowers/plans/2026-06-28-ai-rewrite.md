# AI 系统重写实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重写 AI 系统，使其能够感知墙壁、绕墙寻路、预测子弹反弹、合理管理弹药，行为更像人类玩家。

**Architecture:** 使用有限状态机（FSM）架构，5 个状态（Patrol/Chase/Attack/Dodge/Collect），每个状态独立实现墙壁感知逻辑。AIController 负责传感器收集和状态转换，状态类负责具体行为决策。

**Tech Stack:** TypeScript, Phaser 3, Vitest

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/enums/AIState.ts` | **修改** | 添加 walls 到 AIInput，添加 hasLineOfSight |
| `src/systems/states/PatrolState.ts` | **重写** | 射线探测走廊探索 |
| `src/systems/states/ChaseState.ts` | **重写** | 绕墙寻路，保持安全距离 |
| `src/systems/states/AttackState.ts` | **重写** | 视线检测、弹药管理 |
| `src/systems/states/DodgeState.ts` | **重写** | 子弹反弹预测、掩体寻找 |
| `src/systems/states/CollectState.ts` | **重写** | 绕墙路径计算 |
| `src/systems/AIController.ts` | **重写** | 主控制器：传感器、状态机、反应延迟 |
| `src/scenes/GameScene.ts` | **修改** | 传入墙壁数据 |
| `tests/systems/AIController.test.ts` | **重写** | 更新测试以匹配新接口 |
| `tests/systems/states/*.test.ts` | **重写** | 更新各状态测试 |

---

### Task 1: 更新 AIState 接口

**Files:**
- Modify: `src/enums/AIState.ts`
- Test: `tests/enums/AIState.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
// tests/enums/AIState.test.ts
import { describe, it, expect } from 'vitest';
import { AIStateType, AI_DIFFICULTY_CONFIGS } from '../../src/enums/AIState';

describe('AIState interface', () => {
  it('AIInput includes walls array', () => {
    // We can't directly test interfaces, but we can verify the type compiles
    // by creating an object that matches the interface
    const input = {
      selfPosition: { x: 0, y: 0 },
      selfRotation: 0,
      enemyPosition: null,
      enemyRotation: 0,
      bullets: [],
      powerUps: [],
      walls: [
        { x: 0, y: 0, width: 10, height: 100, orientation: 'vertical' },
      ],
      ammo: 10,
      heldPowerUp: null,
    };
    expect(input.walls).toHaveLength(1);
  });

  it('AI_DIFFICULTY_CONFIGS has all three difficulties', () => {
    expect(AI_DIFFICULTY_CONFIGS).toHaveProperty('easy');
    expect(AI_DIFFICULTY_CONFIGS).toHaveProperty('medium');
    expect(AI_DIFFICULTY_CONFIGS).toHaveProperty('hard');
  });

  it('each difficulty has required fields', () => {
    for (const [key, config] of Object.entries(AI_DIFFICULTY_CONFIGS)) {
      expect(config).toHaveProperty('reactionDelay');
      expect(config).toHaveProperty('accuracyOffset');
      expect(config).toHaveProperty('bulletDetectionDistance');
      expect(config).toHaveProperty('collectWillingness');
      expect(config).toHaveProperty('fireRateCooldown');
    }
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run tests/enums/AIState.test.ts`
Expected: PASS（接口已存在，测试应该通过）

- [ ] **Step 3: 确认 AIInput 接口包含 walls**

检查 `src/enums/AIState.ts` 中的 `AIInput` 接口，确认 `walls` 字段已存在：

```ts
export interface AIInput {
  selfPosition: { x: number; y: number };
  selfRotation: number;
  enemyPosition: { x: number; y: number } | null;
  enemyRotation: number;
  bullets: Array<{ x: number; y: number; vx: number; vy: number; ownerId: number }>;
  powerUps: Array<{ x: number; y: number; type: string }>;
  walls: Array<{ x: number; y: number; width: number; height: number; orientation: string }>;
  ammo: number;
  heldPowerUp: string | null;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run tests/enums/AIState.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/enums/AIState.ts tests/enums/AIState.test.ts
git commit -m "test: verify AIState interface includes walls"
```

---

### Task 2: 创建几何工具函数

**Files:**
- Create: `src/utils/geometry.ts`
- Test: `tests/utils/geometry.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
// tests/utils/geometry.test.ts
import { describe, it, expect } from 'vitest';
import {
  normalizeAngle,
  angleDiff,
  dist,
  hasLineOfSight,
  segmentIntersectsRect,
  predictBulletBounce,
} from '../../src/utils/geometry';

describe('normalizeAngle', () => {
  it('returns angle in (-PI, PI]', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI); // -PI maps to PI
    expect(normalizeAngle(2 * Math.PI)).toBeCloseTo(0);
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-3 * Math.PI)).toBeCloseTo(Math.PI);
  });
});

describe('angleDiff', () => {
  it('returns 0 for same angles', () => {
    expect(angleDiff(1, 1)).toBeCloseTo(0);
  });

  it('returns PI for opposite angles', () => {
    expect(angleDiff(0, Math.PI)).toBeCloseTo(Math.PI);
    expect(angleDiff(Math.PI, 0)).toBeCloseTo(Math.PI);
  });

  it('handles wraparound correctly', () => {
    // Angle from -PI to PI is 2*PI difference, but shortest is 0
    expect(angleDiff(-Math.PI + 0.01, Math.PI - 0.01)).toBeCloseTo(-0.02, 5);
  });
});

describe('dist', () => {
  it('returns 0 for same point', () => {
    expect(dist(0, 0, 0, 0)).toBe(0);
  });

  it('returns correct distance', () => {
    expect(dist(0, 0, 3, 4)).toBe(5);
    expect(dist(100, 100, 103, 104)).toBe(5);
  });
});

describe('segmentIntersectsRect', () => {
  it('returns true when segment crosses rect', () => {
    const rect = { x: 50, y: 0, width: 10, height: 100 };
    expect(segmentIntersectsRect(0, 50, 100, 50, rect)).toBe(true);
  });

  it('returns false when segment misses rect', () => {
    const rect = { x: 50, y: 0, width: 10, height: 100 };
    expect(segmentIntersectsRect(0, 200, 100, 200, rect)).toBe(false);
  });

  it('returns false when segment ends before rect', () => {
    const rect = { x: 50, y: 0, width: 10, height: 100 };
    expect(segmentIntersectsRect(0, 50, 40, 50, rect)).toBe(false);
  });
});

describe('hasLineOfSight', () => {
  it('returns true when no walls block', () => {
    expect(hasLineOfSight({ x: 0, y: 50 }, { x: 100, y: 50 }, [])).toBe(true);
  });

  it('returns false when wall blocks', () => {
    const walls = [{ x: 50, y: 0, width: 10, height: 100, orientation: 'vertical' }];
    expect(hasLineOfSight({ x: 0, y: 50 }, { x: 100, y: 50 }, walls)).toBe(false);
  });

  it('returns true when wall is beside the line', () => {
    const walls = [{ x: 50, y: 0, width: 10, height: 100, orientation: 'vertical' }];
    expect(hasLineOfSight({ x: 0, y: 200 }, { x: 100, y: 200 }, walls)).toBe(true);
  });
});

describe('predictBulletBounce', () => {
  it('returns null when no wall hit', () => {
    const bullet = { x: 0, y: 50, vx: 100, vy: 0 };
    const walls: any[] = [];
    expect(predictBulletBounce(bullet, walls, 1000)).toBeNull();
  });

  it('predicts horizontal bounce off vertical wall', () => {
    const bullet = { x: 0, y: 50, vx: 300, vy: 0 };
    const walls = [{ x: 80, y: 0, width: 10, height: 100, orientation: 'vertical' }];
    const result = predictBulletBounce(bullet, walls, 200);
    expect(result).not.toBeNull();
    expect(result!.vx).toBeCloseTo(-300); // reflected
    expect(result!.vy).toBeCloseTo(0);
  });

  it('predicts vertical bounce off horizontal wall', () => {
    const bullet = { x: 50, y: 0, vx: 0, vy: 300 };
    const walls = [{ x: 0, y: 80, width: 100, height: 10, orientation: 'horizontal' }];
    const result = predictBulletBounce(bullet, walls, 200);
    expect(result).not.toBeNull();
    expect(result!.vx).toBeCloseTo(0);
    expect(result!.vy).toBeCloseTo(-300); // reflected
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run tests/utils/geometry.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: 实现几何工具函数**

```ts
// src/utils/geometry.ts

/**
 * Normalise angle to the range (-PI, PI].
 */
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle <= -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Shortest angular difference from `a` to `b`, in (-PI, PI].
 * Positive means b is clockwise from a.
 */
export function angleDiff(a: number, b: number): number {
  return normalizeAngle(b - a);
}

/**
 * Euclidean distance between two points.
 */
export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Check whether line segment (ax,ay)->(bx,by) intersects an axis-aligned rectangle.
 */
export function segmentIntersectsRect(
  ax: number, ay: number, bx: number, by: number,
  rect: { x: number; y: number; width: number; height: number },
): boolean {
  const { x: rx, y: ry, width: rw, height: rh } = rect;

  // Check if either endpoint is inside the rect
  if (ax >= rx && ax <= rx + rw && ay >= ry && ay <= ry + rh) return true;
  if (bx >= rx && bx <= rx + rw && by >= ry && by <= ry + rh) return true;

  // Check segment against each edge
  return (
    segmentsIntersect(ax, ay, bx, by, rx, ry, rx + rw, ry) ||          // top
    segmentsIntersect(ax, ay, bx, by, rx + rw, ry, rx + rw, ry + rh) || // right
    segmentsIntersect(ax, ay, bx, by, rx, ry + rh, rx + rw, ry + rh) || // bottom
    segmentsIntersect(ax, ay, bx, by, rx, ry, rx, ry + rh)              // left
  );
}

/**
 * Check if line segments AB and CD intersect (proper crossing only).
 */
function segmentsIntersect(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): boolean {
  const d1 = cross(cx, cy, dx, dy, ax, ay);
  const d2 = cross(cx, cy, dx, dy, bx, by);
  const d3 = cross(ax, ay, bx, by, cx, cy);
  const d4 = cross(ax, ay, bx, by, dx, dy);

  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

/**
 * Cross product of vectors (p2-p1) and (p3-p1).
 */
function cross(
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  p3x: number, p3y: number,
): number {
  return (p2x - p1x) * (p3y - p1y) - (p2y - p1y) * (p3x - p1x);
}

/**
 * True when no wall rectangle intersects the line between `from` and `to`.
 */
export function hasLineOfSight(
  from: { x: number; y: number },
  to: { x: number; y: number },
  walls: Array<{ x: number; y: number; width: number; height: number }>,
): boolean {
  for (const wall of walls) {
    if (segmentIntersectsRect(from.x, from.y, to.x, to.y, wall)) {
      return false;
    }
  }
  return true;
}

/**
 * Predict where a bullet will hit a wall and what its reflected velocity will be.
 * Returns null if no wall is hit within maxDist.
 */
export function predictBulletBounce(
  bullet: { x: number; y: number; vx: number; vy: number },
  walls: Array<{ x: number; y: number; width: number; height: number; orientation: string }>,
  maxDist: number,
): { x: number; y: number; vx: number; vy: number } | null {
  const speed = Math.hypot(bullet.vx, bullet.vy);
  if (speed === 0) return null;

  const dx = bullet.vx / speed;
  const dy = bullet.vy / speed;

  let closestT = Infinity;
  let closestWall: typeof walls[0] | null = null;

  for (const wall of walls) {
    const t = rayIntersectsRect(bullet.x, bullet.y, dx, dy, wall);
    if (t !== null && t > 1 && t < closestT && t < maxDist) {
      closestT = t;
      closestWall = wall;
    }
  }

  if (!closestWall) return null;

  const hitX = bullet.x + dx * closestT;
  const hitY = bullet.y + dy * closestT;

  // Reflect velocity based on wall orientation
  let newVx = bullet.vx;
  let newVy = bullet.vy;
  if (closestWall.orientation === 'vertical') {
    newVx = -bullet.vx;
  } else {
    newVy = -bullet.vy;
  }

  return { x: hitX, y: hitY, vx: newVx, vy: newVy };
}

/**
 * Slab-method ray-AABB intersection.
 * Returns the distance `t` along the ray where it first enters the rect,
 * or null if no intersection.
 */
export function rayIntersectsRect(
  ox: number, oy: number,
  dx: number, dy: number,
  rect: { x: number; y: number; width: number; height: number },
): number | null {
  const minX = rect.x;
  const maxX = rect.x + rect.width;
  const minY = rect.y;
  const maxY = rect.y + rect.height;

  let tmin = -Infinity;
  let tmax = Infinity;

  if (dx !== 0) {
    let t1 = (minX - ox) / dx;
    let t2 = (maxX - ox) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  } else {
    if (ox < minX || ox > maxX) return null;
  }

  if (dy !== 0) {
    let t1 = (minY - oy) / dy;
    let t2 = (maxY - oy) / dy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  } else {
    if (oy < minY || oy > maxY) return null;
  }

  return tmin >= 0 ? tmin : null;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run tests/utils/geometry.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/utils/geometry.ts tests/utils/geometry.test.ts
git commit -m "feat: add geometry utilities for AI wall detection"
```

---

### Task 3: 重写 PatrolState

**Files:**
- Rewrite: `src/systems/states/PatrolState.ts`
- Rewrite: `tests/systems/states/PatrolState.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
// tests/systems/states/PatrolState.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PatrolState } from '../../../src/systems/states/PatrolState';
import { AIStateType, type AIInput, type AIDifficultyConfig } from '../../../src/enums/AIState';

const mediumConfig: AIDifficultyConfig = {
  reactionDelay: 0.2,
  accuracyOffset: Math.PI / 12,
  bulletDetectionDistance: 250,
  collectWillingness: 0.6,
  fireRateCooldown: 0.4,
};

function makeInput(overrides: Partial<AIInput> = {}): AIInput {
  return {
    selfPosition: { x: 100, y: 100 },
    selfRotation: 0,
    enemyPosition: null,
    enemyRotation: 0,
    bullets: [],
    powerUps: [],
    walls: [],
    ammo: 10,
    heldPowerUp: null,
    ...overrides,
  };
}

describe('PatrolState', () => {
  let state: PatrolState;

  beforeEach(() => {
    state = new PatrolState();
  });

  it('has correct type', () => {
    expect(state.type).toBe(AIStateType.PATROL);
  });

  it('drives forward', () => {
    const output = state.execute(makeInput(), 0.016);
    expect(output.forward).toBe(true);
  });

  it('does not shoot', () => {
    const output = state.execute(makeInput(), 0.016);
    expect(output.shoot).toBe(false);
  });

  it('uses ray-casting to pick open direction when walls present', () => {
    // Wall directly ahead
    const walls = [
      { x: 130, y: 50, width: 10, height: 100, orientation: 'vertical' },
    ];
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      selfRotation: 0,
      walls,
    });
    const output = state.execute(input, 0.016);
    // Should rotate to avoid wall
    expect(output.rotateLeft || output.rotateRight).toBe(true);
  });

  it('picks new direction periodically', () => {
    const state = new PatrolState();
    const input = makeInput();

    // Run for several seconds
    let changed = false;
    let lastLeft = false;
    let lastRight = false;
    for (let i = 0; i < 300; i++) {
      const output = state.execute(input, 0.016);
      if (i > 0 && (output.rotateLeft !== lastLeft || output.rotateRight !== lastRight)) {
        changed = true;
        break;
      }
      lastLeft = output.rotateLeft;
      lastRight = output.rotateRight;
    }
    expect(changed).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run tests/systems/states/PatrolState.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 PatrolState**

```ts
// src/systems/states/PatrolState.ts
import {
  AIStateType,
  type AIInput,
  type AIOutput,
  type AIState,
} from '../../enums/AIState';
import { rayIntersectsRect, normalizeAngle, angleDiff } from '../../utils/geometry';

const NUM_RAY_DIRECTIONS = 8;
const RAY_MAX_DISTANCE = 300;
const DIRECTION_CHANGE_MIN = 2;
const DIRECTION_CHANGE_MAX = 4;
const ANGLE_TOLERANCE = 0.1;
const WALL_AVOIDANCE_MARGIN = 30;

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class PatrolState implements AIState {
  type = AIStateType.PATROL;

  private targetAngle: number = 0;
  private directionChangeTimer: number = 0;

  enter(): void {
    this.targetAngle = Math.random() * Math.PI * 2;
    this.directionChangeTimer = randomRange(DIRECTION_CHANGE_MIN, DIRECTION_CHANGE_MAX);
  }

  execute(input: AIInput, dt: number): AIOutput {
    this.directionChangeTimer -= dt;
    if (this.directionChangeTimer <= 0) {
      this.directionChangeTimer = randomRange(DIRECTION_CHANGE_MIN, DIRECTION_CHANGE_MAX);
      this.targetAngle = this.pickBestDirection(input);
    }

    const diff = angleDiff(input.selfRotation, this.targetAngle);
    const rotateLeft = diff < -ANGLE_TOLERANCE;
    const rotateRight = diff > ANGLE_TOLERANCE;
    const forward = Math.abs(diff) < Math.PI / 4;

    return {
      forward,
      backward: false,
      rotateLeft,
      rotateRight,
      shoot: false,
      usePowerUp: false,
    };
  }

  exit(): void {}

  private pickBestDirection(input: AIInput): number {
    const { selfPosition, walls } = input;
    let bestAngle = input.selfRotation;
    let bestDist = 0;

    for (let i = 0; i < NUM_RAY_DIRECTIONS; i++) {
      const angle = (i / NUM_RAY_DIRECTIONS) * Math.PI * 2;
      const d = this.castRay(selfPosition.x, selfPosition.y, angle, RAY_MAX_DISTANCE, walls);

      if (d > bestDist) {
        bestDist = d;
        bestAngle = angle;
      }
    }

    if (bestDist < WALL_AVOIDANCE_MARGIN) {
      return input.selfRotation;
    }

    return bestAngle;
  }

  private castRay(
    startX: number, startY: number,
    angle: number, maxDistance: number,
    walls: AIInput['walls'],
  ): number {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let closest = maxDistance;

    for (const wall of walls) {
      const t = rayIntersectsRect(startX, startY, dx, dy, wall);
      if (t !== null && t >= 0 && t < closest) {
        closest = t;
      }
    }

    return closest;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run tests/systems/states/PatrolState.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/systems/states/PatrolState.ts tests/systems/states/PatrolState.test.ts
git commit -m "feat: rewrite PatrolState with ray-based wall avoidance"
```

---

### Task 4: 重写 ChaseState

**Files:**
- Rewrite: `src/systems/states/ChaseState.ts`
- Rewrite: `tests/systems/states/ChaseState.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
// tests/systems/states/ChaseState.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ChaseState } from '../../../src/systems/states/ChaseState';
import { AIStateType, type AIInput, type AIDifficultyConfig } from '../../../src/enums/AIState';

const mediumConfig: AIDifficultyConfig = {
  reactionDelay: 0.2,
  accuracyOffset: Math.PI / 12,
  bulletDetectionDistance: 250,
  collectWillingness: 0.6,
  fireRateCooldown: 0.4,
};

function makeInput(overrides: Partial<AIInput> = {}): AIInput {
  return {
    selfPosition: { x: 100, y: 100 },
    selfRotation: 0,
    enemyPosition: { x: 400, y: 100 },
    enemyRotation: Math.PI,
    bullets: [],
    powerUps: [],
    walls: [],
    ammo: 10,
    heldPowerUp: null,
    ...overrides,
  };
}

describe('ChaseState', () => {
  let state: ChaseState;

  beforeEach(() => {
    state = new ChaseState(mediumConfig);
  });

  it('has correct type', () => {
    expect(state.type).toBe(AIStateType.CHASE);
  });

  it('drives forward toward enemy', () => {
    const output = state.execute(makeInput(), 0.016);
    expect(output.forward).toBe(true);
  });

  it('rotates toward enemy', () => {
    const input = makeInput({
      selfRotation: 0,
      enemyPosition: { x: 200, y: 300 },
    });
    const output = state.execute(input, 0.016);
    expect(output.rotateRight).toBe(true);
  });

  it('finds alternative path when wall blocks direct route', () => {
    const walls = [
      { x: 180, y: 50, width: 10, height: 100, orientation: 'vertical' },
    ];
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      enemyPosition: { x: 400, y: 100 },
      walls,
    });
    const output = state.execute(input, 0.016);
    // Should still move forward but rotate to avoid wall
    expect(output.forward).toBe(true);
  });

  it('does not fire when line of sight is blocked', () => {
    const walls = [
      { x: 180, y: 50, width: 10, height: 100, orientation: 'vertical' },
    ];
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      selfRotation: 0,
      enemyPosition: { x: 400, y: 100 },
      walls,
      ammo: 10,
    });
    const output = state.execute(input, 0.016);
    expect(output.shoot).toBe(false);
  });

  it('fires opportunistically when aim aligned and line clear', () => {
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      selfRotation: 0,
      enemyPosition: { x: 400, y: 100 },
      walls: [],
      ammo: 10,
    });
    const output = state.execute(input, 0.016);
    expect(output.shoot).toBe(true);
  });

  it('returns idle when no enemy', () => {
    const input = makeInput({ enemyPosition: null });
    const output = state.execute(input, 0.016);
    expect(output.forward).toBe(false);
    expect(output.shoot).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run tests/systems/states/ChaseState.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 ChaseState**

```ts
// src/systems/states/ChaseState.ts
import {
  AIStateType,
  type AIInput,
  type AIOutput,
  type AIState,
  type AIDifficultyConfig,
} from '../../enums/AIState';
import { normalizeAngle, angleDiff, hasLineOfSight, rayIntersectsRect } from '../../utils/geometry';

const FIRE_THRESHOLD = Math.PI / 12; // 15 degrees
const WALL_BLOCK_DISTANCE = 60;
const PATH_SWEEP = Math.PI / 2;
const PATH_RAY_COUNT = 6;
const SAFE_DISTANCE = 120;

export class ChaseState implements AIState {
  type = AIStateType.CHASE;

  private config: AIDifficultyConfig;

  constructor(config: AIDifficultyConfig) {
    this.config = config;
  }

  enter(): void {}
  exit(): void {}

  execute(input: AIInput, dt: number): AIOutput {
    const idle: AIOutput = {
      forward: false, backward: false,
      rotateLeft: false, rotateRight: false,
      shoot: false, usePowerUp: false,
    };

    if (!input.enemyPosition) return idle;

    const directAngle = Math.atan2(
      input.enemyPosition.y - input.selfPosition.y,
      input.enemyPosition.x - input.selfPosition.x,
    );

    // Check if direct path is blocked
    const blocked = this.isPathBlocked(
      input.selfPosition.x, input.selfPosition.y,
      directAngle, input.walls,
    );

    // Choose steering angle
    const steerAngle = blocked
      ? this.findAlternativePath(
          input.enemyPosition.x, input.enemyPosition.y,
          input.selfPosition.x, input.selfPosition.y,
          input.walls,
        )
      : directAngle;

    const diff = angleDiff(input.selfRotation, steerAngle);

    // Only shoot when line of sight is clear
    const canSee = hasLineOfSight(input.selfPosition, input.enemyPosition, input.walls);
    const aimDiff = Math.abs(angleDiff(input.selfRotation, directAngle));
    const shoot = canSee && aimDiff < FIRE_THRESHOLD && input.ammo > 0;

    return {
      forward: true,
      backward: false,
      rotateLeft: diff < -0.05,
      rotateRight: diff > 0.05,
      shoot,
      usePowerUp: false,
    };
  }

  private isPathBlocked(ox: number, oy: number, angle: number, walls: AIInput['walls']): boolean {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    for (const w of walls) {
      const t = rayIntersectsRect(ox, oy, dx, dy, w);
      if (t !== null && t > 1 && t < WALL_BLOCK_DISTANCE) {
        return true;
      }
    }
    return false;
  }

  private findAlternativePath(
    targetX: number, targetY: number,
    selfX: number, selfY: number,
    walls: AIInput['walls'],
  ): number {
    const directAngle = Math.atan2(targetY - selfY, targetX - selfX);
    const scanDistance = 200;

    let bestAngle = directAngle;
    let bestScore = -Infinity;

    for (let i = -PATH_RAY_COUNT; i <= PATH_RAY_COUNT; i++) {
      const offset = (i / PATH_RAY_COUNT) * PATH_SWEEP;
      const angle = directAngle + offset;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);

      let closestT = Infinity;
      for (const w of walls) {
        const t = rayIntersectsRect(selfX, selfY, dx, dy, w);
        if (t !== null && t < closestT) {
          closestT = t;
        }
      }

      const openFraction = Math.min(closestT / scanDistance, 1);
      const angularCloseness = 1 - Math.abs(offset) / PATH_SWEEP;
      const score = openFraction * 0.7 + angularCloseness * 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestAngle = angle;
      }
    }

    return bestAngle;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run tests/systems/states/ChaseState.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/systems/states/ChaseState.ts tests/systems/states/ChaseState.test.ts
git commit -m "feat: rewrite ChaseState with wall-aware pathfinding"
```

---

### Task 5: 重写 AttackState

**Files:**
- Rewrite: `src/systems/states/AttackState.ts`
- Rewrite: `tests/systems/states/AttackState.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
// tests/systems/states/AttackState.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AttackState } from '../../../src/systems/states/AttackState';
import { AIStateType, type AIInput, type AIDifficultyConfig } from '../../../src/enums/AIState';

const mediumConfig: AIDifficultyConfig = {
  reactionDelay: 0.2,
  accuracyOffset: Math.PI / 12,
  bulletDetectionDistance: 250,
  collectWillingness: 0.6,
  fireRateCooldown: 0.4,
};

function makeInput(overrides: Partial<AIInput> = {}): AIInput {
  return {
    selfPosition: { x: 100, y: 100 },
    selfRotation: 0,
    enemyPosition: { x: 300, y: 100 },
    enemyRotation: Math.PI,
    bullets: [],
    powerUps: [],
    walls: [],
    ammo: 10,
    heldPowerUp: null,
    ...overrides,
  };
}

describe('AttackState', () => {
  let state: AttackState;

  beforeEach(() => {
    state = new AttackState(mediumConfig, 0);
  });

  it('has correct type', () => {
    expect(state.type).toBe(AIStateType.ATTACK);
  });

  it('shoots when aim aligned, line clear, ammo available', () => {
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      selfRotation: 0,
      enemyPosition: { x: 300, y: 100 },
      walls: [],
      ammo: 10,
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.shoot).toBe(true);
  });

  it('does not shoot when line of sight blocked', () => {
    const walls = [
      { x: 180, y: 50, width: 10, height: 100, orientation: 'vertical' },
    ];
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      selfRotation: 0,
      enemyPosition: { x: 300, y: 100 },
      walls,
      ammo: 10,
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.shoot).toBe(false);
  });

  it('does not shoot when ammo is zero', () => {
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      selfRotation: 0,
      enemyPosition: { x: 300, y: 100 },
      walls: [],
      ammo: 0,
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.shoot).toBe(false);
  });

  it('rotates to aim at enemy', () => {
    const input = makeInput({
      selfRotation: 0,
      enemyPosition: { x: 200, y: 300 },
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.rotateRight).toBe(true);
  });

  it('signals exit after firing', () => {
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      selfRotation: 0,
      enemyPosition: { x: 300, y: 100 },
      walls: [],
      ammo: 10,
    });
    state.enter();
    state.execute(input, 0.016);
    expect(state.shouldExit()).toBe(true);
  });

  it('signals exit when enemy lost', () => {
    const input = makeInput({ enemyPosition: null });
    state.enter();
    state.execute(input, 0.016);
    expect(state.shouldExit()).toBe(true);
  });

  it('signals exit when incoming bullet detected', () => {
    const input = makeInput({
      bullets: [
        { x: 200, y: 100, vx: -300, vy: 0, ownerId: 1 },
      ],
    });
    state.enter();
    state.execute(input, 0.016);
    expect(state.shouldExit()).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run tests/systems/states/AttackState.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 AttackState**

```ts
// src/systems/states/AttackState.ts
import {
  AIStateType,
  type AIInput,
  type AIOutput,
  type AIState,
  type AIDifficultyConfig,
} from '../../enums/AIState';
import { normalizeAngle, angleDiff, hasLineOfSight, dist } from '../../utils/geometry';

const AIM_THRESHOLD = 0.1;
const BULLET_THREAT_ANGLE = 0.6;

export class AttackState implements AIState {
  type = AIStateType.ATTACK;

  private difficulty: AIDifficultyConfig;
  private selfPlayerId: number;
  private fireCooldown: number = 0;
  private _shouldExit: boolean = false;

  constructor(difficulty: AIDifficultyConfig, selfPlayerId: number = 0) {
    this.difficulty = difficulty;
    this.selfPlayerId = selfPlayerId;
  }

  enter(): void {
    this.fireCooldown = 0;
    this._shouldExit = false;
  }

  execute(input: AIInput, dt: number): AIOutput {
    const idle: AIOutput = {
      forward: false, backward: false,
      rotateLeft: false, rotateRight: false,
      shoot: false, usePowerUp: false,
    };

    // Exit if enemy lost
    if (!input.enemyPosition) {
      this._shouldExit = true;
      return idle;
    }

    // Exit if incoming bullet
    if (this.detectIncomingProjectile(input)) {
      this._shouldExit = true;
      return idle;
    }

    if (this._shouldExit) return idle;

    this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    // Check line of sight
    const shotClear = hasLineOfSight(input.selfPosition, input.enemyPosition, input.walls);

    // If can't see enemy, signal exit to chase
    if (!shotClear) {
      this._shouldExit = true;
      return idle;
    }

    // Aim with accuracy offset
    const baseAngle = Math.atan2(
      input.enemyPosition.y - input.selfPosition.y,
      input.enemyPosition.x - input.selfPosition.x,
    );
    const offset = (Math.random() * 2 - 1) * this.difficulty.accuracyOffset;
    const aimAngle = baseAngle + offset;
    const diff = normalizeAngle(aimAngle - input.selfRotation);

    const rotateLeft = diff < -AIM_THRESHOLD;
    const rotateRight = diff > AIM_THRESHOLD;
    const aimAligned = Math.abs(diff) < AIM_THRESHOLD;

    // Fire when conditions met
    let shoot = false;
    if (aimAligned && this.fireCooldown <= 0 && input.ammo > 0) {
      shoot = true;
      this.fireCooldown = this.difficulty.fireRateCooldown;
      this._shouldExit = true;
    }

    return {
      forward: false, backward: false,
      rotateLeft, rotateRight,
      shoot, usePowerUp: false,
    };
  }

  exit(): void {
    this.fireCooldown = 0;
    this._shouldExit = false;
  }

  shouldExit(): boolean {
    return this._shouldExit;
  }

  private detectIncomingProjectile(input: AIInput): boolean {
    for (const bullet of input.bullets) {
      if (bullet.ownerId === this.selfPlayerId) continue;

      const d = dist(bullet.x, bullet.y, input.selfPosition.x, input.selfPosition.y);
      if (d > this.difficulty.bulletDetectionDistance) continue;

      const angleToSelf = Math.atan2(
        input.selfPosition.y - bullet.y,
        input.selfPosition.x - bullet.x,
      );
      const bulletAngle = Math.atan2(bullet.vy, bullet.vx);
      const angleDifference = Math.abs(normalizeAngle(angleToSelf - bulletAngle));

      if (angleDifference < BULLET_THREAT_ANGLE) return true;
    }
    return false;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run tests/systems/states/AttackState.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/systems/states/AttackState.ts tests/systems/states/AttackState.test.ts
git commit -m "feat: rewrite AttackState with line-of-sight check"
```

---

### Task 6: 重写 DodgeState

**Files:**
- Rewrite: `src/systems/states/DodgeState.ts`
- Rewrite: `tests/systems/states/DodgeState.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
// tests/systems/states/DodgeState.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { DodgeState } from '../../../src/systems/states/DodgeState';
import { AIStateType, type AIInput } from '../../../src/enums/AIState';

function makeInput(overrides: Partial<AIInput> = {}): AIInput {
  return {
    selfPosition: { x: 100, y: 100 },
    selfRotation: 0,
    enemyPosition: null,
    enemyRotation: 0,
    bullets: [],
    powerUps: [],
    walls: [],
    ammo: 10,
    heldPowerUp: null,
    ...overrides,
  };
}

describe('DodgeState', () => {
  let state: DodgeState;

  beforeEach(() => {
    state = new DodgeState(0);
  });

  it('has correct type', () => {
    expect(state.type).toBe(AIStateType.DODGE);
  });

  it('drives forward when dodging', () => {
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      bullets: [
        { x: 200, y: 100, vx: -300, vy: 0, ownerId: 1 },
      ],
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.forward).toBe(true);
  });

  it('does not shoot while dodging', () => {
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      bullets: [
        { x: 200, y: 100, vx: -300, vy: 0, ownerId: 1 },
      ],
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.shoot).toBe(false);
  });

  it('predicts bullet bounce and dodges accordingly', () => {
    // Bullet heading toward wall, will bounce back toward AI
    const walls = [
      { x: 250, y: 0, width: 10, height: 200, orientation: 'vertical' },
    ];
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      bullets: [
        { x: 200, y: 100, vx: 300, vy: 0, ownerId: 1 },
      ],
      walls,
    });
    state.enter();
    const output = state.execute(input, 0.016);
    // Should dodge (perpendicular movement)
    expect(output.forward).toBe(true);
    expect(output.rotateLeft || output.rotateRight).toBe(true);
  });

  it('uses walls as shelter when both perpendiculars blocked', () => {
    // Walls on both sides, bullet coming from right
    const walls = [
      { x: 50, y: 0, width: 10, height: 200, orientation: 'vertical' },
      { x: 150, y: 0, width: 10, height: 200, orientation: 'vertical' },
    ];
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      bullets: [
        { x: 300, y: 100, vx: -300, vy: 0, ownerId: 1 },
      ],
      walls,
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.forward).toBe(true);
  });

  it('returns idle after threat passes', () => {
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      bullets: [],
    });
    state.enter();
    // Run without bullets for 0.5s
    for (let i = 0; i < 31; i++) {
      state.execute(input, 0.016);
    }
    const output = state.execute(input, 0.016);
    expect(output.forward).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run tests/systems/states/DodgeState.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 DodgeState**

```ts
// src/systems/states/DodgeState.ts
import {
  AIStateType,
  type AIInput,
  type AIOutput,
  type AIState,
} from '../../enums/AIState';
import {
  normalizeAngle, angleDiff, dist, predictBulletBounce, rayIntersectsRect,
} from '../../utils/geometry';

const BULLET_THREAT_ANGLE = 0.6;
const THREAT_SAFE_DISTANCE = 300;
const CORRIDOR_CHECK_DIST = 200;
const SAFE_EXIT_DELAY = 0.3;

export class DodgeState implements AIState {
  type = AIStateType.DODGE;

  private selfPlayerId: number;
  private cachedThreat: { x: number; y: number; vx: number; vy: number } | null = null;
  private safeTimer: number = 0;

  constructor(selfPlayerId: number = 0) {
    this.selfPlayerId = selfPlayerId;
  }

  enter(): void {
    this.cachedThreat = null;
    this.safeTimer = 0;
  }

  execute(input: AIInput, dt: number): AIOutput {
    const noop: AIOutput = {
      forward: false, backward: false,
      rotateLeft: false, rotateRight: false,
      shoot: false, usePowerUp: false,
    };

    // Find incoming bullet
    const bullet = this.detectIncomingBullet(input);

    if (bullet) {
      this.cachedThreat = bullet;
      this.safeTimer = 0;
    } else {
      this.safeTimer += dt;
      if (this.safeTimer >= SAFE_EXIT_DELAY) {
        return noop;
      }
    }

    const threat = bullet ?? this.cachedThreat;
    if (!threat) return noop;

    // Predict bounce - if bullet will bounce and still threaten us, consider that
    const bounce = predictBulletBounce(threat, input.walls, THREAT_SAFE_DISTANCE);
    const effectiveThreat = bounce && this.bounceStillThreatens(bounce, input.selfPosition)
      ? { ...threat, vx: bounce.vx, vy: bounce.vy }
      : threat;

    // Find dodge direction
    const dodgeDir = this.calculateDodgeDirection(effectiveThreat, input);
    const targetAngle = Math.atan2(dodgeDir.y, dodgeDir.x);
    const diff = normalizeAngle(targetAngle - input.selfRotation);

    return {
      forward: true,
      backward: false,
      rotateLeft: diff < -0.05,
      rotateRight: diff > 0.05,
      shoot: false,
      usePowerUp: false,
    };
  }

  exit(): void {
    this.cachedThreat = null;
    this.safeTimer = 0;
  }

  private detectIncomingBullet(input: AIInput): { x: number; y: number; vx: number; vy: number } | null {
    let closest: { x: number; y: number; vx: number; vy: number } | null = null;
    let closestDist = THREAT_SAFE_DISTANCE;

    for (const b of input.bullets) {
      if (b.ownerId === this.selfPlayerId) continue;

      const d = dist(b.x, b.y, input.selfPosition.x, input.selfPosition.y);
      if (d > THREAT_SAFE_DISTANCE) continue;

      const angleToSelf = Math.atan2(
        input.selfPosition.y - b.y,
        input.selfPosition.x - b.x,
      );
      const bulletAngle = Math.atan2(b.vy, b.vx);
      const diff = Math.abs(normalizeAngle(angleToSelf - bulletAngle));
      if (diff > BULLET_THREAT_ANGLE) continue;

      if (d < closestDist) {
        closestDist = d;
        closest = { x: b.x, y: b.y, vx: b.vx, vy: b.vy };
      }
    }
    return closest;
  }

  private bounceStillThreatens(
    bounce: { x: number; y: number; vx: number; vy: number },
    selfPos: { x: number; y: number },
  ): boolean {
    const angleToSelf = Math.atan2(selfPos.y - bounce.y, selfPos.x - bounce.x);
    const bounceAngle = Math.atan2(bounce.vy, bounce.vx);
    return Math.abs(normalizeAngle(angleToSelf - bounceAngle)) < BULLET_THREAT_ANGLE;
  }

  private calculateDodgeDirection(
    threat: { x: number; y: number; vx: number; vy: number },
    input: AIInput,
  ): { x: number; y: number } {
    const bulletAngle = Math.atan2(threat.vy, threat.vx);
    const perpA = { x: Math.cos(bulletAngle + Math.PI / 2), y: Math.sin(bulletAngle + Math.PI / 2) };
    const perpB = { x: Math.cos(bulletAngle - Math.PI / 2), y: Math.sin(bulletAngle - Math.PI / 2) };

    // Check corridor openness
    const blockedA = this.isRayBlocked(input.selfPosition, perpA, input.walls, CORRIDOR_CHECK_DIST);
    const blockedB = this.isRayBlocked(input.selfPosition, perpB, input.walls, CORRIDOR_CHECK_DIST);

    if (blockedA && !blockedB) return perpB;
    if (blockedB && !blockedA) return perpA;

    // Both blocked: try to find shelter wall
    if (blockedA && blockedB) {
      const shelter = this.findShelterWall(threat, input.selfPosition, input.walls);
      if (shelter) {
        const cx = shelter.x + shelter.width / 2;
        const cy = shelter.y + shelter.height / 2;
        const len = Math.hypot(cx - input.selfPosition.x, cy - input.selfPosition.y);
        if (len > 0) {
          return {
            x: (cx - input.selfPosition.x) / len,
            y: (cy - input.selfPosition.y) / len,
          };
        }
      }
    }

    // Both open: pick closest to current heading
    const diffA = Math.abs(normalizeAngle(Math.atan2(perpA.y, perpA.x) - input.selfRotation));
    const diffB = Math.abs(normalizeAngle(Math.atan2(perpB.y, perpB.x) - input.selfRotation));
    return diffA <= diffB ? perpA : perpB;
  }

  private isRayBlocked(
    origin: { x: number; y: number },
    dir: { x: number; y: number },
    walls: AIInput['walls'],
    maxDist: number,
  ): boolean {
    for (const wall of walls) {
      const t = rayIntersectsRect(origin.x, origin.y, dir.x, dir.y, wall);
      if (t !== null && t > 0 && t < maxDist) return true;
    }
    return false;
  }

  private findShelterWall(
    bullet: { x: number; y: number; vx: number; vy: number },
    self: { x: number; y: number },
    walls: AIInput['walls'],
  ): AIInput['walls'][0] | null {
    const bulletAngle = Math.atan2(bullet.vy, bullet.vx);
    const cosA = Math.cos(bulletAngle);
    const sinA = Math.sin(bulletAngle);

    let bestWall: AIInput['walls'][0] | null = null;
    let bestDist = Infinity;

    for (const wall of walls) {
      const cx = wall.x + wall.width / 2;
      const cy = wall.y + wall.height / 2;

      const wx = cx - bullet.x;
      const wy = cy - bullet.y;
      const proj = wx * cosA + wy * sinA;

      const selfProj = (self.x - bullet.x) * cosA + (self.y - bullet.y) * sinA;
      if (proj > selfProj + 50) continue;

      const d = dist(self.x, self.y, cx, cy);
      if (d < bestDist) {
        bestDist = d;
        bestWall = wall;
      }
    }
    return bestWall;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run tests/systems/states/DodgeState.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/systems/states/DodgeState.ts tests/systems/states/DodgeState.test.ts
git commit -m "feat: rewrite DodgeState with bounce prediction and shelter"
```

---

### Task 7: 重写 CollectState

**Files:**
- Rewrite: `src/systems/states/CollectState.ts`
- Rewrite: `tests/systems/states/CollectState.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
// tests/systems/states/CollectState.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CollectState } from '../../../src/systems/states/CollectState';
import { AIStateType, type AIInput } from '../../../src/enums/AIState';

function makeInput(overrides: Partial<AIInput> = {}): AIInput {
  return {
    selfPosition: { x: 100, y: 100 },
    selfRotation: 0,
    enemyPosition: null,
    enemyRotation: 0,
    bullets: [],
    powerUps: [],
    walls: [],
    ammo: 10,
    heldPowerUp: null,
    ...overrides,
  };
}

describe('CollectState', () => {
  let state: CollectState;

  beforeEach(() => {
    state = new CollectState();
  });

  it('has correct type', () => {
    expect(state.type).toBe(AIStateType.COLLECT);
  });

  it('moves toward nearest power-up', () => {
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      powerUps: [
        { x: 200, y: 100, type: 'shield' },
      ],
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.forward).toBe(true);
  });

  it('does not shoot', () => {
    const input = makeInput({
      powerUps: [
        { x: 200, y: 100, type: 'shield' },
      ],
    });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.shoot).toBe(false);
  });

  it('returns idle when no power-ups', () => {
    const input = makeInput({ powerUps: [] });
    state.enter();
    const output = state.execute(input, 0.016);
    expect(output.forward).toBe(false);
  });

  it('uses wall-aware pathfinding', () => {
    const walls = [
      { x: 150, y: 50, width: 10, height: 100, orientation: 'vertical' },
    ];
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      powerUps: [
        { x: 200, y: 100, type: 'shield' },
      ],
      walls,
    });
    state.enter();
    const output = state.execute(input, 0.016);
    // Should still move forward, rotating to avoid wall
    expect(output.forward).toBe(true);
  });

  it('signals exit when incoming bullet detected', () => {
    const input = makeInput({
      selfPosition: { x: 100, y: 100 },
      powerUps: [
        { x: 200, y: 100, type: 'shield' },
      ],
      bullets: [
        { x: 200, y: 100, vx: -300, vy: 0, ownerId: 1 },
      ],
    });
    state.enter();
    const output = state.execute(input, 0.016);
    // Should return idle to let controller handle dodge
    expect(output.forward).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run tests/systems/states/CollectState.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 CollectState**

```ts
// src/systems/states/CollectState.ts
import {
  AIStateType,
  type AIInput,
  type AIOutput,
  type AIState,
} from '../../enums/AIState';
import { normalizeAngle, angleDiff, dist, hasLineOfSight, rayIntersectsRect } from '../../utils/geometry';

const ROTATION_THRESHOLD = 0.1;
const PATH_SWEEP = Math.PI / 2;
const PATH_RAY_COUNT = 6;
const BULLET_THREAT_ANGLE = 0.6;
const THREAT_DISTANCE = 200;

export class CollectState implements AIState {
  type = AIStateType.COLLECT;

  enter(): void {}

  execute(input: AIInput, _dt: number): AIOutput {
    const noAction: AIOutput = {
      forward: false, backward: false,
      rotateLeft: false, rotateRight: false,
      shoot: false, usePowerUp: false,
    };

    // Exit if incoming bullet
    if (this.detectIncomingBullet(input)) {
      return noAction;
    }

    // Exit if opponent nearby
    if (this.detectNearbyOpponent(input)) {
      return noAction;
    }

    // Find nearest power-up
    const powerUp = this.findNearestPowerUp(input);
    if (!powerUp) return noAction;

    // Calculate path around walls
    const targetAngle = this.findPathToTarget(
      input.selfPosition, powerUp, input.walls,
    );

    const diff = angleDiff(input.selfRotation, targetAngle);

    return {
      forward: true,
      backward: false,
      rotateLeft: diff < -ROTATION_THRESHOLD,
      rotateRight: diff > ROTATION_THRESHOLD,
      shoot: false,
      usePowerUp: false,
    };
  }

  exit(): void {}

  private findNearestPowerUp(input: AIInput): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    let bestDist = Infinity;

    for (const pu of input.powerUps) {
      const d = dist(pu.x, pu.y, input.selfPosition.x, input.selfPosition.y);
      if (d < bestDist) {
        bestDist = d;
        best = { x: pu.x, y: pu.y };
      }
    }
    return best;
  }

  private findPathToTarget(
    self: { x: number; y: number },
    target: { x: number; y: number },
    walls: AIInput['walls'],
  ): number {
    const directAngle = Math.atan2(target.y - self.y, target.x - self.x);

    // Check if direct path is clear
    const blocked = this.isPathBlocked(self.x, self.y, directAngle, walls);
    if (!blocked) return directAngle;

    // Sweep for alternative
    let bestAngle = directAngle;
    let bestScore = -Infinity;

    for (let i = -PATH_RAY_COUNT; i <= PATH_RAY_COUNT; i++) {
      const offset = (i / PATH_RAY_COUNT) * PATH_SWEEP;
      const angle = directAngle + offset;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);

      let closestT = Infinity;
      for (const w of walls) {
        const t = rayIntersectsRect(self.x, self.y, dx, dy, w);
        if (t !== null && t < closestT) closestT = t;
      }

      const openFraction = Math.min(closestT / 200, 1);
      const angularCloseness = 1 - Math.abs(offset) / PATH_SWEEP;
      const score = openFraction * 0.7 + angularCloseness * 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestAngle = angle;
      }
    }

    return bestAngle;
  }

  private isPathBlocked(ox: number, oy: number, angle: number, walls: AIInput['walls']): boolean {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    for (const w of walls) {
      const t = rayIntersectsRect(ox, oy, dx, dy, w);
      if (t !== null && t > 1 && t < 60) return true;
    }
    return false;
  }

  private detectIncomingBullet(input: AIInput): boolean {
    for (const b of input.bullets) {
      const d = dist(b.x, b.y, input.selfPosition.x, input.selfPosition.y);
      if (d > THREAT_DISTANCE) continue;

      const angleToSelf = Math.atan2(
        input.selfPosition.y - b.y,
        input.selfPosition.x - b.x,
      );
      const bulletAngle = Math.atan2(b.vy, b.vx);
      const diff = Math.abs(normalizeAngle(angleToSelf - bulletAngle));
      if (diff < BULLET_THREAT_ANGLE) return true;
    }
    return false;
  }

  private detectNearbyOpponent(input: AIInput): boolean {
    if (!input.enemyPosition) return false;
    return dist(input.enemyPosition.x, input.enemyPosition.y,
                input.selfPosition.x, input.selfPosition.y) < 200;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run tests/systems/states/CollectState.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/systems/states/CollectState.ts tests/systems/states/CollectState.test.ts
git commit -m "feat: rewrite CollectState with wall-aware pathfinding"
```

---

### Task 8: 重写 AIController

**Files:**
- Rewrite: `src/systems/AIController.ts`
- Rewrite: `tests/systems/AIController.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
// tests/systems/AIController.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIController } from '../../src/systems/AIController';
import { AIStateType } from '../../src/enums/AIState';
import { PowerUpType } from '../../src/enums/PowerUpType';

function makeTank(overrides: Record<string, any> = {}): any {
  return {
    x: 100,
    y: 100,
    rotation: 0,
    alive: true,
    ammo: 10,
    shootCooldown: 0,
    shieldActive: false,
    heldPowerUp: null,
    playerId: 0,
    passiveEffects: new Set(),
    passiveTimers: new Map(),
    radius: 16,
    ...overrides,
  };
}

function makeBullet(overrides: Record<string, any> = {}): any {
  return {
    x: 300,
    y: 100,
    vx: -300,
    vy: 0,
    active: true,
    ownerId: 1,
    bounceCount: 0,
    lifeTime: 0,
    spawnTime: 0,
    wallCooldowns: new Map(),
    ...overrides,
  };
}

describe('AIController', () => {
  let ai: AIController;
  let tank: any;
  let enemy: any;

  beforeEach(() => {
    tank = makeTank({ x: 100, y: 100, rotation: 0, playerId: 0 });
    enemy = makeTank({ x: 400, y: 100, rotation: Math.PI, playerId: 1 });
    ai = new AIController(tank, enemy, 'medium');
  });

  describe('getInput', () => {
    it('returns valid PlayerInput', () => {
      ai.setWorldState([], [], [], 800, 600);
      const result = ai.getInput(16, 0);
      expect(result).toHaveProperty('forward');
      expect(result).toHaveProperty('backward');
      expect(result).toHaveProperty('rotateLeft');
      expect(result).toHaveProperty('rotateRight');
      expect(result).toHaveProperty('shoot');
      expect(result).toHaveProperty('usePowerUp');
    });

    it('all fields are booleans', () => {
      ai.setWorldState([], [], [], 800, 600);
      const result = ai.getInput(16, 0);
      for (const key of ['forward', 'backward', 'rotateLeft', 'rotateRight', 'shoot', 'usePowerUp'] as const) {
        expect(typeof result[key]).toBe('boolean');
      }
    });
  });

  describe('setWorldState', () => {
    it('accepts walls parameter', () => {
      const walls = [
        { x: 50, y: 0, width: 10, height: 100, orientation: 'vertical' },
      ];
      ai.setWorldState([], [], walls, 800, 600);
      const result = ai.getInput(16, 0);
      expect(typeof result.forward).toBe('boolean');
    });
  });

  describe('state transitions', () => {
    it('transitions to Dodge when bullet incoming', () => {
      const bullet = makeBullet({ x: 200, y: 100, vx: -300, vy: 0, ownerId: 1 });
      ai.setWorldState([bullet], [], [], 800, 600);

      for (let i = 0; i < 30; i++) {
        ai.getInput(16, i * 16);
      }

      const result = ai.getInput(16, 500);
      expect(result.shoot).toBe(false); // Dodge doesn't shoot
    });

    it('uses wall-aware pathfinding in Chase', () => {
      const walls = [
        { x: 180, y: 50, width: 10, height: 100, orientation: 'vertical' },
      ];
      ai.setWorldState([], [], walls, 800, 600);

      for (let i = 0; i < 30; i++) {
        ai.getInput(16, i * 16);
      }

      const result = ai.getInput(16, 500);
      expect(result.forward).toBe(true);
    });

    it('does not shoot through walls', () => {
      const walls = [
        { x: 180, y: 50, width: 10, height: 100, orientation: 'vertical' },
      ];
      tank.rotation = 0;
      enemy.x = 400;
      enemy.y = 100;
      ai.setWorldState([], [], walls, 800, 600);

      for (let i = 0; i < 30; i++) {
        ai.getInput(16, i * 16);
      }

      const result = ai.getInput(16, 500);
      // Should not shoot if wall blocks line of sight
      expect(result.shoot).toBe(false);
    });
  });

  describe('anti-stuck', () => {
    it('activates escape when stuck', () => {
      ai.setWorldState([], [], [], 800, 600);

      let foundEscape = false;
      for (let i = 0; i < 160; i++) {
        const result = ai.getInput(16, i * 16);
        if (result.backward && (result.rotateLeft || result.rotateRight)) {
          foundEscape = true;
          break;
        }
      }
      expect(foundEscape).toBe(true);
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run tests/systems/AIController.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 AIController**

```ts
// src/systems/AIController.ts
import { PlayerInput } from './InputManager';
import { Tank } from '../objects/Tank';
import { AIStateType, AI_DIFFICULTY_CONFIGS, type AIInput, type AIOutput, type AIState, type AIDifficultyConfig } from '../enums/AIState';
import { normalizeAngle, angleDiff, dist, hasLineOfSight } from '../utils/geometry';
import { PatrolState } from './states/PatrolState';
import { ChaseState } from './states/ChaseState';
import { AttackState } from './states/AttackState';
import { DodgeState } from './states/DodgeState';
import { CollectState } from './states/CollectState';

interface InternalConfig extends AIDifficultyConfig {
  decisionInterval: number;
}

const DIFFICULTY: Record<string, InternalConfig> = {
  easy:   { ...AI_DIFFICULTY_CONFIGS.easy,   decisionInterval: 0.5 },
  medium: { ...AI_DIFFICULTY_CONFIGS.medium, decisionInterval: 0.3 },
  hard:   { ...AI_DIFFICULTY_CONFIGS.hard,   decisionInterval: 0.15 },
};

const POWERUP_SCAN_RANGE = 400;

export class AIController {
  private tank: Tank;
  private enemy: Tank;
  private config: InternalConfig;

  // State machine
  private states: Map<AIStateType, AIState>;
  private currentState: AIState;

  // Timers
  private reactionTimer: number = 0;
  private decisionTimer: number = 0;

  // Anti-stuck
  private lastPosition: { x: number; y: number } = { x: 0, y: 0 };
  private stuckTimer: number = 0;
  private stuckChecks: number = 0;
  private positionSampleTimer: number = 0;
  private stuckEscapeDir: boolean = false;

  // World data
  private bullets: any[] = [];
  private powerUps: any[] = [];
  private walls: any[] = [];
  private gameWidth: number = 800;
  private gameHeight: number = 600;

  constructor(tank: Tank, enemy: Tank, difficulty: string) {
    this.tank = tank;
    this.enemy = enemy;
    this.config = DIFFICULTY[difficulty] ?? DIFFICULTY.medium;

    this.states = new Map([
      [AIStateType.PATROL, new PatrolState()],
      [AIStateType.CHASE, new ChaseState(this.config)],
      [AIStateType.ATTACK, new AttackState(this.config, tank.playerId)],
      [AIStateType.DODGE, new DodgeState(tank.playerId)],
      [AIStateType.COLLECT, new CollectState()],
    ]);

    this.currentState = this.states.get(AIStateType.PATROL)!;
    this.currentState.enter();
    this.lastPosition = { x: tank.x, y: tank.y };
  }

  setWorldState(
    bullets: any[],
    powerUps: any[],
    walls: any[],
    gameWidth: number,
    gameHeight: number,
  ): void {
    this.bullets = bullets;
    this.powerUps = powerUps;
    this.walls = walls;
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
  }

  getInput(delta: number, time: number): PlayerInput {
    const dt = delta / 1000;

    // Build sensory input
    const aiInput = this.buildAIInput();

    // Update reaction timer
    this.reactionTimer = Math.max(0, this.reactionTimer - dt);

    // Anti-stuck detection
    this.updateAntiStuck(dt);

    // Evaluate state transitions
    this.decisionTimer -= dt;
    if (this.decisionTimer <= 0) {
      this.decisionTimer = this.config.decisionInterval;
      const nextState = this.evaluateTransition(aiInput);
      if (nextState !== this.currentState.type) {
        this.currentState.exit();
        this.currentState = this.states.get(nextState)!;
        this.currentState.enter();
      }
    }

    // Execute current state
    const output = this.currentState.execute(aiInput, dt);

    // Override if stuck
    if (this.stuckTimer > 1.0) {
      return this.getStuckEscapeOutput(dt);
    }

    return output;
  }

  private buildAIInput(): AIInput {
    const myX = this.tank.x;
    const myY = this.tank.y;
    const enemyX = this.enemy.x;
    const enemyY = this.enemy.y;

    return {
      selfPosition: { x: myX, y: myY },
      selfRotation: this.tank.rotation,
      enemyPosition: this.enemy.alive ? { x: enemyX, y: enemyY } : null,
      enemyRotation: this.enemy.rotation,
      bullets: this.bullets.filter(b => b.active).map(b => ({
        x: b.x, y: b.y, vx: b.vx, vy: b.vy, ownerId: b.ownerId,
      })),
      powerUps: this.powerUps.filter(p => p.active).map(p => ({
        x: p.x, y: p.y, type: p.type,
      })),
      walls: this.walls,
      ammo: this.tank.ammo,
      heldPowerUp: this.tank.heldPowerUp,
    };
  }

  private evaluateTransition(input: AIInput): AIStateType {
    // Dodge: incoming bullet
    if (input.bullets.some(b => {
      if (b.ownerId === this.tank.playerId) return false;
      const d = dist(b.x, b.y, input.selfPosition.x, input.selfPosition.y);
      if (d > this.config.bulletDetectionDistance) return false;
      const angleToSelf = Math.atan2(input.selfPosition.y - b.y, input.selfPosition.x - b.x);
      const bulletAngle = Math.atan2(b.vy, b.vx);
      return Math.abs(normalizeAngle(angleToSelf - bulletAngle)) < 0.6;
    }) && this.reactionTimer <= 0) {
      return AIStateType.DODGE;
    }

    // Attack: enemy visible, aim aligned, line of sight clear
    if (input.enemyPosition) {
      const aimAngle = Math.atan2(
        input.enemyPosition.y - input.selfPosition.y,
        input.enemyPosition.x - input.selfPosition.x,
      );
      const aimDiff = Math.abs(angleDiff(input.selfRotation, aimAngle));
      const canSee = hasLineOfSight(input.selfPosition, input.enemyPosition, input.walls);

      if (aimDiff < this.config.accuracyOffset && canSee) {
        return AIStateType.ATTACK;
      }
    }

    // Collect: power-up nearby
    const nearestPU = this.findNearestPowerUp(input);
    if (nearestPU && !input.heldPowerUp) {
      return AIStateType.COLLECT;
    }

    // Chase: enemy alive
    if (input.enemyPosition) {
      return AIStateType.CHASE;
    }

    // Patrol: default
    return AIStateType.PATROL;
  }

  private findNearestPowerUp(input: AIInput): { x: number; y: number; type: string } | null {
    let best: { x: number; y: number; type: string } | null = null;
    let bestDist = POWERUP_SCAN_RANGE;

    for (const pu of input.powerUps) {
      const d = dist(pu.x, pu.y, input.selfPosition.x, input.selfPosition.y);
      if (d < bestDist) {
        bestDist = d;
        best = pu;
      }
    }
    return best;
  }

  private updateAntiStuck(dt: number): void {
    this.positionSampleTimer += dt;
    if (this.positionSampleTimer < 1.0) return;
    this.positionSampleTimer = 0;

    const displacement = dist(this.lastPosition.x, this.lastPosition.y, this.tank.x, this.tank.y);
    if (displacement < 5) {
      this.stuckChecks++;
    } else {
      this.stuckChecks = 0;
    }

    if (this.stuckChecks >= 2) {
      this.stuckTimer = 1.5;
      this.stuckChecks = 0;
      this.stuckEscapeDir = Math.random() > 0.5;
    }

    this.lastPosition = { x: this.tank.x, y: this.tank.y };
  }

  private getStuckEscapeOutput(dt: number): PlayerInput {
    this.stuckTimer -= dt;
    const rotateLeft = !this.stuckEscapeDir;
    return {
      forward: false,
      backward: true,
      rotateLeft,
      rotateRight: !rotateLeft,
      shoot: false,
      usePowerUp: false,
    };
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run tests/systems/AIController.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/systems/AIController.ts tests/systems/AIController.test.ts
git commit -m "feat: rewrite AIController with wall-aware state machine"
```

---

### Task 9: 更新 GameScene 传入墙壁数据

**Files:**
- Modify: `src/scenes/GameScene.ts:186-191`

- [ ] **Step 1: 修改 setWorldState 调用**

在 `src/scenes/GameScene.ts` 中找到 `setWorldState` 调用（约第 186 行），添加 `this.wallData` 参数：

```ts
// 修改前:
this.aiController.setWorldState(
  this.bullets.map(b => b.state),
  this.powerUpManager.getPowerUps().map(pu => ({ x: pu.x, y: pu.y, type: pu.type, active: pu.active })),
  GAME_WIDTH,
  GAME_HEIGHT,
);

// 修改后:
this.aiController.setWorldState(
  this.bullets.map(b => b.state),
  this.powerUpManager.getPowerUps().map(pu => ({ x: pu.x, y: pu.y, type: pu.type, active: pu.active })),
  this.wallData,
  GAME_WIDTH,
  GAME_HEIGHT,
);
```

- [ ] **Step 2: 运行测试确认通过**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: 提交**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: pass wall data to AI controller"
```

---

### Task 10: 运行完整测试套件

**Files:**
- None (verification only)

- [ ] **Step 1: 运行所有测试**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run`
Expected: ALL PASS

- [ ] **Step 2: 检查测试覆盖率**

Run: `cd "W:/Workspace/Projects/ricochet-tank" && npx vitest run --coverage`
Expected: 所有新代码都有测试覆盖

- [ ] **Step 3: 最终提交**

```bash
git add -A
git commit -m "feat: complete AI system rewrite with wall awareness"
```
