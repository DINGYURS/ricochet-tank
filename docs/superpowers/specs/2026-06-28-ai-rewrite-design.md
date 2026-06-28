# AI 系统重写设计

**日期:** 2026-06-28
**状态:** 待批准
**游戏:** Ricochet Tank (Phaser 3 + TypeScript)

---

## 问题诊断

当前 AI 存在以下核心问题：

1. **墙壁数据未传入** — `setWorldState` 不传墙壁，导致所有墙壁感知逻辑失效
2. **无脑冲向玩家** — ChaseState 直接朝玩家移动，不考虑墙壁阻挡
3. **盲目射击** — 不检查视线是否清晰，不管理弹药
4. **不躲避子弹** — DodgeState 缺少墙壁掩体和反弹预测
5. **无路径规划** — 不会绕墙寻找路径

---

## 设计目标

重写 AI 系统，使其行为更像人类玩家：

- 会绕墙寻找路径
- 只在有清晰视线时射击
- 能预测子弹反弹轨迹并躲避
- 合理管理弹药
- 利用墙壁作为掩体

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/systems/AIController.ts` | **重写** | 主控制器：传感器收集、状态机管理、反应延迟 |
| `src/systems/states/PatrolState.ts` | **重写** | 巡逻：基于射线的走廊探索 |
| `src/systems/states/ChaseState.ts` | **重写** | 追击：绕墙寻路，保持安全距离 |
| `src/systems/states/AttackState.ts` | **重写** | 攻击：视线检测、弹药管理 |
| `src/systems/states/DodgeState.ts` | **重写** | 躲避：子弹反弹预测、利用掩体 |
| `src/systems/states/CollectState.ts` | **重写** | 拾取：绕墙路径、优先级排序 |
| `src/enums/AIState.ts` | **保留** | 状态枚举和接口定义 |
| `src/scenes/GameScene.ts` | **修改** | 传入墙壁数据 |

---

## 传感器系统

### 每帧收集的数据

```ts
interface InternalAIInput extends AIInput {
  // 基础数据
  selfPosition: { x: number; y: number }
  selfRotation: number
  enemyPosition: { x: number; y: number } | null
  enemyRotation: number
  bullets: Array<{ x, y, vx, vy, ownerId }>
  powerUps: Array<{ x, y, type }>
  walls: Array<{ x, y, width, height, orientation }>
  ammo: number
  heldPowerUp: string | null

  // 派生数据
  hasLineOfSight: boolean       // 到敌人是否有清晰视线
  incomingBullet: Bullet | null // 最近的威胁子弹
  nearestPowerUp: PowerUp | null
  aimAligned: boolean
  distanceToEnemy: number
  enemyAlive: boolean
}
```

### 墙壁数据传递

```ts
// GameScene.ts - 修改 setWorldState 调用
this.aiController.setWorldState(
  this.bullets.map(b => b.state),
  this.powerUpManager.getPowerUps().map(pu => ({ x: pu.x, y: pu.y, type: pu.type, active: pu.active })),
  this.wallData,  // ← 新增：传入墙壁数据
  GAME_WIDTH,
  GAME_HEIGHT,
);

