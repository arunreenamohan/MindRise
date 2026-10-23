import AsyncStorage from '@react-native-async-storage/async-storage';
import { difficultyRepository } from '../src/difficulty/difficultyRepository';
import {
  DIFFICULTY_STORAGE_KEY,
  STARTING_DIFFICULTY_BOUNDS,
} from '../src/difficulty/types';
import { historyRepository } from '../src/history/historyRepository';
import { GameSessionRecord } from '../src/history/types';

describe('DifficultyRepository - Storage, Persistence & Recovery', () => {
  beforeEach(async () => {
    difficultyRepository.resetCacheForTesting();
    historyRepository.resetCacheForTesting();
    await AsyncStorage.clear();
  });

  const createValidSession = (
    overrides: Partial<GameSessionRecord>
  ): GameSessionRecord => ({
    id: `sess-${Math.random().toString(36).substring(2, 8)}`,
    schemaVersion: 1,
    gameId: 'memory-matrix',
    startedAt: new Date(Date.now() - 40000).toISOString(),
    completedAt: new Date().toISOString(),
    dateKey: '2026-10-23',
    finalScore: 1200,
    accuracyPercentage: 90,
    durationMs: 40000,
    roundsCompleted: 10,
    totalRounds: 10,
    highestLevel: 4,
    startingLevel: 1,
    outcome: 'completed',
    gameSpecificMetrics: {
      perfectRounds: 7,
    },
    ...overrides,
  });

  it('initializes with default starting levels and initial_baseline reasons', async () => {
    const profiles = await difficultyRepository.getAllProfiles();
    expect(profiles['memory-matrix'].startingLevel).toBe(1);
    expect(profiles['number-recall'].startingLevel).toBe(1);
    expect(profiles['quick-reaction'].startingLevel).toBe(1);
    expect(profiles['focus-finder'].startingLevel).toBe(1);
    expect(profiles['logic-quest'].startingLevel).toBe(1);
    expect(profiles['pattern-master'].startingLevel).toBe(1);
    expect(profiles['memory-matrix'].adaptationReason).toBe('initial_baseline');
  });

  it('persists and hydrates profile from AsyncStorage across restarts', async () => {
    // Save 3 qualifying sessions for memory matrix
    const s1 = createValidSession({ id: 'sess-persist-1', completedAt: '2026-10-23T10:00:00Z' });
    const s2 = createValidSession({ id: 'sess-persist-2', completedAt: '2026-10-23T11:00:00Z' });
    const s3 = createValidSession({ id: 'sess-persist-3', completedAt: '2026-10-23T12:00:00Z' });

    await historyRepository.saveSession(s1);
    await difficultyRepository.processSessionCompletion(s1);
    await historyRepository.saveSession(s2);
    await difficultyRepository.processSessionCompletion(s2);
    await historyRepository.saveSession(s3);
    const updated = await difficultyRepository.processSessionCompletion(s3);

    expect(updated.startingLevel).toBe(2);
    expect(updated.adaptationReason).toBe('sustained_performance');

    // Verify written to AsyncStorage
    const rawStored = await AsyncStorage.getItem(DIFFICULTY_STORAGE_KEY);
    expect(rawStored).toBeTruthy();
    const parsed = JSON.parse(rawStored!);
    expect(parsed['memory-matrix'].startingLevel).toBe(2);

    // Simulate app restart by clearing in-memory cache
    difficultyRepository.resetCacheForTesting();

    const hydrated = await difficultyRepository.getStartingDifficulty('memory-matrix');
    expect(hydrated.startingLevel).toBe(2);
    expect(hydrated.adaptationReason).toBe('sustained_performance');
  });

  it('ensures idempotency: processing duplicate session ID does not re-apply adaptation', async () => {
    const s1 = createValidSession({ id: 'sess-idem-1', completedAt: '2026-10-23T10:00:00Z' });
    const s2 = createValidSession({ id: 'sess-idem-2', completedAt: '2026-10-23T11:00:00Z' });
    const s3 = createValidSession({ id: 'sess-idem-3', completedAt: '2026-10-23T12:00:00Z' });

    await historyRepository.saveSession(s1);
    await difficultyRepository.processSessionCompletion(s1);
    await historyRepository.saveSession(s2);
    await difficultyRepository.processSessionCompletion(s2);
    await historyRepository.saveSession(s3);
    const firstResult = await difficultyRepository.processSessionCompletion(s3);

    expect(firstResult.startingLevel).toBe(2);

    // Call processSessionCompletion again with s3 (e.g. retry / duplicate dispatch)
    const duplicateResult = await difficultyRepository.processSessionCompletion(s3);
    expect(duplicateResult.startingLevel).toBe(2); // must NOT advance to 3!

    // Verify evaluatedSessionIds has no duplicate s3
    const ids = duplicateResult.evaluatedSessionIds.filter((id) => id === 'sess-idem-3');
    expect(ids.length).toBe(1);
  });

  it('performs manual reset per game without deleting session history', async () => {
    // 1. Establish Level 2 for Memory Matrix
    const s1 = createValidSession({ id: 'sess-reset-1', completedAt: '2026-10-23T10:00:00Z' });
    const s2 = createValidSession({ id: 'sess-reset-2', completedAt: '2026-10-23T11:00:00Z' });
    const s3 = createValidSession({ id: 'sess-reset-3', completedAt: '2026-10-23T12:00:00Z' });

    await historyRepository.saveSession(s1);
    await difficultyRepository.processSessionCompletion(s1);
    await historyRepository.saveSession(s2);
    await difficultyRepository.processSessionCompletion(s2);
    await historyRepository.saveSession(s3);
    await difficultyRepository.processSessionCompletion(s3);

    const beforeReset = await difficultyRepository.getStartingDifficulty('memory-matrix');
    expect(beforeReset.startingLevel).toBe(2);

    // 2. Perform manual reset for Memory Matrix
    const afterReset = await difficultyRepository.resetDifficulty('memory-matrix');
    expect(afterReset.startingLevel).toBe(1);
    expect(afterReset.adaptationReason).toBe('manual_reset');

    // 3. CRITICAL: Verify session history records are completely intact!
    const allHistory = await historyRepository.getSessions();
    expect(allHistory.length).toBe(3);
    expect(allHistory.map((s) => s.id)).toEqual(['sess-reset-3', 'sess-reset-2', 'sess-reset-1']);
  });

  it('reconstructs difficulty deterministically when AsyncStorage data is corrupted', async () => {
    // Populate history with 3 qualifying sessions
    const s1 = createValidSession({ id: 'sess-rec-1', completedAt: '2026-10-23T08:00:00Z' });
    const s2 = createValidSession({ id: 'sess-rec-2', completedAt: '2026-10-23T09:00:00Z' });
    const s3 = createValidSession({ id: 'sess-rec-3', completedAt: '2026-10-23T10:00:00Z' });
    await historyRepository.saveSession(s1);
    await historyRepository.saveSession(s2);
    await historyRepository.saveSession(s3);

    // Corrupt AsyncStorage difficulty key with malformed JSON
    await AsyncStorage.setItem(DIFFICULTY_STORAGE_KEY, '{ invalid JSON :::: corrupted');
    difficultyRepository.resetCacheForTesting();

    // getAllProfiles should handle corruption and replay history to recover Level 2
    const recovered = await difficultyRepository.getAllProfiles();
    expect(recovered['memory-matrix'].startingLevel).toBe(2);
    expect(recovered['memory-matrix'].adaptationReason).toBe('sustained_performance');
  });

  it('validates and clamps malformed out-of-bounds stored values', () => {
    const malformed = {
      startingLevel: 999, // Exceeds max bounds
      highestLevelUnlocked: -10,
      adaptationReason: 'invalid_reason_string',
      evaluatedSessionIds: ['id1', null, 123, 'id2'],
    };

    const validated = difficultyRepository.validateProfile(malformed, 'memory-matrix');
    expect(validated.startingLevel).toBe(STARTING_DIFFICULTY_BOUNDS['memory-matrix'].maxStartingLevel);
    expect(validated.adaptationReason).toBe('initial_baseline');
    expect(validated.evaluatedSessionIds).toEqual(['id1', 'id2']);
  });

  it('serializes concurrent session processing without race conditions', async () => {
    const s1 = createValidSession({ id: 'sess-conc-1', completedAt: '2026-10-23T10:00:00Z' });
    const s2 = createValidSession({ id: 'sess-conc-2', completedAt: '2026-10-23T11:00:00Z' });
    const s3 = createValidSession({ id: 'sess-conc-3', completedAt: '2026-10-23T12:00:00Z' });

    await historyRepository.saveSession(s1);
    await historyRepository.saveSession(s2);
    await historyRepository.saveSession(s3);

    // Dispatch all 3 concurrently
    const [, , p3] = await Promise.all([
      difficultyRepository.processSessionCompletion(s1),
      difficultyRepository.processSessionCompletion(s2),
      difficultyRepository.processSessionCompletion(s3),
    ]);

    expect(p3.startingLevel).toBe(2);
    const finalProfile = await difficultyRepository.getStartingDifficulty('memory-matrix');
    expect(finalProfile.startingLevel).toBe(2);
  });
});
