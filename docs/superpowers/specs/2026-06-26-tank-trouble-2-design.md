# 坦克动荡2 复刻版 - 设计文档

## 概述

复刻经典 4399 Flash 游戏《坦克动荡2》(Tank Trouble 2)，使用现代 Web 技术栈在浏览器中运行。核心玩法：双人本地对战，俯视角坦克在随机生成的迷宫中战斗，子弹可反弹。

**目标平台：** PC 浏览器，键盘操作
**第一版范围：** 核心对战玩法（迷宫 + 坦克 + 子弹反弹 + 计分）

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 游戏引擎 | Phaser 3 | 渲染、输入、Scene、时间、音效 |
| 开发语言 | TypeScript | 类型安全 |
| 构建工具 | Vite | 开发服务器 + HMR + 生产构建 |
| 碰撞检测 | 手写 | 核心碰撞逻辑不依赖 Arcade Physics |

**职责划分：** Phaser 负责渲染、键盘输入、Scene 管理、帧时间管理。核心碰撞和物理逻辑全部手写，保持完全可控。

## 项目结构

```
ricochet-tank/
├── src/
│   ├── main.ts                # 入口，Phaser 配置
│   ├── config.ts              # 游戏常量（速度、尺寸、冷却时间等）
│   ├── scenes/
│   │   ├── BootScene.ts       # 资源加载
│   │   ├── MenuScene.ts       # 主菜单 + 操作说明
│   │   └── GameScene.ts       # 核心游戏场景
│   ├── objects/
│   │   ├── Tank.ts            # 坦克：移动、旋转、射击、碰撞体
│   │   ├── Bullet.ts          # 子弹：飞行、反弹、生命周期
│   │   └── Wall.ts            # 墙壁：矩形、orientation
│   ├── systems/
│   │   ├── MazeGenerator.ts   # DFS 迷宫生成 + 优化
│   │   ├── Collision.ts       # 圆-矩形、圆-圆碰撞检测
│   │   └── InputManager.ts    # 键盘输入管理
│   └── utils/
│       └── math.ts            # 向量、反射等数学工具
├── public/
│   └── assets/                # 预留资源目录
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 核心玩法

### 操控方式

| 操作 | 玩家 1 | 玩家 2 |
|------|--------|--------|
| 前进 | W | ↑ |
| 后退 | S | ↓ |
| 左旋转 | A | ← |
| 右旋转 | D | → |
| 射击 | Space | Enter |

### 坦克行为

- 有 `rotation`（朝向角）、`moveSpeed`、`backSpeed`（后退速度为前进的 60%）、`rotateSpeed`
- 前进/后退：按朝向角方向移动，使用三角函数计算位移
- 旋转：直接修改 rotation，不改变位置
- 静止时保持当前朝向
- 连续移动，无移动冷却
- 视觉：矩形 + 炮管，几何图形绘制
- 碰撞体：圆形

### 子弹行为

- 从炮管前端生成，沿炮管方向直线飞行
- 手动维护 `vx`、`vy`、`bounceCount`、`lifeTime`、`ownerId`
- 每帧按 vx/vy 更新位置
- 每个玩家场上最多存在 1 发子弹
- 射击冷却：0.8 秒
- 最大反弹次数：8 次
- 最大存活时间：8 秒
- 超过任一限制后子弹销毁

### 子弹反弹

- 碰撞检测：圆-矩形
- 墙壁记录 `orientation: vertical | horizontal`
- 命中 vertical wall → 反转 vx
- 命中 horizontal wall → 反转 vy
- 同一帧同时命中 vertical 和 horizontal → vx、vy 都反转
- 反弹后将子弹沿新速度方向推出 1~2px
- 同一面墙设置约 50ms hit cooldown，避免重复触发

### 命中判定

- 子弹与坦克：圆-圆碰撞
- 子弹发射后前 100ms 不检测 owner（避免生成重叠导致自杀）
- 100ms 后可命中任意坦克（包括发射者自己）
- 命中后不立即切换场景，只记录死亡玩家
- 本帧最后统一结算死亡结果

### 地图机制

- DFS 递归回溯算法生成基础迷宫
- 生成后随机移除 15%~30% 墙体，使地图更开阔
- 地图必须保证连通
- 出生点对角放置，距离足够远
- 出生点周围强制开阔（清除周围墙壁）
- 不合格地图重新生成

### 墙壁

- 使用矩形（厚度 8~16px），不使用 1px 线条
- 每面墙有 `orientation: vertical | horizontal`
- 碰撞体为矩形

## 场景与状态机

### 场景流程

```
BootScene → MenuScene → GameScene
              ↑              |
              └──────────────┘  (返回菜单)
```

- **BootScene**：加载资源（第一版只有几何图形，预留加载入口）
- **MenuScene**：标题 + "开始游戏" 按钮 + 操作说明
- **GameScene**：核心游戏循环

### GameScene 状态机

```
GameScene.create()
  初始化比分
  初始化输入
  startRound()

startRound()
  roundState = GENERATING
  清理上一局对象
  生成迷宫
  放置坦克
  清空子弹
  显示 READY
  roundState = COUNTDOWN
  1 秒后 roundState = PLAYING

GameScene.update(time, delta)
  更新 UI
  if roundState !== PLAYING: return
  dt = delta / 1000
  读取输入
  更新坦克旋转
  更新坦克移动 + 碰墙修正
  处理射击输入
  更新子弹位置
  处理子弹反弹
  处理子弹命中
  统一结算死亡

resolveRound(deadPlayers)
  roundState = ROUND_OVER
  if 只有 P1 死: scoreP2 += 1
  else if 只有 P2 死: scoreP1 += 1
  else: 平局，不加分
  显示本局结果
  1.5 秒后:
    if scoreP1 >= 3 or scoreP2 >= 3:
      roundState = MATCH_OVER
      显示整场胜利画面
    else:
      startRound()
```

**状态枚举：** `GENERATING → COUNTDOWN → PLAYING → ROUND_OVER → MATCH_OVER`

## 碰撞检测策略

### 坦克 vs 墙壁

- 圆-矩形碰撞
- 分轴检测：先处理 X 轴移动和修正，再处理 Y 轴移动和修正
- 修正时优先按当前移动轴回退或推出，避免墙角卡死

### 子弹 vs 墙壁

- 圆-矩形碰撞
- 根据墙壁 orientation 反转对应速度分量
- 反弹后沿新速度方向推出 1~2px
- 同一面墙 50ms hit cooldown
- 存储 `bullet.prevX / bullet.prevY`，为后续防穿墙做准备

### 子弹 vs 坦克

- 圆-圆碰撞
- 发射后前 100ms 跳过 owner 检测
- 命中后记录死亡，本帧末统一结算

### 工具选择

- 核心碰撞逻辑手写，不强依赖 Arcade Physics
- 第一版不做复杂连续碰撞检测（CCD）

## 渲染

- 第一版全部使用几何图形（矩形、圆形、线条）
- 坦克：矩形车身 + 矩形炮管
- 子弹：小圆形
- 墙壁：矩形
- 纯色风格，后续可替换为精灵图（sprite）

## 比分系统

- 一方被击毁 → 另一方 +1 分
- 双方同时死亡 → 平局，不加分，重开本局
- 率先获得 3 分 → 整场胜利
- 胜利画面显示最终比分 + 返回菜单按钮

## 第一版不包含

- 在线多人对战
- 道具系统
- 音效和音乐
- 精灵图美术资源
- 移动端适配
