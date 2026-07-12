import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEscapePressed = vi.hoisted(() => ({ value: false }));
const mockPlayer1Input = vi.hoisted(() => ({
  forward: false,
  backward: false,
  rotateLeft: false,
  rotateRight: false,
  shoot: false,
  usePowerUp: false,
}));
const mockPlayer2Input = vi.hoisted(() => ({
  forward: false,
  backward: false,
  rotateLeft: false,
  rotateRight: false,
  shoot: false,
  usePowerUp: false,
}));

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
      this.input = { keyboard: { once: vi.fn(), off: vi.fn(), addKey: vi.fn(() => ({ isDown: false })), addCapture: vi.fn() } };
      this.add = {
        text: vi.fn(() => ({ setOrigin: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(), setAlpha: vi.fn().mockReturnThis(), setText: vi.fn(), setColor: vi.fn() })),
        graphics: vi.fn(() => ({ setDepth: vi.fn().mockReturnThis(), clear: vi.fn(), fillStyle: vi.fn(), fillRect: vi.fn(), fillCircle: vi.fn(), lineStyle: vi.fn(), lineBetween: vi.fn(), strokeRect: vi.fn(), destroy: vi.fn() })),
        circle: vi.fn(() => ({ setPosition: vi.fn(), destroy: vi.fn() })),
      };
      this.time = {
        now: 0,
        addEvent: vi.fn((config: any) => ({ config, remove: vi.fn() })),
        delayedCall: vi.fn((_delay: number, callback: () => void) => ({ callback, remove: vi.fn() })),
      };
      this.events = { on: vi.fn(), once: vi.fn(), emit: vi.fn() };
      this.scene = {
        start: vi.fn(),
        pause: vi.fn(),
        launch: vi.fn(),
        stop: vi.fn(),
        resume: vi.fn(),
        get: vi.fn(),
      };
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
        return { ...mockPlayer1Input };
      }
      getPlayer2Input() {
        return { ...mockPlayer2Input };
      }
      getPlayer3Input() {
        return { forward: false, backward: false, rotateLeft: false, rotateRight: false, shoot: false, usePowerUp: false };
      }
      isEscapePressed() {
        return mockEscapePressed.value;
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
  sweptCircleRectOverlap: vi.fn(() => false),
  sweptCircleRectTOI: vi.fn(() => null),
  sweptCircleCircleTOI: vi.fn(() => null),
}));

vi.mock('../../src/utils/math', async importOriginal => ({
  ...await importOriginal<typeof import('../../src/utils/math')>(),
  reflect: vi.fn((vx: number, vy: number) => ({ vx, vy })),
}));

