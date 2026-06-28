import {
  AIStateType,
  type AIInput,
  type AIOutput,
  type AIState,
} from '../../enums/AIState';
import { normalizeAngle, angleDiff, dist, hasLineOfSight } from '../../utils/geometry';
import { findPath } from '../../utils/pathfinder';

const ROTATION_THRESHOLD = 0.1;
const BULLET_THREAT_ANGLE = 0.6;
const THREAT_DISTANCE = 200;
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

export class CollectState implements AIState {
  type = AIStateType.COLLECT;

  /** Debug: waypoints the AI is navigating through */
  public debugWaypoints: { x: number; y: number }[] = [];

  /** Cached path */
  private cachedPath: { x: number; y: number }[] = [];
  private cachedGoal: { x: number; y: number } | null = null;
  private pathRecalcTimer: number = 0;

  enter(): void {
    this.cachedPath = [];
    this.cachedGoal = null;
    this.pathRecalcTimer = 0;
    this.debugWaypoints = [];
  }

  execute(input: AIInput, _dt: number): AIOutput {
    const noAction: AIOutput = {
      forward: false, backward: false,
      rotateLeft: false, rotateRight: false,
      shoot: false, usePowerUp: false,
    };

    this.debugWaypoints = [];

    if (this.detectIncomingBullet(input)) {
      return noAction;
    }

    if (this.detectNearbyOpponent(input)) {
      return noAction;
    }

    const powerUp = this.findNearestPowerUp(input);
    if (!powerUp) return noAction;

    const directPathClear = hasLineOfSight(input.selfPosition, powerUp, input.walls);

    let steerAngle: number;

    if (directPathClear) {
      steerAngle = Math.atan2(powerUp.y - input.selfPosition.y, powerUp.x - input.selfPosition.x);
      this.cachedPath = [];
      this.debugWaypoints = [
        { x: input.selfPosition.x, y: input.selfPosition.y },
        { x: powerUp.x, y: powerUp.y },
      ];
    } else {
      const result = this.getPath(input, powerUp);
      this.debugWaypoints = [
        { x: input.selfPosition.x, y: input.selfPosition.y },
        ...result,
      ];

      if (result.length > 0) {
        const nextWaypoint = result[0];
        steerAngle = Math.atan2(
          nextWaypoint.y - input.selfPosition.y,
          nextWaypoint.x - input.selfPosition.x,
        );

        const distToWaypoint = Math.hypot(
          nextWaypoint.x - input.selfPosition.x,
          nextWaypoint.y - input.selfPosition.y,
        );
        if (distToWaypoint < 20) {
          this.cachedPath.shift();
        }
      } else {
        steerAngle = Math.atan2(powerUp.y - input.selfPosition.y, powerUp.x - input.selfPosition.x);
      }
    }

    const diff = angleDiff(input.selfRotation, steerAngle);

    return {
      forward: true,
      backward: false,
      rotateLeft: diff < -ROTATION_THRESHOLD,
      rotateRight: diff > ROTATION_THRESHOLD,
      shoot: false,
      usePowerUp: false,
    };
  }

  exit(): void {
    this.cachedPath = [];
    this.cachedGoal = null;
    this.debugWaypoints = [];
  }

  private getPath(input: AIInput, goal: { x: number; y: number }): { x: number; y: number }[] {
    this.pathRecalcTimer -= 1;
    const goalMoved = this.cachedGoal && Math.hypot(goal.x - this.cachedGoal.x, goal.y - this.cachedGoal.y) > 50;

    if (this.cachedPath.length === 0 || this.pathRecalcTimer <= 0 || goalMoved) {
      const pathResult = findPath(
        input.selfPosition,
        goal,
        GAME_WIDTH,
        GAME_HEIGHT,
        input.walls,
      );

      this.cachedPath = pathResult.found ? pathResult.waypoints : [];
      this.cachedGoal = { x: goal.x, y: goal.y };
      this.pathRecalcTimer = 15;
    }

    return this.cachedPath;
  }

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
