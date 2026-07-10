import { PlayerInput } from './InputManager';
import { Tank } from '../objects/Tank';
import { AIStateType, AI_DIFFICULTY_CONFIGS, type AIInput, type AIOutput, type AIState, type AIDifficultyConfig } from '../enums/AIState';
import { normalizeAngle, angleDiff, dist, hasLineOfSight } from '../utils/geometry';
import { PatrolState } from './states/PatrolState';
import { ChaseState } from './states/ChaseState';
import { AttackState } from './states/AttackState';
import { DodgeState } from './states/DodgeState';
import { CollectState } from './states/CollectState';

interface InternalConfig extends AIDifficultyConfig {
  decisionInterval: number;
}

const DIFFICULTY: Record<string, InternalConfig> = {
  easy:   { ...AI_DIFFICULTY_CONFIGS.easy,   decisionInterval: 0.5 },
  medium: { ...AI_DIFFICULTY_CONFIGS.medium, decisionInterval: 0.3 },
  hard:   { ...AI_DIFFICULTY_CONFIGS.hard,   decisionInterval: 0.15 },
};

const POWERUP_SCAN_RANGE = 400;

export class AIController {
  private tank: Tank;
  private enemy: Tank;
  private config: InternalConfig;

  // State machine
  private states: Map<AIStateType, AIState>;
  private currentState: AIState;

  // Debug info
  public debugTarget: { x: number; y: number } | null = null;
  public debugState: string = 'PATROL';
  public debugWaypoints: { x: number; y: number }[] = [];

  // Timers
  private reactionTimer: number = 0;
  private decisionTimer: number = 0;

  // Anti-stuck
  private lastPosition: { x: number; y: number } = { x: 0, y: 0 };
  private stuckTimer: number = 0;
  private stuckChecks: number = 0;
  private positionSampleTimer: number = 0;
  private stuckEscapeDir: boolean = false;

  // World data
  private bullets: any[] = [];
  private powerUps: any[] = [];
  private walls: any[] = [];
  private gameWidth: number = 800;
  private gameHeight: number = 600;

  constructor(tank: Tank, enemy: Tank, difficulty: string) {
    this.tank = tank;
    this.enemy = enemy;
    this.config = DIFFICULTY[difficulty] ?? DIFFICULTY.medium;

    this.states = new Map<AIStateType, AIState>([
      [AIStateType.PATROL, new PatrolState()],
      [AIStateType.CHASE, new ChaseState(this.config)],
      [AIStateType.ATTACK, new AttackState(this.config, tank.playerId)],
      [AIStateType.DODGE, new DodgeState(tank.playerId)],
      [AIStateType.COLLECT, new CollectState()],
    ]);

    this.currentState = this.states.get(AIStateType.PATROL)!;
    this.currentState.enter();
    this.lastPosition = { x: tank.x, y: tank.y };
  }

  setWorldState(
    bullets: any[],
    powerUps: any[],
    walls: any[],
    gameWidth: number,
    gameHeight: number,
  ): void {
    this.bullets = bullets;
    this.powerUps = powerUps;
    this.walls = walls;
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
  }

  getInput(delta: number, time: number): PlayerInput {
    const dt = delta / 1000;

    // Build sensory input
    const aiInput = this.buildAIInput();

    // Update reaction timer
    this.reactionTimer = Math.max(0, this.reactionTimer - dt);

    // Anti-stuck detection
    this.updateAntiStuck(dt);

    // Evaluate state transitions
    this.decisionTimer -= dt;
    if (this.decisionTimer <= 0) {
      this.decisionTimer = this.config.decisionInterval;
      const nextState = this.evaluateTransition(aiInput);
      if (nextState !== this.currentState.type) {
        this.currentState.exit();
        this.currentState = this.states.get(nextState)!;
        this.currentState.enter();
      }
    }

    // Execute current state
    const output = this.currentState.execute(aiInput, dt);

    // Update debug info
    this.debugState = this.currentState.type;
    this.updateDebugTarget(output, aiInput);

    // Collect waypoints from states that support it
    this.debugWaypoints = [];
    if ('debugWaypoints' in this.currentState && Array.isArray((this.currentState as any).debugWaypoints)) {
      this.debugWaypoints = (this.currentState as any).debugWaypoints;
    }

    // Override if stuck
    if (this.stuckTimer > 1.0) {
      return this.getStuckEscapeOutput(dt);
    }

    return output;
  }

