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

import { DEFAULT_GAME_SETTINGS } from '../../src/config';
import { MENU_OPTIONS, MenuScene } from '../../src/scenes/MenuScene';

describe('MenuScene', () => {
  it('offers complete settings for two- and three-player local matches', () => {
    expect(MENU_OPTIONS.map(option => option.label)).toEqual(['2 Players', '3 Players', 'VS AI']);
    expect(MENU_OPTIONS[0].settings).toEqual({ mode: 'local', localPlayers: 2 });
    expect(MENU_OPTIONS[1].settings).toEqual({ mode: 'local', localPlayers: 3 });
    expect(MENU_OPTIONS[2].settings).toBeNull();
    expect(DEFAULT_GAME_SETTINGS).toEqual({ mode: 'local', localPlayers: 2 });
  });

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
