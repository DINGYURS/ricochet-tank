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
  private firstDirectionPick: boolean = true;

  enter(): void {
    this.targetAngle = Math.random() * Math.PI * 2;
    this.directionChangeTimer = randomRange(DIRECTION_CHANGE_MIN, DIRECTION_CHANGE_MAX);
    this.firstDirectionPick = true;
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

    // No walls — explore randomly, but keep current heading on first pick
    if (walls.length === 0) {
      if (this.firstDirectionPick) {
        this.firstDirectionPick = false;
        return input.selfRotation;
      }
      return Math.random() * Math.PI * 2;
    }

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
