/**
 * Deterministic Daily Workout Selection Engine
 *
 * Selects 3 complementary drills each day:
 * 1. Memory: Memory Matrix or Number Recall
 * 2. Attention / Speed: Focus Finder or Quick Reaction
 * 3. Reasoning: Logic Quest or Pattern Master
 *
 * Selection is pure and deterministic based on the user's local calendar date ('YYYY-MM-DD').
 * All 6 games rotate evenly with equal representation (50% per game across 8 days).
 *
 * Timezone Handling:
 * - Uses the local calendar dateKey ('YYYY-MM-DD') computed from the device clock.
 * - Changing timezones before starting a workout loads the workout for the new local calendar date.
 * - Once a workout is started, its dateKey and drill sequence are persisted, preventing mid-workout shifts.
 * - If the local calendar advances to a new day before an unfinished workout is completed,
 *   yesterday's workout remains in history as uncompleted, and a new workout is seeded for today.
 *
 * NOTE: These drill combinations provide varied daily engagement within the app.
 * They do not claim to measure or clinically enhance IQ or general intelligence.
 */

import { GameId } from '../games/types';
import { getGameById } from '../games/registry';
import { getDaysDifference } from '../history/streakCalculator';
import {
  CURRENT_WORKOUT_SCHEMA_VERSION,
  DailyWorkoutRecord,
  WorkoutDrill,
  WorkoutDrillCategory,
} from './types';

export const WORKOUT_EPOCH_DATE = '2026-01-01';

/**
 * 8 balanced, deterministic 3-drill daily workout combinations.
 * Guarantees:
 * - Drill 1: Memory (Memory Matrix or Number Recall)
 * - Drill 2: Attention/Speed (Focus Finder or Quick Reaction)
 * - Drill 3: Reasoning (Logic Quest or Pattern Master)
 * - 50% appearance rate for each of the 6 games over any 8-day rolling window.
 */
export const DAILY_WORKOUT_COMBINATIONS: ReadonlyArray<readonly [GameId, GameId, GameId]> = [
  ['memory-matrix', 'focus-finder', 'logic-quest'], // Day 0
  ['number-recall', 'quick-reaction', 'pattern-master'], // Day 1
  ['memory-matrix', 'quick-reaction', 'logic-quest'], // Day 2
  ['number-recall', 'focus-finder', 'pattern-master'], // Day 3
  ['memory-matrix', 'focus-finder', 'pattern-master'], // Day 4
  ['number-recall', 'quick-reaction', 'logic-quest'], // Day 5
  ['memory-matrix', 'quick-reaction', 'pattern-master'], // Day 6
  ['number-recall', 'focus-finder', 'logic-quest'], // Day 7
];

/**
 * Maps any valid 'YYYY-MM-DD' date string to a deterministic combination index [0..7].
 * Uses UTC day offset from WORKOUT_EPOCH_DATE to guarantee DST safety.
 */
export function getWorkoutCombinationIndex(dateKey: string): number {
  const dayOffset = getDaysDifference(WORKOUT_EPOCH_DATE, dateKey);
  const mod = ((dayOffset % 8) + 8) % 8;
  return mod;
}

/**
 * Maps a GameId to its drill category.
 */
export function getDrillCategory(gameId: GameId): WorkoutDrillCategory {
  switch (gameId) {
    case 'memory-matrix':
    case 'number-recall':
      return 'memory';
    case 'focus-finder':
    case 'quick-reaction':
      return 'attention-speed';
    case 'logic-quest':
    case 'pattern-master':
    default:
      return 'reasoning';
  }
}

/**
 * Returns human-readable category label for a given drill category.
 */
export function getDrillCategoryLabel(category: WorkoutDrillCategory): string {
  switch (category) {
    case 'memory':
      return 'Memory';
    case 'attention-speed':
      return 'Attention & Speed';
    case 'reasoning':
      return 'Reasoning & Logic';
  }
}

/**
 * Generates the 3 drill objects for a given date key.
 */
export function getDailyDrills(dateKey: string): [WorkoutDrill, WorkoutDrill, WorkoutDrill] {
  const index = getWorkoutCombinationIndex(dateKey);
  const [game1, game2, game3] = DAILY_WORKOUT_COMBINATIONS[index];

  const buildDrill = (gameId: GameId, order: number): WorkoutDrill => {
    const game = getGameById(gameId);
    const category = getDrillCategory(gameId);
    return {
      id: `drill_${order}_${gameId}`,
      order,
      gameId,
      category,
      categoryLabel: getDrillCategoryLabel(category),
      estimatedDurationMins: game?.specs.estimatedDurationMins ?? 3,
      status: 'pending',
    };
  };

  return [buildDrill(game1, 1), buildDrill(game2, 2), buildDrill(game3, 3)];
}

/**
 * Creates a brand new, unstarted DailyWorkoutRecord for a calendar dateKey.
 */
export function createDailyWorkout(dateKey: string): DailyWorkoutRecord {
  const drills = getDailyDrills(dateKey);
  return {
    id: `workout_${dateKey}`,
    schemaVersion: CURRENT_WORKOUT_SCHEMA_VERSION,
    dateKey,
    status: 'not-started',
    drills,
    currentDrillIndex: 0,
    totalDurationMs: 0,
    averageAccuracy: 0,
  };
}