// AIController.ts - 修改 setWorldState 方法
setWorldState(bullets, powerUps, walls, gameWidth, gameHeight) {
  this.bullets = bullets;
  this.powerUps = powerUps;
  this.walls = walls;  // ← 存储墙壁数据
  this.gameWidth = gameWidth;
  this.gameHeight = gameHeight;
}
```

### 视线检测

```ts
function hasLineOfSight(
  from: { x: number; y: number },
  to: { x: number; y: number },
  walls: Wall[]
): boolean {
  for (const wall of walls) {
    if (segmentIntersectsRect(from, to, wall)) return false;
  }
  return true;
}
```

---

## 状态机

### 状态优先级（从高到低）

```
Dodge > Attack > Collect > Chase > Patrol
```

### 转换逻辑

```ts
evaluateTransition(input): AIStateType {
  // 1. 威胁检测 — 有子弹飞向我们？
  if (incomingBullet && reactionTimer <= 0) → DODGE

  // 2. 攻击机会 — 敌人在视线内且瞄准对齐？
  if (enemyAlive && hasLineOfSight && aimAligned) → ATTACK

  // 3. 道具拾取 — 附近有道具且没有持有的？
  if (nearestPowerUp && !heldPowerUp && random < collectWillingness) → COLLECT

  // 4. 追击 — 敌人活着但不在视线内？
  if (enemyAlive) → CHASE

  // 5. 巡逻 — 默认
  → PATROL
}
```

### 反应延迟

- AI 决策不立即执行，需要累积 `reactionTimer`
- 难度越高，延迟越短
- 防止 AI 像机器一样瞬间反应

---

## 各状态行为

### PatrolState（巡逻）

**目标：** 在地图中随机探索，避开墙壁和死角

**行为：**
- 进入时选择一个随机方向
- 每 2-4 秒重新选择方向
- 选择方法：向 8 个方向射线探测，选择最长开放走廊的方向
- 检测到敌人/子弹/道具时退出

```ts
pickBestDirection(): number {
  // 向 8 个方向射线探测
  // 选择开放距离最长的方向
  // 避免选择距离 < 30px 的方向（死胡同）
}
```

---

### ChaseState（追击）

**目标：** 绕过墙壁接近敌人，而不是无脑冲

**行为：**
- 计算到敌人的直接角度
- 射线检测直接路径是否被墙阻挡
- 如果被阻挡：向两侧扫描 ±90°，每 15° 一条射线，找到最开放且最接近目标的方向
- 保持 120px 安全距离（太近会碰撞）
- 偶尔机会性射击（瞄准对齐时）

```ts
findPath(enemy, walls): number {
  directAngle = atan2(enemy - self)
  if (!isPathBlocked(directAngle)) return directAngle

  // 向两侧扫描，找最佳绕墙路径
  for (offset in [-15°, +15°, -30°, +30°, ...]) {
    angle = directAngle + offset
    if (!isPathBlocked(angle) && openDistance > best) {
      best = angle
    }
  }
  return best
}
```

---

### AttackState（攻击）

**目标：** 只在有把握时开火，不浪费子弹

**行为：**
- 检查视线是否清晰（无墙阻挡）
- 计算瞄准角度（带难度偏差）
- 只在以下条件全部满足时射击：
  - 瞄准对齐（在精度范围内）
  - 视线清晰
  - 弹药 > 0
  - 冷却完成
- 射击后切换到 Chase 或 Dodge
- **不盲目射击** — 如果视线被墙阻挡，切换到 Chase 寻路

```ts
execute(input): AIOutput {
  if (!hasLineOfSight) → 切换到 CHASE（绕墙找路）
  if (aimAligned && ammo > 0 && cooldown <= 0) → 射击
  else → 旋转瞄准
}
```

---

### DodgeState（躲避）

**目标：** 利用墙壁作为掩体，预测子弹反弹轨迹

**行为：**
- 检测威胁子弹（距离 < 检测范围，方向朝向我们）
- **预测子弹反弹** — 如果子弹即将撞墙，计算反弹后的新轨迹，判断反弹后是否仍威胁我们
- 计算躲避方向：
  - 优先：向有开放走廊的垂直方向移动
  - 次选：移动到最近的掩体墙后面
  - 最后：选择与当前朝向最近的垂直方向
- 威胁消失后 0.3 秒退出

```ts
predictBulletTrajectory(bullet, walls): BulletPath {
  // 模拟子弹运动，检测是否撞墙
  // 如果撞墙，计算反弹方向
  // 返回反弹后是否仍威胁 AI
}

findDodgeDirection(bullet, self, walls): Vector {
  perpA = bulletAngle + 90°
  perpB = bulletAngle - 90°

  // 优先选择开放走廊
  if (raycast(perpA) > raycast(perpB)) return perpA
  else return perpB

  // 如果都被阻挡，找掩体墙
  if (bothBlocked) return directionToNearestShelterWall()
}
```

---

### CollectState（拾取）

**目标：** 智能绕墙接近道具

**行为：**
- 找到最近的可用道具
- 使用绕墙路径计算（与 ChaseState 相同的射线扫描）
- 检测到威胁子弹时退出（让控制器处理躲避）
- 检测到近距离敌人时退出（让控制器处理追击/攻击）
- 拾取后立即评估是否使用主动道具

---

## 难度参数

| 参数 | 简单 | 中等 | 困难 |
|------|------|------|------|
| 反应延迟 | 400ms | 200ms | 50ms |
| 射击精度偏差 | ±30° | ±15° | ±5° |
| 子弹检测距离 | 150px | 250px | 400px |
| 道具拾取意愿 | 30% | 60% | 90% |
| 射击冷却 | 0.8s | 0.4s | 0.15s |
| 躲避行为 | 常常忽略 | 反应式 | 预测轨迹 |

---

## 测试策略

### 单元测试

| 测试目标 | 覆盖内容 |
|----------|----------|
| 状态转换 | 所有 5 个状态的进入/退出条件 |
| 视线检测 | 墙壁阻挡判断 |
| 射线寻路 | 绕墙路径计算 |
| 子弹预测 | 反弹轨迹计算 |
| 躲避方向 | 垂直方向选择、掩体寻找 |
| 防卡住 | 位置追踪、强制脱困 |

### 边界情况

| 场景 | 处理 |
|------|------|
| 敌人死亡 | 重置为 Patrol |
| 无路可走 | 随机探索直到找到路径 |
| 弹药耗尽 | 优先 Patrol/Dodge，避免 Attack |
| 道具消失 | 重新评估状态 |
| 子弹反弹后威胁 | 预测并躲避 |

---

## Out of Scope (YAGNI)

- AI vs AI 观众模式
- AI 学习 / 自适应难度
- AI 性能统计 / 回放
- 在线多人 AI
- A* 寻路（射线探测对于当前迷宫密度已足够）
- 自定义 AI 个性
