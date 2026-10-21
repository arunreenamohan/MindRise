import {
  LogicQuestion,
  QuestionResult,
  LogicQuestSessionStats,
  LogicQuestState,
  LogicQuestAction,
} from './types';
import { getCuratedQuestionsForSession } from './questionBank';

export const MAX_DIFFICULTY_LEVEL = 6;
export const DEFAULT_TOTAL_QUESTIONS = 10;
export const BASE_QUESTION_POINTS = 100;
export const MAX_SPEED_BONUS_PER_DIFF = 50;
export const STREAK_BONUS_POINTS = 20;

/**
 * Deterministic scoring formula for logic questions:
 * - Base points: 100 * difficulty
 * - Speed bonus: up to 50 * difficulty if answered within 5s, decaying to 0 at 15s
 * - Streak bonus: streak * 20
 * - Incorrect answers strictly yield 0 points
 */
export function calculateQuestionScore(
  isCorrect: boolean,
  difficulty: number,
  timeSpentMs: number,
  streak: number
): number {
  if (!isCorrect) {
    return 0;
  }

  const boundedDiff = Math.max(1, Math.min(MAX_DIFFICULTY_LEVEL, Math.floor(difficulty) || 1));
  const basePoints = BASE_QUESTION_POINTS * boundedDiff;

  let speedBonus = 0;
  if (Number.isFinite(timeSpentMs)) {
    if (timeSpentMs <= 5000) {
      speedBonus = MAX_SPEED_BONUS_PER_DIFF * boundedDiff;
    } else if (timeSpentMs < 15000) {
      const decayRatio = (15000 - timeSpentMs) / 10000;
      speedBonus = Math.round(MAX_SPEED_BONUS_PER_DIFF * boundedDiff * decayRatio);
    }
  }

  const streakBonus = Math.max(0, streak) * STREAK_BONUS_POINTS;
  return Math.max(0, basePoints + speedBonus + streakBonus);
}

/**
 * Calculates aggregate session statistics across all answered questions.
 */
export function calculateLogicQuestSessionStats(
  results: QuestionResult[],
  totalDurationMs: number,
  highestDifficulty?: number,
  totalQuestions?: number
): LogicQuestSessionStats {
  const questionsAnswered = results.length;
  const actualTotalQuestions =
    typeof totalQuestions === 'number'
      ? totalQuestions
      : questionsAnswered;
  const correctCount = results.filter((r) => r.isCorrect).length;
  const finalScore = results.reduce((sum, r) => sum + r.score, 0);

  const accuracyPercentage =
    actualTotalQuestions > 0 ? Math.round((correctCount / actualTotalQuestions) * 100) : 0;

  const validTimes = results
    .map((r) => r.timeSpentMs)
    .filter((t) => Number.isFinite(t) && t > 0);

  const avgResponseTimeMs =
    validTimes.length > 0
      ? Math.round(validTimes.reduce((sum, t) => sum + t, 0) / validTimes.length)
      : 0;

  const derivedHighestDiff =
    typeof highestDifficulty === 'number'
      ? highestDifficulty
      : results.reduce((max, r) => Math.max(max, r.difficulty), 1);

  return {
    totalQuestions: actualTotalQuestions,
    questionsAnswered,
    correctCount,
    accuracyPercentage,
    finalScore,
    highestDifficulty: Math.max(1, derivedHighestDiff),
    avgResponseTimeMs,
    totalDurationMs: Math.max(0, totalDurationMs),
    completedAt: new Date().toISOString(),
  };
}

export function createInitialLogicQuestState(
  customQuestions?: LogicQuestion[]
): LogicQuestState {
  const questions =
    customQuestions && customQuestions.length > 0
      ? customQuestions
      : getCuratedQuestionsForSession(DEFAULT_TOTAL_QUESTIONS);

  const initialDiff = questions[0]?.difficulty || 1;

  return {
    phase: 'question',
    currentIndex: 0,
    totalQuestions: questions.length,
    questions,
    selectedOptionIndex: undefined,
    isCurrentAnswerCorrect: undefined,
    currentRoundScore: undefined,
    consecutiveCorrect: 0,
    score: 0,
    results: [],
    currentLevel: initialDiff,
    highestLevelReached: initialDiff,
    questionStartTime: Date.now(),
    sessionStartTime: Date.now(),
  };
}

export function logicQuestReducer(
  state: LogicQuestState,
  action: LogicQuestAction
): LogicQuestState {
  switch (action.type) {
    case 'SELECT_OPTION': {
      if (state.phase !== 'question') return state;
      if (action.optionIndex < 0 || action.optionIndex > 3) return state;
      return {
        ...state,
        selectedOptionIndex: action.optionIndex,
      };
    }

    case 'SUBMIT_ANSWER': {
      if (state.phase !== 'question') return state;
      if (state.selectedOptionIndex === undefined) return state;

      const currentQ = state.questions[state.currentIndex];
      if (!currentQ) return state;

      const isCorrect = state.selectedOptionIndex === currentQ.correctIndex;
      const timeSpentMs = Math.max(
        1,
        Math.round(action.responseTimestamp - state.questionStartTime)
      );

      const roundScore = calculateQuestionScore(
        isCorrect,
        currentQ.difficulty,
        timeSpentMs,
        state.consecutiveCorrect
      );

      const nextStreak = isCorrect ? state.consecutiveCorrect + 1 : 0;
      const nextLevel = isCorrect
        ? Math.min(MAX_DIFFICULTY_LEVEL, state.currentLevel + 1)
        : Math.max(1, state.currentLevel - 1);

      const result: QuestionResult = {
        questionId: currentQ.id,
        category: currentQ.category,
        difficulty: currentQ.difficulty,
        selectedIndex: state.selectedOptionIndex,
        correctIndex: currentQ.correctIndex,
        isCorrect,
        score: roundScore,
        timeSpentMs,
      };

      return {
        ...state,
        phase: 'feedback',
        isCurrentAnswerCorrect: isCorrect,
        currentRoundScore: roundScore,
        score: state.score + roundScore,
        consecutiveCorrect: nextStreak,
        currentLevel: nextLevel,
        highestLevelReached: Math.max(state.highestLevelReached, nextLevel),
        results: [...state.results, result],
      };
    }

    case 'NEXT_QUESTION': {
      if (state.phase !== 'feedback') return state;

      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.totalQuestions) {
        const totalDuration = Date.now() - state.sessionStartTime;
        const stats = calculateLogicQuestSessionStats(
          state.results,
          totalDuration,
          state.highestLevelReached,
          state.totalQuestions
        );

        return {
          ...state,
          phase: 'completed',
          sessionStats: stats,
        };
      }

      return {
        ...state,
        phase: 'question',
        currentIndex: nextIndex,
        selectedOptionIndex: undefined,
        isCurrentAnswerCorrect: undefined,
        currentRoundScore: undefined,
        questionStartTime: action.nextTimestamp,
      };
    }

    case 'PAUSE_GAME': {
      if (state.phase === 'question' || state.phase === 'feedback') {
        return {
          ...state,
          phase: 'paused',
          previousPhase: state.phase,
        };
      }
      return state;
    }

    case 'RESUME_GAME': {
      if (state.phase !== 'paused') return state;
      return {
        ...state,
        phase: state.previousPhase || 'question',
        previousPhase: undefined,
        // Reset question start time to prevent paused duration from inflating response time
        questionStartTime: Date.now(),
      };
    }

    case 'RESTART_GAME':
      return createInitialLogicQuestState(action.questions);

    default:
      return state;
  }
}
