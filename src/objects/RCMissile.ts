import Phaser from 'phaser';
import {
  BULLET_RADIUS,
  RC_MISSILE_MAX_BOUNCES,
  RC_MISSILE_MAX_LIFETIME,
  RC_MISSILE_OWNER_SAFE_PERIOD,
  RC_MISSILE_TURN_SPEED,
} from '../config';
import {
  advanceRCMissile,
  isRCMissileOwnerSafe,
  reflectRCMissile,
  type RCMissileState,
} from '../systems/RCMissilePhysics';

export class RCMissile {
  state: RCMissileState;
  readonly ownerId: number;
  readonly radius = BULLET_RADIUS;

  private readonly graphics: Phaser.GameObjects.Graphics;
  private graphicsDestroyed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, vx: number, vy: number, ownerId: number) {
    this.ownerId = ownerId;
    this.state = { x, y, vx, vy, age: 0, bounces: 0, active: true };
    this.graphics = scene.add.graphics();
    this.graphics.fillStyle(0x99ff33, 1);
    this.graphics.fillTriangle(7, 0, -5, -4, -5, 4);
    this.syncGraphics();
  }

  get x(): number { return this.state.x; }
  get y(): number { return this.state.y; }
  get active(): boolean { return this.state.active; }

  update(dt: number, steerInput: number): void {
    this.state = advanceRCMissile(
      this.state,
      dt,
      steerInput,
      RC_MISSILE_TURN_SPEED,
      RC_MISSILE_MAX_LIFETIME,
    );
    if (!this.state.active) {
      this.destroyGraphics();
      return;
    }
    this.syncGraphics();
  }

  reflect(orientation: 'vertical' | 'horizontal'): void {
    this.state = reflectRCMissile(this.state, orientation, RC_MISSILE_MAX_BOUNCES);
    if (!this.state.active) this.destroyGraphics();
    else this.syncGraphics();
  }

  isOwnerSafe(): boolean {
    return isRCMissileOwnerSafe(this.state.age, RC_MISSILE_OWNER_SAFE_PERIOD);
  }

  destroy(): void {
    this.state = { ...this.state, active: false };
    this.destroyGraphics();
  }

  private syncGraphics(): void {
    this.graphics.setPosition(this.state.x, this.state.y);
    this.graphics.setRotation(Math.atan2(this.state.vy, this.state.vx));
  }

  private destroyGraphics(): void {
    if (this.graphicsDestroyed) return;
    this.graphicsDestroyed = true;
    this.graphics.destroy();
  }
}