vi.mock('../../src/systems/SoundManager', () => {
  return {
    SoundManager: class {
      enabled = true;
      setEnabled(enabled: boolean) { this.enabled = enabled; }
      isEnabled() { return this.enabled; }
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
      laserFire() {}
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
      getBarrelTip() { return { x: this.x + 15, y: this.y }; }
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
  PowerUpType: { Shield: 'Shield', RapidFire: 'RapidFire', DoubleShot: 'DoubleShot', Laser: 'Laser', Rocket: 'Rocket', Mine: 'Mine', Shotgun: 'Shotgun', DeathRay: 'DeathRay', RCMissile: 'RCMissile', FragBomb: 'FragBomb' },
  POWERUP_VISUALS: {
    Shield: { color: 0x4488ff, label: 'Shield', passive: true },
    RapidFire: { color: 0xff8800, label: 'Rapid Fire', passive: true },
    DoubleShot: { color: 0x00ff88, label: 'Double Shot', passive: true },
    Laser: { color: 0xff0000, label: 'Laser', passive: false },
    Rocket: { color: 0xff4400, label: 'Rocket', passive: false },
    Mine: { color: 0x8800ff, label: 'Mine', passive: false },
    Shotgun: { color: 0xffaa00, label: 'Shotgun', passive: false },
    DeathRay: { color: 0x00eeff, label: 'Death Ray', passive: false },
    RCMissile: { color: 0x99ff33, label: 'RC Missile', passive: false },
    FragBomb: { color: 0xffcc33, label: 'Frag Bomb', passive: false },
  },
  ALL_POWERUP_TYPES: ['Shield', 'RapidFire', 'DoubleShot', 'Laser', 'Rocket', 'Mine', 'Shotgun'],
}));

vi.mock('../../src/systems/PowerUpManager', () => {
  return {
    PowerUpManager: class {
      enabled = true;
      update() {}
      updatePassiveTimers() {}
      getPowerUps() { return []; }
      clearAll() {}
      setEnabled(enabled: boolean) { this.enabled = enabled; }
      isEnabled() { return this.enabled; }
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

vi.mock('../../src/objects/RCMissile', () => {
  return {
    RCMissile: class {
      state: any;
      ownerId: number;
      radius = 4;
      update = vi.fn();
      reflect = vi.fn();
      destroy = vi.fn(() => { this.state.active = false; });
      isOwnerSafe = vi.fn(() => false);
      constructor(_scene: any, x: number, y: number, vx: number, vy: number, ownerId: number) {
        this.state = { x, y, vx, vy, age: 0, bounces: 0, active: true };
        this.ownerId = ownerId;
      }
      get x() { return this.state.x; }
      get y() { return this.state.y; }
      get active() { return this.state.active; }
    },
  };
});

vi.mock('../../src/objects/FragBomb', () => {
  class FragBomb {
    x!: number;
    y!: number;
    vx!: number;
    vy!: number;
    age = 0;
    ownerId!: number;
    active = true;
    radius = 6;
    previousX!: number;
    previousY!: number;
    destroy = vi.fn(() => { this.active = false; });
    constructor(_scene: any, x: number, y: number, vx: number, vy: number, ownerId: number) {
      Object.assign(this, { x, y, vx, vy, ownerId });
      this.previousX = x;
      this.previousY = y;
    }
    update(dt: number) {
      this.previousX = this.x;
      this.previousY = this.y;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.age += dt;
    }
  }
  class FragFragment {
    x!: number;
    y!: number;
    vx!: number;
    vy!: number;
    ownerId!: number;
    active = true;
    radius = 2;
    destroy = vi.fn(() => { this.active = false; });
    constructor(_scene: any, x: number, y: number, vx: number, vy: number, ownerId: number) {
      Object.assign(this, { x, y, vx, vy, ownerId });
    }
    update(dt: number) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
  }
  return { FragBomb, FragFragment };
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
import { DEFAULT_GAME_SETTINGS, FRAG_BOMB_RADIUS, MAX_DT, type GameSettings } from '../../src/config';
import { circleCircleOverlap } from '../../src/systems/Collision';
import { circleRectOverlap } from '../../src/systems/Collision';
import { sweptCircleRectOverlap } from '../../src/systems/Collision';
import { sweptCircleCircleTOI, sweptCircleRectTOI } from '../../src/systems/Collision';

beforeEach(() => {
  mockEscapePressed.value = false;
  Object.assign(mockPlayer1Input, {
    forward: false,
    backward: false,
    rotateLeft: false,
    rotateRight: false,
    shoot: false,
    usePowerUp: false,
  });
  Object.assign(mockPlayer2Input, {
    forward: false,
    backward: false,
    rotateLeft: false,
    rotateRight: false,
    shoot: false,
    usePowerUp: false,
  });
  vi.mocked(circleCircleOverlap).mockReturnValue(false);
  vi.mocked(circleRectOverlap).mockReturnValue(false);
  vi.mocked(sweptCircleRectOverlap).mockReturnValue(false);
  vi.mocked(sweptCircleRectTOI).mockReturnValue(null);
  vi.mocked(sweptCircleCircleTOI).mockReturnValue(null);
});

describe('GameScene', () => {
  it('exposes a stable scene key', () => {
    expect(GameScene.KEY).toBe('GameScene');
  });
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

  it('opens the pause overlay on Escape instead of returning to the menu', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    mockEscapePressed.value = true;

    scene.update(0, 16);

    expect((scene as any).scene.pause).toHaveBeenCalledWith('GameScene');
    expect((scene as any).scene.launch).toHaveBeenCalledWith('PauseScene');
    expect((scene as any).scene.start).not.toHaveBeenCalledWith('MenuScene');
  });

  it('delegates match-local sound and power-up settings', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });

    scene.setSoundEnabled(false);
    scene.setPowerUpsEnabled(false);

    expect(scene.getPauseStatus()).toEqual({
      settings: { mode: 'local', localPlayers: 2 },
      soundEnabled: false,
      powerUpsEnabled: false,
    });
    expect((scene as any).soundManager.enabled).toBe(false);
    expect((scene as any).powerUpManager.enabled).toBe(false);
  });

  it('restarts the current match with zero scores and preserves match options', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 3 });
    scene.setSoundEnabled(false);
    scene.setPowerUpsEnabled(false);
    (scene as any).scores = [1, 2, 1];

    scene.restartMatch();

    expect((scene as any).scores).toEqual([0, 0, 0]);
    expect(scene.getPauseStatus()).toEqual({
      settings: { mode: 'local', localPlayers: 3 },
      soundEnabled: false,
      powerUpsEnabled: false,
    });
    expect((scene as any).powerUpManager.enabled).toBe(false);
  });

  it('cancels the previous countdown when restarting during READY', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const oldCountdown = (scene as any).countdownEvent;

    scene.restartMatch();

    expect(oldCountdown.remove).toHaveBeenCalledWith(false);
    expect((scene as any).countdownEvent).not.toBe(oldCountdown);
  });

  it('cancels delayed round resolution when restarting from ROUND_OVER', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    (scene as any).roundState = 'PLAYING';
    (scene as any).eliminatePlayers([1]);
    const oldRoundEnd = (scene as any).roundEndEvent;

    scene.restartMatch();

    expect(oldRoundEnd.remove).toHaveBeenCalledWith(false);
    expect((scene as any).scores).toEqual([0, 0]);
  });

  it('removes the match-over Space listener when restarting', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    (scene as any).scores = [2, 0];
    (scene as any).roundState = 'PLAYING';
    (scene as any).eliminatePlayers([1]);
    (scene as any).roundEndEvent.callback();
    const oldHandler = (scene as any).matchOverSpaceHandler;

    scene.restartMatch();

    expect((scene as any).input.keyboard.off).toHaveBeenCalledWith('keydown-SPACE', oldHandler);
    expect((scene as any).matchOverSpaceHandler).toBeNull();
  });

  it('routes ordinary primary fire to standard shooting only', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const tank = (scene as any).tanks[0];
    const standard = vi.spyOn(scene as any, 'handleShoot');
    const active = vi.spyOn(scene as any, 'handleUsePowerUp');

    (scene as any).handleWeaponInput(tank, { shoot: true, usePowerUp: false }, 100);

    expect(standard).toHaveBeenCalledOnce();
    expect(active).not.toHaveBeenCalled();
  });

  it('routes primary fire with an active weapon to active handling only', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const tank = (scene as any).tanks[0];
    tank.heldPowerUp = 'Laser';
    const standard = vi.spyOn(scene as any, 'handleShoot');
    const active = vi.spyOn(scene as any, 'handleUsePowerUp');

    (scene as any).handleWeaponInput(tank, { shoot: true, usePowerUp: false }, 100);

    expect(standard).not.toHaveBeenCalled();
    expect(active).toHaveBeenCalledOnce();
  });

  it('executes an active weapon once when primary and legacy inputs coincide', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const tank = (scene as any).tanks[0];
    tank.heldPowerUp = 'Rocket';
    const active = vi.spyOn(scene as any, 'handleUsePowerUp');

    (scene as any).handleWeaponInput(tank, { shoot: true, usePowerUp: true }, 100);

    expect(active).toHaveBeenCalledOnce();
  });

  it('resolves primary fire before collecting a power-up in the same update', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    (scene as any).roundState = 'PLAYING';
    mockPlayer1Input.shoot = true;
    const tank = (scene as any).tanks[0];
    vi.spyOn((scene as any).powerUpManager, 'update').mockImplementation(() => {
      tank.heldPowerUp = 'Laser';
    });
    const standard = vi.spyOn(scene as any, 'handleShoot');
    const active = vi.spyOn(scene as any, 'handleUsePowerUp');

    scene.update(0, 16);

    expect(standard).toHaveBeenCalledOnce();
    expect(active).not.toHaveBeenCalled();
    expect(tank.heldPowerUp).toBe('Laser');
  });

  it('fires the snapshotted active weapon when a pickup replaces the held slot', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    (scene as any).roundState = 'PLAYING';
    mockPlayer1Input.shoot = true;
    const tank = (scene as any).tanks[0];
    tank.heldPowerUp = 'Laser';
    vi.spyOn((scene as any).powerUpManager, 'update').mockImplementation(() => {
      tank.heldPowerUp = 'Rocket';
    });
    const active = vi.spyOn(scene as any, 'handleUsePowerUp');

    scene.update(0, 16);

    expect(active).toHaveBeenCalledWith(tank, true, 'Laser');
    expect(tank.heldPowerUp).toBe('Rocket');
  });

  it('preserves a newly collected active weapon of the same type', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    (scene as any).roundState = 'PLAYING';
    mockPlayer1Input.shoot = true;
    const tank = (scene as any).tanks[0];
    tank.heldPowerUp = 'Laser';
    vi.spyOn((scene as any).powerUpManager, 'update').mockImplementation(() => {
      expect(tank.heldPowerUp).toBeNull();
      tank.heldPowerUp = 'Laser';
    });

    scene.update(0, 16);

    expect(tank.heldPowerUp).toBe('Laser');
  });

  it('starts a Death Ray charge from unified weapon input', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const tank = (scene as any).tanks[0];
    tank.heldPowerUp = 'DeathRay';

    (scene as any).handleWeaponInput(tank, { shoot: true, usePowerUp: false }, 0);

    expect((scene as any).deathRayCharges.has(0)).toBe(true);
    expect(tank.heldPowerUp).toBeNull();
  });

  it('locks a charging tank and fires through the arena at charge completion', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 3 });
    const [owner, target, survivor] = (scene as any).tanks;
    target.y = owner.y;
    survivor.y = 300;
    owner.heldPowerUp = 'DeathRay';
    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
    (scene as any).deathRayCharges.get(0).state.elapsed = 0.95;
    (scene as any).roundState = 'PLAYING';
    mockPlayer1Input.forward = true;
    const updateTank = vi.spyOn(scene as any, 'updateTank');

    scene.update(0, 1000);

    expect(updateTank.mock.calls.some(call => call[0] === owner)).toBe(false);
    expect(updateTank.mock.calls.some(call => call[0] === target)).toBe(false);
    expect(owner.alive).toBe(true);
    expect(target.alive).toBe(false);
    expect((scene as any).deathRayBeams).toHaveLength(1);
  });

  it('cleans Death Ray charge and beam state on match restart', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const graphics = { destroy: vi.fn() };
    (scene as any).deathRayCharges.set(0, { state: { elapsed: 0, fired: false }, origin: { x: 0, y: 0 }, direction: { x: 1, y: 0 } });
    (scene as any).deathRayBeams = [{ graphics, remaining: 1 }];

    scene.restartMatch();

    expect((scene as any).deathRayCharges.size).toBe(0);
    expect(graphics.destroy).toHaveBeenCalledOnce();
    expect((scene as any).deathRayBeams).toEqual([]);
  });

  it('cancels a Death Ray charge when its owner is eliminated', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 3 });
    const owner = (scene as any).tanks[0];
    owner.heldPowerUp = 'DeathRay';
    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
    (scene as any).roundState = 'PLAYING';

    (scene as any).eliminatePlayers([0]);

    expect((scene as any).deathRayCharges.has(0)).toBe(false);
  });

  it('launches an RC Missile from unified weapon input', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const tank = (scene as any).tanks[0];
    tank.heldPowerUp = 'RCMissile';

    (scene as any).handleWeaponInput(tank, { shoot: true, usePowerUp: false }, 0);

    expect((scene as any).rcMissiles).toHaveLength(1);
    expect((scene as any).rcMissiles[0].ownerId).toBe(0);
  });

  it('locks the owner tank and steers its active RC Missile', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const owner = (scene as any).tanks[0];
    owner.heldPowerUp = 'RCMissile';
    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
    (scene as any).roundState = 'PLAYING';
    mockPlayer1Input.rotateRight = true;
    const updateTank = vi.spyOn(scene as any, 'updateTank');

    scene.update(0, 16);

    expect((scene as any).rcMissiles[0].update).toHaveBeenCalledWith(expect.any(Number), 1);
    expect(updateTank.mock.calls.some(call => call[0] === owner)).toBe(false);
  });

  it('cleans active RC Missiles on restart', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const owner = (scene as any).tanks[0];
    owner.heldPowerUp = 'RCMissile';
    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
    const missile = (scene as any).rcMissiles[0];

    scene.restartMatch();

    expect(missile.destroy).toHaveBeenCalledOnce();
    expect((scene as any).rcMissiles).toEqual([]);
  });

  it('destroys an active RC Missile when its owner is eliminated', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 3 });
    const owner = (scene as any).tanks[0];
    owner.heldPowerUp = 'RCMissile';
    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
    const missile = (scene as any).rcMissiles[0];
    (scene as any).roundState = 'PLAYING';

    (scene as any).eliminatePlayers([0]);

    expect(missile.destroy).toHaveBeenCalledOnce();
    expect((scene as any).rcMissiles).toEqual([]);
  });

  it('allows an already-sampled counterattack before RC Missile elimination resolves', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const [owner, target] = (scene as any).tanks;
    owner.heldPowerUp = 'RCMissile';
    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
    const missile = (scene as any).rcMissiles[0];
    missile.isOwnerSafe.mockReturnValue(true);
    target.heldPowerUp = 'Laser';
    mockPlayer2Input.shoot = true;
    vi.mocked(circleCircleOverlap).mockReturnValue(true);
    (scene as any).roundState = 'PLAYING';
    const active = vi.spyOn(scene as any, 'handleUsePowerUp');

    scene.update(0, 16);

    expect(active).toHaveBeenCalledWith(target, true, 'Laser');
    expect(target.alive).toBe(false);
  });

  it('reflects both axes once at a wall corner and suppresses overlap repeats', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const owner = (scene as any).tanks[0];
    owner.heldPowerUp = 'RCMissile';
    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
    const missile = (scene as any).rcMissiles[0];
    (scene as any).wallData = [
      { x: 0, y: 0, width: 10, height: 100, orientation: 'vertical' },
      { x: 0, y: 0, width: 100, height: 10, orientation: 'horizontal' },
    ];
    vi.mocked(circleRectOverlap).mockReturnValue(true);
    (scene as any).roundState = 'PLAYING';

    scene.update(0, 16);
    scene.update(0, 16);

    expect(missile.reflect).toHaveBeenCalledTimes(1);
    expect(missile.reflect).toHaveBeenCalledWith(['vertical', 'horizontal']);
  });

  it('allows an RC Missile to hit its owner after launch safety', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const owner = (scene as any).tanks[0];
    owner.heldPowerUp = 'RCMissile';
    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
    (scene as any).rcMissiles[0].isOwnerSafe.mockReturnValue(false);
    vi.mocked(circleCircleOverlap).mockReturnValue(true);
    (scene as any).roundState = 'PLAYING';

    scene.update(0, 16);

    expect(owner.alive).toBe(false);
  });

  it('consumes a shield instead of eliminating an RC Missile target', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const [owner, target] = (scene as any).tanks;
    owner.heldPowerUp = 'RCMissile';
    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
    (scene as any).rcMissiles[0].isOwnerSafe.mockReturnValue(true);
    target.shieldActive = true;
    vi.mocked(circleCircleOverlap).mockReturnValue(true);
    (scene as any).roundState = 'PLAYING';

    scene.update(0, 16);

    expect(target.shieldActive).toBe(false);
    expect(target.alive).toBe(true);
  });

  it('launches and consumes a Frag Bomb from primary or legacy active input', () => {
    for (const input of [
      { shoot: true, usePowerUp: false },
      { shoot: false, usePowerUp: true },
    ]) {
      const scene = new GameScene();
      (scene as any).create({ mode: 'local', localPlayers: 2 });
      const owner = (scene as any).tanks[0];
      owner.heldPowerUp = 'FragBomb';

      (scene as any).handleWeaponInput(owner, input, 0);

      expect((scene as any).fragBombs).toHaveLength(1);
      expect((scene as any).fragBombs[0].ownerId).toBe(0);
      expect(owner.heldPowerUp).toBeNull();
    }
  });

  it('launches a Frag Bomb clear of its owner while preserving return self-damage', async () => {
    const actualMath = await vi.importActual<typeof import('../../src/utils/math')>('../../src/utils/math');
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const owner = (scene as any).tanks[0];
    owner.heldPowerUp = 'FragBomb';
    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
    const bomb = (scene as any).fragBombs[0];

    expect(actualMath.circleCircleOverlap(bomb.x, bomb.y, FRAG_BOMB_RADIUS, owner.x, owner.y, owner.radius)).toBe(false);
    bomb.update(0.016);
    expect(actualMath.circleCircleOverlap(bomb.x, bomb.y, FRAG_BOMB_RADIUS, owner.x, owner.y, owner.radius)).toBe(false);

    bomb.x = owner.x + owner.radius + FRAG_BOMB_RADIUS - 0.1;
    bomb.y = owner.y;
    const actualCollision = await vi.importActual<typeof import('../../src/systems/Collision')>('../../src/systems/Collision');
    vi.mocked(sweptCircleCircleTOI).mockImplementation(actualCollision.sweptCircleCircleTOI);
    (scene as any).updateFragBombs(0, new Set());

    expect(bomb.active).toBe(false);
    expect((scene as any).fragFragments).toHaveLength(12);
  });

  it('detonates the active Frag Bomb on second primary input without firing a bullet', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const owner = (scene as any).tanks[0];
    owner.heldPowerUp = 'FragBomb';
    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
    const standard = vi.spyOn(scene as any, 'handleShoot');

    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 1);

    expect(standard).not.toHaveBeenCalled();
    expect((scene as any).fragBombs).toEqual([]);
    expect((scene as any).fragFragments).toHaveLength(12);
    expect(Math.hypot((scene as any).fragFragments[0].vx, (scene as any).fragFragments[0].vy)).toBeCloseTo(320);
  });

  it('keeps the frame-start Frag Bomb detonation command when the bomb auto-detonates during update', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const owner = (scene as any).tanks[0];
    owner.heldPowerUp = 'FragBomb';
    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
    owner.heldPowerUp = 'Rocket';
    mockPlayer1Input.shoot = true;
    (scene as any).wallData = [{ x: 0, y: 0, width: 10, height: 10, orientation: 'vertical' }];
    vi.mocked(circleRectOverlap).mockReturnValueOnce(true).mockReturnValue(false);
    const standard = vi.spyOn(scene as any, 'handleShoot');
    const active = vi.spyOn(scene as any, 'handleUsePowerUp');
    (scene as any).roundState = 'PLAYING';

    scene.update(0, 16);

    expect(standard).not.toHaveBeenCalled();
    expect(active).not.toHaveBeenCalled();
    expect(owner.heldPowerUp).toBe('Rocket');
  });

  it.each(['wall', 'tank', 'timeout'])('detonates a Frag Bomb on %s', trigger => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const owner = (scene as any).tanks[0];
    owner.heldPowerUp = 'FragBomb';
    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
    if (trigger === 'wall') {
      (scene as any).wallData = [{ x: 0, y: 0, width: 10, height: 10, orientation: 'vertical' }];
      vi.mocked(sweptCircleRectTOI).mockReturnValueOnce(0).mockReturnValue(null);
    } else if (trigger === 'tank') {
      vi.mocked(sweptCircleCircleTOI).mockReturnValueOnce(0).mockReturnValue(null);
    } else {
      (scene as any).fragBombs[0].age = 4;
    }

    (scene as any).updateFragBombs(0, new Set());

    expect((scene as any).fragBombs).toEqual([]);
    expect((scene as any).fragFragments).toHaveLength(12);
  });

  it('destroys fragments on walls without reflecting them', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const owner = (scene as any).tanks[0];
    owner.heldPowerUp = 'FragBomb';
    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
    (scene as any).detonateFragBomb((scene as any).fragBombs[0]);
    const fragment = (scene as any).fragFragments[0];
    (scene as any).wallData = [{ x: 0, y: 0, width: 10, height: 10, orientation: 'vertical' }];
    vi.mocked(sweptCircleRectTOI).mockReturnValue(0);

    (scene as any).updateFragBombs(0, new Set());

    expect(fragment.destroy).toHaveBeenCalledOnce();
    expect((scene as any).fragFragments).not.toContain(fragment);
  });

  it('sweeps a fragment across a thin wall at MAX_DT without tunneling', async () => {
    const actualCollision = await vi.importActual<typeof import('../../src/systems/Collision')>('../../src/systems/Collision');
    vi.mocked(sweptCircleRectTOI).mockImplementation(actualCollision.sweptCircleRectTOI);
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const fragment = new (await vi.importMock<typeof import('../../src/objects/FragBomb')>('../../src/objects/FragBomb')).FragFragment(
      scene as any, 80, 50, 320, 0, 0,
    );
    (scene as any).fragFragments = [fragment];
    (scene as any).wallData = [{ x: 83, y: 0, width: 10, height: 100, orientation: 'vertical' }];

    (scene as any).updateFragBombs(MAX_DT, new Set());

    expect(fragment.x).toBe(96);
    expect(fragment.active).toBe(false);
    expect((scene as any).fragFragments).toEqual([]);
  });

  it('detonates a tangentially crossing bomb on a tank at MAX_DT', async () => {
    const collision = await vi.importActual<typeof import('../../src/systems/Collision')>('../../src/systems/Collision');
    vi.mocked(sweptCircleCircleTOI).mockImplementation(collision.sweptCircleCircleTOI);
    vi.mocked(sweptCircleRectTOI).mockImplementation(collision.sweptCircleRectTOI);
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const target = (scene as any).tanks[1];
    target.x = 58;
    target.y = 100;
    const { FragBomb } = await vi.importMock<typeof import('../../src/objects/FragBomb')>('../../src/objects/FragBomb');
    const bomb = new FragBomb(scene as any, 50, 100 + target.radius + FRAG_BOMB_RADIUS, 320, 0, 0);
    (scene as any).fragBombs = [bomb];

    (scene as any).updateFragBombs(MAX_DT, new Set());

    expect(bomb.active).toBe(false);
    expect((scene as any).fragFragments).toHaveLength(12);
  });

  it('damages a tank on a tangential fragment crossing at MAX_DT', async () => {
    const collision = await vi.importActual<typeof import('../../src/systems/Collision')>('../../src/systems/Collision');
    vi.mocked(sweptCircleCircleTOI).mockImplementation(collision.sweptCircleCircleTOI);
    vi.mocked(sweptCircleRectTOI).mockImplementation(collision.sweptCircleRectTOI);
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const target = (scene as any).tanks[1];
    target.x = 58;
    target.y = 100;
    const { FragFragment } = await vi.importMock<typeof import('../../src/objects/FragBomb')>('../../src/objects/FragBomb');
    const fragment = new FragFragment(scene as any, 50, 100 + target.radius + 2, 320, 0, 0);
    (scene as any).fragFragments = [fragment];
    const eliminated = new Set<number>();

    (scene as any).updateFragBombs(MAX_DT, eliminated);

    expect(fragment.active).toBe(false);
    expect(eliminated).toContain(target.playerId);
  });

  it('resolves a tank before a later wall on the same fragment path', async () => {
    const collision = await vi.importActual<typeof import('../../src/systems/Collision')>('../../src/systems/Collision');
    vi.mocked(sweptCircleCircleTOI).mockImplementation(collision.sweptCircleCircleTOI);
    vi.mocked(sweptCircleRectTOI).mockImplementation(collision.sweptCircleRectTOI);
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const target = (scene as any).tanks[1];
    target.x = 55;
    target.y = 100;
    const { FragFragment } = await vi.importMock<typeof import('../../src/objects/FragBomb')>('../../src/objects/FragBomb');
    const fragment = new FragFragment(scene as any, 30, 100, 640, 0, 0);
    (scene as any).fragFragments = [fragment];
    (scene as any).wallData = [{ x: 60, y: 50, width: 10, height: 100, orientation: 'vertical' }];
    const eliminated = new Set<number>();

    (scene as any).updateFragBombs(MAX_DT, eliminated);

    expect(eliminated).toContain(target.playerId);
  });

  it('gives a tank priority when tank and wall have the same TOI', async () => {
    const collision = await vi.importActual<typeof import('../../src/systems/Collision')>('../../src/systems/Collision');
    vi.mocked(sweptCircleCircleTOI).mockImplementation(collision.sweptCircleCircleTOI);
    vi.mocked(sweptCircleRectTOI).mockImplementation(collision.sweptCircleRectTOI);
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const target = (scene as any).tanks[1];
    target.x = 76;
    target.y = 100;
    const { FragFragment } = await vi.importMock<typeof import('../../src/objects/FragBomb')>('../../src/objects/FragBomb');
    (scene as any).fragFragments = [new FragFragment(scene as any, 30, 100, 640, 0, 0)];
    (scene as any).wallData = [{ x: 60, y: 50, width: 10, height: 100, orientation: 'vertical' }];
    const eliminated = new Set<number>();

    (scene as any).updateFragBombs(MAX_DT, eliminated);

    expect(eliminated).toContain(target.playerId);
  });

  it('detonates a wall-crossing bomb outside the wall so only wallward fragments are destroyed next frame', async () => {
    const actualCollision = await vi.importActual<typeof import('../../src/systems/Collision')>('../../src/systems/Collision');
    vi.mocked(sweptCircleRectTOI).mockImplementation(actualCollision.sweptCircleRectTOI);
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const bombModule = await vi.importMock<typeof import('../../src/objects/FragBomb')>('../../src/objects/FragBomb');
    const bomb = new bombModule.FragBomb(scene as any, 70, 50, 320, 0, 0);
    (scene as any).fragBombs = [bomb];
    (scene as any).wallData = [{ x: 83, y: 0, width: 10, height: 100, orientation: 'vertical' }];

    (scene as any).updateFragBombs(MAX_DT, new Set());

    expect(bomb.active).toBe(false);
    expect((scene as any).fragFragments.every((fragment: any) => fragment.x > 70 && fragment.x < 77 && fragment.y === 50)).toBe(true);

    (scene as any).updateFragBombs(MAX_DT, new Set());

    const outward = (scene as any).fragFragments.find((fragment: any) => fragment.vx < -300 && Math.abs(fragment.vy) < 0.001);
    const wallward = (scene as any).fragFragments.find((fragment: any) => fragment.vx > 300 && Math.abs(fragment.vy) < 0.001);
    expect(outward?.active).toBe(true);
    expect(wallward).toBeUndefined();
  });

  it('destroys a Frag Bomb fragment that leaves the arena bounds', async () => {
    const fragmentModule = await vi.importMock<typeof import('../../src/objects/FragBomb')>('../../src/objects/FragBomb');
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const fragment = new fragmentModule.FragFragment(scene as any, 799, 300, 320, 0, 0);
    (scene as any).fragFragments = [fragment];

    (scene as any).updateFragBombs(MAX_DT, new Set());

    expect(fragment.active).toBe(false);
    expect((scene as any).fragFragments).toEqual([]);
  });

  it('lets Frag Bomb fragments damage the owner and consume shields', async () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const [owner, target] = (scene as any).tanks;
    owner.heldPowerUp = 'FragBomb';
    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
    (scene as any).detonateFragBomb((scene as any).fragBombs[0]);
    target.shieldActive = true;
    const collision = await vi.importActual<typeof import('../../src/systems/Collision')>('../../src/systems/Collision');
    vi.mocked(sweptCircleCircleTOI).mockImplementation(collision.sweptCircleCircleTOI);
    const { FragFragment } = await vi.importMock<typeof import('../../src/objects/FragBomb')>('../../src/objects/FragBomb');
    (scene as any).fragFragments = [
      new FragFragment(scene as any, owner.x, owner.y, 0, 0, owner.playerId),
      new FragFragment(scene as any, target.x, target.y, 0, 0, owner.playerId),
    ];
    const eliminated = new Set<number>();

    (scene as any).updateFragBombs(0, eliminated);

    expect(eliminated).toContain(owner.playerId);
    expect(target.shieldActive).toBe(false);
    expect(eliminated).not.toContain(target.playerId);
  });

  it('aggregates simultaneous Frag Bomb fragment eliminations before round resolution', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 2 });
    const [owner, target] = (scene as any).tanks;
    owner.heldPowerUp = 'FragBomb';
    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
    (scene as any).detonateFragBomb((scene as any).fragBombs[0]);
    vi.mocked(sweptCircleCircleTOI)
      .mockReturnValueOnce(null).mockReturnValueOnce(0)
      .mockReturnValueOnce(0);
    (scene as any).roundState = 'PLAYING';

    scene.update(0, 0);

    expect(owner.alive).toBe(false);
    expect(target.alive).toBe(false);
    expect((scene as any).statusText.setText).toHaveBeenCalledWith('DRAW!');
  });

  it('cleans Frag Bombs and fragments on restart, shutdown, round over, and owner elimination', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 3 });
    const owner = (scene as any).tanks[0];
    owner.heldPowerUp = 'FragBomb';
    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
    const bomb = (scene as any).fragBombs[0];
    (scene as any).fragFragments.push({ active: true, destroy: vi.fn(function (this: any) { this.active = false; }) });
    const fragment = (scene as any).fragFragments[0];
    (scene as any).roundState = 'PLAYING';

    (scene as any).eliminatePlayers([0, 1]);
    expect(bomb.destroy).toHaveBeenCalledOnce();
    expect(fragment.destroy).toHaveBeenCalledOnce();

    const restartFragment = { active: true, destroy: vi.fn(function (this: any) { this.active = false; }) };
    (scene as any).fragFragments.push(restartFragment);
    scene.restartMatch();
    expect(restartFragment.destroy).toHaveBeenCalledOnce();
    expect((scene as any).fragBombs).toEqual([]);
    expect((scene as any).fragFragments).toEqual([]);

    const restartedOwner = (scene as any).tanks[0];
    restartedOwner.heldPowerUp = 'FragBomb';
    (scene as any).handleWeaponInput(restartedOwner, { shoot: true, usePowerUp: false }, 0);
    const shutdownBomb = (scene as any).fragBombs[0];
    (scene as any).clearAsyncTasks();
    expect(shutdownBomb.destroy).toHaveBeenCalledOnce();
  });

  it('destroys only the eliminated owner Frag Bomb fragments before round over', () => {
    const scene = new GameScene();
    (scene as any).create({ mode: 'local', localPlayers: 3 });
    const [owner, , survivor] = (scene as any).tanks;
    owner.heldPowerUp = 'FragBomb';
    (scene as any).handleWeaponInput(owner, { shoot: true, usePowerUp: false }, 0);
    (scene as any).detonateFragBomb((scene as any).fragBombs[0]);
    survivor.heldPowerUp = 'FragBomb';
    (scene as any).handleWeaponInput(survivor, { shoot: true, usePowerUp: false }, 0);
    (scene as any).detonateFragBomb((scene as any).fragBombs[0]);
    const ownerFragments = (scene as any).fragFragments.filter((fragment: any) => fragment.ownerId === owner.playerId);
    const survivorFragments = (scene as any).fragFragments.filter((fragment: any) => fragment.ownerId === survivor.playerId);
    (scene as any).roundState = 'PLAYING';

    (scene as any).eliminatePlayers([owner.playerId]);

    expect((scene as any).roundState).toBe('PLAYING');
    expect(ownerFragments.every((fragment: any) => !fragment.active)).toBe(true);
    expect(survivorFragments.every((fragment: any) => fragment.active)).toBe(true);
    expect((scene as any).fragFragments).toEqual(survivorFragments);
  });
});
