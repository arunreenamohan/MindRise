import {
  LevelConfig,
  RoundResult,
  QuickReactionSessionStats,
  QuickReactionState,
  QuickReactionAction,
  QuickReactionPhase,
} from './types';

export const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  1: { level: 1, minWaitMs: 1200, maxWaitMs: 3000, timeoutDurationMs: 2000 },
  2: { level: 2, minWaitMs: 1100, maxWaitMs: 2800, timeoutDurationMs: 1900 },
  3: { level: 3, minWaitMs: 1000, maxWaitMs: 2600, timeoutDurationMs: 1800 },
  4: { level: 4, minWaitMs: 900, maxWaitMs: 2400, timeoutDurationMs: 1700 },
  5: { level: 5, minWaitMs: 800, maxWaitMs: 2200, timeoutDurationMs: 1600 },
  6: { level: 6, minWaitMs: 750, maxWaitMs: 2000, timeoutDurationMs: 1500 },
};

export const MAX_LEVEL = 6;
export const TOTAL_ROUNDS = 10;
export const SPEED_BONUS_BENCHMARK_MS = 500;
export const MAX_SPEED_BONUS_POINTS = 250;
export const BASE_ROUND_POINTS = 100;

export function getQuickReactionLevelConfig(level: number): LevelConfig {
  const boundedLevel = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level) || 1));
  return LEVEL_CONFIGS[boundedLevel] || LEVEL_CONFIGS[1];
}

export function getRandomWaitDuration(
  minMs: number,
  maxMs: number,
  randomFn: () => number = Math.random
): number {
  const safeMin = Math.max(0, minMs);
  const safeMax = Math.max(safeMin, maxMs);
  const ratio = Math.max(0, Math.min(1, randomFn()));
  return Math.round(safeMin + (safeMax - safeMin) * ratio);
}

/**
 * Deterministic scoring formula for valid hits.
 * - Base points: 100
 * - Speed bonus: scaled linearly from 250 pts at <=150ms down to 0 pts at >=500ms
 * - Level multiplier: 1.0x to 1.5x (1 + (level - 1) * 0.1)
 */
export function calculateRoundScore(reactionTimeMs: number, level: number): number {
  if (!Number.isFinite(reactionTimeMs) || reactionTimeMs <= 0) {
    return 0;
  }

  const boundedLevel = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level) || 1));
  const levelMultiplier = 1 + (boundedLevel - 1) * 0.1;

  let speedBonus = 0;
  if (reactionTimeMs <= 150) {
    speedBonus = MAX_SPEED_BONUS_POINTS;
  } else if (reactionTimeMs < SPEED_BONUS_BENCHMARK_MS) {
    const fraction = (SPEED_BONUS_BENCHMARK_MS - reactionTimeMs) / 350;
    speedBonus = Math.round(MAX_SPEED_BONUS_POINTS * fraction);
  } else {
    speedBonus = 0;
  }

  const rawScore = (BASE_ROUND_POINTS + speedBonus) * levelMultiplier;
  return Math.max(0, Math.round(rawScore));
}

/**
 * Calculates aggregate session statistics across all concluded rounds.
 */
