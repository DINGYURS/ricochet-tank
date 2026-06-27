import Phaser from 'phaser';
import {
  BULLET_SPEED, BULLET_SHOOT_COOLDOWN,
  DOUBLE_SHOT_SPREAD, LASER_LIFETIME,
  ROCKET_SPEED, ROCKET_TURN_SPEED,
  SHOTGUN_COUNT, SHOTGUN_SPREAD,
} from '../config';
import { Tank } from '../objects/Tank';
import { Bullet } from '../objects/Bullet';
import { Rocket } from '../objects/Rocket';
import { Mine } from '../objects/Mine';
import { reflect } from '../utils/math';
import { PowerUpType } from '../enums/PowerUpType';

export interface LaserSegment {
  x1: number; y1: number;
  x2: number; y2: number;
}

export function getEffectiveCooldown(tank: Tank): number {
  if (tank.passiveEffects.has(PowerUpType.RapidFire)) {
    return BULLET_SHOOT_COOLDOWN / 2;
  }
  return BULLET_SHOOT_COOLDOWN;
}

export function createBulletsForShot(
  scene: Phaser.Scene,
  tank: Tank,
  currentTimeMs: number
): Bullet[] {
  const tip = tank.getBarrelTip();
  const baseAngle = tank.rotation;
  const bullets: Bullet[] = [];

  if (tank.passiveEffects.has(PowerUpType.DoubleShot)) {
    // Two bullets at ±spread
    for (const offset of [-DOUBLE_SHOT_SPREAD, DOUBLE_SHOT_SPREAD]) {
      const angle = baseAngle + offset;
      const vx = Math.cos(angle) * BULLET_SPEED;
      const vy = Math.sin(angle) * BULLET_SPEED;
      bullets.push(new Bullet(scene, tip.x, tip.y, vx, vy, tank.playerId, currentTimeMs / 1000));
    }
  } else {
    const vx = Math.cos(baseAngle) * BULLET_SPEED;
    const vy = Math.sin(baseAngle) * BULLET_SPEED;
    bullets.push(new Bullet(scene, tip.x, tip.y, vx, vy, tank.playerId, currentTimeMs / 1000));
  }

  return bullets;
}

export function fireLaser(
  scene: Phaser.Scene,
  tank: Tank,
  wallData: Array<{ x: number; y: number; width: number; height: number; orientation: 'vertical' | 'horizontal' }>,
  tanks: Tank[],
  soundManager: { laserFire(): void }
): { graphics: Phaser.GameObjects.Graphics; segments: LaserSegment[]; hitPlayerId: number | null } {
  const tip = tank.getBarrelTip();
  const segments: LaserSegment[] = [];
  let x = tip.x;
  let y = tip.y;
  let vx = Math.cos(tank.rotation);
  let vy = Math.sin(tank.rotation);
  let hitPlayerId: number | null = null;

  const maxBounces = 8;
  const maxLength = 2000;

  for (let bounce = 0; bounce <= maxBounces; bounce++) {
    let nearestDist = maxLength;
    let nearestX = x + vx * maxLength;
    let nearestY = y + vy * maxLength;
    let hitOrientation: 'vertical' | 'horizontal' | null = null;

    // Check wall intersections
    for (const wd of wallData) {
      const result = lineRectIntersection(x, y, vx, vy, wd.x, wd.y, wd.width, wd.height);
      if (result && result.dist < nearestDist) {
        nearestDist = result.dist;
        nearestX = result.x;
        nearestY = result.y;
        hitOrientation = wd.orientation;
      }
    }

    segments.push({ x1: x, y1: y, x2: nearestX, y2: nearestY });

    // Check tank hits along this segment
    if (hitPlayerId === null) {
      for (const t of tanks) {
        if (!t.alive || t.playerId === tank.playerId) continue;
        if (lineCircleIntersect(x, y, nearestX, nearestY, t.x, t.y, t.radius)) {
          hitPlayerId = t.playerId;
        }
      }
    }

    if (!hitOrientation) break;

    // Reflect
    const reflected = reflect(vx, vy, hitOrientation);
    vx = reflected.vx;
    vy = reflected.vy;
    x = nearestX + vx * 1;
    y = nearestY + vy * 1;
  }

  // Draw laser
  const graphics = scene.add.graphics().setDepth(50);
  graphics.lineStyle(3, 0xff0000, 0.9);
  for (const seg of segments) {
    graphics.lineBetween(seg.x1, seg.y1, seg.x2, seg.y2);
  }
  // Glow
  graphics.lineStyle(8, 0xff0000, 0.3);
  for (const seg of segments) {
    graphics.lineBetween(seg.x1, seg.y1, seg.x2, seg.y2);
  }

  soundManager.laserFire();

  return { graphics, segments, hitPlayerId };
}

