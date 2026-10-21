/**
 * Scoring Engine for Number Recall
 *
 * Implements deterministic scoring and summary statistics for digit sequence recall.
 */

import { NumberRecallRoundResult, NumberRecallSessionStats } from './types';

export const BASE_POINTS_PER_DIGIT = 100;
export const PERFECT_MATCH_BONUS = 250;
export const SPEED_BONUS_TIME_LIMIT_MS = 8000;
export const MISTAKE_PENALTY_PER_DIGIT = 50;

export interface CalculateNumberRecallRoundScoreParams {
  level: number;
  targetSequence: string;
  submittedSequence: string;
  recallDurationMs: number;
  consecutiveCorrectRounds: number;
}

/**
 * Returns streak multiplier based on consecutive correct rounds.
 */
export function getStreakMultiplier(streak: number): number {
  if (streak >= 3) return 1.5;
  if (streak === 2) return 1.25;
  return 1.0;
}

/**
 * Calculates matching positions between target and submitted sequence.
 * Preserves leading zero comparison by treating sequences as string characters.
 */
export function countMatchedDigits(target: string, submitted: string): number {
  let matched = 0;
  const compareLen = Math.min(target.length, submitted.length);
  for (let i = 0; i < compareLen; i++) {
    if (target[i] === submitted[i]) {
      matched++;
    }
  }
  return matched;
}

/**
 * Calculates deterministic score for a single Number Recall round.
 */
export function calculateNumberRecallRoundScore({
  level,
  targetSequence,
  submittedSequence,
  recallDurationMs,
  consecutiveCorrectRounds,
}: CalculateNumberRecallRoundScoreParams): {
  roundScore: number;
  isCorrect: boolean;
  matchedDigitsCount: number;
  basePoints: number;
  perfectBonus: number;
  speedBonus: number;
  penalty: number;
  streakMultiplier: number;
} {
  const safeLevel = Math.max(1, Number.isFinite(level) ? Math.round(level) : 1);
  const safeRecallDuration = Math.max(0, Number.isFinite(recallDurationMs) ? recallDurationMs : 0);

  const isCorrect = targetSequence.length > 0 && targetSequence === submittedSequence;
  const matchedDigitsCount = countMatchedDigits(targetSequence, submittedSequence);
  const sequenceLength = targetSequence.length;

  let basePoints = 0;
  let perfectBonus = 0;
  let speedBonus = 0;
  let penalty = 0;

  if (isCorrect) {
    basePoints = sequenceLength * BASE_POINTS_PER_DIGIT * safeLevel;
    perfectBonus = PERFECT_MATCH_BONUS * safeLevel;
    speedBonus =
      safeRecallDuration < SPEED_BONUS_TIME_LIMIT_MS
        ? Math.floor((SPEED_BONUS_TIME_LIMIT_MS - safeRecallDuration) / 100) * safeLevel
        : 0;
    penalty = 0;
  } else {
    // Partial credit for correctly matched digit positions
    basePoints = matchedDigitsCount * 25 * safeLevel;
    perfectBonus = 0;
    speedBonus = 0;
    const unmatchedCount = Math.max(0, sequenceLength - matchedDigitsCount);
    penalty = unmatchedCount * MISTAKE_PENALTY_PER_DIGIT * safeLevel;
  }

  const streakMultiplier = getStreakMultiplier(consecutiveCorrectRounds);
  const rawScore = (basePoints + perfectBonus + speedBonus - penalty) * streakMultiplier;
  const roundScore = Math.max(0, Math.round(rawScore));

  return {
    roundScore,
    isCorrect,
    matchedDigitsCount,
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
export function computeNumberRecallSessionStats(
  roundHistory: NumberRecallRoundResult[],
  totalRounds: number,
  sessionStartTime: number,
  completedAtIso = new Date().toISOString(),
  currentTime?: number
): NumberRecallSessionStats {
  const totalMatchedDigits = roundHistory.reduce((acc, r) => acc + r.matchedDigitsCount, 0);
  const totalExpectedDigits = roundHistory.reduce((acc, r) => acc + r.sequenceLength, 0);

  const finalScore = roundHistory.reduce((acc, r) => acc + r.roundScore, 0);
  const accuracyPercentage =
    totalExpectedDigits > 0 ? Math.round((totalMatchedDigits / totalExpectedDigits) * 100) : 0;
  const highestLevel = roundHistory.reduce((max, r) => Math.max(max, r.level), 1);
  const maxDigitSpan = roundHistory.reduce(
    (max, r) => (r.isCorrect ? Math.max(max, r.sequenceLength) : max),
    0
  );
  const perfectRounds = roundHistory.filter((r) => r.isCorrect).length;

  const now = currentTime ?? Date.now();
  const totalDurationMs =
    sessionStartTime > 0 && Number.isFinite(sessionStartTime)
      ? Math.max(0, now - sessionStartTime)
      : roundHistory.reduce((sum, r) => sum + r.recallDurationMs, 0);

  return {
    gameId: 'number-recall',
    completedAt: completedAtIso,
    finalScore,
    accuracyPercentage,
    roundsCompleted: roundHistory.length,
    totalRounds,
    highestLevel,
    maxDigitSpan,
    perfectRounds,
    totalDurationMs,
  };
}
