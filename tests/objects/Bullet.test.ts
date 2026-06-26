import { describe, it, expect } from 'vitest';
import { BulletState, updateBullet } from '../../src/objects/Bullet';

describe('updateBullet', () => {
  it('moves bullet by velocity * dt', () => {
    const bullet: BulletState = {
      x: 100, y: 100, vx: 300, vy: 0,
      bounceCount: 0, lifeTime: 0, ownerId: 0,
      spawnTime: 0, active: true,
    };
    updateBullet(bullet, 0.016, 1000);
    expect(bullet.x).toBeCloseTo(100 + 300 * 0.016);
    expect(bullet.y).toBeCloseTo(100);
    expect(bullet.lifeTime).toBeCloseTo(0.016);
  });

  it('deactivates after max lifetime', () => {
    const bullet: BulletState = {
      x: 100, y: 100, vx: 300, vy: 0,
      bounceCount: 0, lifeTime: 7.9, ownerId: 0,
      spawnTime: 0, active: true,
    };
    updateBullet(bullet, 0.2, 8000);
    expect(bullet.active).toBe(false);
  });

  it('deactivates after max bounces', () => {
    const bullet: BulletState = {
      x: 100, y: 100, vx: 300, vy: 0,
      bounceCount: 8, lifeTime: 0, ownerId: 0,
      spawnTime: 0, active: true,
    };
    updateBullet(bullet, 0.016, 1000);
    expect(bullet.active).toBe(true);
  });

  it('tracks prevX/prevY', () => {
    const bullet: BulletState = {
      x: 100, y: 100, vx: 300, vy: 0,
      bounceCount: 0, lifeTime: 0, ownerId: 0,
      spawnTime: 0, active: true,
    };
    updateBullet(bullet, 0.016, 1000);
    expect(bullet.prevX).toBeCloseTo(100);
    expect(bullet.prevY).toBeCloseTo(100);
  });
});
