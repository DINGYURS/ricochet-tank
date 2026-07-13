import { describe, expect, it, vi } from 'vitest';
import { FragBomb, FragFragment } from '../../src/objects/FragBomb';

function createScene() {
  const circles: any[] = [];
  return {
    scene: {
      add: {
        circle: vi.fn((x: number, y: number) => {
          const circle = { x, y, setPosition: vi.fn(), destroy: vi.fn() };
          circles.push(circle);
          return circle;
        }),
      },
    } as any,
    circles,
  };
}

describe('FragBomb', () => {
  it('advances flight state and graphics', () => {
    const { scene, circles } = createScene();
    const bomb = new FragBomb(scene, 0, 0, 100, 0, 2);
    bomb.update(0.5);
    expect(bomb.previousX).toBe(0);
    expect(bomb.previousY).toBe(0);
    expect(bomb.x).toBe(50);
    expect(bomb.age).toBe(0.5);
    expect(circles[0].setPosition).toHaveBeenCalledWith(50, 0);
  });

  it('sets model and graphics position together', () => {
    const { scene, circles } = createScene();
    const bomb = new FragBomb(scene, 0, 0, 100, 0, 2);

    bomb.setPosition(12, 34);

    expect(bomb.x).toBe(12);
    expect(bomb.y).toBe(34);
    expect(circles[0].setPosition).toHaveBeenCalledWith(12, 34);
  });

  it('destroys idempotently', () => {
    const { scene, circles } = createScene();
    const bomb = new FragBomb(scene, 0, 0, 100, 0, 2);
    bomb.destroy();
    bomb.destroy();
    expect(bomb.active).toBe(false);
    expect(circles[0].destroy).toHaveBeenCalledOnce();
  });
});

describe('FragFragment', () => {
  it('moves independently and retains owner identity', () => {
    const { scene } = createScene();
    const fragment = new FragFragment(scene, 10, 20, 0, -100, 1);
    fragment.update(0.25);
    expect(fragment.x).toBe(10);
    expect(fragment.y).toBe(-5);
    expect(fragment.ownerId).toBe(1);
  });
});
