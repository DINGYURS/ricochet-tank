export interface RoundEvaluation {
  roundOver: boolean;
  winnerId: number | null;
  draw: boolean;
}

export function evaluateRound(alivePlayerIds: number[]): RoundEvaluation {
  const uniqueAlivePlayerIds = [...new Set(alivePlayerIds)];
  if (uniqueAlivePlayerIds.length > 1) {
    return { roundOver: false, winnerId: null, draw: false };
  }
  if (uniqueAlivePlayerIds.length === 1) {
    return { roundOver: true, winnerId: uniqueAlivePlayerIds[0], draw: false };
  }
  return { roundOver: true, winnerId: null, draw: true };
}
