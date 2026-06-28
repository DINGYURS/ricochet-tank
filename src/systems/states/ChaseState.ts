import {
  AIStateType,
  type AIInput,
  type AIOutput,
  type AIState,
  type AIDifficultyConfig,
} from '../../enums/AIState';
import {
  normalizeAngle,
  angleDiff,
  hasLineOfSight,
  findBlockingWall,
  getWallEdgePoint,
  rayIntersectsRect,
} from '../../utils/geometry';

const FIRE_THRESHOLD = Math.PI / 12;

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

    // Check if we can see the enemy directly
    const canSee = hasLineOfSight(input.selfPosition, input.enemyPosition, input.walls);

    let steerAngle: number;

    if (canSee) {
      // Direct path is clear - go straight toward enemy
      steerAngle = directAngle;
    } else {
      // Path blocked by wall - use wall-following to navigate around
      steerAngle = this.findPathAroundWall(input);
    }

    const diff = angleDiff(input.selfRotation, steerAngle);

    // Only shoot when we can see the enemy and aim is aligned
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

  /**
   * Find a path around the blocking wall.
   * Strategy: find the blocking wall, navigate to its edge closest to the enemy.
   */
  private findPathAroundWall(input: AIInput): number {
    const { selfPosition, enemyPosition, walls } = input;

    const directAngle = Math.atan2(
      enemyPosition!.y - selfPosition.y,
      enemyPosition!.x - selfPosition.x,
    );

    // Find the wall blocking our path
    const blocking = findBlockingWall(selfPosition, directAngle, walls);

    if (blocking) {
      // Navigate to the edge of the blocking wall that's closer to the enemy
      const edgePoint = getWallEdgePoint(blocking.wall, selfPosition, enemyPosition!);
      return Math.atan2(edgePoint.y - selfPosition.y, edgePoint.x - selfPosition.x);
    }

    // Fallback: if no specific wall found, try perpendicular directions
    const perpA = directAngle + Math.PI / 2;
    const perpB = directAngle - Math.PI / 2;

    // Pick the perpendicular that's more open
    const openA = this.measureOpenness(selfPosition, perpA, walls);
    const openB = this.measureOpenness(selfPosition, perpB, walls);

    return openA > openB ? perpA : perpB;
  }

  /**
   * Measure how open a direction is (distance to nearest wall).
   */
  private measureOpenness(
    self: { x: number; y: number },
    angle: number,
    walls: AIInput['walls'],
  ): number {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let closest = 300;

    for (const w of walls) {
      const t = rayIntersectsRect(self.x, self.y, dx, dy, w);
      if (t !== null && t > 0 && t < closest) {
        closest = t;
      }
    }

    return closest;
  }
}
