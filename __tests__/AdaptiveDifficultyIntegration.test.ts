import AsyncStorage from '@react-native-async-storage/async-storage';
import { difficultyRepository } from '../src/difficulty/difficultyRepository';
import { historyRepository } from '../src/history/historyRepository';
import { GameSessionRecord } from '../src/history/types';
import { STARTING_DIFFICULTY_BOUNDS } from '../src/difficulty/types';

describe('Adaptive Difficulty Integration Tests', () => {
  beforeEach(async () => {
    difficultyRepository.resetCacheForTesting();
    historyRepository.resetCacheForTesting();
    await AsyncStorage.clear();
  });

  it('records startingLevel in GameSessionRecord when saving through historyRepository', async () => {
    const sessionWithStartingLevel: GameSessionRecord = {
      id: 'sess-int-1',
      schemaVersion: 1,
      gameId: 'memory-matrix',
      startedAt: '2026-10-23T10:00:00Z',
      completedAt: '2026-10-23T10:01:00Z',
      dateKey: '2026-10-23',
      finalScore: 850,
      accuracyPercentage: 90,
      roundsCompleted: 10,
      totalRounds: 10,
      highestLevel: 4,
      startingLevel: 2,
      durationMs: 60000,
      outcome: 'completed',
    };

    const saved = await historyRepository.saveSession(sessionWithStartingLevel);
    expect(saved).toBe(true);

    const retrieved = await historyRepository.getSessions();
    expect(retrieved.length).toBe(1);
    expect(retrieved[0].startingLevel).toBe(2);
  });

  it('preserves legacy sessions that do not contain startingLevel without fabricating fake data', async () => {
    const legacySession: GameSessionRecord = {
      id: 'sess-legacy-1',
      schemaVersion: 1,
      gameId: 'quick-reaction',
      startedAt: '2026-10-20T10:00:00Z',
      completedAt: '2026-10-20T10:01:00Z',
      dateKey: '2026-10-20',
      finalScore: 1000,
      accuracyPercentage: 80,
      roundsCompleted: 10,
      totalRounds: 10,
      highestLevel: 1,
      durationMs: 40000,
      outcome: 'completed',
    };

    await historyRepository.saveSession(legacySession);

    const retrieved = await historyRepository.getSessions();
    expect(retrieved.length).toBe(1);
    expect(retrieved[0].startingLevel).toBeUndefined();
  });

  it('coordinates starting difficulty retrieval across all 6 games with correct tier/level classification', async () => {
    const profiles = await difficultyRepository.getAllProfiles();

    // Verify all 6 games are registered with correct tier vs level flags
    expect(STARTING_DIFFICULTY_BOUNDS['memory-matrix'].isTierBased).toBe(false);
    expect(STARTING_DIFFICULTY_BOUNDS['number-recall'].isTierBased).toBe(false);
    expect(STARTING_DIFFICULTY_BOUNDS['quick-reaction'].isTierBased).toBe(false);
    expect(STARTING_DIFFICULTY_BOUNDS['focus-finder'].isTierBased).toBe(false);
    expect(STARTING_DIFFICULTY_BOUNDS['logic-quest'].isTierBased).toBe(true);
    expect(STARTING_DIFFICULTY_BOUNDS['pattern-master'].isTierBased).toBe(true);

    // Initial starting levels
    expect(profiles['memory-matrix'].startingLevel).toBe(1);
    expect(profiles['logic-quest'].startingLevel).toBe(1);
  });

  it('manages manual reset per-game independently without cross-contaminating other games', async () => {
    // Promote Memory Matrix to Level 2
    const mmSessions = [
      { id: 'mm1', gameId: 'memory-matrix' as const, accuracyPercentage: 90, highestLevel: 4, startingLevel: 1, roundsCompleted: 10, totalRounds: 10, durationMs: 40000, finalScore: 1000, outcome: 'completed' as const, schemaVersion: 1, startedAt: '2026-10-23T08:00:00Z', completedAt: '2026-10-23T08:01:00Z', dateKey: '2026-10-23', gameSpecificMetrics: { perfectRounds: 7 } },
      { id: 'mm2', gameId: 'memory-matrix' as const, accuracyPercentage: 90, highestLevel: 4, startingLevel: 1, roundsCompleted: 10, totalRounds: 10, durationMs: 40000, finalScore: 1000, outcome: 'completed' as const, schemaVersion: 1, startedAt: '2026-10-23T09:00:00Z', completedAt: '2026-10-23T09:01:00Z', dateKey: '2026-10-23', gameSpecificMetrics: { perfectRounds: 7 } },
      { id: 'mm3', gameId: 'memory-matrix' as const, accuracyPercentage: 90, highestLevel: 4, startingLevel: 1, roundsCompleted: 10, totalRounds: 10, durationMs: 40000, finalScore: 1000, outcome: 'completed' as const, schemaVersion: 1, startedAt: '2026-10-23T10:00:00Z', completedAt: '2026-10-23T10:01:00Z', dateKey: '2026-10-23', gameSpecificMetrics: { perfectRounds: 7 } },
    ];

    // Promote Logic Quest to Tier 2
    const lqSessions = [
      { id: 'lq1', gameId: 'logic-quest' as const, accuracyPercentage: 90, highestLevel: 1, startingLevel: 1, roundsCompleted: 10, totalRounds: 10, durationMs: 40000, finalScore: 1000, outcome: 'completed' as const, schemaVersion: 1, startedAt: '2026-10-23T08:00:00Z', completedAt: '2026-10-23T08:01:00Z', dateKey: '2026-10-23', gameSpecificMetrics: { avgResponseTimeMs: 4000 } },
      { id: 'lq2', gameId: 'logic-quest' as const, accuracyPercentage: 90, highestLevel: 1, startingLevel: 1, roundsCompleted: 10, totalRounds: 10, durationMs: 40000, finalScore: 1000, outcome: 'completed' as const, schemaVersion: 1, startedAt: '2026-10-23T09:00:00Z', completedAt: '2026-10-23T09:01:00Z', dateKey: '2026-10-23', gameSpecificMetrics: { avgResponseTimeMs: 4000 } },
      { id: 'lq3', gameId: 'logic-quest' as const, accuracyPercentage: 90, highestLevel: 1, startingLevel: 1, roundsCompleted: 10, totalRounds: 10, durationMs: 40000, finalScore: 1000, outcome: 'completed' as const, schemaVersion: 1, startedAt: '2026-10-23T10:00:00Z', completedAt: '2026-10-23T10:01:00Z', dateKey: '2026-10-23', gameSpecificMetrics: { avgResponseTimeMs: 4000 } },
    ];

    for (const s of mmSessions) {
      await historyRepository.saveSession(s);
      await difficultyRepository.processSessionCompletion(s);
    }
    for (const s of lqSessions) {
      await historyRepository.saveSession(s);
      await difficultyRepository.processSessionCompletion(s);
    }

    const mmBefore = await difficultyRepository.getStartingDifficulty('memory-matrix');
    const lqBefore = await difficultyRepository.getStartingDifficulty('logic-quest');
    expect(mmBefore.startingLevel).toBe(2);
    expect(lqBefore.startingLevel).toBe(2);

    // Reset ONLY memory-matrix
    await difficultyRepository.resetDifficulty('memory-matrix');

    const mmAfter = await difficultyRepository.getStartingDifficulty('memory-matrix');
    const lqAfter = await difficultyRepository.getStartingDifficulty('logic-quest');

    expect(mmAfter.startingLevel).toBe(1);
    expect(mmAfter.adaptationReason).toBe('manual_reset');
    // Logic quest must remain at Tier 2!
    expect(lqAfter.startingLevel).toBe(2);
    expect(lqAfter.adaptationReason).toBe('sustained_performance');

    // All 6 sessions in history remain preserved
    const allHistory = await historyRepository.getSessions();
    expect(allHistory.length).toBe(6);
  });

  it('verifies full persistence lifecycle: non-baseline save, cold restart, reset, second restart, and history integrity', async () => {
    // 1. Save 3 qualifying sessions to promote Number Recall from Level 1 to Level 2
    const nrSessions: GameSessionRecord[] = [
      { id: 'nr-1', gameId: 'number-recall', accuracyPercentage: 90, startingLevel: 1, highestLevel: 2, roundsCompleted: 8, totalRounds: 8, durationMs: 40000, finalScore: 900, outcome: 'completed', schemaVersion: 1, startedAt: '2026-10-23T07:00:00Z', completedAt: '2026-10-23T07:01:00Z', dateKey: '2026-10-23', gameSpecificMetrics: { maxDigitSpan: 6 } },
      { id: 'nr-2', gameId: 'number-recall', accuracyPercentage: 88, startingLevel: 1, highestLevel: 2, roundsCompleted: 8, totalRounds: 8, durationMs: 38000, finalScore: 920, outcome: 'completed', schemaVersion: 1, startedAt: '2026-10-23T08:00:00Z', completedAt: '2026-10-23T08:01:00Z', dateKey: '2026-10-23', gameSpecificMetrics: { maxDigitSpan: 5 } },
      { id: 'nr-3', gameId: 'number-recall', accuracyPercentage: 92, startingLevel: 1, highestLevel: 2, roundsCompleted: 8, totalRounds: 8, durationMs: 42000, finalScore: 950, outcome: 'completed', schemaVersion: 1, startedAt: '2026-10-23T09:00:00Z', completedAt: '2026-10-23T09:01:00Z', dateKey: '2026-10-23', gameSpecificMetrics: { maxDigitSpan: 6 } },
    ];

    for (const session of nrSessions) {
      await historyRepository.saveSession(session);
      await difficultyRepository.processSessionCompletion(session);
    }

    // Verify non-baseline difficulty is saved
    const profileBeforeRestart = await difficultyRepository.getStartingDifficulty('number-recall');
    expect(profileBeforeRestart.startingLevel).toBe(2);
    expect(profileBeforeRestart.adaptationReason).toBe('sustained_performance');

    // 2. Simulate force-stop / app restart by resetting in-memory caches
    difficultyRepository.resetCacheForTesting();
    historyRepository.resetCacheForTesting();

    // Confirm the same difficulty is loaded from persistent storage
    const profileAfterRestart = await difficultyRepository.getStartingDifficulty('number-recall');
    expect(profileAfterRestart.startingLevel).toBe(2);
    expect(profileAfterRestart.adaptationReason).toBe('sustained_performance');

    // 3. Reset that game's difficulty
    const resetResult = await difficultyRepository.resetDifficulty('number-recall');
    expect(resetResult.startingLevel).toBe(1);
    expect(resetResult.adaptationReason).toBe('manual_reset');

    // 4. Simulate a second force-stop and app restart
    difficultyRepository.resetCacheForTesting();
    historyRepository.resetCacheForTesting();

    // Confirm the baseline difficulty is saved and reloaded after second restart
    const profileAfterSecondRestart = await difficultyRepository.getStartingDifficulty('number-recall');
    expect(profileAfterSecondRestart.startingLevel).toBe(1);
    expect(profileAfterSecondRestart.adaptationReason).toBe('manual_reset');

    // 5. Confirm original session history remains intact and unchanged
    const historyAfterAllRestarts = await historyRepository.getSessions();
    expect(historyAfterAllRestarts.length).toBe(3);
    expect(historyAfterAllRestarts.map((s) => s.id)).toEqual(['nr-3', 'nr-2', 'nr-1']);
  });

  it('verifies end-to-end demotion and duplicate processing guard via difficulty repository', async () => {
    // Start Focus Finder at Level 2
    const ffGoodSessions: GameSessionRecord[] = [
      { id: 'ff-good-1', gameId: 'focus-finder', accuracyPercentage: 90, startingLevel: 1, highestLevel: 2, roundsCompleted: 10, totalRounds: 10, durationMs: 30000, finalScore: 900, outcome: 'completed', schemaVersion: 1, startedAt: '2026-10-23T06:00:00Z', completedAt: '2026-10-23T06:01:00Z', dateKey: '2026-10-23', gameSpecificMetrics: { avgFindTimeMs: 2000 } },
      { id: 'ff-good-2', gameId: 'focus-finder', accuracyPercentage: 90, startingLevel: 1, highestLevel: 2, roundsCompleted: 10, totalRounds: 10, durationMs: 30000, finalScore: 900, outcome: 'completed', schemaVersion: 1, startedAt: '2026-10-23T07:00:00Z', completedAt: '2026-10-23T07:01:00Z', dateKey: '2026-10-23', gameSpecificMetrics: { avgFindTimeMs: 2000 } },
      { id: 'ff-good-3', gameId: 'focus-finder', accuracyPercentage: 90, startingLevel: 1, highestLevel: 2, roundsCompleted: 10, totalRounds: 10, durationMs: 30000, finalScore: 900, outcome: 'completed', schemaVersion: 1, startedAt: '2026-10-23T08:00:00Z', completedAt: '2026-10-23T08:01:00Z', dateKey: '2026-10-23', gameSpecificMetrics: { avgFindTimeMs: 2000 } },
    ];
    for (const s of ffGoodSessions) {
      await historyRepository.saveSession(s);
      await difficultyRepository.processSessionCompletion(s);
    }
    const promoted = await difficultyRepository.getStartingDifficulty('focus-finder');
    expect(promoted.startingLevel).toBe(2);

    // Duplicate processing check: re-processing ff-good-3 must NOT promote again
    const dupResult = await difficultyRepository.processSessionCompletion(ffGoodSessions[2]);
    expect(dupResult.startingLevel).toBe(2);

    // Now introduce 3 struggling sessions at startingLevel 2
    const ffStruggleSessions: GameSessionRecord[] = [
      { id: 'ff-bad-1', gameId: 'focus-finder', accuracyPercentage: 40, startingLevel: 2, highestLevel: 2, roundsCompleted: 10, totalRounds: 10, durationMs: 70000, finalScore: 300, outcome: 'completed', schemaVersion: 1, startedAt: '2026-10-23T09:00:00Z', completedAt: '2026-10-23T09:01:00Z', dateKey: '2026-10-23', gameSpecificMetrics: { avgFindTimeMs: 7000, misses: 3, timeouts: 2 } },
      { id: 'ff-bad-2', gameId: 'focus-finder', accuracyPercentage: 42, startingLevel: 2, highestLevel: 2, roundsCompleted: 10, totalRounds: 10, durationMs: 68000, finalScore: 320, outcome: 'completed', schemaVersion: 1, startedAt: '2026-10-23T10:00:00Z', completedAt: '2026-10-23T10:01:00Z', dateKey: '2026-10-23', gameSpecificMetrics: { avgFindTimeMs: 6800, misses: 2, timeouts: 2 } },
      { id: 'ff-bad-3', gameId: 'focus-finder', accuracyPercentage: 38, startingLevel: 2, highestLevel: 2, roundsCompleted: 10, totalRounds: 10, durationMs: 72000, finalScore: 290, outcome: 'completed', schemaVersion: 1, startedAt: '2026-10-23T11:00:00Z', completedAt: '2026-10-23T11:01:00Z', dateKey: '2026-10-23', gameSpecificMetrics: { avgFindTimeMs: 7200, misses: 4, timeouts: 1 } },
    ];
    // Process 1st struggle session: mixed window, still at Level 2
    await historyRepository.saveSession(ffStruggleSessions[0]);
    const res1 = await difficultyRepository.processSessionCompletion(ffStruggleSessions[0]);
    expect(res1.startingLevel).toBe(2);

    // Process 2nd struggle session: 2 slow sessions trigger demotion from Level 2 to Level 1
    await historyRepository.saveSession(ffStruggleSessions[1]);
    const res2 = await difficultyRepository.processSessionCompletion(ffStruggleSessions[1]);
    expect(res2.startingLevel).toBe(1);
    expect(res2.adaptationReason).toBe('sustained_struggle');

    // Process 3rd struggle session: already at minimum Level 1, clamped strictly
    await historyRepository.saveSession(ffStruggleSessions[2]);
    const res3 = await difficultyRepository.processSessionCompletion(ffStruggleSessions[2]);
    expect(res3.startingLevel).toBe(1);

    // Duplicate processing check: re-processing ff-bad-3 must not alter profile
    const dupBadResult = await difficultyRepository.processSessionCompletion(ffStruggleSessions[2]);
    expect(dupBadResult.startingLevel).toBe(1);
  });
});

