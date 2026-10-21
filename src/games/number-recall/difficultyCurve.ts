/**
 * Difficulty Progression Curve for Number Recall
 *
 * Provides deterministic rules for digit sequence length and display duration.
 * Does not make unsupported clinical claims.
 */

import { NumberRecallLevelConfig } from './types';

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 12;
export const DEFAULT_INITIAL_LEVEL = 1;
export const TOTAL_SESSION_ROUNDS = 10;
export const MAX_STRIKES = 3;

const LEVEL_CONFIGS: Record<number, NumberRecallLevelConfig> = {
  1: { level: 1, sequenceLength: 3, displayDurationMs: 2400 },
  2: { level: 2, sequenceLength: 4, displayDurationMs: 2800 },
  3: { level: 3, sequenceLength: 4, displayDurationMs: 2400 },
  4: { level: 4, sequenceLength: 5, displayDurationMs: 3000 },
  5: { level: 5, sequenceLength: 5, displayDurationMs: 2500 },
  6: { level: 6, sequenceLength: 6, displayDurationMs: 3000 },
  7: { level: 7, sequenceLength: 6, displayDurationMs: 2700 },
  8: { level: 8, sequenceLength: 7, displayDurationMs: 3150 },
  9: { level: 9, sequenceLength: 7, displayDurationMs: 2800 },
  10: { level: 10, sequenceLength: 8, displayDurationMs: 3200 },
  11: { level: 11, sequenceLength: 8, displayDurationMs: 2800 },
  12: { level: 12, sequenceLength: 9, displayDurationMs: 3150 },
};

/**
 * Returns LevelConfig for a given level, clamped to [MIN_LEVEL, MAX_LEVEL].
 */
export function getNumberRecallLevelConfig(level: number): NumberRecallLevelConfig {
  const safeLevel = Math.max(
    MIN_LEVEL,
    Math.min(MAX_LEVEL, Number.isFinite(level) ? Math.round(level) : MIN_LEVEL)
  );
  return LEVEL_CONFIGS[safeLevel] || LEVEL_CONFIGS[1];
}

/**
 * Calculates adaptive level progression for the next round.
 *
 * Rules:
 * - Full match: level increases by 1 (capped at MAX_LEVEL).
 * - Incorrect / partial match: level decreases by 1 (floored at MIN_LEVEL).
 */
export function computeNextNumberRecallLevel(currentLevel: number, isCorrect: boolean): number {
  const safeCurrent = Math.max(
    MIN_LEVEL,
    Math.min(MAX_LEVEL, Number.isFinite(currentLevel) ? Math.round(currentLevel) : MIN_LEVEL)
  );
  if (isCorrect) {
    return Math.min(MAX_LEVEL, safeCurrent + 1);
  }
  return Math.max(MIN_LEVEL, safeCurrent - 1);
}