  /**
   * Compute the debug target point based on the current output.
   * This shows where the AI is trying to go.
   */
  private updateDebugTarget(output: PlayerInput, input: AIInput): void {
    const { selfPosition } = input;
    const debugDist = 100;

    // Compute the movement angle based on output
    let moveAngle = input.selfRotation;

    if (output.rotateLeft && !output.rotateRight) {
      moveAngle -= Math.PI / 8;
    } else if (output.rotateRight && !output.rotateLeft) {
      moveAngle += Math.PI / 8;
    }

    if (output.backward && !output.forward) {
      moveAngle += Math.PI; // reverse direction
    }

    this.debugTarget = {
      x: selfPosition.x + Math.cos(moveAngle) * debugDist,
      y: selfPosition.y + Math.sin(moveAngle) * debugDist,
    };

    // For specific states, show the actual target
    if (this.currentState.type === AIStateType.CHASE && input.enemyPosition) {
      // Show enemy position as target
      this.debugTarget = { x: input.enemyPosition.x, y: input.enemyPosition.y };
    } else if (this.currentState.type === AIStateType.ATTACK && input.enemyPosition) {
      this.debugTarget = { x: input.enemyPosition.x, y: input.enemyPosition.y };
    } else if (this.currentState.type === AIStateType.COLLECT) {
      const pu = this.findNearestPowerUp(input);
      if (pu) {
        this.debugTarget = { x: pu.x, y: pu.y };
      }
    }
  }

  private buildAIInput(): AIInput {
    const myX = this.tank.x;
    const myY = this.tank.y;
    const enemyX = this.enemy.x;
    const enemyY = this.enemy.y;

    return {
      selfPosition: { x: myX, y: myY },
      selfRotation: this.tank.rotation,
      enemyPosition: this.enemy.alive ? { x: enemyX, y: enemyY } : null,
      enemyRotation: this.enemy.rotation,
      bullets: this.bullets.filter(b => b.active).map(b => ({
        x: b.x, y: b.y, vx: b.vx, vy: b.vy, ownerId: b.ownerId,
      })),
      powerUps: this.powerUps.filter(p => p.active).map(p => ({
        x: p.x, y: p.y, type: p.type,
      })),
      walls: this.walls,
      ammo: this.tank.ammo,
      heldPowerUp: this.tank.heldPowerUp,
    };
  }

  private evaluateTransition(input: AIInput): AIStateType {
    // Dodge: incoming bullet
    if (input.bullets.some(b => {
      if (b.ownerId === this.tank.playerId) return false;
      const d = dist(b.x, b.y, input.selfPosition.x, input.selfPosition.y);
      if (d > this.config.bulletDetectionDistance) return false;
      const angleToSelf = Math.atan2(input.selfPosition.y - b.y, input.selfPosition.x - b.x);
      const bulletAngle = Math.atan2(b.vy, b.vx);
      return Math.abs(normalizeAngle(angleToSelf - bulletAngle)) < 0.6;
    }) && this.reactionTimer <= 0) {
      return AIStateType.DODGE;
    }

    // Attack: enemy visible, aim aligned, line of sight clear
    if (input.enemyPosition) {
      const aimAngle = Math.atan2(
        input.enemyPosition.y - input.selfPosition.y,
        input.enemyPosition.x - input.selfPosition.x,
      );
      const aimDiff = Math.abs(angleDiff(input.selfRotation, aimAngle));
      const canSee = hasLineOfSight(input.selfPosition, input.enemyPosition, input.walls);

      if (aimDiff < this.config.accuracyOffset && canSee) {
        return AIStateType.ATTACK;
      }
    }

    // Collect: power-up nearby
    const nearestPU = this.findNearestPowerUp(input);
    if (nearestPU && !input.heldPowerUp) {
      return AIStateType.COLLECT;
    }

    // Chase: enemy alive
    if (input.enemyPosition) {
      return AIStateType.CHASE;
    }

    // Patrol: default
    return AIStateType.PATROL;
  }

  private findNearestPowerUp(input: AIInput): { x: number; y: number; type: string } | null {
    let best: { x: number; y: number; type: string } | null = null;
    let bestDist = POWERUP_SCAN_RANGE;

    for (const pu of input.powerUps) {
      const d = dist(pu.x, pu.y, input.selfPosition.x, input.selfPosition.y);
      if (d < bestDist) {
        bestDist = d;
        best = pu;
      }
    }
    return best;
  }

  private updateAntiStuck(dt: number): void {
    this.positionSampleTimer += dt;
    if (this.positionSampleTimer < 1.0) return;
    this.positionSampleTimer = 0;

    const displacement = dist(this.lastPosition.x, this.lastPosition.y, this.tank.x, this.tank.y);
    if (displacement < 5) {
      this.stuckChecks++;
    } else {
      this.stuckChecks = 0;
    }

    if (this.stuckChecks >= 2) {
      this.stuckTimer = 1.5;
      this.stuckChecks = 0;
      this.stuckEscapeDir = Math.random() > 0.5;
    }

    this.lastPosition = { x: this.tank.x, y: this.tank.y };
  }

  private getStuckEscapeOutput(dt: number): PlayerInput {
    this.stuckTimer -= dt;
    const rotateLeft = !this.stuckEscapeDir;
    return {
      forward: false,
      backward: true,
      rotateLeft,
      rotateRight: !rotateLeft,
      shoot: false,
      usePowerUp: false,
    };
  }
}
