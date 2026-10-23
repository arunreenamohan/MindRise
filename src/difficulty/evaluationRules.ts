import { GameId } from '../games/types';
import { GameSessionRecord } from '../history/types';
import {
  DifficultyAdjustmentResult,
  EVALUATION_WINDOW_SIZE,
  STARTING_DIFFICULTY_BOUNDS,
} from './types';

/**
 * Validates whether a raw session record represents a legitimate,
 * evaluated session suitable for adaptive difficulty assessment.
 *
 * Excludes:
 * - Abandoned sessions
 * - Sessions with invalid/negative or impossible metrics
 * - Sessions with insufficient completed rounds
 * - Unrealistic timing artifacts
 */
export function isSessionEligibleForEvaluation(session: GameSessionRecord): boolean {
  if (!session || typeof session !== 'object') {
    return false;
  }

  // 1. Must not be abandoned
  if (session.outcome === 'abandoned') {
    return false;
  }

  // 2. Metrics sanity checks
  if (
    !Number.isFinite(session.finalScore) ||
    session.finalScore < 0 ||
    !Number.isFinite(session.accuracyPercentage) ||
    session.accuracyPercentage < 0 ||
    session.accuracyPercentage > 100 ||
    !Number.isFinite(session.durationMs) ||
    session.durationMs <= 0 ||
    !Number.isFinite(session.totalRounds) ||
    session.totalRounds <= 0 ||
    !Number.isFinite(session.roundsCompleted) ||
    session.roundsCompleted <= 0
  ) {
    return false;
  }

  // 3. Round completeness and outcome validation
  if (session.outcome === 'completed') {
    // A completed session must have finished all designated rounds
    if (session.roundsCompleted < session.totalRounds) {
      return false;
    }
  } else if (session.outcome === 'game-over') {
    // Only strike-out games (Memory Matrix, Number Recall) can legitimately end in game-over
    if (session.gameId !== 'memory-matrix' && session.gameId !== 'number-recall') {
      return false;
    }
    // Must have played at least 3 rounds to be an evaluated strike-out, not an immediate crash
    if (session.roundsCompleted < 3) {
      return false;
    }
  } else {
    return false;
  }

  // 4. Time sanity check: at least 400ms per round completed
  if (session.durationMs < session.roundsCompleted * 400) {
    return false;
  }

  return true;
}

/**
 * Pure evaluation function calculating adaptive difficulty for a game based on
 * the 3 most recent eligible sessions.
 */
