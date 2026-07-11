# Ricochet Tank

一个受《坦克动荡 2》（Tank Trouble 2）启发的浏览器本地坦克对战游戏。游戏使用 Phaser 3 和 TypeScript 开发，核心玩法包括随机迷宫、反弹弹道、本地双人/三人对战、AI 对手和道具。

## 环境要求

- Node.js 20.19+（20.x）、22.12+（22.x）或 24+
- npm 10 或更高版本

## 安装与运行

```powershell
npm install
npm run dev
```

Vite 会输出本地访问地址。游戏面向桌面浏览器，使用键盘和鼠标操作。

## 项目检查

```powershell
npm run typecheck
npm test
npm run build
npm run check
```

- `typecheck`：只执行 TypeScript 类型检查。
- `test`：运行全部 Vitest 测试。
- `build`：执行类型检查并生成生产构建。
- `check`：依次执行类型检查、测试和生产构建，提交代码前必须通过。

生产文件输出到 `dist/`。

## 游戏模式

- **2 Players**：两名玩家共用一块键盘进行本地对战。
- **3 Players**：两名键盘玩家和一名鼠标玩家进行本地混战；回合在只剩一辆坦克时结束。
- **VS AI**：选择 Easy、Medium 或 Hard 难度，与电脑坦克对战。

每局会生成新的迷宫。两人模式中，坦克被击毁后对手得分；三人模式中，首辆坦克被淘汰后回合继续，最后幸存者得分，同时全灭则平局。率先获得 3 分的一方赢得比赛。普通子弹可以从墙面反弹，也可能反弹击中发射者。

## 控制方式

| 操作 | 玩家 1 | 玩家 2 | 玩家 3（仅三人模式） |
| --- | --- | --- | --- |
| 移动 / 转向 | `W` / `S` + `A` / `D` | `↑` / `↓` + `←` / `→` | 移动鼠标指针，坦克朝指针转向并前进 |
| 发射普通子弹 | `Space` | `Enter` | 鼠标左键 |
| 使用主动道具 | `E` | `.` | 鼠标右键 |
| 返回主菜单 | `Esc` | `Esc` | `Esc` |

主动道具包括激光、追踪导弹、地雷和霰弹。护盾、快速射击和双发属于拾取后自动生效的被动道具。

## 开发文档

- [P0-P1 开发流程](docs/P0-P1-DEVELOPMENT-WORKFLOW.md)
- [P0 工程基线实施计划](docs/superpowers/plans/2026-07-10-p0-engineering-baseline.md)
- [P1-A 三人本地模式实施计划](docs/superpowers/plans/2026-07-11-three-player-local-mode.md)

P0 工程基线和 P1-A 三人本地模式已经完成；P1 后续将继续实现暂停设置、统一武器输入和经典特殊武器。
