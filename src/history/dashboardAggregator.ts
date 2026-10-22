/**
 * Progress Dashboard Data Aggregator
 *
 * Implements pure, deterministic calculation of dashboard statistics,
 * differentiating completed daily workouts from individual game sessions,
 * computing reliable streaks, 7-day activity matrices, and per-game trends.
 */

import { GameId } from '../games/types';
import { GameSessionRecord } from './types';
import { DailyWorkoutRecord } from '../workout/types';
import {
  calculateStreak,
  getLocalDateKey,
  calculateDrillPerformanceIndex,
  StreakResult,
} from './streakCalculator';

export interface WeeklyActivityDay {
  dateKey: string; // 'YYYY-MM-DD'
  dayLabel: string; // 'M', 'T', 'W', etc.
  dateNum: number; // Day of month, e.g. 22
  isToday: boolean;
  hasCompletedWorkout: boolean;
  sessionsCount: number;
  totalDurationMs: number;
}

export interface DashboardGameMetricSummary {
  gameId: GameId;
  sessionsCount: number;
  highestScore: number;
  avgAccuracy: number;
  highestLevel: number;
  recentScores: number[]; // Chronological oldest-to-newest for trend visualization (up to 5)
  // Meaningful game-specific metrics
  perfectRoundsTotal?: number;
  maxDigitSpan?: number;
  bestReactionMs?: number;
  avgReactionMs?: number;
  bestFindTimeMs?: number;
  avgFindTimeMs?: number;
  avgResponseTimeMs?: number;
}

export interface DashboardData {
  totalGameSessions: number;
  totalCompletedWorkouts: number;
  totalTrainingMinutes: number;
  workoutStreak: StreakResult;
  sessionStreak: StreakResult;
  last7DaysActivity: WeeklyActivityDay[];
  performanceIndex: number | null;
  gameStats: Record<GameId, DashboardGameMetricSummary>;
  recentSessions: GameSessionRecord[];
}

const ALL_GAME_IDS: GameId[] = [
  'memory-matrix',
  'number-recall',
  'quick-reaction',
  'logic-quest',
  'focus-finder',
  'pattern-master',
];

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sunday = 0

/**
 * Builds the 7-day activity calendar ending at referenceDate.
 */
