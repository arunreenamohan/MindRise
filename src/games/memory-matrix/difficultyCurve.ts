/**
 * Difficulty Progression Curve for Memory Matrix
 *
 * Provides deterministic rules for grid dimensions, tile count,
 * and preview duration across cognitive load stages.
 */

import { LevelConfig } from './types';

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 12;
export const DEFAULT_INITIAL_LEVEL = 1;
export const TOTAL_SESSION_ROUNDS = 10;
export const MAX_STRIKES = 3;

/**
 * Predefined, verified matrix configurations for levels 1 through 12.
 */
const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  1: { level: 1, gridSize: 3, targetCount: 3, previewDurationMs: 2500 },
  2: { level: 2, gridSize: 3, targetCount: 4, previewDurationMs: 2400 },
  3: { level: 3, gridSize: 4, targetCount: 4, previewDurationMs: 2500 },
  4: { level: 4, gridSize: 4, targetCount: 5, previewDurationMs: 2400 },
  5: { level: 5, gridSize: 4, targetCount: 6, previewDurationMs: 2300 },
  6: { level: 6, gridSize: 5, targetCount: 6, previewDurationMs: 2500 },
  7: { level: 7, gridSize: 5, targetCount: 7, previewDurationMs: 2400 },
  8: { level: 8, gridSize: 5, targetCount: 8, previewDurationMs: 2300 },
  9: { level: 9, gridSize: 6, targetCount: 8, previewDurationMs: 2500 },
  10: { level: 10, gridSize: 6, targetCount: 9, previewDurationMs: 2400 },
  11: { level: 11, gridSize: 6, targetCount: 10, previewDurationMs: 2300 },
  12: { level: 12, gridSize: 6, targetCount: 11, previewDurationMs: 2200 },
};

/**
 * Returns the LevelConfig for a given level, clamped to [MIN_LEVEL, MAX_LEVEL].
 */
export function getLevelConfig(level: number): LevelConfig {
  const safeLevel = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Math.round(level)));
  return LEVEL_CONFIGS[safeLevel] || LEVEL_CONFIGS[1];
}

/**
 * Calculates adaptive level progression for the next round.
 *
 * Rules:
 * - Perfect round (all targets recalled with 0 mistakes): level increases by 1 (up to MAX_LEVEL).
 * - Non-perfect round (any mistake made): level decreases by 1 (down to MIN_LEVEL).
 */
export function computeNextLevel(currentLevel: number, isPerfect: boolean): number {
  const safeCurrent = Math.max(
    MIN_LEVEL,
    Math.min(MAX_LEVEL, Number.isFinite(currentLevel) ? Math.round(currentLevel) : MIN_LEVEL)
  );
  if (isPerfect) {
    return Math.min(MAX_LEVEL, safeCurrent + 1);
  }
  return Math.max(MIN_LEVEL, safeCurrent - 1);
}