export function calculateSessionStats(
  rounds: RoundResult[],
  totalDurationMs: number,
  highestLevel: number,
  totalRounds = TOTAL_ROUNDS
): QuickReactionSessionStats {
  const validHitsRecords = rounds.filter(
    (r) => r.outcome === 'hit' && Number.isFinite(r.reactionTimeMs) && r.reactionTimeMs! > 0
  );

  const validHits = validHitsRecords.length;
  const falseStarts = rounds.filter((r) => r.outcome === 'false-start').length;
  const timeouts = rounds.filter((r) => r.outcome === 'timeout').length;
  const finalScore = rounds.reduce((sum, r) => sum + r.score, 0);

  let bestReactionMs: number | undefined;
  let avgReactionMs: number | undefined;
  let medianReactionMs: number | undefined;

  if (validHitsRecords.length > 0) {
    const sortedTimes = validHitsRecords
      .map((r) => r.reactionTimeMs!)
      .sort((a, b) => a - b);

    bestReactionMs = sortedTimes[0];
    const totalMs = sortedTimes.reduce((sum, t) => sum + t, 0);
    avgReactionMs = Math.round(totalMs / sortedTimes.length);

    const mid = Math.floor(sortedTimes.length / 2);
    if (sortedTimes.length % 2 === 1) {
      medianReactionMs = sortedTimes[mid];
    } else {
      medianReactionMs = Math.round((sortedTimes[mid - 1] + sortedTimes[mid]) / 2);
    }
  }

  const accuracyPercentage =
    totalRounds > 0 ? Math.round((validHits / totalRounds) * 100) : 0;

  return {
    totalRounds,
    roundsCompleted: rounds.length,
    validHits,
    falseStarts,
    timeouts,
    bestReactionMs,
    avgReactionMs,
    medianReactionMs,
    finalScore,
    accuracyPercentage,
    highestLevel,
    totalDurationMs: Math.max(0, totalDurationMs),
    completedAt: new Date().toISOString(),
  };
}

export function createInitialQuickReactionState(initialLevel = 1): QuickReactionState {
  const level = Math.max(1, Math.min(MAX_LEVEL, initialLevel));
  const config = getQuickReactionLevelConfig(level);
  const targetWaitDurationMs = getRandomWaitDuration(config.minWaitMs, config.maxWaitMs);

  return {
    phase: 'countdown',
    currentRound: 1,
    totalRounds: TOTAL_ROUNDS,
    currentLevel: level,
    highestLevelReached: level,
    consecutiveFastHits: 0,
    score: 0,
    roundsHistory: [],
    targetWaitDurationMs,
    sessionStartTime: Date.now(),
  };
}

