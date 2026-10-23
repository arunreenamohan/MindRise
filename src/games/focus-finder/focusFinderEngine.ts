import {
  FocusFinderShape,
  FocusFinderColorKey,
  FocusFinderInnerPattern,
  FocusFinderLevelConfig,
  FocusFinderRoundConfig,
  FocusFinderRoundResult,
  FocusFinderSessionStats,
  FocusFinderState,
  FocusFinderAction,
  FocusFinderTarget,
  GridItem,
  RoundOutcome,
} from './types';

export const FOCUS_FINDER_SHAPES: FocusFinderShape[] = [
  'circle',
  'square',
  'triangle',
  'diamond',
  'star',
  'hexagon',
];

export const FOCUS_FINDER_COLORS: FocusFinderColorKey[] = [
  'cyan',
  'amber',
  'emerald',
  'rose',
  'violet',
  'blue',
];

export const FOCUS_FINDER_PATTERNS: FocusFinderInnerPattern[] = [
  'solid',
  'ring',
  'cross',
  'dot',
];

export const FOCUS_FINDER_COLOR_HEX_MAP: Record<FocusFinderColorKey, string> = {
  cyan: '#00D4B2',
  amber: '#F59E0B',
  emerald: '#10B981',
  rose: '#FF5376',
  violet: '#8A67FF',
  blue: '#3B82F6',
};

export const TOTAL_FOCUS_FINDER_ROUNDS = 10;
export const MAX_FOCUS_FINDER_LEVEL = 6;
export const MIN_FOCUS_FINDER_LEVEL = 1;

export const FOCUS_FINDER_LEVEL_CONFIGS: Record<number, FocusFinderLevelConfig> = {
  1: {
    level: 1,
    rows: 3,
    cols: 3,
    totalItems: 9,
    timeLimitMs: 10000,
    conjunctionDistractorRatio: 0,
    includePatternDistractors: false,
  },
  2: {
    level: 2,
    rows: 3,
    cols: 4,
    totalItems: 12,
    timeLimitMs: 9000,
    conjunctionDistractorRatio: 0.35,
    includePatternDistractors: false,
  },
  3: {
    level: 3,
    rows: 4,
    cols: 4,
    totalItems: 16,
    timeLimitMs: 8000,
    conjunctionDistractorRatio: 0.5,
    includePatternDistractors: true,
  },
  4: {
    level: 4,
    rows: 4,
    cols: 5,
    totalItems: 20,
    timeLimitMs: 7000,
    conjunctionDistractorRatio: 0.65,
    includePatternDistractors: true,
  },
  5: {
    level: 5,
    rows: 5,
    cols: 5,
    totalItems: 25,
    timeLimitMs: 6000,
    conjunctionDistractorRatio: 0.75,
    includePatternDistractors: true,
  },
  6: {
    level: 6,
    rows: 5,
    cols: 6,
    totalItems: 30,
    timeLimitMs: 5000,
    conjunctionDistractorRatio: 0.85,
    includePatternDistractors: true,
  },
};

/**
 * Returns level parameters clamped between level 1 and 6.
 */
export function getFocusFinderLevelConfig(level: number): FocusFinderLevelConfig {
  const boundedLevel = Math.max(MIN_FOCUS_FINDER_LEVEL, Math.min(MAX_FOCUS_FINDER_LEVEL, Math.round(level)));
  return FOCUS_FINDER_LEVEL_CONFIGS[boundedLevel] || FOCUS_FINDER_LEVEL_CONFIGS[1];
}

/**
 * Generates a guaranteed valid Focus Finder round with exactly one unique target
 * and varied distractors based on level complexity.
 * Fully deterministic when a prng function is provided.
 */
