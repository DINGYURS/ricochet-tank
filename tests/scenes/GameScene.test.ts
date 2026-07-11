import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Phaser before importing GameScene
vi.mock('phaser', () => {
  class MockScene {
    input: any;
    add: any;
    time: any;
    events: any;
    scene: any;
    config: any;
    constructor(config?: any) {
      this.config = config;
      this.input = { keyboard: { once: vi.fn(), addKey: vi.fn(() => ({ isDown: false })), addCapture: vi.fn() } };
      this.add = {
        text: vi.fn(() => ({ setOrigin: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(), setAlpha: vi.fn().mockReturnThis(), setText: vi.fn(), setColor: vi.fn() })),
        graphics: vi.fn(() => ({ setDepth: vi.fn().mockReturnThis(), clear: vi.fn(), fillStyle: vi.fn(), fillRect: vi.fn(), fillCircle: vi.fn(), lineStyle: vi.fn(), strokeRect: vi.fn() })),
        circle: vi.fn(() => ({ setPosition: vi.fn(), destroy: vi.fn() })),
      };
      this.time = { now: 0, addEvent: vi.fn(), delayedCall: vi.fn() };
      this.events = { on: vi.fn(), emit: vi.fn() };
      this.scene = { start: vi.fn() };
    }
  }

  return {
    default: {
      Scene: MockScene,
      Input: {
        Keyboard: {
          KeyCodes: { W: 87, S: 83, A: 65, D: 68, UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39, SPACE: 32, ENTER: 13, ESC: 27, E: 69, PERIOD: 190 },
          JustDown: vi.fn(() => false),
        },
      },
      AUTO: 0,
    },
  };
});

// Mock InputManager as a proper class
vi.mock('../../src/systems/InputManager', () => {
  return {
    InputManager: class {
      getPlayer1Input() {
        return { forward: false, backward: false, rotateLeft: false, rotateRight: false, shoot: false, usePowerUp: false };
      }
      getPlayer2Input() {
        return { forward: false, backward: false, rotateLeft: false, rotateRight: false, shoot: false, usePowerUp: false };
      }
      getPlayer3Input() {
        return { forward: false, backward: false, rotateLeft: false, rotateRight: false, shoot: false, usePowerUp: false };
      }
      isEscapePressed() {
        return false;
      }
    },
  };
});

vi.mock('../../src/systems/MazeGenerator', () => ({
  generateMaze: vi.fn(() => ({
    walls: [],
    spawns: [{ x: 100, y: 100 }, { x: 700, y: 500 }, { x: 700, y: 100 }],
    spawn1: { x: 100, y: 100 },
    spawn2: { x: 700, y: 500 },
  })),
}));

vi.mock('../../src/systems/Collision', () => ({
  separateCircleFromRect: vi.fn((x: number, y: number) => ({ x, y })),
  circleCircleOverlap: vi.fn(() => false),
  circleRectOverlap: vi.fn(() => false),
}));

vi.mock('../../src/utils/math', () => ({
  reflect: vi.fn((vx: number, vy: number) => ({ vx, vy })),
}));

vi.mock('../../src/systems/SoundManager', () => {
  return {
    SoundManager: class {
      shoot() {}
      bounce() {}
      explosion() {}
      victory() {}
      countdownTick() {}
      powerUpPickup() {}
      shieldBreak() {}
      rocketFire() {}
      minePlace() {}
      mineExplode() {}
      shotgunFire() {}
    },
  };
});

vi.mock('../../src/objects/Wall', () => {
  return {
    Wall: class {
      destroy() {}
    },
  };
});

vi.mock('../../src/objects/Tank', () => {
  return {
    Tank: class {
      x: number;
      y: number;
      rotation: number;
      playerId: number;
      alive = true;
      ammo = 10;
      shootCooldown = 0;
      ammoRefillTimer = 0;
      heldPowerUp = null;
      passiveEffects = new Set();
      passiveTimers = new Map();
      shieldActive = false;
      radius = 16;
      constructor(_scene: any, x: number, y: number, rotation: number, playerId: number) {
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        this.playerId = playerId;
      }
      destroy() {}
      setPosition() {}
      setAlive(alive: boolean) { this.alive = alive; }
      clearPowerUps() {}
    },
    computeTankMovement: vi.fn(),
  };
});

