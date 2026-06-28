import {
  AIStateType,
  type AIInput,
  type AIOutput,
  type AIState,
} from '../../enums/AIState';
import {
  normalizeAngle, angleDiff, dist, predictBulletBounce, rayIntersectsRect,
} from '../../utils/geometry';

const BULLET_THREAT_ANGLE = 0.6;
const THREAT_SAFE_DISTANCE = 300;
const CORRIDOR_CHECK_DIST = 200;
const SAFE_EXIT_DELAY = 0.3;

export class DodgeState implements AIState {
  type = AIStateType.DODGE;

  private selfPlayerId: number;
  private cachedThreat: { x: number; y: number; vx: number; vy: number } | null = null;
  private safeTimer: number = 0;

  constructor(selfPlayerId: number = 0) {
    this.selfPlayerId = selfPlayerId;
  }

  enter(): void {
    this.cachedThreat = null;
    this.safeTimer = 0;
  }

  execute(input: AIInput, dt: number): AIOutput {
    const noop: AIOutput = {
      forward: false, backward: false,
      rotateLeft: false, rotateRight: false,
      shoot: false, usePowerUp: false,
    };

    const bullet = this.detectIncomingBullet(input);

    if (bullet) {
      this.cachedThreat = bullet;
      this.safeTimer = 0;
    } else {
      this.safeTimer += dt;
      if (this.safeTimer >= SAFE_EXIT_DELAY) {
        return noop;
      }
    }

    const threat = bullet ?? this.cachedThreat;
    if (!threat) return noop;

    const bounce = predictBulletBounce(threat, input.walls, THREAT_SAFE_DISTANCE);
    const effectiveThreat = bounce && this.bounceStillThreatens(bounce, input.selfPosition)
      ? { ...threat, vx: bounce.vx, vy: bounce.vy }
      : threat;

    const dodgeDir = this.calculateDodgeDirection(effectiveThreat, input);
    const targetAngle = Math.atan2(dodgeDir.y, dodgeDir.x);
    const diff = normalizeAngle(targetAngle - input.selfRotation);

    return {
      forward: true,
      backward: false,
      rotateLeft: diff < -0.05,
      rotateRight: diff > 0.05,
      shoot: false,
      usePowerUp: false,
    };
  }

  exit(): void {
    this.cachedThreat = null;
    this.safeTimer = 0;
  }

  private detectIncomingBullet(input: AIInput): { x: number; y: number; vx: number; vy: number } | null {
    let closest: { x: number; y: number; vx: number; vy: number } | null = null;
    let closestDist = THREAT_SAFE_DISTANCE;

    for (const b of input.bullets) {
      if (b.ownerId === this.selfPlayerId) continue;

      const d = dist(b.x, b.y, input.selfPosition.x, input.selfPosition.y);
      if (d > THREAT_SAFE_DISTANCE) continue;

      const angleToSelf = Math.atan2(
        input.selfPosition.y - b.y,
        input.selfPosition.x - b.x,
      );
      const bulletAngle = Math.atan2(b.vy, b.vx);
      const diff = Math.abs(normalizeAngle(angleToSelf - bulletAngle));

      let isThreat = diff <= BULLET_THREAT_ANGLE;

      // Also check if a bounce off a wall would make this bullet threatening
      if (!isThreat) {
        const bounce = predictBulletBounce(b, input.walls, THREAT_SAFE_DISTANCE);
        if (bounce) {
          const bounceAngleToSelf = Math.atan2(
            input.selfPosition.y - bounce.y,
            input.selfPosition.x - bounce.x,
          );
          const bounceAngle = Math.atan2(bounce.vy, bounce.vx);
          const bounceDiff = Math.abs(normalizeAngle(bounceAngleToSelf - bounceAngle));
          if (bounceDiff <= BULLET_THREAT_ANGLE) {
            isThreat = true;
          }
        }
      }

      if (!isThreat) continue;

      if (d < closestDist) {
        closestDist = d;
        closest = { x: b.x, y: b.y, vx: b.vx, vy: b.vy };
      }
    }
    return closest;
  }

  private bounceStillThreatens(
    bounce: { x: number; y: number; vx: number; vy: number },
    selfPos: { x: number; y: number },
  ): boolean {
    const angleToSelf = Math.atan2(selfPos.y - bounce.y, selfPos.x - bounce.x);
    const bounceAngle = Math.atan2(bounce.vy, bounce.vx);
    return Math.abs(normalizeAngle(angleToSelf - bounceAngle)) < BULLET_THREAT_ANGLE;
  }

  private calculateDodgeDirection(
    threat: { x: number; y: number; vx: number; vy: number },
    input: AIInput,
  ): { x: number; y: number } {
    const bulletAngle = Math.atan2(threat.vy, threat.vx);
    const perpA = { x: Math.cos(bulletAngle + Math.PI / 2), y: Math.sin(bulletAngle + Math.PI / 2) };
    const perpB = { x: Math.cos(bulletAngle - Math.PI / 2), y: Math.sin(bulletAngle - Math.PI / 2) };

    const blockedA = this.isRayBlocked(input.selfPosition, perpA, input.walls, CORRIDOR_CHECK_DIST);
    const blockedB = this.isRayBlocked(input.selfPosition, perpB, input.walls, CORRIDOR_CHECK_DIST);

    if (blockedA && !blockedB) return perpB;
    if (blockedB && !blockedA) return perpA;

    if (blockedA && blockedB) {
      const shelter = this.findShelterWall(threat, input.selfPosition, input.walls);
      if (shelter) {
        const cx = shelter.x + shelter.width / 2;
        const cy = shelter.y + shelter.height / 2;
        const len = Math.hypot(cx - input.selfPosition.x, cy - input.selfPosition.y);
        if (len > 0) {
          return {
            x: (cx - input.selfPosition.x) / len,
            y: (cy - input.selfPosition.y) / len,
          };
        }
      }
    }

    const diffA = Math.abs(normalizeAngle(Math.atan2(perpA.y, perpA.x) - input.selfRotation));
    const diffB = Math.abs(normalizeAngle(Math.atan2(perpB.y, perpB.x) - input.selfRotation));
    return diffA <= diffB ? perpA : perpB;
  }

  private isRayBlocked(
    origin: { x: number; y: number },
    dir: { x: number; y: number },
    walls: AIInput['walls'],
    maxDist: number,
  ): boolean {
    for (const wall of walls) {
      const t = rayIntersectsRect(origin.x, origin.y, dir.x, dir.y, wall);
      if (t !== null && t > 0 && t < maxDist) return true;
    }
    return false;
  }

  private findShelterWall(
    bullet: { x: number; y: number; vx: number; vy: number },
    self: { x: number; y: number },
    walls: AIInput['walls'],
  ): AIInput['walls'][0] | null {
    const bulletAngle = Math.atan2(bullet.vy, bullet.vx);
    const cosA = Math.cos(bulletAngle);
    const sinA = Math.sin(bulletAngle);

    let bestWall: AIInput['walls'][0] | null = null;
    let bestDist = Infinity;

    for (const wall of walls) {
      const cx = wall.x + wall.width / 2;
      const cy = wall.y + wall.height / 2;

      const wx = cx - bullet.x;
      const wy = cy - bullet.y;
      const proj = wx * cosA + wy * sinA;

      const selfProj = (self.x - bullet.x) * cosA + (self.y - bullet.y) * sinA;
      if (proj > selfProj + 50) continue;

      const d = dist(self.x, self.y, cx, cy);
      if (d < bestDist) {
        bestDist = d;
        bestWall = wall;
      }
    }
    return bestWall;
  }
}
