import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SoundManager } from '../../src/systems/SoundManager';

// Mock AudioContext
const mockOscillator = {
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  type: '',
};

const mockGain = {
  connect: vi.fn(),
  gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
};

const mockBufferSource = {
  connect: vi.fn(),
  start: vi.fn(),
  buffer: null,
};

const mockCtx = {
  currentTime: 0,
  state: 'running',
  resume: vi.fn(),
  createOscillator: vi.fn(() => ({ ...mockOscillator, frequency: { ...mockOscillator.frequency } })),
  createGain: vi.fn(() => ({ ...mockGain, gain: { ...mockGain.gain } })),
  createBuffer: vi.fn(() => ({ getChannelData: () => new Float32Array(100) })),
  createBufferSource: vi.fn(() => ({ ...mockBufferSource })),
  destination: {},
  sampleRate: 44100,
};

describe('SoundManager', () => {
  let manager: SoundManager;

  beforeEach(() => {
    vi.stubGlobal('AudioContext', function () {
      return mockCtx;
    } as unknown as typeof AudioContext);
    manager = new SoundManager();
    vi.clearAllMocks();
  });

  it('creates oscillator on shoot', () => {
    manager.shoot();
    expect(mockCtx.createOscillator).toHaveBeenCalled();
  });

  it('creates buffer source on explosion', () => {
    manager.explosion();
    expect(mockCtx.createBufferSource).toHaveBeenCalled();
  });

  it('creates oscillator on bounce', () => {
    manager.bounce();
    expect(mockCtx.createOscillator).toHaveBeenCalled();
  });

  it('creates oscillator on countdownTick', () => {
    manager.countdownTick();
    expect(mockCtx.createOscillator).toHaveBeenCalled();
  });

  it('creates 3 oscillators on victory', () => {
    manager.victory();
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3);
  });
});
