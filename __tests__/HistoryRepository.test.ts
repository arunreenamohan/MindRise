import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  historyRepository,
  getLocalDateKey,
  getDaysDifference,
  calculateStreak,
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

  it('safely handles invalid JSON in storage without throwing', async () => {
    await AsyncStorage.setItem('@mindrise_session_history_v1', '{not-a-valid-json}');
    historyRepository.resetCacheForTesting();

    const loaded = await historyRepository.getSessions();
    expect(loaded).toEqual([]);
  });

  it('safely handles AsyncStorage read failures', async () => {
    const originalGetItem = AsyncStorage.getItem;
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Disk read error'));
    historyRepository.resetCacheForTesting();

    const sessions = await historyRepository.getSessions();
    expect(sessions).toEqual([]);
    AsyncStorage.getItem = originalGetItem;
  });

  it('clears history completely', async () => {
    await historyRepository.saveSession(sampleMMRecord);
    expect(await historyRepository.getSessions()).toHaveLength(1);

    await historyRepository.clearHistory();
    expect(await historyRepository.getSessions()).toHaveLength(0);
  });
});