export function generateFocusFinderRound(
  roundNumber: number,
  level: number,
  prng: () => number = Math.random
): FocusFinderRoundConfig {
  const config = getFocusFinderLevelConfig(level);
  const { rows, cols, totalItems, timeLimitMs, conjunctionDistractorRatio, includePatternDistractors } = config;

  // Pick target features
  const targetShape = FOCUS_FINDER_SHAPES[Math.floor(prng() * FOCUS_FINDER_SHAPES.length)];
  const targetColor = FOCUS_FINDER_COLORS[Math.floor(prng() * FOCUS_FINDER_COLORS.length)];
  const targetPattern = includePatternDistractors
    ? FOCUS_FINDER_PATTERNS[Math.floor(prng() * FOCUS_FINDER_PATTERNS.length)]
    : 'solid';

  const target: FocusFinderTarget = {
    shape: targetShape,
    colorKey: targetColor,
    pattern: targetPattern,
  };

  // Pick target placement slot
  const targetIndex = Math.floor(prng() * totalItems);

  const otherShapes = FOCUS_FINDER_SHAPES.filter((s) => s !== targetShape);
  const otherColors = FOCUS_FINDER_COLORS.filter((c) => c !== targetColor);
  const otherPatterns = FOCUS_FINDER_PATTERNS.filter((p) => p !== targetPattern);

  const items: GridItem[] = [];

  for (let i = 0; i < totalItems; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    if (i === targetIndex) {
      items.push({
        id: `round_${roundNumber}_item_${i}`,
        shape: targetShape,
        colorKey: targetColor,
        pattern: targetPattern,
        isTarget: true,
        row,
        col,
      });
      continue;
    }

    // Distractor generation
    let dShape: FocusFinderShape;
    let dColor: FocusFinderColorKey;
    let dPattern: FocusFinderInnerPattern = 'solid';

    const useConjunction = prng() < conjunctionDistractorRatio;

    if (useConjunction) {
      // Conjunction distractor: share 1 or 2 attributes with target, but NEVER all attributes
      const conjunctionType = Math.floor(prng() * (includePatternDistractors ? 3 : 2));

      if (conjunctionType === 0) {
        // Same shape, different color
        dShape = targetShape;
        dColor = otherColors[Math.floor(prng() * otherColors.length)];
        dPattern = includePatternDistractors
          ? (prng() < 0.5 ? targetPattern : otherPatterns[Math.floor(prng() * otherPatterns.length)])
          : 'solid';
      } else if (conjunctionType === 1) {
        // Same color, different shape
        dShape = otherShapes[Math.floor(prng() * otherShapes.length)];
        dColor = targetColor;
        dPattern = includePatternDistractors
          ? (prng() < 0.5 ? targetPattern : otherPatterns[Math.floor(prng() * otherPatterns.length)])
          : 'solid';
      } else {
        // Same shape and color, but strictly different pattern
        dShape = targetShape;
        dColor = targetColor;
        dPattern = otherPatterns[Math.floor(prng() * otherPatterns.length)];
      }
    } else {
      // Feature distractor: completely distinct shape and distinct color
      dShape = otherShapes[Math.floor(prng() * otherShapes.length)];
      dColor = otherColors[Math.floor(prng() * otherColors.length)];
      dPattern = includePatternDistractors
        ? FOCUS_FINDER_PATTERNS[Math.floor(prng() * FOCUS_FINDER_PATTERNS.length)]
        : 'solid';
    }

    // Safety assertion: under no circumstance can a distractor match all 3 target attributes
    if (dShape === targetShape && dColor === targetColor && dPattern === targetPattern) {
      dShape = otherShapes[0];
      dColor = otherColors[0];
    }

    items.push({
      id: `round_${roundNumber}_item_${i}`,
      shape: dShape,
      colorKey: dColor,
      pattern: dPattern,
      isTarget: false,
      row,
      col,
    });
  }

  return {
    roundNumber,
    level: config.level,
    rows,
    cols,
    totalItems,
    timeLimitMs,
    target,
    items,
    targetIndex,
  };
}

/**
 * Pure scoring calculation based on accuracy, response latency, level multiplier, and streaks.
 */
