import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIController } from '../../src/systems/AIController';
import { AIStateType } from '../../src/enums/AIState';
import { PowerUpType } from '../../src/enums/PowerUpType';

function makeTank(overrides: Record<string, any> = {}): any {
  return {
    x: 100,
    y: 100,
    rotation: 0,
    alive: true,
    ammo: 10,
    shootCooldown: 0,
    shieldActive: false,
    heldPowerUp: null,
    playerId: 0,
    passiveEffects: new Set(),
    passiveTimers: new Map(),
    radius: 16,
    ...overrides,
  };
}

function makeBullet(overrides: Record<string, any> = {}): any {
  return {
    x: 300,
    y: 100,
    vx: -300,
    vy: 0,
    active: true,
    ownerId: 1,
    bounceCount: 0,
    lifeTime: 0,
    spawnTime: 0,
    wallCooldowns: new Map(),
    ...overrides,
  };
}

describe('AIController', () => {
  let ai: AIController;
  let tank: any;
  let enemy: any;

  beforeEach(() => {
    tank = makeTank({ x: 100, y: 100, rotation: 0, playerId: 0 });
    enemy = makeTank({ x: 400, y: 100, rotation: Math.PI, playerId: 1 });
    ai = new AIController(tank, enemy, 'medium');
  });

  describe('getInput', () => {
    it('returns valid PlayerInput', () => {
      ai.setWorldState([], [], [], 800, 600);
      const result = ai.getInput(16, 0);
      expect(result).toHaveProperty('forward');
      expect(result).toHaveProperty('backward');
      expect(result).toHaveProperty('rotateLeft');
      expect(result).toHaveProperty('rotateRight');
      expect(result).toHaveProperty('shoot');
      expect(result).toHaveProperty('usePowerUp');
    });

    it('all fields are booleans', () => {
      ai.setWorldState([], [], [], 800, 600);
      const result = ai.getInput(16, 0);
      for (const key of ['forward', 'backward', 'rotateLeft', 'rotateRight', 'shoot', 'usePowerUp'] as const) {
        expect(typeof result[key]).toBe('boolean');
      }
    });
  });

  describe('setWorldState', () => {
    it('accepts walls parameter', () => {
      const walls = [
        { x: 50, y: 0, width: 10, height: 100, orientation: 'vertical' },
      ];
      ai.setWorldState([], [], walls, 800, 600);
      const result = ai.getInput(16, 0);
      expect(typeof result.forward).toBe('boolean');
    });
  });

  describe('state transitions', () => {
    it('transitions to Dodge when bullet incoming', () => {
      const bullet = makeBullet({ x: 200, y: 100, vx: -300, vy: 0, ownerId: 1 });
      ai.setWorldState([bullet], [], [], 800, 600);

      for (let i = 0; i < 30; i++) {
        ai.getInput(16, i * 16);
      }

      const result = ai.getInput(16, 500);
      expect(result.shoot).toBe(false);
    });

    it('uses wall-aware pathfinding in Chase', () => {
      const walls = [
        { x: 180, y: 50, width: 10, height: 100, orientation: 'vertical' },
      ];
      ai.setWorldState([], [], walls, 800, 600);

      for (let i = 0; i < 30; i++) {
        ai.getInput(16, i * 16);
      }

      const result = ai.getInput(16, 500);
      expect(result.forward).toBe(true);
    });

    it('does not shoot through walls', () => {
      const walls = [
        { x: 180, y: 50, width: 10, height: 100, orientation: 'vertical' },
      ];
      tank.rotation = 0;
      enemy.x = 400;
      enemy.y = 100;
      ai.setWorldState([], [], walls, 800, 600);

      for (let i = 0; i < 30; i++) {
        ai.getInput(16, i * 16);
      }

      const result = ai.getInput(16, 500);
      expect(result.shoot).toBe(false);
    });
  });

  describe('anti-stuck', () => {
    it('activates escape when stuck', () => {
      ai.setWorldState([], [], [], 800, 600);

      let foundEscape = false;
      for (let i = 0; i < 160; i++) {
        const result = ai.getInput(16, i * 16);
        if (result.backward && (result.rotateLeft || result.rotateRight)) {
          foundEscape = true;
          break;
        }
      }
      expect(foundEscape).toBe(true);
    });
  });
});
