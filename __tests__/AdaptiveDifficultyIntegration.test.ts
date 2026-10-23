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
});