export function calculateFocusFinderScore(
  level: number,
  outcome: RoundOutcome,
  responseTimeMs: number,
  timeLimitMs: number,
  consecutiveHits: number
): number {
  if (outcome === 'hit') {
    const boundedLevel = Math.max(1, Math.min(6, level));
    const baseScore = boundedLevel * 200;

    const safeResponseTime = Math.max(0, Math.min(timeLimitMs, responseTimeMs));
    const speedRatio = Math.max(0, (timeLimitMs - safeResponseTime) / timeLimitMs);
    const speedBonus = Math.round(speedRatio * 150 * boundedLevel);

    const streakBonus = consecutiveHits >= 2 ? consecutiveHits * 40 : 0;

    return baseScore + speedBonus + streakBonus;
  }

  if (outcome === 'miss') {
    return -50;
  }

  return 0; // timeout
}

/**
 * Computes complete aggregate session statistics from completed round results.
 */
export function calculateFocusFinderSessionStats(
  rounds: FocusFinderRoundResult[],
  totalRounds: number,
  sessionStartTime: number,
  completedTimestamp?: number
): FocusFinderSessionStats {
  const completedAt = new Date(completedTimestamp || Date.now()).toISOString();
  const totalDurationMs = Math.max(0, (completedTimestamp || Date.now()) - sessionStartTime);

  const targetHits = rounds.filter((r) => r.outcome === 'hit').length;
  const misses = rounds.filter((r) => r.outcome === 'miss').length;
  const timeouts = rounds.filter((r) => r.outcome === 'timeout').length;

  const totalScoreRaw = rounds.reduce((sum, r) => sum + r.score, 0);
  const finalScore = Math.max(0, totalScoreRaw);

  const accuracyPercentage = totalRounds > 0 ? Math.round((targetHits / totalRounds) * 100) : 0;
  const highestLevel = rounds.reduce((max, r) => Math.max(max, r.level), 1);

  const hitTimes = rounds
    .filter((r) => r.outcome === 'hit' && r.responseTimeMs > 0)
    .map((r) => r.responseTimeMs);

  const bestFindTimeMs = hitTimes.length > 0 ? Math.min(...hitTimes) : undefined;
  const avgFindTimeMs =
    hitTimes.length > 0 ? Math.round(hitTimes.reduce((a, b) => a + b, 0) / hitTimes.length) : undefined;

  return {
    totalRounds,
    roundsCompleted: rounds.length,
    targetHits,
    misses,
    timeouts,
    accuracyPercentage,
    finalScore,
    highestLevel,
    bestFindTimeMs,
    avgFindTimeMs,
    totalDurationMs,
    completedAt,
  };
}

/**
 * Creates initial clean state for a new Focus Finder session.
 */
export function createInitialFocusFinderState(
  initialLevel: number = 1,
  startTimestamp: number = Date.now(),
  prng?: () => number
): FocusFinderState {
  const boundedLevel = Math.max(MIN_FOCUS_FINDER_LEVEL, Math.min(MAX_FOCUS_FINDER_LEVEL, initialLevel));
  const initialRoundConfig = generateFocusFinderRound(1, boundedLevel, prng);

  return {
    phase: 'countdown',
    currentRound: 1,
    totalRounds: TOTAL_FOCUS_FINDER_ROUNDS,
    currentLevel: boundedLevel,
    highestLevelReached: boundedLevel,
    score: 0,
    consecutiveHits: 0,
    currentRoundConfig: initialRoundConfig,
    roundsHistory: [],
    roundStartTime: 0,
    sessionStartTime: startTimestamp,
  };
}

/**
 * Pure state reducer driving Focus Finder gameplay.
 */
