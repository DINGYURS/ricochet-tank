import { describe, expect, it, vi } from 'vitest';
import { RCMissile } from '../../src/objects/RCMissile';

function createScene() {
  const graphics = {
    clear: vi.fn().mockReturnThis(),
    fillStyle: vi.fn().mockReturnThis(),
    fillTriangle: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    setRotation: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
  return { scene: { add: { graphics: () => graphics } } as any, graphics };
}

describe('RCMissile', () => {
  it('updates position and heading from steering input', () => {
    const { scene, graphics } = createScene();
    const missile = new RCMissile(scene, 10, 20, 100, 0, 1);

    missile.update(0.1, 1);

    expect(missile.x).toBeGreaterThan(10);
    expect(missile.y).toBeGreaterThan(20);
    expect(graphics.setPosition).toHaveBeenLastCalledWith(missile.x, missile.y);
    expect(graphics.setRotation).toHaveBeenCalled();
  });

  it('reflects and tracks bounce count', () => {
    const { scene } = createScene();
    const missile = new RCMissile(scene, 0, 0, 100, 50, 1);

    missile.reflect('vertical');

    expect(missile.state.vx).toBe(-100);
    expect(missile.state.vy).toBe(50);
    expect(missile.state.bounces).toBe(1);
  });

  it('destroys its graphics and becomes inactive', () => {
    const { scene, graphics } = createScene();
    const missile = new RCMissile(scene, 0, 0, 100, 0, 1);

    missile.destroy();

    expect(missile.active).toBe(false);
    expect(graphics.destroy).toHaveBeenCalledOnce();
  });
});
