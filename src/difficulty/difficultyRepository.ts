/**
 * Unified Game Difficulty & Progression Repository
 *
 * Implements persistent starting difficulty management using AsyncStorage with
 * schema validation, idempotency guards, concurrency queues, and recovery replay.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameId } from '../games/types';
import { historyRepository } from '../history/historyRepository';
import { GameSessionRecord } from '../history/types';
import {
  DIFFICULTY_STORAGE_KEY,
  GameDifficultyProfile,
  STARTING_DIFFICULTY_BOUNDS,
} from './types';
import { evaluateGameDifficulty, isSessionEligibleForEvaluation } from './evaluationRules';

const ALL_GAME_IDS: GameId[] = [
  'memory-matrix',
  'number-recall',
  'quick-reaction',
  'focus-finder',
  'logic-quest',
  'pattern-master',
];

export function createDefaultProfile(gameId: GameId): GameDifficultyProfile {
  const bounds = STARTING_DIFFICULTY_BOUNDS[gameId];
  return {
    gameId,
    startingLevel: bounds.defaultStartingLevel,
    highestLevelUnlocked: bounds.defaultStartingLevel,
    lastEvaluatedSessionId: null,
    lastAdaptedAt: null,
    adaptationReason: 'initial_baseline',
    evaluatedSessionIds: [],
  };
}

export function createInitialProfiles(): Record<GameId, GameDifficultyProfile> {
  const profiles: Partial<Record<GameId, GameDifficultyProfile>> = {};
  for (const id of ALL_GAME_IDS) {
    profiles[id] = createDefaultProfile(id);
  }
  return profiles as Record<GameId, GameDifficultyProfile>;
}

class DifficultyRepository {
  private memoryCache: Record<GameId, GameDifficultyProfile> | null = null;
  private writeQueue: Promise<unknown> = Promise.resolve();
  private storageReadError: boolean = false;

  /**
   * Validates and sanitizes a profile loaded from persistent storage.
   */
  public validateProfile(raw: unknown, gameId: GameId): GameDifficultyProfile {
    const defaultProfile = createDefaultProfile(gameId);
    if (!raw || typeof raw !== 'object') {
      return defaultProfile;
    }

    const item = raw as Partial<GameDifficultyProfile>;
    const bounds = STARTING_DIFFICULTY_BOUNDS[gameId];

    const startingLevel =
      typeof item.startingLevel === 'number' && Number.isFinite(item.startingLevel)
        ? Math.max(bounds.minStartingLevel, Math.min(bounds.maxStartingLevel, Math.round(item.startingLevel)))
        : bounds.defaultStartingLevel;

    const highestLevelUnlocked =
      typeof item.highestLevelUnlocked === 'number' && Number.isFinite(item.highestLevelUnlocked)
        ? Math.max(startingLevel, Math.round(item.highestLevelUnlocked))
        : startingLevel;

    const lastEvaluatedSessionId =
      typeof item.lastEvaluatedSessionId === 'string' && item.lastEvaluatedSessionId.length > 0
        ? item.lastEvaluatedSessionId
        : null;

    const lastAdaptedAt =
      typeof item.lastAdaptedAt === 'string' && item.lastAdaptedAt.length > 0
        ? item.lastAdaptedAt
        : null;

    const adaptationReason =
      item.adaptationReason === 'initial_baseline' ||
      item.adaptationReason === 'sustained_performance' ||
      item.adaptationReason === 'sustained_struggle' ||
      item.adaptationReason === 'unchanged' ||
      item.adaptationReason === 'manual_reset'
        ? item.adaptationReason
        : 'initial_baseline';

    const evaluatedSessionIds = Array.isArray(item.evaluatedSessionIds)
      ? item.evaluatedSessionIds.filter((id): id is string => typeof id === 'string').slice(-50)
      : [];

    return {
      gameId,
      startingLevel,
      highestLevelUnlocked,
      lastEvaluatedSessionId,
      lastAdaptedAt,
      adaptationReason,
      evaluatedSessionIds,
    };
  }

  /**
   * Retrieves all game difficulty profiles, hydrating cache from AsyncStorage or rebuilding from history.
   */
  public async getAllProfiles(): Promise<Record<GameId, GameDifficultyProfile>> {
    try {
      if (this.memoryCache === null) {
        const stored = await AsyncStorage.getItem(DIFFICULTY_STORAGE_KEY);
        this.storageReadError = false;

        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') {
              const profiles = createInitialProfiles();
              for (const id of ALL_GAME_IDS) {
                if (parsed[id]) {
                  profiles[id] = this.validateProfile(parsed[id], id);
                }
              }
              this.memoryCache = profiles;
            } else {
              await this.rebuildFromHistory();
            }
          } catch {
            await this.rebuildFromHistory();
          }
        } else {
          // If never initialized, check if existing history records exist before starting fresh
          await this.rebuildFromHistory();
        }
      }

      return { ...(this.memoryCache ?? createInitialProfiles()) };
    } catch {
      this.storageReadError = true;
      return this.memoryCache ? { ...this.memoryCache } : createInitialProfiles();
    }
  }

  /**
   * Returns the starting difficulty profile for a specific game.
   */
  public async getStartingDifficulty(gameId: GameId): Promise<GameDifficultyProfile> {
    const profiles = await this.getAllProfiles();
    return profiles[gameId] ?? createDefaultProfile(gameId);
  }

  /**
   * Processes a newly concluded or saved session record to update adaptive progression.
   * Fully idempotent: calling multiple times with the same session ID will NOT double-apply adaptations.
   */
  public async processSessionCompletion(session: GameSessionRecord): Promise<GameDifficultyProfile> {
    return new Promise<GameDifficultyProfile>((resolve) => {
      const execute = async () => {
        try {
          const profiles = await this.getAllProfiles();
          const currentProfile = profiles[session.gameId] ?? createDefaultProfile(session.gameId);

          // 1. Idempotency guard: ignore if already evaluated
          if (
            currentProfile.lastEvaluatedSessionId === session.id ||
            currentProfile.evaluatedSessionIds.includes(session.id)
          ) {
            resolve(currentProfile);
            return;
          }

          // 2. Fetch history records for this game
          const allSessions = await historyRepository.getSessions();
          const gameSessions = allSessions.filter((s) => s.gameId === session.gameId);

          // Ensure session is in the candidate list
          const candidateList = gameSessions.some((s) => s.id === session.id)
            ? gameSessions
            : [session, ...gameSessions];

          // 3. Filter eligible sessions
          const eligibleSessions = candidateList.filter(isSessionEligibleForEvaluation);

          // 4. Run pure evaluation
          const { nextStartingLevel, reason } = evaluateGameDifficulty(
            session.gameId,
            currentProfile.startingLevel,
            eligibleSessions
          );

          const now = new Date().toISOString();
          const updatedSessionIds = [...currentProfile.evaluatedSessionIds, session.id].slice(-50);

          const updatedProfile: GameDifficultyProfile = {
            gameId: session.gameId,
            startingLevel: nextStartingLevel,
            highestLevelUnlocked: Math.max(
              currentProfile.highestLevelUnlocked,
              nextStartingLevel,
              session.highestLevel || 1
            ),
            lastEvaluatedSessionId: session.id,
            lastAdaptedAt: reason !== 'unchanged' ? now : currentProfile.lastAdaptedAt,
            adaptationReason: reason,
            evaluatedSessionIds: updatedSessionIds,
          };

          profiles[session.gameId] = updatedProfile;
          this.memoryCache = profiles;

          // 5. Persist to storage
          if (!this.storageReadError) {
            await AsyncStorage.setItem(DIFFICULTY_STORAGE_KEY, JSON.stringify(profiles));
          }

          resolve(updatedProfile);
        } catch {
          // In case of write failure, return current memory profile gracefully
          const fallback = this.memoryCache?.[session.gameId] ?? createDefaultProfile(session.gameId);
          resolve(fallback);
        }
      };

      this.writeQueue = this.writeQueue.then(execute, execute).catch(() => {
        resolve(createDefaultProfile(session.gameId));
      });
    });
  }

  /**
   * Resets difficulty for a specific game back to Level 1 / Tier 1 upon user request.
   * Completely preserves historical session records in historyRepository.
   */
  public async resetDifficulty(gameId: GameId): Promise<GameDifficultyProfile> {
    return new Promise<GameDifficultyProfile>((resolve) => {
      const execute = async () => {
        try {
          const profiles = await this.getAllProfiles();
          const bounds = STARTING_DIFFICULTY_BOUNDS[gameId];

          // Find the most recent session ID for this game so past sessions won't re-promote immediately
          const allSessions = await historyRepository.getSessions();
          const latestSession = allSessions.find((s) => s.gameId === gameId);

          const resetProfile: GameDifficultyProfile = {
            gameId,
            startingLevel: bounds.defaultStartingLevel,
            highestLevelUnlocked: bounds.defaultStartingLevel,
            lastEvaluatedSessionId: latestSession ? latestSession.id : null,
            lastAdaptedAt: new Date().toISOString(),
            adaptationReason: 'manual_reset',
            evaluatedSessionIds: latestSession ? [latestSession.id] : [],
          };

          profiles[gameId] = resetProfile;
          this.memoryCache = profiles;

          if (!this.storageReadError) {
            await AsyncStorage.setItem(DIFFICULTY_STORAGE_KEY, JSON.stringify(profiles));
          }

          resolve(resetProfile);
        } catch {
          resolve(createDefaultProfile(gameId));
        }
      };

      this.writeQueue = this.writeQueue.then(execute, execute).catch(() => {
        resolve(createDefaultProfile(gameId));
      });
    });
  }

  /**
   * Deterministically reconstructs difficulty profiles by replaying historical sessions
   * chronologically from oldest to newest. Used when storage is missing or corrupt.
   */
  public async rebuildFromHistory(): Promise<Record<GameId, GameDifficultyProfile>> {
    const profiles = createInitialProfiles();
    const allSessions = await historyRepository.getSessions();

    for (const gameId of ALL_GAME_IDS) {
      // Sort oldest to newest for chronological playback
      const gameSessions = allSessions
        .filter((s) => s.gameId === gameId)
        .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

      let currentLevel = STARTING_DIFFICULTY_BOUNDS[gameId].defaultStartingLevel;
      let highestUnlocked = currentLevel;
      let lastSessionId: string | null = null;
      let lastAdaptedAt: string | null = null;
      let lastReason = profiles[gameId].adaptationReason;
      const evaluatedIds: string[] = [];
      const eligibleHistory: GameSessionRecord[] = [];

      for (const session of gameSessions) {
        evaluatedIds.push(session.id);
        lastSessionId = session.id;
        highestUnlocked = Math.max(highestUnlocked, session.highestLevel || 1);

        if (isSessionEligibleForEvaluation(session)) {
          // Prepend to eligible window (newest first within window)
          eligibleHistory.unshift(session);
          if (eligibleHistory.length >= 3) {
            const { nextStartingLevel, reason } = evaluateGameDifficulty(
              gameId,
              currentLevel,
              eligibleHistory
            );
            if (reason !== 'unchanged') {
              currentLevel = nextStartingLevel;
              lastReason = reason;
              lastAdaptedAt = session.completedAt;
              highestUnlocked = Math.max(highestUnlocked, currentLevel);
            }
          }
        }
      }

      profiles[gameId] = {
        gameId,
        startingLevel: currentLevel,
        highestLevelUnlocked: highestUnlocked,
        lastEvaluatedSessionId: lastSessionId,
        lastAdaptedAt,
        adaptationReason: lastReason,
        evaluatedSessionIds: evaluatedIds.slice(-50),
      };
    }

    this.memoryCache = profiles;
    try {
      await AsyncStorage.setItem(DIFFICULTY_STORAGE_KEY, JSON.stringify(profiles));
    } catch {
      // Ignore storage write error during rebuild
    }

    return profiles;
  }

  /**
   * Resets memory cache for deterministic isolated testing.
   */
  public resetCacheForTesting(): void {
    this.memoryCache = null;
    this.storageReadError = false;
  }
}

export const difficultyRepository = new DifficultyRepository();
