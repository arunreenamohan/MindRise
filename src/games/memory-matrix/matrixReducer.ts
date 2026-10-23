/**
 * State Machine Reducer for Memory Matrix
 *
 * Enforces pure, deterministic state transitions for the game lifecycle.
 */

import { GameState, GameAction, RoundResult } from './types';
import {
  DEFAULT_INITIAL_LEVEL,
  TOTAL_SESSION_ROUNDS,
  MAX_STRIKES,
  getLevelConfig,
  computeNextLevel,
} from './difficultyCurve';
import { calculateRoundScore, computeSessionStats } from './scoringEngine';

/**
 * Creates the initial clean state for a new Memory Matrix session.
 */
export function createInitialGameState(initialLevel = DEFAULT_INITIAL_LEVEL): GameState {
  const levelConfig = getLevelConfig(initialLevel);
  return {
    phase: 'countdown',
    previousPhase: null,
    currentRound: 1,
    totalRounds: TOTAL_SESSION_ROUNDS,
    currentLevel: levelConfig.level,
    highestLevel: levelConfig.level,
    strikesRemaining: MAX_STRIKES,
    maxStrikes: MAX_STRIKES,
    gridSize: levelConfig.gridSize,
    targetIndices: [],
    selectedIndices: [],
    mistakeIndices: [],
    score: 0,
    roundScore: 0,
    consecutivePerfectRounds: 0,
    previewDurationMs: levelConfig.previewDurationMs,
    roundStartTime: 0,
    recallStartTime: 0,
    sessionStartTime: 0,
    pausedAt: null,
    roundHistory: [],
    sessionStats: null,
  };
}

/**
 * Pure state transition reducer.
 */
