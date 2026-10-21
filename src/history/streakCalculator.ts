/**
 * Streak and Calendar Calculation Engine
 *
 * Implements deterministic streak calculations based on local calendar dates (YYYY-MM-DD).
 * Handles midnight boundaries, leap years, month/year transitions, and multiple sessions on a single day.
 */

/**
 * Returns 'YYYY-MM-DD' representing the local calendar date for a given Date object.
 */
export function getLocalDateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes exact integer day difference between two 'YYYY-MM-DD' dates (date2 - date1).
 * Uses UTC representation to eliminate Daylight Saving Time and timezone skew.
 */
export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const parts1 = dateStr1.split('-').map(Number);
  const parts2 = dateStr2.split('-').map(Number);
  if (parts1.length !== 3 || parts2.length !== 3) {
    return 0;
  }
  const [y1, m1, d1] = parts1;
  const [y2, m2, d2] = parts2;
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((utc2 - utc1) / msPerDay);
}

export interface StreakResult {
  currentStreak: number;
  bestStreak: number;
}

/**
 * Calculates current and best streak given an array of training date keys ('YYYY-MM-DD').
 *
 * Rules:
 * - Multiple sessions on the same calendar day count as 1 training day.
 * - Current streak is active if the user trained today OR yesterday (giving the user until midnight to train today).
 * - Best streak is the maximum consecutive calendar days found across all historical training days.
 *
 * @param dateKeys Array of 'YYYY-MM-DD' strings
 * @param referenceDate Optional reference date for testing (defaults to now)
 */
export function calculateStreak(
  dateKeys: string[],
  referenceDate: Date = new Date()
): StreakResult {
  if (!dateKeys || dateKeys.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Deduplicate and filter valid 'YYYY-MM-DD' patterns
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const rawUniqueDates = Array.from(
    new Set(dateKeys.filter((k) => typeof k === 'string' && dateRegex.test(k)))
  );

  if (rawUniqueDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const todayKey = getLocalDateKey(referenceDate);

  // Timezone & Future Date Validation Policy:
  // - Global timezones span from UTC-12 to UTC+14 (at most 26 hours total difference).
  // - A workout can legitimately be at most 1 calendar day ahead of local reference date
  //   (e.g., user trained in Tokyo on Oct 22 and flew westward to Honolulu where it is Oct 21: diff = -1).
  // - Any record >= 2 days in the future (diff < -1) is physically impossible through normal timezone
  //   differences and represents an invalid/corrupted date. It is excluded so future timestamps
  //   cannot falsely preserve an active streak forever.
  const validDates = rawUniqueDates.filter((dateStr) => {
    const diff = getDaysDifference(dateStr, todayKey);
    return diff >= -1;
  });

  if (validDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Sort chronologically ascending
  validDates.sort((a, b) => a.localeCompare(b));

  // 1. Calculate best streak across valid historical timeline
  let bestStreak = 1;
  let currentRun = 1;

  for (let i = 1; i < validDates.length; i++) {
    const diff = getDaysDifference(validDates[i - 1], validDates[i]);
    if (diff === 1) {
      currentRun += 1;
      if (currentRun > bestStreak) {
        bestStreak = currentRun;
      }
    } else if (diff > 1) {
      currentRun = 1;
    }
  }

  // 2. Calculate current active streak ending today, yesterday, or tomorrow (timezone shift)
  const latestTrained = validDates[validDates.length - 1];
  const diffFromToday = getDaysDifference(latestTrained, todayKey);

  // If latest training was before yesterday (diffFromToday > 1), the active streak has lapsed.
  // diffFromToday is guaranteed >= -1 due to the filter above.
  if (diffFromToday > 1) {
    return { currentStreak: 0, bestStreak };
  }

  // Walk backwards from latest training date counting consecutive days
  let activeStreak = 1;
  for (let i = validDates.length - 1; i > 0; i--) {
    const diff = getDaysDifference(validDates[i - 1], validDates[i]);
    if (diff === 1) {
      activeStreak += 1;
    } else {
      break;
    }
  }

  return {
    currentStreak: activeStreak,
    bestStreak: Math.max(bestStreak, activeStreak),
  };
}

/**
 * Computes the transparent in-app Drill Performance Index.
 *
 * Formula:
 * - When totalWorkouts > 0: Math.round(totalScore / totalWorkouts)
 * - When totalWorkouts === 0: null (uncalibrated)
 *
 * Input metrics:
 * - totalScore: sum of final scores across qualifying sessions (completed or game-over)
 * - totalWorkouts: count of qualifying sessions
 *
 * Boundaries:
 * - Lower bound: 0
 * - Uncalibrated: null
 *
 * IMPORTANT: This metric is an in-app training score average. It is NOT an IQ score,
 * cognitive percentile, or clinically validated measure of general cognitive ability.
 */
export function calculateDrillPerformanceIndex(
  totalScore: number,
  totalWorkouts: number
): number | null {
  if (!Number.isFinite(totalWorkouts) || totalWorkouts <= 0) {
    return null;
  }
  if (!Number.isFinite(totalScore) || totalScore <= 0) {
    return 0;
  }
  const average = totalScore / totalWorkouts;
  return Math.max(0, Math.round(average));
}
