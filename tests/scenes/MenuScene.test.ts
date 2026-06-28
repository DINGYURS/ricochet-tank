// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

// Mock Phaser before importing MenuScene
vi.mock('phaser', () => {
  class Scene {
    sys = { settings: { key: '' } };
    add: any;
    input: any;
    tweens: any;
    scene: any;
    constructor(config?: { key?: string }) {
      this.sys.settings.key = config?.key ?? '';
      this.add = {
        text: vi.fn().mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
          setColor: vi.fn().mockReturnThis(),
          setText: vi.fn().mockReturnThis(),
        }),
      };
      this.input = {
        keyboard: {
          on: vi.fn(),
          once: vi.fn(),
        },
      };
      this.tweens = { add: vi.fn() };
      this.scene = { start: vi.fn() };
    }
  }
  return { default: { Scene } };
});

import { MenuScene } from '../../src/scenes/MenuScene';

describe('MenuScene', () => {
  it('exists and is a class', () => {
    expect(MenuScene).toBeDefined();
    expect(typeof MenuScene).toBe('function');
  });

  it('can be instantiated', () => {
    const scene = new MenuScene();
    expect(scene).toBeInstanceOf(MenuScene);
  });

  it('has the correct scene key', () => {
    const scene = new MenuScene();
    expect(scene.sys.settings.key).toBe('MenuScene');
  });
});