export function quickReactionReducer(
  state: QuickReactionState,
  action: QuickReactionAction
): QuickReactionState {
  switch (action.type) {
    case 'START_COUNTDOWN':
      return {
        ...state,
        phase: 'countdown',
      };

    case 'START_WAITING': {
      if (state.phase === 'completed') return state;
      return {
        ...state,
        phase: 'waiting',
        targetWaitDurationMs: action.waitDurationMs,
        currentRoundOutcome: undefined,
        currentRoundReactionMs: undefined,
        currentRoundScore: undefined,
        triggerTimestamp: undefined,
      };
    }

    case 'SHOW_TRIGGER': {
      if (state.phase !== 'waiting') return state;
      return {
        ...state,
        phase: 'trigger',
        triggerTimestamp: action.triggerTimestamp,
      };
    }

    case 'RECORD_TAP': {
      // 1. False start: user tapped before trigger appeared
      if (state.phase === 'waiting') {
        const roundScore = 0;
        const newLevel = Math.max(1, state.currentLevel - 1);
        const roundResult: RoundResult = {
          roundNumber: state.currentRound,
          outcome: 'false-start',
          score: roundScore,
          level: state.currentLevel,
          waitDurationMs: state.targetWaitDurationMs,
        };

        return {
          ...state,
          phase: 'round-feedback',
          currentLevel: newLevel,
          consecutiveFastHits: 0,
          currentRoundOutcome: 'false-start',
          currentRoundReactionMs: undefined,
          currentRoundScore: roundScore,
          roundsHistory: [...state.roundsHistory, roundResult],
        };
      }

      // 2. Valid Hit: user tapped after trigger appeared
      if (state.phase === 'trigger' && state.triggerTimestamp) {
        const rawReactionMs = action.tapTimestamp - state.triggerTimestamp;
        const reactionTimeMs = Math.max(1, Math.round(rawReactionMs));
        const roundScore = calculateRoundScore(reactionTimeMs, state.currentLevel);

        let newLevel = state.currentLevel;
        let consecutiveFastHits = state.consecutiveFastHits;

        // Adaptive level progression: 2 consecutive reactions under 350ms advances level
        if (reactionTimeMs < 350) {
          consecutiveFastHits += 1;
          if (consecutiveFastHits >= 2 && newLevel < MAX_LEVEL) {
            newLevel += 1;
            consecutiveFastHits = 0;
          }
        } else if (reactionTimeMs >= 450) {
          consecutiveFastHits = 0;
        }

        const roundResult: RoundResult = {
          roundNumber: state.currentRound,
          outcome: 'hit',
          reactionTimeMs,
          score: roundScore,
          level: state.currentLevel,
          waitDurationMs: state.targetWaitDurationMs,
        };

        return {
          ...state,
          phase: 'round-feedback',
          currentLevel: newLevel,
          highestLevelReached: Math.max(state.highestLevelReached, newLevel),
          consecutiveFastHits,
          score: state.score + roundScore,
          currentRoundOutcome: 'hit',
          currentRoundReactionMs: reactionTimeMs,
          currentRoundScore: roundScore,
          roundsHistory: [...state.roundsHistory, roundResult],
        };
      }

      // Ignore taps in countdown, round-feedback, paused, or completed
      return state;
    }

    case 'TIMEOUT_TRIGGER': {
      if (state.phase !== 'trigger') return state;

      const roundScore = 0;
      const newLevel = Math.max(1, state.currentLevel - 1);
      const roundResult: RoundResult = {
        roundNumber: state.currentRound,
        outcome: 'timeout',
        score: roundScore,
        level: state.currentLevel,
        waitDurationMs: state.targetWaitDurationMs,
      };

      return {
        ...state,
        phase: 'round-feedback',
        currentLevel: newLevel,
        consecutiveFastHits: 0,
        currentRoundOutcome: 'timeout',
        currentRoundReactionMs: undefined,
        currentRoundScore: roundScore,
        roundsHistory: [...state.roundsHistory, roundResult],
      };
    }

    case 'END_ROUND_FEEDBACK': {
      if (state.phase !== 'round-feedback') return state;

      if (state.currentRound >= state.totalRounds) {
        const totalDurationMs = Date.now() - (state.sessionStartTime || Date.now());
        const stats = calculateSessionStats(
          state.roundsHistory,
          totalDurationMs,
          state.highestLevelReached,
          state.totalRounds
        );

        return {
          ...state,
          phase: 'completed',
          sessionStats: stats,
        };
      }

      const nextRound = state.currentRound + 1;
      const config = getQuickReactionLevelConfig(state.currentLevel);
      const waitDurationMs = getRandomWaitDuration(config.minWaitMs, config.maxWaitMs);

      return {
        ...state,
        phase: 'waiting',
        currentRound: nextRound,
        targetWaitDurationMs: waitDurationMs,
        currentRoundOutcome: undefined,
        currentRoundReactionMs: undefined,
        currentRoundScore: undefined,
        triggerTimestamp: undefined,
      };
    }

    case 'PAUSE_GAME': {
      if (
        state.phase === 'countdown' ||
        state.phase === 'waiting' ||
        state.phase === 'trigger'
      ) {
        return {
          ...state,
          phase: 'paused',
          previousPhase: state.phase,
        };
      }
      return state;
    }

    case 'RESUME_GAME': {
      if (state.phase !== 'paused') return state;
      const restoredPhase: QuickReactionPhase =
        state.previousPhase === 'countdown' ? 'countdown' : 'waiting';
      const config = getQuickReactionLevelConfig(state.currentLevel);
      const waitDurationMs = getRandomWaitDuration(config.minWaitMs, config.maxWaitMs);
      return {
        ...state,
        phase: restoredPhase,
        targetWaitDurationMs: waitDurationMs,
        previousPhase: undefined,
        triggerTimestamp: undefined,
      };
    }

    case 'RESTART_GAME':
      return createInitialQuickReactionState(1);

    default:
      return state;
  }
}
