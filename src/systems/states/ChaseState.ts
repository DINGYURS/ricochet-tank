import {
  AIStateType,
  type AIInput,
  type AIOutput,
  type AIState,
  type AIDifficultyConfig,
} from '../../enums/AIState';
import { normalizeAngle, angleDiff, hasLineOfSight, rayIntersectsRect } from '../../utils/geometry';

const FIRE_THRESHOLD = Math.PI / 12;
const WALL_BLOCK_DISTANCE = 60;
const PATH_SWEEP = Math.PI / 2;
const PATH_RAY_COUNT = 6;

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

    const blocked = this.isPathBlocked(
      input.selfPosition.x, input.selfPosition.y,
      directAngle, input.walls,
    );

    const steerAngle = blocked
      ? this.findAlternativePath(
          input.enemyPosition.x, input.enemyPosition.y,
          input.selfPosition.x, input.selfPosition.y,
          input.walls,
        )
      : directAngle;

    const diff = angleDiff(input.selfRotation, steerAngle);

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
