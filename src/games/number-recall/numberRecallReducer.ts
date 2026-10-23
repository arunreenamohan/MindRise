/**
 * State Machine Reducer for Number Recall
 *
 * Enforces pure, deterministic state transitions for the game lifecycle.
 */

import {
  NumberRecallGameState,
  NumberRecallGameAction,
  NumberRecallRoundResult,
} from './types';
import {
  DEFAULT_INITIAL_LEVEL,
  TOTAL_SESSION_ROUNDS,
  MAX_STRIKES,
  getNumberRecallLevelConfig,
  computeNextNumberRecallLevel,
} from './difficultyCurve';
import {
  calculateNumberRecallRoundScore,
  computeNumberRecallSessionStats,
} from './scoringEngine';

/**
 * Creates the initial clean state for a new Number Recall session.
 */
export function createInitialNumberRecallState(
  initialLevel = DEFAULT_INITIAL_LEVEL
): NumberRecallGameState {
  const levelConfig = getNumberRecallLevelConfig(initialLevel);
  return {
    phase: 'countdown',
    previousPhase: null,
    currentRound: 1,
    totalRounds: TOTAL_SESSION_ROUNDS,
    currentLevel: levelConfig.level,
    highestLevel: levelConfig.level,
    maxDigitSpan: 0,
    strikesRemaining: MAX_STRIKES,
    maxStrikes: MAX_STRIKES,
    targetSequence: '',
    inputSequence: '',
    score: 0,
    roundScore: 0,
    consecutiveCorrectRounds: 0,
    displayDurationMs: levelConfig.displayDurationMs,
    roundStartTime: 0,
    recallStartTime: 0,
    sessionStartTime: 0,
    pausedAt: null,
    roundHistory: [],
    sessionStats: null,
  };
}

/**
 * Pure state transition reducer for Number Recall.
 */
