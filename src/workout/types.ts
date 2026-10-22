import { GameId } from '../games/types';

export const CURRENT_WORKOUT_SCHEMA_VERSION = 1;

export type WorkoutDrillCategory = 'memory' | 'attention-speed' | 'reasoning';

export type WorkoutDrillStatus = 'pending' | 'in-progress' | 'completed' | 'abandoned';

export interface WorkoutDrill {
  id: string; // e.g. 'drill_1', 'drill_2', 'drill_3'
  order: number; // 1, 2, 3
  gameId: GameId;
  category: WorkoutDrillCategory;
  categoryLabel: string;
  estimatedDurationMins: number;
  status: WorkoutDrillStatus;
  sessionId?: string; // id of the GameSessionRecord in historyRepository
  score?: number;
  accuracyPercentage?: number;
  durationMs?: number;
  completedAt?: string; // ISO string
}

export type DailyWorkoutStatus = 'not-started' | 'in-progress' | 'completed';

export interface DailyWorkoutRecord {
  id: string; // e.g. 'workout_2026-10-22'
  schemaVersion: number;
  dateKey: string; // 'YYYY-MM-DD' in user's local calendar
  status: DailyWorkoutStatus;
  drills: [WorkoutDrill, WorkoutDrill, WorkoutDrill];
  currentDrillIndex: number; // 0, 1, 2, or 3 (when completed)
  startedAt?: string; // ISO string
  completedAt?: string; // ISO string
  totalDurationMs: number;
  averageAccuracy: number;
}

export interface WorkoutStreakResult {
  currentStreak: number;
  bestStreak: number;
}