vi.mock('../../src/objects/Bullet', () => {
  return {
    Bullet: class {
      state = { x: 0, y: 0, vx: 0, vy: 0, bounceCount: 0, lifeTime: 0, ownerId: 0, spawnTime: 0, active: true, wallCooldowns: new Map() };
      radius = 4;
      destroy() {}
      update() {}
    },
    isOwnerSafe: vi.fn(() => true),
  };
});

vi.mock('../../src/enums/PowerUpType', () => ({
  PowerUpType: { Shield: 'Shield', RapidFire: 'RapidFire', DoubleShot: 'DoubleShot', Laser: 'Laser', Rocket: 'Rocket', Mine: 'Mine', Shotgun: 'Shotgun' },
  POWERUP_VISUALS: {
    Shield: { color: 0x4488ff, label: 'Shield', passive: true },
    RapidFire: { color: 0xff8800, label: 'Rapid Fire', passive: true },
    DoubleShot: { color: 0x00ff88, label: 'Double Shot', passive: true },
    Laser: { color: 0xff0000, label: 'Laser', passive: false },
    Rocket: { color: 0xff4400, label: 'Rocket', passive: false },
    Mine: { color: 0x8800ff, label: 'Mine', passive: false },
    Shotgun: { color: 0xffaa00, label: 'Shotgun', passive: false },
  },
  ALL_POWERUP_TYPES: ['Shield', 'RapidFire', 'DoubleShot', 'Laser', 'Rocket', 'Mine', 'Shotgun'],
}));

vi.mock('../../src/systems/PowerUpManager', () => {
  return {
    PowerUpManager: class {
      update() {}
      updatePassiveTimers() {}
      getPowerUps() { return []; }
      clearAll() {}
    },
  };
});

vi.mock('../../src/systems/PowerUpEffects', () => ({
  getEffectiveCooldown: vi.fn(() => 0.1),
  createBulletsForShot: vi.fn(() => []),
  fireLaser: vi.fn(() => ({ graphics: null, hitPlayerId: null })),
  fireRocket: vi.fn(() => ({ active: true, destroy: vi.fn() })),
  placeMine: vi.fn(() => ({ active: true, destroy: vi.fn() })),
  fireShotgun: vi.fn(() => []),
}));

vi.mock('../../src/objects/Rocket', () => {
  return { Rocket: class {} };
});

vi.mock('../../src/objects/Mine', () => {
  return { Mine: class {} };
});

vi.mock('../../src/systems/AIController', () => {
  return {
    AIController: class {
      getInput() {
        return { forward: false, backward: false, rotateLeft: false, rotateRight: false, shoot: false, usePowerUp: false };
      }
      setWorldState() {}
    },
  };
});

// Now import after all mocks are set up
import { GameScene } from '../../src/scenes/GameScene';
import { DEFAULT_GAME_SETTINGS, type GameSettings } from '../../src/config';
import { circleCircleOverlap } from '../../src/systems/Collision';

