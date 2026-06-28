import {
  AIStateType,
  type AIInput,
  type AIOutput,
  type AIState,
} from '../../enums/AIState';
import { normalizeAngle, angleDiff, dist, rayIntersectsRect } from '../../utils/geometry';

const ROTATION_THRESHOLD = 0.1;
const PATH_SWEEP = Math.PI / 2;
const PATH_RAY_COUNT = 6;
const BULLET_THREAT_ANGLE = 0.6;
const THREAT_DISTANCE = 200;

export class CollectState implements AIState {
  type = AIStateType.COLLECT;

  enter(): void {}

  execute(input: AIInput, _dt: number): AIOutput {
    const noAction: AIOutput = {
      forward: false, backward: false,
      rotateLeft: false, rotateRight: false,
      shoot: false, usePowerUp: false,
    };

    if (this.detectIncomingBullet(input)) {
      return noAction;
    }

    if (this.detectNearbyOpponent(input)) {
      return noAction;
    }

    const powerUp = this.findNearestPowerUp(input);
    if (!powerUp) return noAction;

    const targetAngle = this.findPathToTarget(
      input.selfPosition, powerUp, input.walls,
    );

    const diff = angleDiff(input.selfRotation, targetAngle);

    return {
      forward: true,
      backward: false,
      rotateLeft: diff < -ROTATION_THRESHOLD,
      rotateRight: diff > ROTATION_THRESHOLD,
      shoot: false,
      usePowerUp: false,
    };
  }

  exit(): void {}

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

  private findPathToTarget(
    self: { x: number; y: number },
    target: { x: number; y: number },
    walls: AIInput['walls'],
  ): number {
    const directAngle = Math.atan2(target.y - self.y, target.x - self.x);

    const blocked = this.isPathBlocked(self.x, self.y, directAngle, walls);
    if (!blocked) return directAngle;

    let bestAngle = directAngle;
    let bestScore = -Infinity;

    for (let i = -PATH_RAY_COUNT; i <= PATH_RAY_COUNT; i++) {
      const offset = (i / PATH_RAY_COUNT) * PATH_SWEEP;
      const angle = directAngle + offset;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);

      let closestT = Infinity;
      for (const w of walls) {
        const t = rayIntersectsRect(self.x, self.y, dx, dy, w);
        if (t !== null && t < closestT) closestT = t;
      }

      const openFraction = Math.min(closestT / 200, 1);
      const angularCloseness = 1 - Math.abs(offset) / PATH_SWEEP;
      const score = openFraction * 0.7 + angularCloseness * 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestAngle = angle;
      }
    }

    return bestAngle;
  }

  private isPathBlocked(ox: number, oy: number, angle: number, walls: AIInput['walls']): boolean {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    for (const w of walls) {
      const t = rayIntersectsRect(ox, oy, dx, dy, w);
      if (t !== null && t > 1 && t < 60) return true;
    }
    return false;
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