export function focusFinderReducer(
  state: FocusFinderState,
  action: FocusFinderAction
): FocusFinderState {
  switch (action.type) {
    case 'START_ROUND': {
      return {
        ...state,
        phase: 'searching',
        roundStartTime: action.roundStartTime,
        selectedItemIndex: undefined,
        lastRoundOutcome: undefined,
        lastRoundScore: undefined,
      };
    }

    case 'TAP_ITEM': {
      // Strictly prevent duplicate taps or scoring while not actively searching
      if (state.phase !== 'searching') {
        return state;
      }

      const { itemIndex, tapTimestamp } = action;
      const { currentRoundConfig, roundStartTime, currentLevel, consecutiveHits, score } = state;
      const isTarget = itemIndex === currentRoundConfig.targetIndex;
      const outcome: RoundOutcome = isTarget ? 'hit' : 'miss';

      const responseTimeMs = Math.max(0, tapTimestamp - roundStartTime);
      const nextConsecutiveHits = isTarget ? consecutiveHits + 1 : 0;

      const roundScore = calculateFocusFinderScore(
        currentLevel,
        outcome,
        responseTimeMs,
        currentRoundConfig.timeLimitMs,
        consecutiveHits
      );

      const nextScore = Math.max(0, score + roundScore);

      const roundResult: FocusFinderRoundResult = {
        roundNumber: state.currentRound,
        level: currentLevel,
        outcome,
        selectedIndex: itemIndex,
        targetIndex: currentRoundConfig.targetIndex,
        responseTimeMs,
        score: roundScore,
      };

      return {
        ...state,
        phase: 'feedback',
        selectedItemIndex: itemIndex,
        lastRoundOutcome: outcome,
        lastRoundScore: roundScore,
        score: nextScore,
        consecutiveHits: nextConsecutiveHits,
        roundsHistory: [...state.roundsHistory, roundResult],
      };
    }

    case 'TIMEOUT_ROUND': {
      if (state.phase !== 'searching') {
        return state;
      }

      const { timeoutTimestamp } = action;
      const { currentRoundConfig, roundStartTime, currentLevel } = state;
      const responseTimeMs = Math.max(0, timeoutTimestamp - roundStartTime);

      const roundResult: FocusFinderRoundResult = {
        roundNumber: state.currentRound,
        level: currentLevel,
        outcome: 'timeout',
        targetIndex: currentRoundConfig.targetIndex,
        responseTimeMs,
        score: 0,
      };

      return {
        ...state,
        phase: 'feedback',
        lastRoundOutcome: 'timeout',
        lastRoundScore: 0,
        consecutiveHits: 0,
        roundsHistory: [...state.roundsHistory, roundResult],
      };
    }

    case 'NEXT_ROUND': {
      if (state.phase !== 'feedback') {
        return state;
      }

      // Check if session reached final round
      if (state.currentRound >= state.totalRounds) {
        const stats = calculateFocusFinderSessionStats(
          state.roundsHistory,
          state.totalRounds,
          state.sessionStartTime,
          action.nextStartTime
        );

        return {
          ...state,
          phase: 'completed',
          sessionStats: stats,
        };
      }

      // Adaptive difficulty calculation:
      // 2 consecutive hits -> increase level (up to level 6)
      // Miss or timeout -> decrease level if above level 1
      let nextLevel = state.currentLevel;
      if (state.lastRoundOutcome === 'hit' && state.consecutiveHits >= 2 && nextLevel < MAX_FOCUS_FINDER_LEVEL) {
        nextLevel += 1;
      } else if (state.lastRoundOutcome !== 'hit' && nextLevel > MIN_FOCUS_FINDER_LEVEL) {
        nextLevel -= 1;
      }

      const nextRoundNumber = state.currentRound + 1;
      const nextRoundConfig = generateFocusFinderRound(nextRoundNumber, nextLevel, action.prng);

      return {
        ...state,
        phase: 'searching',
        currentRound: nextRoundNumber,
        currentLevel: nextLevel,
        highestLevelReached: Math.max(state.highestLevelReached, nextLevel),
        currentRoundConfig: nextRoundConfig,
        roundStartTime: action.nextStartTime,
        selectedItemIndex: undefined,
        lastRoundOutcome: undefined,
        lastRoundScore: undefined,
      };
    }

    case 'PAUSE_GAME': {
      if (state.phase === 'completed' || state.phase === 'paused') {
        return state;
      }
      return {
        ...state,
        previousPhase: state.phase,
        phase: 'paused',
      };
    }

    case 'RESUME_GAME': {
      if (state.phase !== 'paused') {
        return state;
      }
      return {
        ...state,
        phase: state.previousPhase || 'searching',
        previousPhase: undefined,
      };
    }

    case 'RESTART_GAME': {
      return createInitialFocusFinderState(action.initialLevel || 1, action.startTimestamp || Date.now(), action.prng);
    }

    default:
      return state;
  }
}