export function evaluateGameDifficulty(
  gameId: GameId,
  currentStartingLevel: number,
  eligibleSessions: GameSessionRecord[]
): DifficultyAdjustmentResult {
  const bounds = STARTING_DIFFICULTY_BOUNDS[gameId];
  const boundedCurrent = Math.max(
    bounds.minStartingLevel,
    Math.min(bounds.maxStartingLevel, Math.round(currentStartingLevel) || bounds.defaultStartingLevel)
  );

  // Require at least EVALUATION_WINDOW_SIZE (3) qualifying sessions
  if (eligibleSessions.length < EVALUATION_WINDOW_SIZE) {
    return {
      nextStartingLevel: boundedCurrent,
      reason: 'unchanged',
    };
  }

  // Take the most recent 3 sessions for evaluation window
  const window = eligibleSessions.slice(0, EVALUATION_WINDOW_SIZE);

  const avgAccuracy = window.reduce((sum, s) => sum + s.accuracyPercentage, 0) / window.length;

  switch (gameId) {
    case 'memory-matrix': {
      // Promotion (+1, max 8):
      // All 3 completed, avg accuracy >= 85%, each session >= 6 perfect rounds,
      // and each session climbed at least 2 levels above its starting level.
      const allCompleted = window.every((s) => s.outcome === 'completed');
      const allHighAccuracy = avgAccuracy >= 85;
      const allSustainedPerfectRounds = window.every(
        (s) => (s.gameSpecificMetrics?.perfectRounds ?? 0) >= 6
      );
      const allClimbed = window.every((s) => {
        const refStart = s.startingLevel ?? boundedCurrent;
        return s.highestLevel >= refStart + 2;
      });

      if (allCompleted && allHighAccuracy && allSustainedPerfectRounds && allClimbed) {
        const next = Math.min(bounds.maxStartingLevel, boundedCurrent + 1);
        return {
          nextStartingLevel: next,
          reason: next > boundedCurrent ? 'sustained_performance' : 'unchanged',
        };
      }

      // Demotion (-1, min 1):
      // Average accuracy < 60% OR at least 2 sessions ended in strike-out before round 7
      const strikesOutEarlyCount = window.filter(
        (s) => s.outcome === 'game-over' && s.roundsCompleted < 7
      ).length;

      if (avgAccuracy < 60 || strikesOutEarlyCount >= 2) {
        const next = Math.max(bounds.minStartingLevel, boundedCurrent - 1);
        return {
          nextStartingLevel: next,
          reason: next < boundedCurrent ? 'sustained_struggle' : 'unchanged',
        };
      }

      return { nextStartingLevel: boundedCurrent, reason: 'unchanged' };
    }

    case 'number-recall': {
      // Promotion (+1, max 7):
      // All 3 completed, avg accuracy >= 85%, and maxDigitSpan >= startingLevel + 3
      const allCompleted = window.every((s) => s.outcome === 'completed');
      const allHighAccuracy = avgAccuracy >= 85;
      const allSpanMastered = window.every((s) => {
        const refStart = s.startingLevel ?? boundedCurrent;
        const span = s.gameSpecificMetrics?.maxDigitSpan;
        return typeof span === 'number' && span >= refStart + 3;
      });

      if (allCompleted && allHighAccuracy && allSpanMastered) {
        const next = Math.min(bounds.maxStartingLevel, boundedCurrent + 1);
        return {
          nextStartingLevel: next,
          reason: next > boundedCurrent ? 'sustained_performance' : 'unchanged',
        };
      }

      // Demotion (-1, min 1):
      // Avg accuracy < 60% OR >= 2 sessions ended in strike-out with span <= startingLevel + 1
      const earlyFailures = window.filter((s) => {
        if (s.outcome !== 'game-over') return false;
        const refStart = s.startingLevel ?? boundedCurrent;
        const span = s.gameSpecificMetrics?.maxDigitSpan ?? 0;
        return span <= refStart + 1;
      }).length;

      if (avgAccuracy < 60 || earlyFailures >= 2) {
        const next = Math.max(bounds.minStartingLevel, boundedCurrent - 1);
        return {
          nextStartingLevel: next,
          reason: next < boundedCurrent ? 'sustained_struggle' : 'unchanged',
        };
      }

      return { nextStartingLevel: boundedCurrent, reason: 'unchanged' };
    }

    case 'quick-reaction': {
      // Promotion (+1, max 4):
      // All 3 completed, valid hits accuracy >= 80%, median reaction < 320ms, false starts <= 1
      const allCompleted = window.every((s) => s.outcome === 'completed');
      const allHighAccuracy = avgAccuracy >= 80;
      const allFastAndControlled = window.every((s) => {
        const median = (s.gameSpecificMetrics?.medianReactionMs as number) ??
          (s.gameSpecificMetrics?.avgReactionMs as number) ?? 999;
        const falseStarts = (s.gameSpecificMetrics?.falseStarts as number) ?? 0;
        return Number.isFinite(median) && median > 100 && median < 320 && falseStarts <= 1;
      });

      if (allCompleted && allHighAccuracy && allFastAndControlled) {
        const next = Math.min(bounds.maxStartingLevel, boundedCurrent + 1);
        return {
          nextStartingLevel: next,
          reason: next > boundedCurrent ? 'sustained_performance' : 'unchanged',
        };
      }

      // Demotion (-1, min 1):
      // Accuracy < 60% OR median reaction > 480ms in >= 2 sessions OR false starts + timeouts >= 4 in >= 2 sessions
      const slowOrErraticCount = window.filter((s) => {
        const median = (s.gameSpecificMetrics?.medianReactionMs as number) ??
          (s.gameSpecificMetrics?.avgReactionMs as number) ?? 0;
        const falseStarts = (s.gameSpecificMetrics?.falseStarts as number) ?? 0;
        const timeouts = (s.gameSpecificMetrics?.timeouts as number) ?? 0;
        return median > 480 || (falseStarts + timeouts) >= 4;
      }).length;

      if (avgAccuracy < 60 || slowOrErraticCount >= 2) {
        const next = Math.max(bounds.minStartingLevel, boundedCurrent - 1);
        return {
          nextStartingLevel: next,
          reason: next < boundedCurrent ? 'sustained_struggle' : 'unchanged',
        };
      }

      return { nextStartingLevel: boundedCurrent, reason: 'unchanged' };
    }

    case 'focus-finder': {
      // Promotion (+1, max 4):
      // All completed, accuracy >= 80%, avgFindTimeMs < 3500ms, highestLevel >= startingLevel + 1
      const allCompleted = window.every((s) => s.outcome === 'completed');
      const allHighAccuracy = avgAccuracy >= 80;
      const allFastSearch = window.every((s) => {
        const avgTime = s.gameSpecificMetrics?.avgFindTimeMs as number ?? 99999;
        const refStart = s.startingLevel ?? boundedCurrent;
        return Number.isFinite(avgTime) && avgTime > 0 && avgTime < 3500 && s.highestLevel >= refStart + 1;
      });

      if (allCompleted && allHighAccuracy && allFastSearch) {
        const next = Math.min(bounds.maxStartingLevel, boundedCurrent + 1);
        return {
          nextStartingLevel: next,
          reason: next > boundedCurrent ? 'sustained_performance' : 'unchanged',
        };
      }

      // Demotion (-1, min 1):
      // Accuracy < 60% OR avgFindTimeMs > 6500ms in >= 2 sessions
      const slowSearchCount = window.filter((s) => {
        const avgTime = s.gameSpecificMetrics?.avgFindTimeMs as number ?? 0;
        const misses = (s.gameSpecificMetrics?.misses as number) ?? 0;
        const timeouts = (s.gameSpecificMetrics?.timeouts as number) ?? 0;
        return avgTime > 6500 || (misses + timeouts) >= 4;
      }).length;

      if (avgAccuracy < 60 || slowSearchCount >= 2) {
        const next = Math.max(bounds.minStartingLevel, boundedCurrent - 1);
        return {
          nextStartingLevel: next,
          reason: next < boundedCurrent ? 'sustained_struggle' : 'unchanged',
        };
      }

      return { nextStartingLevel: boundedCurrent, reason: 'unchanged' };
    }

    case 'logic-quest': {
      // Promotion (+1 Tier, max Tier 3):
      // All completed, avg accuracy >= 80%, avgResponseTimeMs <= 10000ms
      const allCompleted = window.every((s) => s.outcome === 'completed');
      const allHighAccuracy = avgAccuracy >= 80;
      const allPaced = window.every((s) => {
        const avgTime = s.gameSpecificMetrics?.avgResponseTimeMs as number ?? 99999;
        return Number.isFinite(avgTime) && avgTime <= 10000;
      });

      if (allCompleted && allHighAccuracy && allPaced) {
        const next = Math.min(bounds.maxStartingLevel, boundedCurrent + 1);
        return {
          nextStartingLevel: next,
          reason: next > boundedCurrent ? 'sustained_performance' : 'unchanged',
        };
      }

      // Demotion (-1 Tier, min Tier 1):
      // Average accuracy <= 50%
      if (avgAccuracy <= 50) {
        const next = Math.max(bounds.minStartingLevel, boundedCurrent - 1);
        return {
          nextStartingLevel: next,
          reason: next < boundedCurrent ? 'sustained_struggle' : 'unchanged',
        };
      }

      return { nextStartingLevel: boundedCurrent, reason: 'unchanged' };
    }

    case 'pattern-master': {
      // Promotion (+1 Tier, max Tier 3):
      // All completed, avg accuracy >= 80%, avgResponseTimeMs <= 12000ms
      const allCompleted = window.every((s) => s.outcome === 'completed');
      const allHighAccuracy = avgAccuracy >= 80;
      const allPaced = window.every((s) => {
        const avgTime = s.gameSpecificMetrics?.avgResponseTimeMs as number ?? 99999;
        return Number.isFinite(avgTime) && avgTime <= 12000;
      });

      if (allCompleted && allHighAccuracy && allPaced) {
        const next = Math.min(bounds.maxStartingLevel, boundedCurrent + 1);
        return {
          nextStartingLevel: next,
          reason: next > boundedCurrent ? 'sustained_performance' : 'unchanged',
        };
      }

      // Demotion (-1 Tier, min Tier 1):
      // Average accuracy <= 50%
      if (avgAccuracy <= 50) {
        const next = Math.max(bounds.minStartingLevel, boundedCurrent - 1);
        return {
          nextStartingLevel: next,
          reason: next < boundedCurrent ? 'sustained_struggle' : 'unchanged',
        };
      }

      return { nextStartingLevel: boundedCurrent, reason: 'unchanged' };
    }

    default:
      return { nextStartingLevel: boundedCurrent, reason: 'unchanged' };
  }
}
