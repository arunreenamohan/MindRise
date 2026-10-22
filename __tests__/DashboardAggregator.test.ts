import {
  aggregateDashboardData,
  buildWeeklyActivity,
} from '../src/history/dashboardAggregator';
import { GameSessionRecord } from '../src/history/types';
import { DailyWorkoutRecord, WorkoutDrill } from '../src/workout/types';

describe('Dashboard Aggregator', () => {
  const refDate = new Date(2026, 9, 22, 12, 0, 0); // 2026-10-22

  const mockDrill = (id: string, gameId = 'memory-matrix'): WorkoutDrill => ({
    id,
    order: 1,
    gameId: gameId as any,
    category: 'memory',
    categoryLabel: 'Memory',
    estimatedDurationMins: 3,
    status: 'completed',
  });

  it('aggregates cleanly for empty history', () => {
    const data = aggregateDashboardData([], [], refDate);
    expect(data.totalGameSessions).toBe(0);
    expect(data.totalCompletedWorkouts).toBe(0);
    expect(data.totalTrainingMinutes).toBe(0);
    expect(data.performanceIndex).toBeNull();
    expect(data.workoutStreak.currentStreak).toBe(0);
    expect(data.sessionStreak.currentStreak).toBe(0);
    expect(data.last7DaysActivity).toHaveLength(7);
    expect(data.recentSessions).toHaveLength(0);

    // Each of the 6 games should have zero stats
    expect(data.gameStats['memory-matrix'].sessionsCount).toBe(0);
    expect(data.gameStats['number-recall'].sessionsCount).toBe(0);
    expect(data.gameStats['quick-reaction'].sessionsCount).toBe(0);
    expect(data.gameStats['logic-quest'].sessionsCount).toBe(0);
    expect(data.gameStats['focus-finder'].sessionsCount).toBe(0);
    expect(data.gameStats['pattern-master'].sessionsCount).toBe(0);
  });

  it('strictly counts only status === completed workouts as completed daily workouts', () => {
    const workouts: DailyWorkoutRecord[] = [
      {
        id: 'w1',
        schemaVersion: 1,
        dateKey: '2026-10-22',
        status: 'completed',
        drills: [mockDrill('d1'), mockDrill('d2'), mockDrill('d3')],
        currentDrillIndex: 3,
        totalDurationMs: 180000,
        averageAccuracy: 95,
      },
      {
        id: 'w2',
        schemaVersion: 1,
        dateKey: '2026-10-21',
        status: 'in-progress',
        drills: [mockDrill('d4'), mockDrill('d5'), mockDrill('d6')],
        currentDrillIndex: 1,
        totalDurationMs: 60000,
        averageAccuracy: 90,
      },
      {
        id: 'w3',
        schemaVersion: 1,
        dateKey: '2026-10-20',
        status: 'not-started',
        drills: [mockDrill('d7'), mockDrill('d8'), mockDrill('d9')],
        currentDrillIndex: 0,
        totalDurationMs: 0,
        averageAccuracy: 0,
      },
      {
        id: 'w4',
        schemaVersion: 1,
        dateKey: '2026-10-19',
        status: 'completed',
        drills: [mockDrill('d10'), mockDrill('d11'), mockDrill('d12')],
        currentDrillIndex: 3,
        totalDurationMs: 200000,
        averageAccuracy: 88,
      },
    ];

    const data = aggregateDashboardData([], workouts, refDate);
    expect(data.totalCompletedWorkouts).toBe(2);
  });

  it('separates game session totals from daily workout totals', () => {
    const sessions: GameSessionRecord[] = [
      {
        id: 's1',
        schemaVersion: 1,
        gameId: 'memory-matrix',
        startedAt: '2026-10-22T10:00:00Z',
        completedAt: '2026-10-22T10:03:00Z',
        dateKey: '2026-10-22',
        outcome: 'completed',
        finalScore: 1200,
        accuracyPercentage: 90,
        roundsCompleted: 10,
        totalRounds: 10,
        highestLevel: 4,
        durationMs: 180000,
      },
      {
        id: 's2',
        schemaVersion: 1,
        gameId: 'quick-reaction',
        startedAt: '2026-10-22T10:05:00Z',
        completedAt: '2026-10-22T10:07:00Z',
        dateKey: '2026-10-22',
        outcome: 'completed',
        finalScore: 1500,
        accuracyPercentage: 95,
        roundsCompleted: 10,
        totalRounds: 10,
        highestLevel: 3,
        durationMs: 120000,
      },
      {
        id: 's3',
        schemaVersion: 1,
        gameId: 'number-recall',
        startedAt: '2026-10-22T10:10:00Z',
        completedAt: '2026-10-22T10:13:00Z',
        dateKey: '2026-10-22',
        outcome: 'abandoned', // Abandoned session should not count in qualifying totals
        finalScore: 200,
        accuracyPercentage: 50,
        roundsCompleted: 2,
        totalRounds: 10,
        highestLevel: 1,
        durationMs: 40000,
      },
    ];

    const workouts: DailyWorkoutRecord[] = [
      {
        id: 'w1',
        schemaVersion: 1,
        dateKey: '2026-10-22',
        status: 'completed',
        drills: [mockDrill('d1'), mockDrill('d2'), mockDrill('d3')],
        currentDrillIndex: 3,
        totalDurationMs: 300000,
        averageAccuracy: 92,
      },
    ];

    const data = aggregateDashboardData(sessions, workouts, refDate);
    expect(data.totalGameSessions).toBe(2); // s1 and s2 (s3 is abandoned)
    expect(data.totalCompletedWorkouts).toBe(1);
    expect(data.totalTrainingMinutes).toBe(5); // (180000 + 120000) / 60000
    expect(data.performanceIndex).toBe(1350); // (1200 + 1500) / 2
  });

  it('builds accurate 7-day activity matrix across midnight and month boundaries', () => {
    const sessions: GameSessionRecord[] = [
      {
        id: 's1',
        schemaVersion: 1,
        gameId: 'memory-matrix',
        startedAt: '2026-10-22T10:00:00Z',
        completedAt: '2026-10-22T10:03:00Z',
        dateKey: '2026-10-22',
        outcome: 'completed',
        finalScore: 1000,
        accuracyPercentage: 80,
        roundsCompleted: 10,
        totalRounds: 10,
        highestLevel: 3,
        durationMs: 180000,
      },
      {
        id: 's2',
        schemaVersion: 1,
        gameId: 'logic-quest',
        startedAt: '2026-10-20T10:00:00Z',
        completedAt: '2026-10-20T10:03:00Z',
        dateKey: '2026-10-20',
        outcome: 'completed',
        finalScore: 1100,
        accuracyPercentage: 85,
        roundsCompleted: 10,
        totalRounds: 10,
        highestLevel: 3,
        durationMs: 180000,
      },
    ];

    const workouts: DailyWorkoutRecord[] = [
      {
        id: 'w1',
        schemaVersion: 1,
        dateKey: '2026-10-22',
        status: 'completed',
        drills: [mockDrill('d1'), mockDrill('d2'), mockDrill('d3')],
        currentDrillIndex: 3,
        totalDurationMs: 180000,
        averageAccuracy: 80,
      },
    ];

    const weekly = buildWeeklyActivity(sessions, workouts, refDate);
    expect(weekly).toHaveLength(7);

    // Last item should be today (2026-10-22)
    const today = weekly[6];
    expect(today.dateKey).toBe('2026-10-22');
    expect(today.isToday).toBe(true);
    expect(today.hasCompletedWorkout).toBe(true);
    expect(today.sessionsCount).toBe(1);

    // 2026-10-20 (index 4) had individual session but no completed workout
    const oct20 = weekly[4];
    expect(oct20.dateKey).toBe('2026-10-20');
    expect(oct20.isToday).toBe(false);
    expect(oct20.hasCompletedWorkout).toBe(false);
    expect(oct20.sessionsCount).toBe(1);

    // 2026-10-21 (index 5) had nothing (rest day)
    const oct21 = weekly[5];
    expect(oct21.dateKey).toBe('2026-10-21');
    expect(oct21.hasCompletedWorkout).toBe(false);
    expect(oct21.sessionsCount).toBe(0);
  });

  it('orders recent scores chronologically from oldest to newest for trend sparklines', () => {
    const sessions: GameSessionRecord[] = [
      {
        id: 's_old',
        schemaVersion: 1,
        gameId: 'quick-reaction',
        startedAt: '2026-10-18T10:00:00Z',
        completedAt: '2026-10-18T10:02:00Z',
        dateKey: '2026-10-18',
        outcome: 'completed',
        finalScore: 1000,
        accuracyPercentage: 80,
        roundsCompleted: 10,
        totalRounds: 10,
        highestLevel: 2,
        durationMs: 120000,
      },
      {
        id: 's_mid',
        schemaVersion: 1,
        gameId: 'quick-reaction',
        startedAt: '2026-10-20T10:00:00Z',
        completedAt: '2026-10-20T10:02:00Z',
        dateKey: '2026-10-20',
        outcome: 'completed',
        finalScore: 1500,
        accuracyPercentage: 90,
        roundsCompleted: 10,
        totalRounds: 10,
        highestLevel: 3,
        durationMs: 120000,
      },
      {
        id: 's_new',
        schemaVersion: 1,
        gameId: 'quick-reaction',
        startedAt: '2026-10-22T10:00:00Z',
        completedAt: '2026-10-22T10:02:00Z',
        dateKey: '2026-10-22',
        outcome: 'completed',
        finalScore: 2100,
        accuracyPercentage: 100,
        roundsCompleted: 10,
        totalRounds: 10,
        highestLevel: 4,
        durationMs: 120000,
      },
    ];

    const data = aggregateDashboardData(sessions, [], refDate);
    const qrStats = data.gameStats['quick-reaction'];

    expect(qrStats.sessionsCount).toBe(3);
    expect(qrStats.highestScore).toBe(2100);
    // Chronological order: [1000, 1500, 2100]
    expect(qrStats.recentScores).toEqual([1000, 1500, 2100]);
  });

  it('aggregates meaningful game-specific metrics safely', () => {
    const sessions: GameSessionRecord[] = [
      {
        id: 'nr1',
        schemaVersion: 1,
        gameId: 'number-recall',
        startedAt: '2026-10-22T10:00:00Z',
        completedAt: '2026-10-22T10:03:00Z',
        dateKey: '2026-10-22',
        outcome: 'completed',
        finalScore: 2000,
        accuracyPercentage: 100,
        roundsCompleted: 10,
        totalRounds: 10,
        highestLevel: 6,
        durationMs: 180000,
        gameSpecificMetrics: {
          maxDigitSpan: 8,
          perfectRounds: 9,
        },
      },
      {
        id: 'qr1',
        schemaVersion: 1,
        gameId: 'quick-reaction',
        startedAt: '2026-10-22T11:00:00Z',
        completedAt: '2026-10-22T11:02:00Z',
        dateKey: '2026-10-22',
        outcome: 'completed',
        finalScore: 1800,
        accuracyPercentage: 90,
        roundsCompleted: 10,
        totalRounds: 10,
        highestLevel: 4,
        durationMs: 120000,
        gameSpecificMetrics: {
          bestReactionMs: 220,
          avgReactionMs: 290,
        },
      },
      {
        id: 'ff1',
        schemaVersion: 1,
        gameId: 'focus-finder',
        startedAt: '2026-10-22T12:00:00Z',
        completedAt: '2026-10-22T12:02:00Z',
        dateKey: '2026-10-22',
        outcome: 'completed',
        finalScore: 3500,
        accuracyPercentage: 95,
        roundsCompleted: 10,
        totalRounds: 10,
        highestLevel: 5,
        durationMs: 120000,
        gameSpecificMetrics: {
          bestFindTimeMs: 450,
          avgFindTimeMs: 820,
        },
      },
      {
        id: 'lq1',
        schemaVersion: 1,
        gameId: 'logic-quest',
        startedAt: '2026-10-22T13:00:00Z',
        completedAt: '2026-10-22T13:03:00Z',
        dateKey: '2026-10-22',
        outcome: 'completed',
        finalScore: 1600,
        accuracyPercentage: 90,
        roundsCompleted: 10,
        totalRounds: 10,
        highestLevel: 4,
        durationMs: 180000,
        gameSpecificMetrics: {
          avgResponseTimeMs: 3400,
        },
      },
    ];

    const data = aggregateDashboardData(sessions, [], refDate);

    expect(data.gameStats['number-recall'].maxDigitSpan).toBe(8);
    expect(data.gameStats['number-recall'].perfectRoundsTotal).toBe(9);

    expect(data.gameStats['quick-reaction'].bestReactionMs).toBe(220);
    expect(data.gameStats['quick-reaction'].avgReactionMs).toBe(290);

    expect(data.gameStats['focus-finder'].bestFindTimeMs).toBe(450);
    expect(data.gameStats['focus-finder'].avgFindTimeMs).toBe(820);

    expect(data.gameStats['logic-quest'].avgResponseTimeMs).toBe(3400);
  });
});
