import { GameId } from '../games/types';

export const CURRENT_SCHEMA_VERSION = 1;

export type SessionOutcome = 'completed' | 'game-over' | 'abandoned';

export interface GameSpecificMetrics {
  perfectRounds?: number;
  maxDigitSpan?: number;
  bestReactionMs?: number;
  avgReactionMs?: number;
  medianReactionMs?: number;
  validHits?: number;
  falseStarts?: number;
  timeouts?: number;
  correctAnswers?: number;
  questionsAnswered?: number;
  avgResponseTimeMs?: number;
  targetHits?: number;
  misses?: number;
  bestFindTimeMs?: number;
  avgFindTimeMs?: number;
  [key: string]: unknown;
}

export interface GameSessionRecord {
  id: string;
  schemaVersion: number;
  gameId: GameId;
  startedAt: string; // ISO string
  completedAt: string; // ISO string
  dateKey: string; // 'YYYY-MM-DD' device local calendar date
  outcome: SessionOutcome;
  finalScore: number;
  accuracyPercentage: number;
  roundsCompleted: number;
  totalRounds: number;
  highestLevel: number;
  startingLevel?: number;
  durationMs: number;
  gameSpecificMetrics?: GameSpecificMetrics;
}

export interface GamePerformanceSummary {
  sessionsCount: number;
  highestScore: number;
  avgAccuracy: number;
  highestLevel: number;
  maxDigitSpan?: number;
  perfectRoundsTotal: number;
  bestReactionMs?: number;
  avgReactionMs?: number;
  avgResponseTimeMs?: number;
  bestFindTimeMs?: number;
  avgFindTimeMs?: number;
}

export interface HistorySummary {
  totalWorkouts: number;
  totalScore: number;
  totalDurationMs: number;
  currentStreak: number;
  bestStreak: number;
  lastTrainedDate: string | null;
  gameStats: Record<GameId, GamePerformanceSummary>;
}