export function buildWeeklyActivity(
  qualifyingSessions: GameSessionRecord[],
  workouts: DailyWorkoutRecord[],
  referenceDate: Date = new Date()
): WeeklyActivityDay[] {
  const safeSessions = Array.isArray(qualifyingSessions) ? qualifyingSessions : [];
  const safeWorkouts = Array.isArray(workouts) ? workouts : [];
  const result: WeeklyActivityDay[] = [];
  const todayKey = getLocalDateKey(referenceDate);

  // Group qualifying sessions by dateKey
  const sessionCountByDate: Record<string, { count: number; durationMs: number }> = {};
  safeSessions.forEach((s) => {
    if (!s) return;
    if (!sessionCountByDate[s.dateKey]) {
      sessionCountByDate[s.dateKey] = { count: 0, durationMs: 0 };
    }
    sessionCountByDate[s.dateKey].count += 1;
    sessionCountByDate[s.dateKey].durationMs += s.durationMs || 0;
  });

  // Set of completed workout date keys
  const completedWorkoutDates = new Set(
    safeWorkouts.filter((w) => w && w.status === 'completed').map((w) => w.dateKey)
  );

  // Generate 7 days in chronological order: [today - 6 days, ..., today]
  for (let i = 6; i >= 0; i--) {
    const d = new Date(referenceDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = getLocalDateKey(d);
    const dayIndex = d.getDay();
    const dayStats = sessionCountByDate[dateKey] || { count: 0, durationMs: 0 };

    result.push({
      dateKey,
      dayLabel: DAY_LABELS[dayIndex] || '•',
      dateNum: d.getDate(),
      isToday: dateKey === todayKey,
      hasCompletedWorkout: completedWorkoutDates.has(dateKey),
      sessionsCount: dayStats.count,
      totalDurationMs: dayStats.durationMs,
    });
  }

  return result;
}

/**
 * Derives comprehensive dashboard data from session records and workout records.
 */
export function aggregateDashboardData(
  allSessions: GameSessionRecord[],
  allWorkouts: DailyWorkoutRecord[],
  referenceDate: Date = new Date(),
  maxRecentSessions = 20
): DashboardData {
  const safeSessions = Array.isArray(allSessions) ? allSessions : [];
  const safeWorkouts = Array.isArray(allWorkouts) ? allWorkouts : [];

  // 1. Filter qualifying sessions (completed or concluded with evaluation)
  const qualifyingSessions = safeSessions.filter(
    (s) => s && (s.outcome === 'completed' || s.outcome === 'game-over')
  );

  const totalGameSessions = qualifyingSessions.length;
  const totalScore = qualifyingSessions.reduce((sum, s) => sum + (s.finalScore || 0), 0);
  const totalDurationMs = qualifyingSessions.reduce((sum, s) => sum + (s.durationMs || 0), 0);
  const totalTrainingMinutes = Math.round(totalDurationMs / 60000);

  // 2. Completed daily workouts (status === 'completed' only)
  const completedWorkouts = safeWorkouts.filter((w) => w && w.status === 'completed');
  const totalCompletedWorkouts = completedWorkouts.length;

  // 3. Streaks
  const workoutStreak = calculateStreak(
    completedWorkouts.map((w) => w.dateKey),
    referenceDate
  );
  const sessionStreak = calculateStreak(
    qualifyingSessions.map((s) => s.dateKey),
    referenceDate
  );

  // 4. Weekly 7-day activity
  const last7DaysActivity = buildWeeklyActivity(qualifyingSessions, allWorkouts, referenceDate);

  // 5. In-app Drill Performance Index (average score across evaluated sessions)
  const performanceIndex = calculateDrillPerformanceIndex(totalScore, totalGameSessions);

  // 6. Per-Game breakdown & trends
  const gameStats: Record<GameId, DashboardGameMetricSummary> = {} as Record<
    GameId,
    DashboardGameMetricSummary
  >;

  ALL_GAME_IDS.forEach((gameId) => {
    // Sessions for this game, sorted newest to oldest
    const gameSessions = qualifyingSessions
      .filter((s) => s.gameId === gameId)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    const count = gameSessions.length;
    const highestScore = gameSessions.reduce((max, s) => Math.max(max, s.finalScore || 0), 0);
    const highestLevel = gameSessions.reduce((max, s) => Math.max(max, s.highestLevel || 1), 1);
    const sumAccuracy = gameSessions.reduce((sum, s) => sum + (s.accuracyPercentage || 0), 0);
    const avgAccuracy = count > 0 ? Math.round(sumAccuracy / count) : 0;

    // Up to 5 recent scores, ordered oldest to newest for trend left-to-right progression
    const recentScores = gameSessions
      .slice(0, 5)
      .map((s) => s.finalScore || 0)
      .reverse();

    // Game-specific metric reductions
    let perfectRoundsTotal: number | undefined;
    let maxDigitSpan: number | undefined;
    let bestReactionMs: number | undefined;
    let avgReactionMs: number | undefined;
    let bestFindTimeMs: number | undefined;
    let avgFindTimeMs: number | undefined;
    let avgResponseTimeMs: number | undefined;

    if (gameId === 'memory-matrix') {
      perfectRoundsTotal = gameSessions.reduce(
        (sum, s) => sum + (Number(s.gameSpecificMetrics?.perfectRounds) || 0),
        0
      );
    } else if (gameId === 'number-recall') {
      perfectRoundsTotal = gameSessions.reduce(
        (sum, s) => sum + (Number(s.gameSpecificMetrics?.perfectRounds) || 0),
        0
      );
      maxDigitSpan = gameSessions.reduce(
        (max, s) => Math.max(max, Number(s.gameSpecificMetrics?.maxDigitSpan) || 0),
        0
      );
    } else if (gameId === 'quick-reaction') {
      const validReactions = gameSessions
        .map((s) => Number(s.gameSpecificMetrics?.bestReactionMs))
        .filter((v) => Number.isFinite(v) && v > 0);
      bestReactionMs = validReactions.length > 0 ? Math.min(...validReactions) : undefined;

      const avgReactions = gameSessions
        .map((s) => Number(s.gameSpecificMetrics?.avgReactionMs))
        .filter((v) => Number.isFinite(v) && v > 0);
      avgReactionMs =
        avgReactions.length > 0
          ? Math.round(avgReactions.reduce((a, b) => a + b, 0) / avgReactions.length)
          : undefined;
    } else if (gameId === 'focus-finder') {
      const validFindTimes = gameSessions
        .map((s) => Number(s.gameSpecificMetrics?.bestFindTimeMs))
        .filter((v) => Number.isFinite(v) && v > 0);
      bestFindTimeMs = validFindTimes.length > 0 ? Math.min(...validFindTimes) : undefined;

      const avgFindTimes = gameSessions
        .map((s) => Number(s.gameSpecificMetrics?.avgFindTimeMs))
        .filter((v) => Number.isFinite(v) && v > 0);
      avgFindTimeMs =
        avgFindTimes.length > 0
          ? Math.round(avgFindTimes.reduce((a, b) => a + b, 0) / avgFindTimes.length)
          : undefined;
    } else if (gameId === 'logic-quest' || gameId === 'pattern-master') {
      const validResponseTimes = gameSessions
        .map((s) => Number(s.gameSpecificMetrics?.avgResponseTimeMs))
        .filter((v) => Number.isFinite(v) && v > 0);
      avgResponseTimeMs =
        validResponseTimes.length > 0
          ? Math.round(validResponseTimes.reduce((a, b) => a + b, 0) / validResponseTimes.length)
          : undefined;
    }

    gameStats[gameId] = {
      gameId,
      sessionsCount: count,
      highestScore,
      avgAccuracy,
      highestLevel,
      recentScores,
      perfectRoundsTotal,
      maxDigitSpan,
      bestReactionMs,
      avgReactionMs,
      bestFindTimeMs,
      avgFindTimeMs,
      avgResponseTimeMs,
    };
  });

  // 7. Recent sessions limited and sorted descending by completion time
  const sortedSessions = [...safeSessions].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
  const recentSessions = sortedSessions.slice(0, Math.max(1, maxRecentSessions));

  return {
    totalGameSessions,
    totalCompletedWorkouts,
    totalTrainingMinutes,
    workoutStreak,
    sessionStreak,
    last7DaysActivity,
    performanceIndex,
    gameStats,
    recentSessions,
  };
}
