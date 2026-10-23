/**
 * Unified Local Progress & Session History Repository
 *
 * Implements persistent storage using AsyncStorage with schema validation,
 * deduplication, concurrency queues, and graceful error handling.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameId } from '../games/types';
import {
  GameSessionRecord,
  HistorySummary,
  GamePerformanceSummary,
  CURRENT_SCHEMA_VERSION,
} from './types';
import { calculateStreak, getLocalDateKey } from './streakCalculator';

export const HISTORY_STORAGE_KEY = '@mindrise_session_history_v1';
export const MAX_STORED_SESSIONS = 300;

class HistoryRepository {
  private memoryCache: GameSessionRecord[] | null = null;
  private writeQueue: Promise<unknown> = Promise.resolve();
  private preservedUnknownRecords: unknown[] = [];
  private storageLoadError: boolean = false;

  /**
   * Generates a unique, collision-resistant session ID.
   */
  public generateSessionId(gameId: GameId): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${gameId}_${timestamp}_${random}`;
  }

  /**
   * Validates and sanitizes a raw session record loaded from storage or memory.
   */
  public validateRecord(raw: unknown): GameSessionRecord | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const item = raw as Partial<GameSessionRecord>;

    if (typeof item.id !== 'string' || item.id.trim().length === 0) {
      return null;
    }

    // Do not validate or downgrade records from unsupported future schema versions
    if (typeof item.schemaVersion === 'number' && item.schemaVersion > CURRENT_SCHEMA_VERSION) {
      return null;
    }

    if (
      item.gameId !== 'memory-matrix' &&
      item.gameId !== 'number-recall' &&
      item.gameId !== 'focus-finder' &&
      item.gameId !== 'pattern-master' &&
      item.gameId !== 'quick-reaction' &&
      item.gameId !== 'logic-quest'
    ) {
      return null;
    }

    const finalScore = Number.isFinite(item.finalScore) ? Math.max(0, item.finalScore!) : 0;
    const accuracyPercentage = Number.isFinite(item.accuracyPercentage)
      ? Math.max(0, Math.min(100, item.accuracyPercentage!))
      : 0;
    const roundsCompleted = Number.isFinite(item.roundsCompleted)
      ? Math.max(0, item.roundsCompleted!)
      : 0;
    const totalRounds = Number.isFinite(item.totalRounds) ? Math.max(1, item.totalRounds!) : 10;
    const highestLevel = Number.isFinite(item.highestLevel) ? Math.max(1, item.highestLevel!) : 1;
    const startingLevel =
      typeof item.startingLevel === 'number' && Number.isFinite(item.startingLevel) && item.startingLevel >= 1
        ? Math.round(item.startingLevel)
        : undefined;
    const durationMs = Number.isFinite(item.durationMs) ? Math.max(0, item.durationMs!) : 0;

    const completedAt =
      typeof item.completedAt === 'string' && item.completedAt.length > 0
        ? item.completedAt
        : new Date().toISOString();

    const startedAt =
      typeof item.startedAt === 'string' && item.startedAt.length > 0
        ? item.startedAt
        : completedAt;

    const dateKey =
      typeof item.dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.dateKey)
        ? item.dateKey
        : getLocalDateKey(new Date(completedAt));

    const outcome =
      item.outcome === 'completed' || item.outcome === 'game-over' || item.outcome === 'abandoned'
        ? item.outcome
        : 'completed';

    return {
      id: item.id,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      gameId: item.gameId,
      startedAt,
      completedAt,
      dateKey,
      outcome,
      finalScore,
      accuracyPercentage,
      roundsCompleted,
      totalRounds,
      highestLevel,
      ...(startingLevel !== undefined ? { startingLevel } : {}),
      durationMs,
      gameSpecificMetrics: item.gameSpecificMetrics ?? {},
    };
  }

  /**
   * Retrieves all persisted sessions, loaded through validation and migration filters.
   */
  public async getSessions(limit?: number): Promise<GameSessionRecord[]> {
    try {
      if (this.memoryCache === null) {
        const stored = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
        this.storageLoadError = false;
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              const validRecords: GameSessionRecord[] = [];
              const unknownRecords: unknown[] = [];
              for (const raw of parsed) {
                const validated = this.validateRecord(raw);
                if (validated) {
                  validRecords.push(validated);
                } else if (raw && typeof raw === 'object' && 'id' in raw) {
                  // Preserve future schema or unvalidated records to avoid data loss on resave
                  unknownRecords.push(raw);
                }
              }
              // Sort descending by completion timestamp
              validRecords.sort(
                (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
              );
              this.memoryCache = validRecords;
              this.preservedUnknownRecords = unknownRecords;
            } else {
              this.memoryCache = [];
              this.preservedUnknownRecords = [];
            }
          } catch {
            // Corrupted JSON payload -> do NOT silently destroy recoverable data.
            // Backup raw string to quarantine key before resetting memory cache.
            AsyncStorage.setItem(`${HISTORY_STORAGE_KEY}_corrupt_backup`, stored).catch(() => {});
            this.memoryCache = [];
            this.preservedUnknownRecords = [];
          }
        } else {
          this.memoryCache = [];
          this.preservedUnknownRecords = [];
        }
      }

      const sessions = this.memoryCache ?? [];
      if (typeof limit === 'number' && limit > 0) {
        return sessions.slice(0, limit);
      }
      return [...sessions];
    } catch {
      // Storage read failure: flag error so subsequent saveSession won't overwrite existing disk data
      this.storageLoadError = true;
      return this.memoryCache ? [...this.memoryCache] : [];
    }
  }

  /**
   * Atomically saves a completed or concluded game session.
   * Guarantees idempotency via unique session ID and serialization queue.
   */
  public async saveSession(session: GameSessionRecord): Promise<boolean> {
    const validated = this.validateRecord(session);
    if (!validated) {
      return false;
    }

    // Sequence execution through the write queue to prevent race conditions
    return new Promise<boolean>((resolve) => {
      const executeWrite = async () => {
        try {
          const currentSessions = await this.getSessions();

          if (this.storageLoadError) {
            // Abort persistent write if initial storage read failed, preventing data destruction
            if (this.memoryCache) {
              const existingIndex = this.memoryCache.findIndex((s) => s.id === validated.id);
              if (existingIndex >= 0) {
                this.memoryCache[existingIndex] = validated;
              } else {
                this.memoryCache.unshift(validated);
              }
            }
            resolve(false);
            return;
          }

          // Deduplication check by session ID
          const existingIndex = currentSessions.findIndex((s) => s.id === validated.id);
          let nextSessions: GameSessionRecord[];

          if (existingIndex >= 0) {
            // Update existing record rather than duplicating
            nextSessions = [...currentSessions];
            nextSessions[existingIndex] = validated;
          } else {
            // Prepend newly completed session
            nextSessions = [validated, ...currentSessions];
          }

          // Ensure sorted descending by completion timestamp
          nextSessions.sort(
            (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
          );

          // Cap stored items to prevent unbounded storage inflation
          if (nextSessions.length > MAX_STORED_SESSIONS) {
            nextSessions = nextSessions.slice(0, MAX_STORED_SESSIONS);
          }

          // Retain preserved future records alongside v1 records
          const persistentPayload = [...nextSessions, ...this.preservedUnknownRecords];

          // Write to persistent storage
          await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(persistentPayload));
          this.memoryCache = nextSessions;
          resolve(true);
        } catch {
          // If persistent write failed, still update in-memory cache so current app session stays responsive
          if (this.memoryCache) {
            const existingIndex = this.memoryCache.findIndex((s) => s.id === validated.id);
            if (existingIndex >= 0) {
              this.memoryCache[existingIndex] = validated;
            } else {
              this.memoryCache.unshift(validated);
            }
          }
          resolve(false);
        }
      };

      this.writeQueue = this.writeQueue
        .then(executeWrite, executeWrite)
        .catch(() => {
          resolve(false);
        });
    });
  }

  /**
   * Computes aggregate summary statistics, daily streaks, and per-game performance breakdown.
   */
  public async getHistorySummary(referenceDate?: Date): Promise<HistorySummary> {
    const sessions = await this.getSessions();

    // Only completed or game-over outcomes represent evaluated workouts
    const qualifyingSessions = sessions.filter(
      (s) => s.outcome === 'completed' || s.outcome === 'game-over'
    );

    const totalWorkouts = qualifyingSessions.length;
    const totalScore = qualifyingSessions.reduce((sum, s) => sum + s.finalScore, 0);
    const totalDurationMs = qualifyingSessions.reduce((sum, s) => sum + s.durationMs, 0);

    // Calculate streaks from unique qualifying training dates
    const trainingDateKeys = qualifyingSessions.map((s) => s.dateKey);
    const streakResult = calculateStreak(trainingDateKeys, referenceDate);

    const lastTrainedDate = qualifyingSessions.length > 0 ? qualifyingSessions[0].dateKey : null;

    // Per-game breakdown
    const defaultGameSummary: GamePerformanceSummary = {
      sessionsCount: 0,
      highestScore: 0,
      avgAccuracy: 0,
      highestLevel: 1,
      perfectRoundsTotal: 0,
    };

    const gameStats: Record<GameId, GamePerformanceSummary> = {
      'memory-matrix': { ...defaultGameSummary },
      'number-recall': { ...defaultGameSummary },
      'focus-finder': { ...defaultGameSummary },
      'pattern-master': { ...defaultGameSummary },
      'quick-reaction': { ...defaultGameSummary },
      'logic-quest': { ...defaultGameSummary },
    };

    const gameGroups: Partial<Record<GameId, GameSessionRecord[]>> = {};

    qualifyingSessions.forEach((session) => {
      if (!gameGroups[session.gameId]) {
        gameGroups[session.gameId] = [];
      }
      gameGroups[session.gameId]!.push(session);
    });

    (Object.keys(gameGroups) as GameId[]).forEach((gameId) => {
      const records = gameGroups[gameId] || [];
      if (records.length > 0) {
        const count = records.length;
        const highestScore = records.reduce((max, r) => Math.max(max, r.finalScore), 0);
        const highestLevel = records.reduce((max, r) => Math.max(max, r.highestLevel), 1);
        const sumAccuracy = records.reduce((sum, r) => sum + r.accuracyPercentage, 0);
        const avgAccuracy = Math.round(sumAccuracy / count);

        const perfectRoundsTotal = records.reduce(
          (sum, r) => sum + (Number(r.gameSpecificMetrics?.perfectRounds) || 0),
          0
        );

        const maxDigitSpan = records.reduce(
          (max, r) => Math.max(max, Number(r.gameSpecificMetrics?.maxDigitSpan) || 0),
          0
        );

        const validReactionTimes = records
          .map((r) => Number(r.gameSpecificMetrics?.bestReactionMs))
          .filter((v) => Number.isFinite(v) && v > 0);

        const bestReactionMs =
          validReactionTimes.length > 0 ? Math.min(...validReactionTimes) : undefined;

        const avgReactionTimes = records
          .map((r) => Number(r.gameSpecificMetrics?.avgReactionMs))
          .filter((v) => Number.isFinite(v) && v > 0);

        const overallAvgReactionMs =
          avgReactionTimes.length > 0
            ? Math.round(avgReactionTimes.reduce((sum, v) => sum + v, 0) / avgReactionTimes.length)
            : undefined;

        const avgLogicResponses = records
          .map((r) => Number(r.gameSpecificMetrics?.avgResponseTimeMs))
          .filter((v) => Number.isFinite(v) && v > 0);

        const overallAvgLogicMs =
          avgLogicResponses.length > 0
            ? Math.round(avgLogicResponses.reduce((sum, v) => sum + v, 0) / avgLogicResponses.length)
            : undefined;

        const validFindTimes = records
          .map((r) => Number(r.gameSpecificMetrics?.bestFindTimeMs))
          .filter((v) => Number.isFinite(v) && v > 0);

        const bestFindTimeMs =
          validFindTimes.length > 0 ? Math.min(...validFindTimes) : undefined;

        const avgFindTimes = records
          .map((r) => Number(r.gameSpecificMetrics?.avgFindTimeMs))
          .filter((v) => Number.isFinite(v) && v > 0);

        const overallAvgFindMs =
          avgFindTimes.length > 0
            ? Math.round(avgFindTimes.reduce((sum, v) => sum + v, 0) / avgFindTimes.length)
            : undefined;

        gameStats[gameId] = {
          sessionsCount: count,
          highestScore,
          avgAccuracy,
          highestLevel,
          perfectRoundsTotal,
          maxDigitSpan: gameId === 'number-recall' ? maxDigitSpan : undefined,
          bestReactionMs: gameId === 'quick-reaction' ? bestReactionMs : undefined,
          avgReactionMs: gameId === 'quick-reaction' ? overallAvgReactionMs : undefined,
          avgResponseTimeMs:
            gameId === 'logic-quest' || gameId === 'pattern-master'
              ? overallAvgLogicMs
              : undefined,
          bestFindTimeMs: gameId === 'focus-finder' ? bestFindTimeMs : undefined,
          avgFindTimeMs: gameId === 'focus-finder' ? overallAvgFindMs : undefined,
        };
      }
    });

    return {
      totalWorkouts,
      totalScore,
      totalDurationMs,
      currentStreak: streakResult.currentStreak,
      bestStreak: streakResult.bestStreak,
      lastTrainedDate,
      gameStats,
    };
  }

  /**
   * Clears all session records from memory cache and persistent storage.
   */
  public async clearHistory(): Promise<boolean> {
    try {
      this.memoryCache = [];
      await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resets repository memory cache (useful for test isolation).
   */
  public resetCacheForTesting(): void {
    this.memoryCache = null;
    this.writeQueue = Promise.resolve();
    this.preservedUnknownRecords = [];
    this.storageLoadError = false;
  }
}

export const historyRepository = new HistoryRepository();
