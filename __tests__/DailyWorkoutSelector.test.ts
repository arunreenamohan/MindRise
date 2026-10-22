import {
  getWorkoutCombinationIndex,
  getDailyDrills,
  createDailyWorkout,
  getDrillCategory,
  DAILY_WORKOUT_COMBINATIONS,
} from '../src/workout/workoutSelector';
import { GameId } from '../src/games/types';

describe('Daily Workout Selector', () => {
  describe('Deterministic Date Selection', () => {
    it('returns a stable index between 0 and 7 for any dateKey', () => {
      const dates = [
        '2026-01-01',
        '2026-01-02',
        '2026-02-28',
        '2026-03-01',
        '2026-10-22',
        '2026-12-31',
        '2027-01-01',
      ];

      dates.forEach((d) => {
        const idx = getWorkoutCombinationIndex(d);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(8);
      });
    });

    it('returns the exact same combination when called repeatedly for the same date', () => {
      const date = '2026-10-22';
      const index1 = getWorkoutCombinationIndex(date);
      const index2 = getWorkoutCombinationIndex(date);
      const drills1 = getDailyDrills(date);
      const drills2 = getDailyDrills(date);

      expect(index1).toBe(index2);
      expect(drills1.map((d) => d.gameId)).toEqual(drills2.map((d) => d.gameId));
    });

    it('handles dates before the 2026-01-01 epoch gracefully with positive modulo', () => {
      const pastDates = ['2025-12-31', '2025-01-01', '2024-02-29', '2020-01-01'];
      pastDates.forEach((d) => {
        const idx = getWorkoutCombinationIndex(d);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(8);
      });
    });

    it('handles leap years correctly across February 28, February 29, and March 1', () => {
      // 2028 is a leap year
      const feb28 = getWorkoutCombinationIndex('2028-02-28');
      const feb29 = getWorkoutCombinationIndex('2028-02-29');
      const mar01 = getWorkoutCombinationIndex('2028-03-01');

      expect(feb29).toBe((feb28 + 1) % 8);
      expect(mar01).toBe((feb29 + 1) % 8);
    });

    it('cycles sequentially across 8 consecutive days', () => {
      const indices: number[] = [];
      for (let i = 0; i < 8; i++) {
        const dayStr = String(1 + i).padStart(2, '0');
        indices.push(getWorkoutCombinationIndex(`2026-05-${dayStr}`));
      }

      // Check that each consecutive day increments by 1 mod 8
      for (let i = 1; i < 8; i++) {
        expect(indices[i]).toBe((indices[i - 1] + 1) % 8);
      }
    });
  });

  describe('Category Coverage & Balancing', () => {
    it('guarantees Drill 1 is Memory, Drill 2 is Attention/Speed, and Drill 3 is Reasoning', () => {
      for (let i = 0; i < 8; i++) {
        const [g1, g2, g3] = DAILY_WORKOUT_COMBINATIONS[i];
        expect(getDrillCategory(g1)).toBe('memory');
        expect(getDrillCategory(g2)).toBe('attention-speed');
        expect(getDrillCategory(g3)).toBe('reasoning');

        expect(['memory-matrix', 'number-recall']).toContain(g1);
        expect(['focus-finder', 'quick-reaction']).toContain(g2);
        expect(['logic-quest', 'pattern-master']).toContain(g3);
      }
    });

    it('guarantees equal 50% appearance for every game across the 8-day rotation', () => {
      const counts: Record<GameId, number> = {
        'memory-matrix': 0,
        'number-recall': 0,
        'focus-finder': 0,
        'quick-reaction': 0,
        'logic-quest': 0,
        'pattern-master': 0,
      };

      DAILY_WORKOUT_COMBINATIONS.forEach(([g1, g2, g3]) => {
        counts[g1]++;
        counts[g2]++;
        counts[g3]++;
      });

      // Exactly 4 appearances out of 8 days (50%) for each game
      Object.keys(counts).forEach((gameId) => {
        expect(counts[gameId as GameId]).toBe(4);
      });
    });

    it('creates an initialized DailyWorkoutRecord with correct structure', () => {
      const dateKey = '2026-10-22';
      const workout = createDailyWorkout(dateKey);

      expect(workout.id).toBe('workout_2026-10-22');
      expect(workout.dateKey).toBe(dateKey);
      expect(workout.status).toBe('not-started');
      expect(workout.currentDrillIndex).toBe(0);
      expect(workout.drills).toHaveLength(3);
      expect(workout.totalDurationMs).toBe(0);
      expect(workout.averageAccuracy).toBe(0);

      workout.drills.forEach((drill, index) => {
        expect(drill.order).toBe(index + 1);
        expect(drill.status).toBe('pending');
        expect(drill.estimatedDurationMins).toBeGreaterThan(0);
        expect(drill.categoryLabel).toBeTruthy();
      });
    });
  });
});
