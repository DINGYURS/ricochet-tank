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

  /** Debug: waypoints the AI is navigating through */
  public debugWaypoints: { x: number; y: number }[] = [];

  constructor(config: AIDifficultyConfig) {
    this.config = config;
  }

  enter(): void {
    this.debugWaypoints = [];
  }

  exit(): void {
    this.debugWaypoints = [];
  }

  execute(input: AIInput, dt: number): AIOutput {
    const idle: AIOutput = {
      forward: false, backward: false,
      rotateLeft: false, rotateRight: false,
      shoot: false, usePowerUp: false,
    };

    this.debugWaypoints = [];

    if (!input.enemyPosition) return idle;

    const directAngle = Math.atan2(
      input.enemyPosition.y - input.selfPosition.y,
      input.enemyPosition.x - input.selfPosition.x,
    );

    const canSee = hasLineOfSight(input.selfPosition, input.enemyPosition, input.walls);

    let steerAngle: number;

    if (canSee) {
      // Direct path - show straight line to enemy
      steerAngle = directAngle;
      this.debugWaypoints = [
        { x: input.selfPosition.x, y: input.selfPosition.y },
        { x: input.enemyPosition.x, y: input.enemyPosition.y },
      ];
    } else {
      // Path blocked - find waypoints around wall
      const result = this.findPathAroundWall(input);
      steerAngle = result.angle;
      this.debugWaypoints = result.waypoints;
    }

    const diff = angleDiff(input.selfRotation, steerAngle);

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

  private findPathAroundWall(input: AIInput): { angle: number; waypoints: { x: number; y: number }[] } {
    const { selfPosition, enemyPosition, walls } = input;

    const directAngle = Math.atan2(
      enemyPosition!.y - selfPosition.y,
      enemyPosition!.x - selfPosition.x,
    );

    const blocking = findBlockingWall(selfPosition, directAngle, walls);

    if (blocking) {
      const edgePoint = getWallEdgePoint(blocking.wall, selfPosition, enemyPosition!);
      const angle = Math.atan2(edgePoint.y - selfPosition.y, edgePoint.x - selfPosition.x);

      // Path: self → edge point → enemy
      return {
        angle,
        waypoints: [
          { x: selfPosition.x, y: selfPosition.y },
          { x: edgePoint.x, y: edgePoint.y },
          { x: enemyPosition!.x, y: enemyPosition!.y },
        ],
      };
    }

    // Fallback
    const perpA = directAngle + Math.PI / 2;
    const perpB = directAngle - Math.PI / 2;
    const openA = this.measureOpenness(selfPosition, perpA, walls);
    const openB = this.measureOpenness(selfPosition, perpB, walls);
    const angle = openA > openB ? perpA : perpB;
    const fallbackDist = 100;

    return {
      angle,
      waypoints: [
        { x: selfPosition.x, y: selfPosition.y },
        {
          x: selfPosition.x + Math.cos(angle) * fallbackDist,
          y: selfPosition.y + Math.sin(angle) * fallbackDist,
        },
      ],
    };
  }

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
