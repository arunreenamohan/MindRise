import { workoutRepository } from '../src/workout/workoutRepository';
import { historyRepository } from '../src/history';
import { GameSessionRecord } from '../src/history/types';

describe('Daily Workout End-to-End Flow & Interruption Lifecycle', () => {
  beforeEach(async () => {
    await workoutRepository.clearAllWorkoutsForTesting();
    await historyRepository.clearHistory();
    jest.clearAllMocks();
  });

  const createMockSession = (
    gameId: any,
    dateKey: string,
    score: number = 10000,
    accuracy: number = 90,
    durationMs: number = 120000
  ): GameSessionRecord => ({
    id: `session_${gameId}_${Date.now()}_${Math.random()}`,
    schemaVersion: 1,
    gameId,
    startedAt: `${dateKey}T08:00:00.000Z`,
    completedAt: `${dateKey}T08:02:00.000Z`,
    dateKey,
    outcome: 'completed',
    finalScore: score,
    accuracyPercentage: accuracy,
    roundsCompleted: 10,
    totalRounds: 10,
    highestLevel: 4,
    durationMs,
  });

  it('handles partial completion, app closure, and resuming the same day', async () => {
    const today = new Date('2026-10-22T09:00:00Z');
    const dateKey = '2026-10-22';

    // 1. User opens Daily Workout for today
    const workout = await workoutRepository.getOrCreateTodayWorkout(today);
    expect(workout.status).toBe('not-started');
    expect(workout.currentDrillIndex).toBe(0);

    // 2. User finishes Drill 1 (e.g. Memory Matrix)
    const drill1Session = createMockSession(workout.drills[0].gameId, dateKey, 14000, 92, 130000);
    await historyRepository.saveSession(drill1Session);
    await workoutRepository.recordDrillCompletion({
      dateKey,
      drillIndex: 0,
      sessionRecord: drill1Session,
    });

    // 3. User closes the app or navigates away. State is persisted in storage.
    // Simulate re-opening the app later on the same day:
    const reloaded = await workoutRepository.getOrCreateTodayWorkout(today);
    expect(reloaded.status).toBe('in-progress');
    expect(reloaded.currentDrillIndex).toBe(1);
    expect(reloaded.drills[0].status).toBe('completed');
    expect(reloaded.drills[0].score).toBe(14000);
    expect(reloaded.drills[1].status).toBe('pending');
    expect(reloaded.drills[2].status).toBe('pending');

    // Individual game session is preserved in history repository
    const historySessions = await historyRepository.getSessions();
    expect(historySessions).toHaveLength(1);
    expect(historySessions[0].id).toBe(drill1Session.id);
  });

  it('handles interrupted drill without losing prior completed drill progress', async () => {
    const today = new Date('2026-10-22T09:00:00Z');
    const dateKey = '2026-10-22';

    const workout = await workoutRepository.getOrCreateTodayWorkout(today);

    // Complete Drill 1
    const s1 = createMockSession(workout.drills[0].gameId, dateKey, 11000, 85, 110000);
    await historyRepository.saveSession(s1);
    await workoutRepository.recordDrillCompletion({
      dateKey,
      drillIndex: 0,
      sessionRecord: s1,
    });

    // User starts Drill 2 but quits halfway (no session completion recorded for drill 2)
    // When returning to coordinator:
    const currentWorkout = await workoutRepository.getOrCreateTodayWorkout(today);
    expect(currentWorkout.drills[0].status).toBe('completed');
    expect(currentWorkout.drills[1].status).toBe('pending');
    expect(currentWorkout.currentDrillIndex).toBe(1);

    // Now user plays and finishes Drill 2
    const s2 = createMockSession(workout.drills[1].gameId, dateKey, 13500, 95, 115000);
    await historyRepository.saveSession(s2);
    const afterDrill2 = await workoutRepository.recordDrillCompletion({
      dateKey,
      drillIndex: 1,
      sessionRecord: s2,
    });
    expect(afterDrill2.drills[1].status).toBe('completed');
    expect(afterDrill2.currentDrillIndex).toBe(2);
  });

  it('resuming on the next day starts a fresh daily workout while preserving past individual history', async () => {
    const day1 = new Date('2026-10-22T10:00:00Z');
    const day2 = new Date('2026-10-23T10:00:00Z');

    // On Day 1: user only finishes Drill 1
    const w1 = await workoutRepository.getOrCreateTodayWorkout(day1);
    const s1 = createMockSession(w1.drills[0].gameId, '2026-10-22', 10000);
    await historyRepository.saveSession(s1);
    await workoutRepository.recordDrillCompletion({
      dateKey: '2026-10-22',
      drillIndex: 0,
      sessionRecord: s1,
    });

    // On Day 2: user reopens the app
    const w2 = await workoutRepository.getOrCreateTodayWorkout(day2);
    expect(w2.dateKey).toBe('2026-10-23');
    expect(w2.status).toBe('not-started');
    expect(w2.currentDrillIndex).toBe(0);
    expect(w2.drills.every((d) => d.status === 'pending')).toBe(true);

    // Day 1 workout is still in storage as in-progress
    const pastW1 = await workoutRepository.getWorkoutForDate('2026-10-22');
    expect(pastW1?.status).toBe('in-progress');

    // Day 1 session is still in history repository
    const sessions = await historyRepository.getSessions();
    expect(sessions.some((s) => s.id === s1.id)).toBe(true);
  });

  it('completing the entire daily workout updates history and streak consistently', async () => {
    const today = new Date('2026-10-22T10:00:00Z');
    const dateKey = '2026-10-22';
    const workout = await workoutRepository.getOrCreateTodayWorkout(today);

    // Play and record all 3 drills in sequence
    for (let i = 0; i < 3; i++) {
      const session = createMockSession(
        workout.drills[i].gameId,
        dateKey,
        10000 + i * 1000,
        90 + i * 2,
        120000
      );
      await historyRepository.saveSession(session);
      await workoutRepository.recordDrillCompletion({
        dateKey,
        drillIndex: i,
        sessionRecord: session,
      });
    }

    // Daily workout is completed
    const finishedWorkout = await workoutRepository.getWorkoutForDate(dateKey);
    expect(finishedWorkout?.status).toBe('completed');
    expect(finishedWorkout?.currentDrillIndex).toBe(3);

    // History repository has 3 sessions
    const historySessions = await historyRepository.getSessions();
    expect(historySessions).toHaveLength(3);

    // Daily workout streak is active (1 day)
    const workoutStreak = await workoutRepository.getWorkoutStreak(today);
    expect(workoutStreak.currentStreak).toBe(1);

    // General history summary streak is also active
    const summary = await historyRepository.getHistorySummary(today);
    expect(summary.currentStreak).toBe(1);
    expect(summary.totalWorkouts).toBe(3);
  });
});
