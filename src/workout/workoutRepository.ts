/**
 * Daily Workout State & Persistence Repository
 *
 * Implements persistent storage using AsyncStorage with schema validation,
 * deduplication, concurrency queues, and crash recovery.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameSessionRecord } from '../history/types';
import { calculateStreak, getLocalDateKey } from '../history/streakCalculator';
import {
  CURRENT_WORKOUT_SCHEMA_VERSION,
  DailyWorkoutRecord,
  WorkoutDrill,
  WorkoutStreakResult,
} from './types';
import { createDailyWorkout } from './workoutSelector';

export const WORKOUT_STORAGE_KEY = '@mindrise_daily_workouts_v1';
export const MAX_STORED_WORKOUTS = 180;

class WorkoutRepository {
  private memoryCache: DailyWorkoutRecord[] | null = null;
  private writeQueue: Promise<unknown> = Promise.resolve();
  private storageLoadError: boolean = false;

  /**
   * Validates and sanitizes a raw workout record from storage or memory.
   */
  public validateRecord(raw: unknown): DailyWorkoutRecord | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const item = raw as Partial<DailyWorkoutRecord>;

    if (typeof item.id !== 'string' || item.id.trim().length === 0) {
      return null;
    }

    if (
      typeof item.schemaVersion === 'number' &&
      item.schemaVersion > CURRENT_WORKOUT_SCHEMA_VERSION
    ) {
      return null;
    }

    if (typeof item.dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.dateKey)) {
      return null;
    }

    if (!Array.isArray(item.drills) || item.drills.length !== 3) {
      return null;
    }

    const validatedDrills = item.drills.map((d, index) => {
      const drill = d as Partial<WorkoutDrill>;
      const order = index + 1;
      const status =
        drill.status === 'completed' ||
        drill.status === 'in-progress' ||
        drill.status === 'abandoned'
          ? drill.status
          : 'pending';

      return {
        id: typeof drill.id === 'string' ? drill.id : `drill_${order}`,
        order,
        gameId: drill.gameId || 'memory-matrix',
        category: drill.category || 'memory',
        categoryLabel: typeof drill.categoryLabel === 'string' ? drill.categoryLabel : 'Memory',
        estimatedDurationMins: Number.isFinite(drill.estimatedDurationMins)
          ? Math.max(1, drill.estimatedDurationMins!)
          : 3,
        status,
        sessionId: typeof drill.sessionId === 'string' ? drill.sessionId : undefined,
        score: Number.isFinite(drill.score) ? Math.max(0, drill.score!) : undefined,
        accuracyPercentage: Number.isFinite(drill.accuracyPercentage)
          ? Math.max(0, Math.min(100, drill.accuracyPercentage!))
          : undefined,
        durationMs: Number.isFinite(drill.durationMs) ? Math.max(0, drill.durationMs!) : undefined,
        completedAt: typeof drill.completedAt === 'string' ? drill.completedAt : undefined,
      } as WorkoutDrill;
    }) as [WorkoutDrill, WorkoutDrill, WorkoutDrill];

    const status =
      item.status === 'completed' || item.status === 'in-progress'
        ? item.status
        : 'not-started';

    const currentDrillIndex = Number.isFinite(item.currentDrillIndex)
      ? Math.max(0, Math.min(3, item.currentDrillIndex!))
      : 0;

    const totalDurationMs = Number.isFinite(item.totalDurationMs)
      ? Math.max(0, item.totalDurationMs!)
      : 0;

    const averageAccuracy = Number.isFinite(item.averageAccuracy)
      ? Math.max(0, Math.min(100, item.averageAccuracy!))
      : 0;

    return {
      id: item.id,
      schemaVersion: CURRENT_WORKOUT_SCHEMA_VERSION,
      dateKey: item.dateKey,
      status,
      drills: validatedDrills,
      currentDrillIndex,
      startedAt: typeof item.startedAt === 'string' ? item.startedAt : undefined,
      completedAt: typeof item.completedAt === 'string' ? item.completedAt : undefined,
      totalDurationMs,
      averageAccuracy,
    };
  }

  /**
   * Retrieves all persisted workouts from storage or memory cache.
   */
  public async getAllWorkouts(): Promise<DailyWorkoutRecord[]> {
    try {
      if (this.memoryCache === null) {
        const stored = await AsyncStorage.getItem(WORKOUT_STORAGE_KEY);
        this.storageLoadError = false;
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              const validRecords: DailyWorkoutRecord[] = [];
              for (const raw of parsed) {
                const validated = this.validateRecord(raw);
                if (validated) {
                  validRecords.push(validated);
                }
              }
              // Sort descending by dateKey
              validRecords.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
              this.memoryCache = validRecords;
            } else {
              this.memoryCache = [];
            }
          } catch {
            this.memoryCache = [];
          }
        } else {
          this.memoryCache = [];
        }
      }
      return this.memoryCache ? [...this.memoryCache] : [];
    } catch {
      this.storageLoadError = true;
      return this.memoryCache ? [...this.memoryCache] : [];
    }
  }

  /**
   * Retrieves the workout record for a specific dateKey ('YYYY-MM-DD').
   */
  public async getWorkoutForDate(dateKey: string): Promise<DailyWorkoutRecord | null> {
    const workouts = await this.getAllWorkouts();
    const found = workouts.find((w) => w.dateKey === dateKey);
    return found ? { ...found, drills: [...found.drills] as [WorkoutDrill, WorkoutDrill, WorkoutDrill] } : null;
  }

  /**
   * Retrieves the workout for today or creates and persists a new one if none exists.
   */
  public async getOrCreateTodayWorkout(referenceDate: Date = new Date()): Promise<DailyWorkoutRecord> {
    const todayKey = getLocalDateKey(referenceDate);
    const existing = await this.getWorkoutForDate(todayKey);
    if (existing) {
      return existing;
    }

    const newWorkout = createDailyWorkout(todayKey);
    await this.saveWorkout(newWorkout);
    return newWorkout;
  }

  /**
   * Atomically saves or updates a daily workout record.
   */
  public async saveWorkout(workout: DailyWorkoutRecord): Promise<boolean> {
    const validated = this.validateRecord(workout);
    if (!validated) {
      return false;
    }

    return new Promise<boolean>((resolve) => {
      const executeWrite = async () => {
        try {
          const currentWorkouts = await this.getAllWorkouts();

          if (this.storageLoadError) {
            // Abort persistent write if initial storage read failed, preventing data destruction
            if (this.memoryCache) {
              const idx = this.memoryCache.findIndex((w) => w.id === validated.id);
              if (idx >= 0) {
                this.memoryCache[idx] = validated;
              } else {
                this.memoryCache.unshift(validated);
              }
            }
            resolve(false);
            return;
          }

          const existingIndex = currentWorkouts.findIndex((w) => w.id === validated.id);
          let nextWorkouts: DailyWorkoutRecord[];

          if (existingIndex >= 0) {
            nextWorkouts = [...currentWorkouts];
            nextWorkouts[existingIndex] = validated;
          } else {
            nextWorkouts = [validated, ...currentWorkouts];
          }

          nextWorkouts.sort((a, b) => b.dateKey.localeCompare(a.dateKey));

          if (nextWorkouts.length > MAX_STORED_WORKOUTS) {
            nextWorkouts = nextWorkouts.slice(0, MAX_STORED_WORKOUTS);
          }

          await AsyncStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(nextWorkouts));
          this.memoryCache = nextWorkouts;
          resolve(true);
        } catch {
          if (this.memoryCache) {
            const idx = this.memoryCache.findIndex((w) => w.id === validated.id);
            if (idx >= 0) {
              this.memoryCache[idx] = validated;
            } else {
              this.memoryCache.unshift(validated);
            }
          }
          resolve(false);
        }
      };

      this.writeQueue = this.writeQueue
        .then(executeWrite, executeWrite)
        .catch(() => resolve(false));
    });
  }

  /**
   * Records completion of an individual drill within the workout.
   * Updates drill metrics, advances drill index, and sets workout to 'completed'
   * when all 3 drills have concluded.
   */
  public async recordDrillCompletion(params: {
    dateKey: string;
    drillIndex: number;
    sessionRecord: GameSessionRecord;
  }): Promise<DailyWorkoutRecord> {
    const { dateKey, drillIndex, sessionRecord } = params;
    let workout = await this.getWorkoutForDate(dateKey);
    if (!workout) {
      workout = createDailyWorkout(dateKey);
    }

    if (drillIndex < 0 || drillIndex > 2) {
      return workout;
    }

    const updatedDrills = [...workout.drills] as [WorkoutDrill, WorkoutDrill, WorkoutDrill];
    const targetDrill = { ...updatedDrills[drillIndex] };

    targetDrill.status = 'completed';
    targetDrill.sessionId = sessionRecord.id;
    targetDrill.score = sessionRecord.finalScore;
    targetDrill.accuracyPercentage = sessionRecord.accuracyPercentage;
    targetDrill.durationMs = sessionRecord.durationMs;
    targetDrill.completedAt = sessionRecord.completedAt;
    updatedDrills[drillIndex] = targetDrill;

    const allCompleted = updatedDrills.every((d) => d.status === 'completed');
    const startedAt = workout.startedAt || sessionRecord.startedAt;
    const completedAt = allCompleted ? sessionRecord.completedAt : workout.completedAt;

    const completedDrills = updatedDrills.filter((d) => d.status === 'completed');
    const totalDurationMs = completedDrills.reduce((sum, d) => sum + (d.durationMs || 0), 0);
    const averageAccuracy =
      completedDrills.length > 0
        ? Math.round(
            completedDrills.reduce((sum, d) => sum + (d.accuracyPercentage || 0), 0) /
              completedDrills.length
          )
        : 0;

    const updatedWorkout: DailyWorkoutRecord = {
      ...workout,
      status: allCompleted ? 'completed' : 'in-progress',
      drills: updatedDrills,
      currentDrillIndex: allCompleted ? 3 : Math.max(workout.currentDrillIndex, drillIndex + 1),
      startedAt,
      completedAt,
      totalDurationMs,
      averageAccuracy,
    };

    await this.saveWorkout(updatedWorkout);
    return updatedWorkout;
  }

  /**
   * Resets today's workout drills to pending for users wanting to re-train.
   */
  public async resetTodayWorkout(referenceDate: Date = new Date()): Promise<DailyWorkoutRecord> {
    const todayKey = getLocalDateKey(referenceDate);
    const freshWorkout = createDailyWorkout(todayKey);
    await this.saveWorkout(freshWorkout);
    return freshWorkout;
  }

  /**
   * Computes the daily workout streak based strictly on dates where all 3 drills were completed.
   */
  public async getWorkoutStreak(referenceDate: Date = new Date()): Promise<WorkoutStreakResult> {
    const workouts = await this.getAllWorkouts();
    const completedDateKeys = workouts
      .filter((w) => w.status === 'completed')
      .map((w) => w.dateKey);

    return calculateStreak(completedDateKeys, referenceDate);
  }

  /**
   * Clears internal state and storage for tests.
   */
  public async clearAllWorkoutsForTesting(): Promise<void> {
    this.memoryCache = null;
    this.storageLoadError = false;
    await AsyncStorage.removeItem(WORKOUT_STORAGE_KEY).catch(() => {});
  }
}

export const workoutRepository = new WorkoutRepository();
