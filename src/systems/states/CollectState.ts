import {
  AIStateType,
  type AIInput,
  type AIOutput,
  type AIState,
} from '../../enums/AIState';
import {
  normalizeAngle,
  angleDiff,
  dist,
  hasLineOfSight,
  findBlockingWall,
  getWallEdgePoint,
  rayIntersectsRect,
} from '../../utils/geometry';

const ROTATION_THRESHOLD = 0.1;
const BULLET_THREAT_ANGLE = 0.6;
const THREAT_DISTANCE = 200;

export class CollectState implements AIState {
  type = AIStateType.COLLECT;

  /** Debug: waypoints the AI is navigating through */
  public debugWaypoints: { x: number; y: number }[] = [];

  enter(): void {
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
      this.debugWaypoints = [
        { x: input.selfPosition.x, y: input.selfPosition.y },
        { x: powerUp.x, y: powerUp.y },
      ];
    } else {
      const result = this.findPathAroundWall(input, powerUp);
      steerAngle = result.angle;
      this.debugWaypoints = result.waypoints;
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
    this.debugWaypoints = [];
  }

  private findPathAroundWall(
    input: AIInput,
    target: { x: number; y: number },
  ): { angle: number; waypoints: { x: number; y: number }[] } {
    const { selfPosition, walls } = input;

    const directAngle = Math.atan2(target.y - selfPosition.y, target.x - selfPosition.x);

    const blocking = findBlockingWall(selfPosition, directAngle, walls);

    if (blocking) {
      const edgePoint = getWallEdgePoint(blocking.wall, selfPosition, target);
      const angle = Math.atan2(edgePoint.y - selfPosition.y, edgePoint.x - selfPosition.x);

      return {
        angle,
        waypoints: [
          { x: selfPosition.x, y: selfPosition.y },
          { x: edgePoint.x, y: edgePoint.y },
          { x: target.x, y: target.y },
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