export function numberRecallReducer(
  state: NumberRecallGameState,
  action: NumberRecallGameAction
): NumberRecallGameState {
  switch (action.type) {
    case 'START_GAME': {
      const now = action.timestamp ?? Date.now();
      const initLevel = typeof action.initialLevel === 'number' ? action.initialLevel : state.currentLevel;
      const levelConfig = getNumberRecallLevelConfig(initLevel);
      return {
        ...createInitialNumberRecallState(initLevel),
        phase: 'display',
        displayDurationMs: levelConfig.displayDurationMs,
        sessionStartTime: now,
        roundStartTime: now,
      };
    }

    case 'START_DISPLAY': {
      const now = action.timestamp ?? Date.now();
      return {
        ...state,
        phase: 'display',
        sessionStartTime: state.sessionStartTime === 0 ? now : state.sessionStartTime,
        targetSequence: action.targetSequence,
        displayDurationMs: action.displayDurationMs,
        inputSequence: '',
        roundScore: 0,
        roundStartTime: now,
      };
    }

    case 'START_RECALL': {
      if (state.phase !== 'display') {
        return state;
      }
      const now = action.timestamp ?? Date.now();
      return {
        ...state,
        phase: 'recall',
        recallStartTime: now,
        inputSequence: '',
      };
    }

    case 'APPEND_DIGIT': {
      if (state.phase !== 'recall') {
        return state;
      }
      if (!/^[0-9]$/.test(action.digit)) {
        return state;
      }
      if (state.inputSequence.length >= state.targetSequence.length) {
        return state;
      }
      return {
        ...state,
        inputSequence: state.inputSequence + action.digit,
      };
    }

    case 'DELETE_DIGIT': {
      if (state.phase !== 'recall') {
        return state;
      }
      if (state.inputSequence.length === 0) {
        return state;
      }
      return {
        ...state,
        inputSequence: state.inputSequence.slice(0, -1),
      };
    }

    case 'CLEAR_INPUT': {
      if (state.phase !== 'recall') {
        return state;
      }
      if (state.inputSequence.length === 0) {
        return state;
      }
      return {
        ...state,
        inputSequence: '',
      };
    }

    case 'SUBMIT_ANSWER': {
      // 1. Strictly forbid submission outside the recall phase
      if (state.phase !== 'recall') {
        return state;
      }

      // 2. Prevent submission of empty answer
      if (state.inputSequence.length === 0) {
        return state;
      }

      const now = action.timestamp ?? Date.now();
      const recallDurationMs = Math.max(0, now - state.recallStartTime);

      const scoreCalc = calculateNumberRecallRoundScore({
        level: state.currentLevel,
        targetSequence: state.targetSequence,
        submittedSequence: state.inputSequence,
        recallDurationMs,
        consecutiveCorrectRounds:
          state.inputSequence === state.targetSequence
            ? state.consecutiveCorrectRounds + 1
            : 0,
      });

      const nextStrikes = scoreCalc.isCorrect
        ? state.strikesRemaining
        : Math.max(0, state.strikesRemaining - 1);

      const roundResult: NumberRecallRoundResult = {
        round: state.currentRound,
        level: state.currentLevel,
        sequenceLength: state.targetSequence.length,
        targetSequence: state.targetSequence,
        submittedSequence: state.inputSequence,
        isCorrect: scoreCalc.isCorrect,
        matchedDigitsCount: scoreCalc.matchedDigitsCount,
        recallDurationMs,
        roundScore: scoreCalc.roundScore,
      };

      const nextMaxSpan = scoreCalc.isCorrect
        ? Math.max(state.maxDigitSpan, state.targetSequence.length)
        : state.maxDigitSpan;

      return {
        ...state,
        phase: 'round-feedback',
        score: state.score + scoreCalc.roundScore,
        roundScore: scoreCalc.roundScore,
        strikesRemaining: nextStrikes,
        maxDigitSpan: nextMaxSpan,
        consecutiveCorrectRounds: scoreCalc.isCorrect
          ? state.consecutiveCorrectRounds + 1
          : 0,
        highestLevel: Math.max(state.highestLevel, state.currentLevel),
        roundHistory: [...state.roundHistory, roundResult],
      };
    }

    case 'END_ROUND_FEEDBACK': {
      if (state.phase !== 'round-feedback') {
        return state;
      }

      const isGameOver = state.strikesRemaining <= 0;
      const isSessionComplete = state.currentRound >= state.totalRounds;

      if (isGameOver || isSessionComplete) {
        const now = action.timestamp ?? Date.now();
        const stats = computeNumberRecallSessionStats(
          state.roundHistory,
          state.totalRounds,
          state.sessionStartTime,
          new Date(now).toISOString(),
          now
        );
        return {
          ...state,
          phase: isGameOver ? 'game-over' : 'completed',
          sessionStats: stats,
        };
      }

      // Advance to next round with adaptive difficulty
      const lastRound = state.roundHistory[state.roundHistory.length - 1];
      const isLastRoundCorrect = lastRound?.isCorrect ?? false;
      const nextLevel = computeNextNumberRecallLevel(state.currentLevel, isLastRoundCorrect);
      const nextConfig = getNumberRecallLevelConfig(nextLevel);

      return {
        ...state,
        phase: 'display',
        currentRound: state.currentRound + 1,
        currentLevel: nextLevel,
        displayDurationMs: nextConfig.displayDurationMs,
        targetSequence: '',
        inputSequence: '',
        roundScore: 0,
        highestLevel: Math.max(state.highestLevel, nextLevel),
      };
    }

    case 'PAUSE_GAME': {
      if (
        state.phase === 'countdown' ||
        state.phase === 'display' ||
        state.phase === 'recall' ||
        state.phase === 'round-feedback'
      ) {
        const now = action.timestamp ?? Date.now();
        return {
          ...state,
          previousPhase: state.phase,
          phase: 'paused',
          pausedAt: now,
        };
      }
      return state;
    }

    case 'RESUME_GAME': {
      if (state.phase === 'paused' && state.previousPhase) {
        const now = action.timestamp ?? Date.now();
        const pauseDuration = state.pausedAt ? Math.max(0, now - state.pausedAt) : 0;

        const adjustedRecallStartTime =
          state.previousPhase === 'recall' && state.recallStartTime > 0
            ? state.recallStartTime + pauseDuration
            : state.recallStartTime;

        const adjustedRoundStartTime =
          state.roundStartTime > 0
            ? state.roundStartTime + pauseDuration
            : state.roundStartTime;

        return {
          ...state,
          phase: state.previousPhase,
          previousPhase: null,
          pausedAt: null,
          recallStartTime: adjustedRecallStartTime,
          roundStartTime: adjustedRoundStartTime,
        };
      }
      return state;
    }

    case 'RESTART_GAME': {
      const now = action.timestamp ?? Date.now();
      const initLevel = typeof action.initialLevel === 'number' ? action.initialLevel : DEFAULT_INITIAL_LEVEL;
      const initial = createInitialNumberRecallState(initLevel);
      return {
        ...initial,
        phase: 'countdown',
        sessionStartTime: now,
        roundStartTime: now,
      };
    }

    default:
      return state;
  }
}
