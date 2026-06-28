import {
  AIStateType,
  type AIInput,
  type AIOutput,
  type AIState,
  type AIDifficultyConfig,
} from '../../enums/AIState';
import { normalizeAngle, hasLineOfSight, dist } from '../../utils/geometry';

const AIM_THRESHOLD = 0.1;
const BULLET_THREAT_ANGLE = 0.6;

export class AttackState implements AIState {
  type = AIStateType.ATTACK;

  private difficulty: AIDifficultyConfig;
  private selfPlayerId: number;
  private fireCooldown: number = 0;
  private _shouldExit: boolean = false;

  constructor(difficulty: AIDifficultyConfig, selfPlayerId: number = 0) {
    this.difficulty = difficulty;
    this.selfPlayerId = selfPlayerId;
  }

  enter(): void {
    this.fireCooldown = 0;
    this._shouldExit = false;
  }

  execute(input: AIInput, dt: number): AIOutput {
    const idle: AIOutput = {
      forward: false, backward: false,
      rotateLeft: false, rotateRight: false,
      shoot: false, usePowerUp: false,
    };

    if (!input.enemyPosition) {
      this._shouldExit = true;
      return idle;
    }

    if (this.detectIncomingProjectile(input)) {
      this._shouldExit = true;
      return idle;
    }

    if (this._shouldExit) return idle;

    this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    const shotClear = hasLineOfSight(input.selfPosition, input.enemyPosition, input.walls);

    if (!shotClear) {
      this._shouldExit = true;
      return idle;
    }

    const baseAngle = Math.atan2(
      input.enemyPosition.y - input.selfPosition.y,
      input.enemyPosition.x - input.selfPosition.x,
    );
    const offset = (Math.random() * 2 - 1) * this.difficulty.accuracyOffset;
    const aimAngle = baseAngle + offset;
    const diff = normalizeAngle(aimAngle - input.selfRotation);

    const rotateLeft = diff < -AIM_THRESHOLD;
    const rotateRight = diff > AIM_THRESHOLD;
    const aimAligned = Math.abs(diff) < AIM_THRESHOLD;

    let shoot = false;
    if (aimAligned && this.fireCooldown <= 0 && input.ammo > 0) {
      shoot = true;
      this.fireCooldown = this.difficulty.fireRateCooldown;
      this._shouldExit = true;
    }

    return {
      forward: false, backward: false,
      rotateLeft, rotateRight,
      shoot, usePowerUp: false,
    };
  }

  exit(): void {
    this.fireCooldown = 0;
    this._shouldExit = false;
  }

  shouldExit(): boolean {
    return this._shouldExit;
  }

  private detectIncomingProjectile(input: AIInput): boolean {
    for (const bullet of input.bullets) {
      if (bullet.ownerId === this.selfPlayerId) continue;

      const d = dist(bullet.x, bullet.y, input.selfPosition.x, input.selfPosition.y);
      if (d > this.difficulty.bulletDetectionDistance) continue;

      const angleToSelf = Math.atan2(
        input.selfPosition.y - bullet.y,
        input.selfPosition.x - bullet.x,
      );
      const bulletAngle = Math.atan2(bullet.vy, bullet.vx);
      const angleDifference = Math.abs(normalizeAngle(angleToSelf - bulletAngle));

      if (angleDifference < BULLET_THREAT_ANGLE) return true;
    }
    return false;
  }
}