describe('GameScene', () => {
  it('uses the canonical GameSettings interface', () => {
    const settings: GameSettings = { mode: 'local', localPlayers: 2 };
    expect(settings.mode).toBe('local');
  });

  it('uses the canonical local defaults', () => {
    expect(DEFAULT_GAME_SETTINGS).toEqual({ mode: 'local', localPlayers: 2 });
  });

  it('can be instantiated', () => {
    const scene = new GameScene();
    expect(scene).toBeDefined();
    expect(scene).toBeInstanceOf(GameScene);
  });

  it('has the correct scene key', () => {
    const scene = new GameScene();
    expect((scene as any).config.key).toBe('GameScene');
  });

  it('accepts GameSettings with ai mode', () => {
    const settings: GameSettings = { mode: 'ai', aiDifficulty: 'hard' };
    expect(settings.mode).toBe('ai');
    expect(settings.aiDifficulty).toBe('hard');
  });

  it('accepts GameSettings with local mode', () => {
    const settings: GameSettings = { mode: 'local', localPlayers: 2 };
    expect(settings.mode).toBe('local');
    expect(settings.localPlayers).toBe(2);
  });

  it('accepts three-player local settings', () => {
    const settings: GameSettings = { mode: 'local', localPlayers: 3 };
    expect(settings.localPlayers).toBe(3);
  });

  it('create method can be called with no settings (defaults to local)', () => {
    const scene = new GameScene();
    expect(() => (scene as any).create()).not.toThrow();
  });

  it('create method accepts local settings', () => {
    const scene = new GameScene();
    expect(() => (scene as any).create({ mode: 'local', localPlayers: 2 })).not.toThrow();
  });

  it('create method accepts ai settings with difficulty', () => {
    const scene = new GameScene();
    expect(() => (scene as any).create({ mode: 'ai', aiDifficulty: 'easy' })).not.toThrow();
  });

  it('create method accepts ai settings with all difficulty levels', () => {
    const scene = new GameScene();
    for (const diff of ['easy', 'medium', 'hard'] as const) {
      expect(() => (scene as any).create({ mode: 'ai', aiDifficulty: diff })).not.toThrow();
    }
  });

  it('settings property defaults to local when create called without args', () => {
    const scene = new GameScene();
    (scene as any).create();
    expect((scene as any).settings).toEqual({ mode: 'local', localPlayers: 2 });
  });

  it('settings property reflects provided ai settings', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'ai', aiDifficulty: 'hard' });
    expect((scene as any).settings).toEqual({ mode: 'ai', aiDifficulty: 'hard' });
  });

  it('does not create AI debug graphics when debug paths are disabled', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'ai', aiDifficulty: 'easy' });
    expect((scene as any).aiDebugGraphics).toBeNull();
  });

  it('creates three tanks, scores, and HUD entries for three-player local mode', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 3 });

    expect((scene as any).tanks).toHaveLength(3);
    expect((scene as any).scores).toEqual([0, 0, 0]);
    expect((scene as any).powerUpHudGraphics).toHaveLength(3);
  });

  it('continues a three-player round after the first elimination', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 3 });
    (scene as any).roundState = 'PLAYING';

    (scene as any).eliminatePlayers([0]);

    expect((scene as any).tanks[0].alive).toBe(false);
    expect((scene as any).roundState).toBe('PLAYING');
    expect((scene as any).scores).toEqual([0, 0, 0]);
  });

  it('awards the round to the last surviving player', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 3 });
    (scene as any).roundState = 'PLAYING';

    (scene as any).eliminatePlayers([0]);
    (scene as any).eliminatePlayers([1]);

    expect((scene as any).roundState).toBe('ROUND_OVER');
    expect((scene as any).scores).toEqual([0, 0, 1]);
    expect((scene as any).statusText.setText).toHaveBeenCalledWith('P3 Wins!');
  });

  it('records an all-dead round as a draw', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 3 });
    (scene as any).roundState = 'PLAYING';

    (scene as any).eliminatePlayers([0, 1, 2]);

    expect((scene as any).roundState).toBe('ROUND_OVER');
    expect((scene as any).scores).toEqual([0, 0, 0]);
    expect((scene as any).statusText.setText).toHaveBeenCalledWith('DRAW!');
  });

  it('aggregates separate eliminations in one frame before resolving the round', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 3 });
    (scene as any).roundState = 'PLAYING';
    (scene as any).eliminatePlayers([0]);
    (scene as any).tanks[1].x = 100;
    (scene as any).tanks[1].y = 100;
    (scene as any).tanks[2].x = 200;
    (scene as any).tanks[2].y = 200;
    vi.mocked(circleCircleOverlap).mockImplementation((x1, y1, _r1, x2, y2) => x1 === x2 && y1 === y2);
    (scene as any).mines = [
      { x: 100, y: 100, triggerRadius: 40, ownerId: 0, active: true, update: vi.fn(), destroy() { this.active = false; } },
      { x: 200, y: 200, triggerRadius: 40, ownerId: 0, active: true, update: vi.fn(), destroy() { this.active = false; } },
    ];

    scene.update(0, 16);

    expect((scene as any).roundState).toBe('ROUND_OVER');
    expect((scene as any).scores).toEqual([0, 0, 0]);
    expect((scene as any).statusText.setText).toHaveBeenCalledWith('DRAW!');
  });
});
