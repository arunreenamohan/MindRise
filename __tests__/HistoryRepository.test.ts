import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  historyRepository,
  getLocalDateKey,
  getDaysDifference,
  calculateStreak,
  calculateDrillPerformanceIndex,
  GameSessionRecord,
  CURRENT_SCHEMA_VERSION,
} from '../src/history';

describe('Streak Calculator & Date Utilities', () => {
  it('formats local date keys as YYYY-MM-DD with zero-padding', () => {
    const d1 = new Date(2026, 0, 5); // Jan 5, 2026
    expect(getLocalDateKey(d1)).toBe('2026-01-05');

    const d2 = new Date(2026, 9, 21); // Oct 21, 2026
    expect(getLocalDateKey(d2)).toBe('2026-10-21');
  });

  it('calculates calendar day differences accurately across months, leap years, and years', () => {
    // Normal day difference
    expect(getDaysDifference('2026-05-10', '2026-05-15')).toBe(5);
    expect(getDaysDifference('2026-05-15', '2026-05-10')).toBe(-5);
    expect(getDaysDifference('2026-05-10', '2026-05-10')).toBe(0);

    // Month boundary
    expect(getDaysDifference('2026-04-30', '2026-05-01')).toBe(1);

    // Leap year boundary (2024 is a leap year)
    expect(getDaysDifference('2024-02-28', '2024-02-29')).toBe(1);
    expect(getDaysDifference('2024-02-28', '2024-03-01')).toBe(2);

    // Year boundary
    expect(getDaysDifference('2025-12-31', '2026-01-01')).toBe(1);
  });

  describe('calculateStreak', () => {
    const refDate = new Date(2026, 9, 21); // 2026-10-21 (Today)

    it('returns 0 streak for empty sessions', () => {
      const result = calculateStreak([], refDate);
      expect(result.currentStreak).toBe(0);
      expect(result.bestStreak).toBe(0);
    });

    it('recognizes training done today as an active 1-day streak', () => {
      const result = calculateStreak(['2026-10-21'], refDate);
      expect(result.currentStreak).toBe(1);
      expect(result.bestStreak).toBe(1);
    });

    it('recognizes training done yesterday as an active 1-day streak (grace period until midnight)', () => {
      const result = calculateStreak(['2026-10-20'], refDate);
      expect(result.currentStreak).toBe(1);
      expect(result.bestStreak).toBe(1);
    });

    it('breaks current streak if last training was 2 or more days ago, preserving best streak', () => {
      const result = calculateStreak(['2026-10-18', '2026-10-19'], refDate);
      expect(result.currentStreak).toBe(0);
      expect(result.bestStreak).toBe(2);
    });

    it('does not count multiple sessions on the same calendar day as multiple streak days', () => {
      const result = calculateStreak(
        ['2026-10-21', '2026-10-21', '2026-10-21', '2026-10-20', '2026-10-20'],
        refDate
      );
      expect(result.currentStreak).toBe(2);
      expect(result.bestStreak).toBe(2);
    });

    it('calculates consecutive days correctly across month boundaries', () => {
      const dates = [
        '2026-09-29',
        '2026-09-30',
        '2026-10-01',
        '2026-10-02',
        '2026-10-03',
      ];
      const oct3 = new Date(2026, 9, 3);
      const result = calculateStreak(dates, oct3);
      expect(result.currentStreak).toBe(5);
      expect(result.bestStreak).toBe(5);
    });

    it('calculates consecutive days correctly across leap days', () => {
      const leapDates = ['2024-02-27', '2024-02-28', '2024-02-29', '2024-03-01'];
      const mar1 = new Date(2024, 2, 1);
      const result = calculateStreak(leapDates, mar1);
      expect(result.currentStreak).toBe(4);
      expect(result.bestStreak).toBe(4);
    });

    it('calculates consecutive days correctly across year boundaries', () => {
      const yearDates = ['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02'];
      const jan2 = new Date(2026, 0, 2);
      const result = calculateStreak(yearDates, jan2);
      expect(result.currentStreak).toBe(4);
      expect(result.bestStreak).toBe(4);
    });

    it('handles multiple historical streaks and records the best historical streak', () => {
      const dates = [
        '2026-05-01',
        '2026-05-02',
        '2026-05-03',
        '2026-05-04',
        // Gap
        '2026-10-20',
        '2026-10-21',
      ];
      const result = calculateStreak(dates, refDate);
      expect(result.currentStreak).toBe(2);
      expect(result.bestStreak).toBe(4);
    });

    it('remains active when user travels westward or clock shifts where todayKey is slightly behind latestTrained', () => {
      // User trained on 2026-10-22 (in Tokyo or forward timezone), device in Honolulu says today is 2026-10-21
      const result = calculateStreak(['2026-10-21', '2026-10-22'], new Date(2026, 9, 21));
      expect(result.currentStreak).toBe(2);
      expect(result.bestStreak).toBe(2);
    });
  });

  describe('calculateDrillPerformanceIndex', () => {
    it('returns null for uncalibrated history (0 workouts)', () => {
      expect(calculateDrillPerformanceIndex(0, 0)).toBeNull();
      expect(calculateDrillPerformanceIndex(500, 0)).toBeNull();
      expect(calculateDrillPerformanceIndex(500, -1)).toBeNull();
      expect(calculateDrillPerformanceIndex(NaN, 0)).toBeNull();
    });

    it('returns 0 when total score is 0 or negative with positive workouts', () => {
      expect(calculateDrillPerformanceIndex(0, 3)).toBe(0);
      expect(calculateDrillPerformanceIndex(-50, 2)).toBe(0);
    });

    it('computes exact average rounded to integer for single and multiple workouts', () => {
      // 450 / 1 = 450
      expect(calculateDrillPerformanceIndex(450, 1)).toBe(450);

      // (450 + 680) / 2 = 1130 / 2 = 565
      expect(calculateDrillPerformanceIndex(1130, 2)).toBe(565);

      // 1000 / 3 = 333.33 -> 333
      expect(calculateDrillPerformanceIndex(1000, 3)).toBe(333);

      // 1004 / 3 = 334.66 -> 335
      expect(calculateDrillPerformanceIndex(1004, 3)).toBe(335);
    });

    it('handles non-finite scores safely', () => {
      expect(calculateDrillPerformanceIndex(Infinity, 2)).toBe(0);
      expect(calculateDrillPerformanceIndex(NaN, 2)).toBe(0);
    });
  });
});

