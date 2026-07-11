import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => {
  class Scene {
    sys = { settings: { key: '' } };
    scene = { get: vi.fn(), stop: vi.fn(), resume: vi.fn(), start: vi.fn() };
    add = {
      rectangle: vi.fn(() => ({ setOrigin: vi.fn().mockReturnThis() })),
      text: vi.fn(() => ({
        setOrigin: vi.fn().mockReturnThis(),
        setText: vi.fn().mockReturnThis(),
        setColor: vi.fn().mockReturnThis(),
      })),
    };
    input = { keyboard: { on: vi.fn(), once: vi.fn() } };
    constructor(config?: { key?: string }) {
      this.sys.settings.key = config?.key ?? '';
    }
  }
  return { default: { Scene } };
});

import {
  PAUSE_ACTIONS,
  PauseScene,
  getControlLines,
  getPauseActionLabels,
} from '../../src/scenes/PauseScene';

describe('PauseScene', () => {
  it('uses a stable scene key and exposes all required actions', () => {
    expect(PauseScene.KEY).toBe('PauseScene');
    expect(new PauseScene().sys.settings.key).toBe('PauseScene');
    expect(PAUSE_ACTIONS.map(action => action.key)).toEqual([
      'resume',
      'restart',
      'sound',
      'powerups',
      'menu',
    ]);
  });

  it('renders current toggle state in action labels', () => {
    expect(getPauseActionLabels({ soundEnabled: true, powerUpsEnabled: false })).toContain('Sound: ON');
    expect(getPauseActionLabels({ soundEnabled: true, powerUpsEnabled: false })).toContain('Power-ups: OFF');
  });

  it('shows controls for every local player in the selected mode', () => {
    expect(getControlLines({ mode: 'local', localPlayers: 3 })).toEqual([
      'P1: W/A/S/D + Space · E power-up',
      'P2: Arrow Keys + Enter · . power-up',
      'P3: Mouse move + Left click · Right click power-up',
    ]);
  });

  it('identifies the AI opponent instead of showing P2 controls', () => {
    expect(getControlLines({ mode: 'ai', aiDifficulty: 'hard' })).toEqual([
      'P1: W/A/S/D + Space · E power-up',
      'P2: AI (Hard)',
    ]);
  });

  it('delegates toggles and restart to the active game controller', () => {
    const status = {
      settings: { mode: 'local', localPlayers: 2 } as const,
      soundEnabled: true,
      powerUpsEnabled: true,
    };
    const controller = {
      getPauseStatus: vi.fn(() => status),
      setSoundEnabled: vi.fn((enabled: boolean) => { status.soundEnabled = enabled; }),
      setPowerUpsEnabled: vi.fn((enabled: boolean) => { status.powerUpsEnabled = enabled; }),
      restartMatch: vi.fn(),
    };
    const scene = new PauseScene();
    vi.mocked(scene.scene.get).mockReturnValue(controller as any);
    scene.create();

    (scene as any).selectedIndex = 2;
    (scene as any).activateSelectedAction();
    expect(controller.setSoundEnabled).toHaveBeenCalledWith(false);

    (scene as any).selectedIndex = 3;
    (scene as any).activateSelectedAction();
    expect(controller.setPowerUpsEnabled).toHaveBeenCalledWith(false);

    (scene as any).selectedIndex = 1;
    (scene as any).activateSelectedAction();
    expect(controller.restartMatch).toHaveBeenCalledOnce();
    expect(scene.scene.resume).toHaveBeenCalledWith('GameScene');
  });

  it('stops the game before returning to the main menu', () => {
    const controller = {
      getPauseStatus: () => ({
        settings: { mode: 'ai', aiDifficulty: 'easy' } as const,
        soundEnabled: true,
        powerUpsEnabled: true,
      }),
      setSoundEnabled: vi.fn(),
      setPowerUpsEnabled: vi.fn(),
      restartMatch: vi.fn(),
    };
    const scene = new PauseScene();
    vi.mocked(scene.scene.get).mockReturnValue(controller as any);
    scene.create();
    (scene as any).selectedIndex = 4;

    (scene as any).activateSelectedAction();

    expect(scene.scene.stop).toHaveBeenCalledWith('GameScene');
    expect(scene.scene.start).toHaveBeenCalledWith('MenuScene');
  });
});