export function fireRocket(
  scene: Phaser.Scene,
  tank: Tank
): Rocket {
  const tip = tank.getBarrelTip();
  const vx = Math.cos(tank.rotation) * ROCKET_SPEED;
  const vy = Math.sin(tank.rotation) * ROCKET_SPEED;
  return new Rocket(scene, tip.x, tip.y, vx, vy, tank.playerId);
}

export function placeMine(
  scene: Phaser.Scene,
  tank: Tank,
  existingMine: Mine | null
): Mine {
  if (existingMine && existingMine.active) {
    existingMine.destroy();
  }
  return new Mine(scene, tank.x, tank.y, tank.playerId);
}

export function fireShotgun(
  scene: Phaser.Scene,
  tank: Tank,
  currentTimeMs: number
): Bullet[] {
  const tip = tank.getBarrelTip();
  const baseAngle = tank.rotation;
  const bullets: Bullet[] = [];

  for (let i = 0; i < SHOTGUN_COUNT; i++) {
    const offset = -SHOTGUN_SPREAD / 2 + (SHOTGUN_SPREAD / (SHOTGUN_COUNT - 1)) * i;
    const angle = baseAngle + offset;
    const vx = Math.cos(angle) * BULLET_SPEED;
    const vy = Math.sin(angle) * BULLET_SPEED;
    bullets.push(new Bullet(scene, tip.x, tip.y, vx, vy, tank.playerId, currentTimeMs / 1000));
  }

  return bullets;
}

// --- Math helpers ---

function lineRectIntersection(
  ox: number, oy: number, dx: number, dy: number,
  rx: number, ry: number, rw: number, rh: number
): { x: number; y: number; dist: number } | null {
  let minDist = Infinity;
  let result: { x: number; y: number; dist: number } | null = null;

  // Check all 4 edges
  const edges = [
    { x1: rx, y1: ry, x2: rx + rw, y2: ry },         // top
    { x1: rx, y1: ry + rh, x2: rx + rw, y2: ry + rh }, // bottom
    { x1: rx, y1: ry, x2: rx, y2: ry + rh },           // left
    { x1: rx + rw, y1: ry, x2: rx + rw, y2: ry + rh }, // right
  ];

  for (const edge of edges) {
    const hit = lineLineIntersection(ox, oy, ox + dx, oy + dy, edge.x1, edge.y1, edge.x2, edge.y2);
    if (hit) {
      const dist = Math.sqrt((hit.x - ox) ** 2 + (hit.y - oy) ** 2);
      if (dist > 0.1 && dist < minDist) {
        minDist = dist;
        result = { x: hit.x, y: hit.y, dist };
      }
    }
  }

  return result;
}

function lineLineIntersection(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): { x: number; y: number } | null {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.0001) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  }
  return null;
}

function lineCircleIntersect(
  x1: number, y1: number, x2: number, y2: number,
  cx: number, cy: number, r: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;

  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return false;

  discriminant = Math.sqrt(discriminant);
  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);

  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}