describe('HistoryRepository', () => {
  const sampleMMRecord: GameSessionRecord = {
    id: 'session_mm_123',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    gameId: 'memory-matrix',
    startedAt: '2026-10-21T09:00:00.000Z',
    completedAt: '2026-10-21T09:01:00.000Z',
    dateKey: '2026-10-21',
    outcome: 'completed',
    finalScore: 450,
    accuracyPercentage: 90,
    roundsCompleted: 10,
    totalRounds: 10,
    highestLevel: 5,
    durationMs: 60000,
    gameSpecificMetrics: {
      perfectRounds: 3,
    },
  };

  const sampleNRRecord: GameSessionRecord = {
    id: 'session_nr_456',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    gameId: 'number-recall',
    startedAt: '2026-10-21T09:10:00.000Z',
    completedAt: '2026-10-21T09:12:00.000Z',
    dateKey: '2026-10-21',
    outcome: 'game-over',
    finalScore: 680,
    accuracyPercentage: 85,
    roundsCompleted: 8,
    totalRounds: 8,
    highestLevel: 4,
    durationMs: 120000,
    gameSpecificMetrics: {
      maxDigitSpan: 7,
    },
  };

  beforeEach(async () => {
    historyRepository.resetCacheForTesting();
    await AsyncStorage.clear();
  });

  it('starts with empty history and default summary', async () => {
    const sessions = await historyRepository.getSessions();
    expect(sessions).toEqual([]);

    const summary = await historyRepository.getHistorySummary();
    expect(summary.totalWorkouts).toBe(0);
    expect(summary.totalScore).toBe(0);
    expect(summary.totalDurationMs).toBe(0);
    expect(summary.currentStreak).toBe(0);
    expect(summary.bestStreak).toBe(0);
    expect(summary.lastTrainedDate).toBeNull();
    expect(summary.gameStats['memory-matrix'].sessionsCount).toBe(0);
    expect(summary.gameStats['number-recall'].sessionsCount).toBe(0);
  });

  it('saves completed session and retrieves it', async () => {
    await historyRepository.saveSession(sampleMMRecord);

    const sessions = await historyRepository.getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('session_mm_123');
    expect(sessions[0].finalScore).toBe(450);
  });

  it('prevents duplicate records when saveSession is called twice with same id', async () => {
    await historyRepository.saveSession(sampleMMRecord);
    await historyRepository.saveSession(sampleMMRecord);

    const sessions = await historyRepository.getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('session_mm_123');
  });

  it('maintains session sorting by completedAt in descending order', async () => {
    await historyRepository.saveSession(sampleMMRecord); // completedAt: 09:01:00
    await historyRepository.saveSession(sampleNRRecord); // completedAt: 09:12:00

    const sessions = await historyRepository.getSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions[0].id).toBe('session_nr_456');
    expect(sessions[1].id).toBe('session_mm_123');
  });

  it('respects limit parameter in getSessions', async () => {
    await historyRepository.saveSession(sampleMMRecord);
    await historyRepository.saveSession(sampleNRRecord);

    const limited = await historyRepository.getSessions(1);
    expect(limited).toHaveLength(1);
    expect(limited[0].id).toBe('session_nr_456');
  });

  it('computes aggregated history summary correctly across multiple games', async () => {
    await historyRepository.saveSession(sampleMMRecord);
    await historyRepository.saveSession(sampleNRRecord);

    const summary = await historyRepository.getHistorySummary();
    expect(summary.totalWorkouts).toBe(2);
    // 450 + 680 = 1130
    expect(summary.totalScore).toBe(1130);
    // 60,000ms + 120,000ms = 180,000ms
    expect(summary.totalDurationMs).toBe(180000);

    // Performance per game
    const mmPerf = summary.gameStats['memory-matrix'];
    expect(mmPerf.sessionsCount).toBe(1);
    expect(mmPerf.highestScore).toBe(450);
    expect(mmPerf.avgAccuracy).toBe(90);
    expect(mmPerf.highestLevel).toBe(5);
    expect(mmPerf.perfectRoundsTotal).toBe(3);

    const nrPerf = summary.gameStats['number-recall'];
    expect(nrPerf.sessionsCount).toBe(1);
    expect(nrPerf.highestScore).toBe(680);
    expect(nrPerf.avgAccuracy).toBe(85);
    expect(nrPerf.highestLevel).toBe(4);
    expect(nrPerf.maxDigitSpan).toBe(7);
  });

  it('safely handles corrupted or malformed data in storage', async () => {
    // Inject corrupt JSON into storage directly
    const corruptedPayload = JSON.stringify([
      null,
      {},
      { id: 123 }, // invalid type
      {
        id: 'valid_one',
        gameId: 'memory-matrix',
        startedAt: '2026-10-21T10:00:00.000Z',
        completedAt: '2026-10-21T10:01:00.000Z',
        dateKey: '2026-10-21',
        outcome: 'completed',
        durationMs: 100,
        finalScore: 300,
        accuracyPercentage: 100,
        roundsCompleted: 5,
        totalRounds: 5,
        highestLevel: 3,
      },
      'invalid-string',
      {
        id: '', // empty id is invalid
        gameId: 'memory-matrix',
        startedAt: '2026-10-21T10:00:00.000Z',
        completedAt: '2026-10-21T10:01:00.000Z',
        dateKey: '2026-10-21',
        outcome: 'completed',
        durationMs: 100,
        finalScore: 100,
        accuracyPercentage: 100,
        roundsCompleted: 5,
        totalRounds: 5,
        highestLevel: 3,
      },
    ]);

    await AsyncStorage.setItem('@mindrise_session_history_v1', corruptedPayload);
    historyRepository.resetCacheForTesting();

    const loaded = await historyRepository.getSessions();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('valid_one');
  });

  it('safely handles invalid JSON in storage and creates quarantine backup', async () => {
    const malformed = '{not-a-valid-json-string-content';
    await AsyncStorage.setItem('@mindrise_session_history_v1', malformed);
    historyRepository.resetCacheForTesting();

    const loaded = await historyRepository.getSessions();
    expect(loaded).toEqual([]);

    // Check that recoverable data was quarantined rather than wiped
    const backup = await AsyncStorage.getItem('@mindrise_session_history_v1_corrupt_backup');
    expect(backup).toBe(malformed);
  });

  it('rejects unsupported future schema versions in validateRecord', () => {
    const futureRecord = {
      ...sampleMMRecord,
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
    };
    expect(historyRepository.validateRecord(futureRecord)).toBeNull();
  });

  it('preserves unknown/future schema records in storage without wiping them on resave', async () => {
    const futureRecord = {
      id: 'session_v2_future',
      schemaVersion: 2,
      gameId: 'memory-matrix',
      customFutureField: 'advanced-analytics',
    };
    await AsyncStorage.setItem(
      '@mindrise_session_history_v1',
      JSON.stringify([futureRecord])
    );
    historyRepository.resetCacheForTesting();

    // v1 client should ignore future record for active v1 display
    const loaded = await historyRepository.getSessions();
    expect(loaded).toHaveLength(0);

    // Saving a new session must not erase the preserved future record
    await historyRepository.saveSession(sampleMMRecord);

    const storedRaw = await AsyncStorage.getItem('@mindrise_session_history_v1');
    const parsed = JSON.parse(storedRaw!);
    expect(parsed).toHaveLength(2);
    expect(parsed.some((r: any) => r.id === 'session_v2_future')).toBe(true);
    expect(parsed.some((r: any) => r.id === sampleMMRecord.id)).toBe(true);
  });

  it('prevents persistent overwrite when storage read initially fails', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(async () => {
      throw new Error('SQLite locked');
    });
    historyRepository.resetCacheForTesting();

    // Attempting to read causes storageLoadError flag
    const loaded = await historyRepository.getSessions();
    expect(loaded).toEqual([]);

    // saveSession should abort disk overwrite to avoid wiping existing database
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(async () => {
      throw new Error('SQLite locked');
    });
    const saved = await historyRepository.saveSession(sampleMMRecord);
    expect(saved).toBe(false);
  });

  it('write queue recovers and continues processing subsequent writes after an error', async () => {
    // Force first write to reject
    (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(async () => {
      throw new Error('Disk write error');
    });

    const result1 = await historyRepository.saveSession(sampleMMRecord);
    expect(result1).toBe(false);

    // Subsequent write must succeed without being blocked by previous rejection
    const result2 = await historyRepository.saveSession(sampleNRRecord);
    expect(result2).toBe(true);

    const sessions = await historyRepository.getSessions();
    expect(sessions.some((s) => s.id === sampleNRRecord.id)).toBe(true);
  });

  it('enforces 300-session limit by capping and discarding oldest sessions', async () => {
    const baseTime = new Date('2026-10-01T00:00:00.000Z').getTime();
    const records: GameSessionRecord[] = [];

    // Generate 305 records
    for (let i = 0; i < 305; i++) {
      records.push({
        id: `bulk_session_${i}`,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        gameId: 'memory-matrix',
        startedAt: new Date(baseTime + i * 60000).toISOString(),
        completedAt: new Date(baseTime + i * 60000 + 30000).toISOString(),
        dateKey: '2026-10-01',
        outcome: 'completed',
        finalScore: 100 + i,
        accuracyPercentage: 100,
        roundsCompleted: 10,
        totalRounds: 10,
        highestLevel: 5,
        durationMs: 30000,
      });
    }

    // Seed storage with 300 records
    await AsyncStorage.setItem(
      '@mindrise_session_history_v1',
      JSON.stringify(records.slice(0, 300))
    );
    historyRepository.resetCacheForTesting();

    // Save one more session (bulk_session_304)
    await historyRepository.saveSession(records[304]);

    const sessions = await historyRepository.getSessions();
    expect(sessions).toHaveLength(300);
    // Newest session is present
    expect(sessions[0].id).toBe('bulk_session_304');
    // Oldest session (bulk_session_0) was trimmed
    expect(sessions.some((s) => s.id === 'bulk_session_0')).toBe(false);
  });

  it('excludes abandoned sessions from qualifying summary stats and streaks', async () => {
    const abandonedRecord: GameSessionRecord = {
      ...sampleMMRecord,
      id: 'session_abandoned_999',
      outcome: 'abandoned',
      finalScore: 50,
      dateKey: '2026-10-21',
    };

    await historyRepository.saveSession(sampleMMRecord); // completed, score 450
    await historyRepository.saveSession(abandonedRecord); // abandoned, score 50

    const summary = await historyRepository.getHistorySummary();
    // Only 1 qualifying workout
    expect(summary.totalWorkouts).toBe(1);
    expect(summary.totalScore).toBe(450);
  });

  it('clears history completely', async () => {
    await historyRepository.saveSession(sampleMMRecord);
    expect(await historyRepository.getSessions()).toHaveLength(1);

    await historyRepository.clearHistory();
    expect(await historyRepository.getSessions()).toHaveLength(0);
  });
});
