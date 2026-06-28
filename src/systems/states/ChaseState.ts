import {
  AIStateType,
  type AIInput,
  type AIOutput,
  type AIState,
  type AIDifficultyConfig,
} from '../../enums/AIState';
import { normalizeAngle, angleDiff, hasLineOfSight } from '../../utils/geometry';
import { findPath } from '../../utils/pathfinder';

const FIRE_THRESHOLD = Math.PI / 12;
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

export class ChaseState implements AIState {
  type = AIStateType.CHASE;

  private config: AIDifficultyConfig;

  /** Debug: waypoints the AI is navigating through */
  public debugWaypoints: { x: number; y: number }[] = [];

  /** Cached path to avoid recalculating every frame */
  private cachedPath: { x: number; y: number }[] = [];
  private cachedGoal: { x: number; y: number } | null = null;
  private pathRecalcTimer: number = 0;

  constructor(config: AIDifficultyConfig) {
    this.config = config;
  }

  enter(): void {
    this.cachedPath = [];
    this.cachedGoal = null;
    this.pathRecalcTimer = 0;
    this.debugWaypoints = [];
  }

  exit(): void {
    this.cachedPath = [];
    this.cachedGoal = null;
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
      // Direct path clear - go straight
      steerAngle = directAngle;
      this.cachedPath = [];
      this.debugWaypoints = [
        { x: input.selfPosition.x, y: input.selfPosition.y },
        { x: input.enemyPosition.x, y: input.enemyPosition.y },
      ];
    } else {
      // Use BFS pathfinding
      const result = this.getPath(input);
      this.debugWaypoints = [
        { x: input.selfPosition.x, y: input.selfPosition.y },
        ...result,
      ];

      if (result.length > 0) {
        // Navigate to first waypoint
        const nextWaypoint = result[0];
        steerAngle = Math.atan2(
          nextWaypoint.y - input.selfPosition.y,
          nextWaypoint.x - input.selfPosition.x,
        );

        // If we're close to the waypoint, remove it
        const distToWaypoint = Math.hypot(
          nextWaypoint.x - input.selfPosition.x,
          nextWaypoint.y - input.selfPosition.y,
        );
        if (distToWaypoint < 20) {
          this.cachedPath.shift();
        }
      } else {
        // No path found - fallback to direct angle
        steerAngle = directAngle;
      }
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

  private getPath(input: AIInput): { x: number; y: number }[] {
    const goal = input.enemyPosition!;

    // Recalculate path periodically or if goal moved significantly
    this.pathRecalcTimer -= 1; // every frame
    const goalMoved = this.cachedGoal && Math.hypot(goal.x - this.cachedGoal.x, goal.y - this.cachedGoal.y) > 50;

    if (this.cachedPath.length === 0 || this.pathRecalcTimer <= 0 || goalMoved) {
      const pathResult = findPath(
        input.selfPosition,
        goal,
        GAME_WIDTH,
        GAME_HEIGHT,
        input.walls,
      );

      if (pathResult.found) {
        this.cachedPath = pathResult.waypoints;
      } else {
        this.cachedPath = [];
      }

      this.cachedGoal = { x: goal.x, y: goal.y };
      this.pathRecalcTimer = 15; // recalc every ~15 frames
    }

    return this.cachedPath;
  }
}
