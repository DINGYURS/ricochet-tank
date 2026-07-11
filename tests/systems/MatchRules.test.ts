import { describe, expect, it } from 'vitest';
import { evaluateRound } from '../../src/systems/MatchRules';

describe('evaluateRound', () => {
  it('continues while two or more players remain alive', () => {
    expect(evaluateRound([0, 1, 2])).toEqual({ roundOver: false, winnerId: null, draw: false });
    expect(evaluateRound([1, 2])).toEqual({ roundOver: false, winnerId: null, draw: false });
  });

  it('ends with the sole survivor as winner', () => {
    expect(evaluateRound([2])).toEqual({ roundOver: true, winnerId: 2, draw: false });
  });

  it('ends in a draw when no players survive', () => {
    expect(evaluateRound([])).toEqual({ roundOver: true, winnerId: null, draw: true });
  });
});
