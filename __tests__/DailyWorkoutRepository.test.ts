import AsyncStorage from '@react-native-async-storage/async-storage';
import { workoutRepository } from '../src/workout/workoutRepository';
import { GameSessionRecord } from '../src/history/types';

describe('Daily Workout Repository', () => {
  beforeEach(async () => {
    await workoutRepository.clearAllWorkoutsForTesting();
    jest.clearAllMocks();
  });

  const createMockSessionRecord = (
    gameId: any,
    dateKey: string,
    overrides?: Partial<GameSessionRecord>
  ): GameSessionRecord => ({
    id: `session_${gameId}_${Date.now()}_${Math.random()}`,
    schemaVersion: 1,
    gameId,
    startedAt: `${dateKey}T10:00:00.000Z`,
    completedAt: `${dateKey}T10:03:00.000Z`,
    dateKey,
    outcome: 'completed',
    finalScore: 12000,
    accuracyPercentage: 90,
    roundsCompleted: 10,
    totalRounds: 10,
    highestLevel: 5,
    durationMs: 180000,
    ...overrides,
  });

  it('creates and returns today workout if none exists', async () => {
    const today = new Date('2026-10-22T12:00:00Z');
    const workout = await workoutRepository.getOrCreateTodayWorkout(today);

    expect(workout).toBeDefined();
    expect(workout.dateKey).toBe('2026-10-22');
    expect(workout.status).toBe('not-started');
    expect(workout.drills).toHaveLength(3);
    expect(workout.currentDrillIndex).toBe(0);
  });

  it('returns existing workout on subsequent calls for the same day', async () => {
    const today = new Date('2026-10-22T12:00:00Z');
    const workout1 = await workoutRepository.getOrCreateTodayWorkout(today);
    const workout2 = await workoutRepository.getOrCreateTodayWorkout(today);

    expect(workout1.id).toBe(workout2.id);
    expect(workout1.dateKey).toBe(workout2.dateKey);
  });

  it('updates drill 1 completion, sets workout in-progress, and advances drill index', async () => {
    const todayKey = '2026-10-22';
    const workout = await workoutRepository.getOrCreateTodayWorkout(new Date(`${todayKey}T12:00:00Z`));
    const drill0 = workout.drills[0];

    const session = createMockSessionRecord(drill0.gameId, todayKey, {
      finalScore: 15400,
      accuracyPercentage: 95,
      durationMs: 150000,
    });

    const updated = await workoutRepository.recordDrillCompletion({
      dateKey: todayKey,
      drillIndex: 0,
      sessionRecord: session,
    });

    expect(updated.status).toBe('in-progress');
    expect(updated.currentDrillIndex).toBe(1);
    expect(updated.drills[0].status).toBe('completed');
    expect(updated.drills[0].score).toBe(15400);
    expect(updated.drills[0].accuracyPercentage).toBe(95);
    expect(updated.drills[0].durationMs).toBe(150000);
    expect(updated.drills[1].status).toBe('pending');
  });

  it('completes the workout when all 3 drills are recorded', async () => {
    const todayKey = '2026-10-22';
    const workout = await workoutRepository.getOrCreateTodayWorkout(new Date(`${todayKey}T12:00:00Z`));

    // Drill 0
    await workoutRepository.recordDrillCompletion({
      dateKey: todayKey,
      drillIndex: 0,
      sessionRecord: createMockSessionRecord(workout.drills[0].gameId, todayKey, {
        finalScore: 10000,
        accuracyPercentage: 90,
        durationMs: 120000,
      }),
    });

    // Drill 1
    await workoutRepository.recordDrillCompletion({
      dateKey: todayKey,
      drillIndex: 1,
      sessionRecord: createMockSessionRecord(workout.drills[1].gameId, todayKey, {
        finalScore: 8000,
        accuracyPercentage: 100,
        durationMs: 100000,
      }),
    });

    // Drill 2
    const finalWorkout = await workoutRepository.recordDrillCompletion({
      dateKey: todayKey,
      drillIndex: 2,
      sessionRecord: createMockSessionRecord(workout.drills[2].gameId, todayKey, {
        finalScore: 12000,
        accuracyPercentage: 80,
        durationMs: 140000,
      }),
    });

    expect(finalWorkout.status).toBe('completed');
    expect(finalWorkout.currentDrillIndex).toBe(3);
    expect(finalWorkout.completedAt).toBeDefined();
    expect(finalWorkout.totalDurationMs).toBe(120000 + 100000 + 140000);
    // Average accuracy: (90 + 100 + 80) / 3 = 90%
    expect(finalWorkout.averageAccuracy).toBe(90);
  });

  it('is idempotent: recording the same drill repeatedly does not corrupt state or advance past 3', async () => {
    const todayKey = '2026-10-22';
    const workout = await workoutRepository.getOrCreateTodayWorkout(new Date(`${todayKey}T12:00:00Z`));

    const session = createMockSessionRecord(workout.drills[0].gameId, todayKey);
    await workoutRepository.recordDrillCompletion({
      dateKey: todayKey,
      drillIndex: 0,
      sessionRecord: session,
    });

    // Duplicate call with same drillIndex
    const res = await workoutRepository.recordDrillCompletion({
      dateKey: todayKey,
      drillIndex: 0,
      sessionRecord: session,
    });

    expect(res.currentDrillIndex).toBe(1);
    expect(res.drills[0].status).toBe('completed');
  });

  it('calculates daily workout streak strictly from completed workouts', async () => {
    const refDate = new Date('2026-10-24T12:00:00Z');

    // 1. Incomplete workout on 2026-10-22 (only 2 drills completed)
    const w1 = await workoutRepository.getOrCreateTodayWorkout(new Date('2026-10-22T10:00:00Z'));
    await workoutRepository.recordDrillCompletion({
      dateKey: '2026-10-22',
      drillIndex: 0,
      sessionRecord: createMockSessionRecord(w1.drills[0].gameId, '2026-10-22'),
    });
    await workoutRepository.recordDrillCompletion({
      dateKey: '2026-10-22',
      drillIndex: 1,
      sessionRecord: createMockSessionRecord(w1.drills[1].gameId, '2026-10-22'),
    });

    // Incomplete workout does NOT count for streak
    let streak = await workoutRepository.getWorkoutStreak(refDate);
    expect(streak.currentStreak).toBe(0);

    // 2. Complete workout on 2026-10-23
    const w2 = await workoutRepository.getOrCreateTodayWorkout(new Date('2026-10-23T10:00:00Z'));
    for (let i = 0; i < 3; i++) {
      await workoutRepository.recordDrillCompletion({
        dateKey: '2026-10-23',
        drillIndex: i,
        sessionRecord: createMockSessionRecord(w2.drills[i].gameId, '2026-10-23'),
      });
    }

    // 3. Complete workout on 2026-10-24
    const w3 = await workoutRepository.getOrCreateTodayWorkout(new Date('2026-10-24T10:00:00Z'));
    for (let i = 0; i < 3; i++) {
      await workoutRepository.recordDrillCompletion({
        dateKey: '2026-10-24',
        drillIndex: i,
        sessionRecord: createMockSessionRecord(w3.drills[i].gameId, '2026-10-24'),
      });
    }

    streak = await workoutRepository.getWorkoutStreak(refDate);
    expect(streak.currentStreak).toBe(2); // Oct 23 and Oct 24
    expect(streak.bestStreak).toBe(2);
  });

  it('resets today workout back to pending without affecting other dates', async () => {
    const today = new Date('2026-10-22T12:00:00Z');
    const workout = await workoutRepository.getOrCreateTodayWorkout(today);

    await workoutRepository.recordDrillCompletion({
      dateKey: '2026-10-22',
      drillIndex: 0,
      sessionRecord: createMockSessionRecord(workout.drills[0].gameId, '2026-10-22'),
    });

    const reset = await workoutRepository.resetTodayWorkout(today);
    expect(reset.status).toBe('not-started');
    expect(reset.currentDrillIndex).toBe(0);
    expect(reset.drills.every((d) => d.status === 'pending')).toBe(true);
  });

  it('handles AsyncStorage read errors gracefully using memory cache', async () => {
    const today = new Date('2026-10-22T12:00:00Z');
    await workoutRepository.getOrCreateTodayWorkout(today);

    // Mock getItem error
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage failure'));

    const result = await workoutRepository.getWorkoutForDate('2026-10-22');
    expect(result).toBeDefined();
    expect(result?.dateKey).toBe('2026-10-22');
  });

  it('handles AsyncStorage write errors gracefully without throwing', async () => {
    const today = new Date('2026-10-22T12:00:00Z');
    const workout = await workoutRepository.getOrCreateTodayWorkout(today);

    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Disk full'));

    const saveSuccess = await workoutRepository.saveWorkout(workout);
    expect(saveSuccess).toBe(false);

    // Memory cache should still reflect the record
    const retrieved = await workoutRepository.getWorkoutForDate('2026-10-22');
    expect(retrieved).toBeDefined();
  });
});
