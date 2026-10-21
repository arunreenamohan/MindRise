/**
 * Scoring Engine for Memory Matrix
 *
 * Implements an explicit, deterministic scoring model derived solely
 * from current session performance.
 *
 * Formula:
 * - Base Tile Points: 100 * level * correctCount
 * - Perfect Round Bonus: 250 * level (if 0 mistakes)
 * - Speed Bonus: max(0, floor((6000 - recallDurationMs) / 100)) * level (if perfect)
 * - Mistake Penalty: 50 * level * mistakesCount
 * - Streak Multiplier: 1.0x (1), 1.25x (2), 1.5x (3+) consecutive perfect rounds
 * - Net Round Score: max(0, round((basePoints + perfectBonus + speedBonus - penalty) * streakMultiplier))
 */

import { RoundResult, MemoryMatrixSessionStats } from './types';

export const BASE_POINTS_PER_TILE = 100;
export const PERFECT_ROUND_BONUS = 250;
export const MISTAKE_PENALTY_PER_TILE = 50;
export const SPEED_BONUS_TIME_LIMIT_MS = 6000;

export interface CalculateRoundScoreParams {
  level: number;
  correctCount: number;
  mistakesCount: number;
  recallDurationMs: number;
  consecutivePerfectRounds: number;
}

/**
 * Returns streak multiplier based on consecutive perfect rounds.
 */
export function getStreakMultiplier(streak: number): number {
  if (streak >= 3) return 1.5;
  if (streak === 2) return 1.25;
  return 1.0;
}

/**
 * Calculates deterministic score for a single round.
 */
export function calculateRoundScore({
  level,
  correctCount,
  mistakesCount,
  recallDurationMs,
  consecutivePerfectRounds,
}: CalculateRoundScoreParams): {
  roundScore: number;
  isPerfect: boolean;
  basePoints: number;
  perfectBonus: number;
  speedBonus: number;
  penalty: number;
  streakMultiplier: number;
} {
  const safeLevel = Math.max(1, Math.round(level));
  const safeCorrect = Math.max(0, correctCount);
  const safeMistakes = Math.max(0, mistakesCount);
  const isPerfect = safeMistakes === 0 && safeCorrect > 0;

  const basePoints = safeCorrect * BASE_POINTS_PER_TILE * safeLevel;
  const perfectBonus = isPerfect ? PERFECT_ROUND_BONUS * safeLevel : 0;

  // Speed bonus only awarded if the round was completed cleanly
  const speedBonus =
    isPerfect && recallDurationMs < SPEED_BONUS_TIME_LIMIT_MS
      ? Math.floor((SPEED_BONUS_TIME_LIMIT_MS - Math.max(0, recallDurationMs)) / 100) * safeLevel
      : 0;

  const penalty = safeMistakes * MISTAKE_PENALTY_PER_TILE * safeLevel;
  const streakMultiplier = getStreakMultiplier(consecutivePerfectRounds);

  const rawScore = (basePoints + perfectBonus + speedBonus - penalty) * streakMultiplier;
  const roundScore = Math.max(0, Math.round(rawScore));

  return {
    roundScore,
    isPerfect,
    basePoints,
    perfectBonus,
    speedBonus,
    penalty,
    streakMultiplier,
  };
}

/**
 * Computes final summary statistics from completed rounds.
 */
export function computeSessionStats(
  roundHistory: RoundResult[],
  totalRounds: number,
  sessionStartTime: number,
  completedAtIso = new Date().toISOString()
): MemoryMatrixSessionStats {
  const totalCorrect = roundHistory.reduce((acc, r) => acc + r.correctCount, 0);
  const totalMistakes = roundHistory.reduce((acc, r) => acc + r.mistakesCount, 0);
  const totalTaps = totalCorrect + totalMistakes;

  const finalScore = roundHistory.reduce((acc, r) => acc + r.roundScore, 0);
  const accuracyPercentage = totalTaps > 0 ? Math.round((totalCorrect / totalTaps) * 100) : 0;
  const highestLevel = roundHistory.reduce((max, r) => Math.max(max, r.level), 1);
  const perfectRounds = roundHistory.filter((r) => r.isPerfect).length;
  const totalDurationMs = Math.max(0, Date.now() - sessionStartTime);

  return {
    gameId: 'memory-matrix',
    completedAt: completedAtIso,
    finalScore,
    accuracyPercentage,
    roundsCompleted: roundHistory.length,
    totalRounds,
    highestLevel,
    perfectRounds,
    totalDurationMs,
  };
}