export function matrixReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const now = action.timestamp ?? Date.now();
      const initLevel = typeof action.initialLevel === 'number' ? action.initialLevel : state.currentLevel;
      const levelConfig = getLevelConfig(initLevel);
      return {
        ...createInitialGameState(initLevel),
        phase: 'preview',
        gridSize: levelConfig.gridSize,
        previewDurationMs: levelConfig.previewDurationMs,
        sessionStartTime: now,
        roundStartTime: now,
      };
    }

    case 'START_PREVIEW': {
      const now = action.timestamp ?? Date.now();
      const levelConfig = getLevelConfig(state.currentLevel);
      return {
        ...state,
        phase: 'preview',
        sessionStartTime: state.sessionStartTime === 0 ? now : state.sessionStartTime,
        gridSize: levelConfig.gridSize,
        targetIndices: [...action.targetIndices],
        previewDurationMs: action.previewDurationMs,
        selectedIndices: [],
        mistakeIndices: [],
        roundScore: 0,
        roundStartTime: now,
      };
    }

    case 'START_RECALL': {
      // Disallow entering recall if not currently in preview
      if (state.phase !== 'preview') {
        return state;
      }
      const now = action.timestamp ?? Date.now();
      return {
        ...state,
        phase: 'recall',
        recallStartTime: now,
      };
    }

    case 'TAP_TILE': {
      // 1. Strictly forbid interactions outside the recall phase
      if (state.phase !== 'recall') {
        return state;
      }

      const { tileIndex } = action;
      const now = action.timestamp ?? Date.now();

      // 2. Prevent duplicate taps on already selected or mistake tiles
      if (
        state.selectedIndices.includes(tileIndex) ||
        state.mistakeIndices.includes(tileIndex)
      ) {
        return state;
      }

      const isHit = state.targetIndices.includes(tileIndex);

      if (isHit) {
        const nextSelected = [...state.selectedIndices, tileIndex];
        const allTargetsFound = nextSelected.length === state.targetIndices.length;

        if (allTargetsFound) {
          // Round completed successfully!
          const recallDurationMs = Math.max(0, now - state.recallStartTime);
          const scoreCalculation = calculateRoundScore({
            level: state.currentLevel,
            correctCount: nextSelected.length,
            mistakesCount: state.mistakeIndices.length,
            recallDurationMs,
            consecutivePerfectRounds:
              state.mistakeIndices.length === 0
                ? state.consecutivePerfectRounds + 1
                : 0,
          });

          const roundResult: RoundResult = {
            round: state.currentRound,
            level: state.currentLevel,
            gridSize: state.gridSize,
            targetCount: state.targetIndices.length,
            correctCount: nextSelected.length,
            mistakesCount: state.mistakeIndices.length,
            recallDurationMs,
            roundScore: scoreCalculation.roundScore,
            isPerfect: scoreCalculation.isPerfect,
          };

          return {
            ...state,
            phase: 'round-feedback',
            selectedIndices: nextSelected,
            score: state.score + scoreCalculation.roundScore,
            roundScore: scoreCalculation.roundScore,
            consecutivePerfectRounds: scoreCalculation.isPerfect
              ? state.consecutivePerfectRounds + 1
              : 0,
            highestLevel: Math.max(state.highestLevel, state.currentLevel),
            roundHistory: [...state.roundHistory, roundResult],
          };
        }

        // Target found, but more targets remain in current round
        return {
          ...state,
          selectedIndices: nextSelected,
        };
      }

      // Mistake tapped: penalty and strike deduction
      const nextMistakes = [...state.mistakeIndices, tileIndex];
      const nextStrikes = Math.max(0, state.strikesRemaining - 1);
      // Max mistakes in a single round is 2, or running out of strikes
      const roundFailed = nextStrikes === 0 || nextMistakes.length >= 2;

      if (roundFailed) {
        const recallDurationMs = Math.max(0, now - state.recallStartTime);
        const scoreCalculation = calculateRoundScore({
          level: state.currentLevel,
          correctCount: state.selectedIndices.length,
          mistakesCount: nextMistakes.length,
          recallDurationMs,
          consecutivePerfectRounds: 0,
        });

        const roundResult: RoundResult = {
          round: state.currentRound,
          level: state.currentLevel,
          gridSize: state.gridSize,
          targetCount: state.targetIndices.length,
          correctCount: state.selectedIndices.length,
          mistakesCount: nextMistakes.length,
          recallDurationMs,
          roundScore: scoreCalculation.roundScore,
          isPerfect: false,
        };

        return {
          ...state,
          phase: 'round-feedback',
          mistakeIndices: nextMistakes,
          strikesRemaining: nextStrikes,
          score: state.score + scoreCalculation.roundScore,
          roundScore: scoreCalculation.roundScore,
          consecutivePerfectRounds: 0,
          roundHistory: [...state.roundHistory, roundResult],
        };
      }

      // Mistake recorded, but round continues
      return {
        ...state,
        mistakeIndices: nextMistakes,
        strikesRemaining: nextStrikes,
      };
    }

    case 'END_ROUND_FEEDBACK': {
      if (state.phase !== 'round-feedback') {
        return state;
      }

      // Check if session has concluded
      const isGameOver = state.strikesRemaining <= 0;
      const isSessionComplete = state.currentRound >= state.totalRounds;

      if (isGameOver || isSessionComplete) {
        const now = action.timestamp ?? Date.now();
        const stats = computeSessionStats(
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
      const lastRoundResult = state.roundHistory[state.roundHistory.length - 1];
      const isLastRoundPerfect = lastRoundResult?.isPerfect ?? false;
      const nextLevel = computeNextLevel(state.currentLevel, isLastRoundPerfect);
      const nextConfig = getLevelConfig(nextLevel);

      return {
        ...state,
        phase: 'preview',
        currentRound: state.currentRound + 1,
        currentLevel: nextLevel,
        gridSize: nextConfig.gridSize,
        previewDurationMs: nextConfig.previewDurationMs,
        targetIndices: [],
        selectedIndices: [],
        mistakeIndices: [],
        roundScore: 0,
        highestLevel: Math.max(state.highestLevel, nextLevel),
      };
    }

    case 'PAUSE_GAME': {
      if (
        state.phase === 'countdown' ||
        state.phase === 'preview' ||
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
      const initial = createInitialGameState(initLevel);
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
