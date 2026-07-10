# Ricochet Tank

一个受《坦克动荡 2》（Tank Trouble 2）启发的浏览器本地坦克对战游戏。游戏使用 Phaser 3 和 TypeScript 开发，核心玩法包括随机迷宫、反弹弹道、本地双人对战、AI 对手和道具。

## 环境要求

- Node.js 20.19+ 或 22.12+
- npm 10 或更高版本

## 安装与运行

```powershell
npm install
npm run dev
```

Vite 会输出本地访问地址。游戏面向桌面浏览器和键盘操作。

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

- **VS Player**：两名玩家共用一块键盘进行本地对战。
- **VS AI**：选择 Easy、Medium 或 Hard 难度，与电脑坦克对战。

每局会生成新的迷宫。坦克被击毁后对手得分，率先获得 3 分的一方赢得比赛。普通子弹可以从墙面反弹，也可能反弹击中发射者。

## 控制方式

| 操作 | 玩家 1 | 玩家 2 |
| --- | --- | --- |
| 前进 / 后退 | `W` / `S` | `↑` / `↓` |
| 左转 / 右转 | `A` / `D` | `←` / `→` |
| 发射普通子弹 | `Space` | `Enter` |
| 使用主动道具 | `E` | `.` |
| 返回主菜单 | `Esc` | `Esc` |

主动道具包括激光、追踪导弹、地雷和霰弹。护盾、快速射击和双发属于拾取后自动生效的被动道具。

## 开发文档

- [P0-P1 开发流程](docs/P0-P1-DEVELOPMENT-WORKFLOW.md)
- [P0 工程基线实施计划](docs/superpowers/plans/2026-07-10-p0-engineering-baseline.md)

P0 负责恢复类型安全、构建、检查命令和发布基线；P1 将继续实现三人本地模式、暂停设置、统一武器输入和经典特殊武器。
