import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('phaser', () => {
  class Scene {
    scene = { key: '', start: vi.fn() };
    input = { keyboard: { on: vi.fn(), once: vi.fn() } };
    add = { text: vi.fn(() => ({ setOrigin: vi.fn(() => ({})), setColor: vi.fn(), setText: vi.fn() })) };
    constructor(config?: { key?: string }) {
      if (config?.key) this.scene.key = config.key;
    }
  }
  return { default: { Scene }, Scene };
});

let DifficultyScene: typeof import('../../src/scenes/DifficultyScene').DifficultyScene;
let DIFFICULTIES: typeof import('../../src/scenes/DifficultyScene').DIFFICULTIES;

beforeAll(async () => {
  const mod = await import('../../src/scenes/DifficultyScene');
  DifficultyScene = mod.DifficultyScene;
  DIFFICULTIES = mod.DIFFICULTIES;
});

describe('DifficultyScene', () => {
  it('is exported and can be instantiated', () => {
    expect(DifficultyScene).toBeDefined();
    const scene = new DifficultyScene();
    expect(scene).toBeInstanceOf(DifficultyScene);
  });

  it('has the correct scene key', () => {
    expect(DifficultyScene.KEY).toBe('DifficultyScene');
  });

  it('constructor creates scene with correct key', () => {
    const scene = new DifficultyScene();
    expect(scene.scene.key).toBe('DifficultyScene');
  });

  describe('DIFFICULTIES', () => {
    it('has exactly 3 options', () => {
      expect(DIFFICULTIES).toHaveLength(3);
    });

    it('contains easy, medium, and hard', () => {
      const keys = DIFFICULTIES.map(d => d.key);
      expect(keys).toEqual(['easy', 'medium', 'hard']);
    });

    it('each option has a label and description', () => {
      for (const opt of DIFFICULTIES) {
        expect(opt).toHaveProperty('key');
        expect(opt).toHaveProperty('label');
        expect(opt).toHaveProperty('description');
        expect(typeof opt.label).toBe('string');
        expect(opt.label.length).toBeGreaterThan(0);
        expect(typeof opt.description).toBe('string');
        expect(opt.description.length).toBeGreaterThan(0);
      }
    });
  });
});
