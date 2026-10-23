import {
  PatternQuestion,
  PatternQuestionResult,
  PatternMasterSessionStats,
  PatternMasterState,
  PatternMasterAction,
} from './types';
import { PATTERN_QUESTION_BANK, selectSessionQuestions, validateQuestionBank } from './questionBank';

export const PATTERN_MASTER_TIME_LIMIT_MS = 20000;
export const TOTAL_PATTERN_MASTER_QUESTIONS = 10;

/**
 * Calculates question score based on difficulty level, correctness, latency, and streaks.
 */
export function calculatePatternScore(
  difficulty: number,
  isCorrect: boolean,
  timeSpentMs: number,
  timeLimitMs: number = PATTERN_MASTER_TIME_LIMIT_MS,
  consecutiveCorrect: number = 0
): number {
  if (!isCorrect) {
    return -40;
  }

  const boundedDifficulty = Math.max(1, Math.min(6, difficulty));
  const baseScore = boundedDifficulty * 200;

  const safeTimeSpent = Math.max(0, Math.min(timeLimitMs, timeSpentMs));
  const speedRatio = Math.max(0, (timeLimitMs - safeTimeSpent) / timeLimitMs);
  const speedBonus = Math.round(speedRatio * 100 * boundedDifficulty);

  const streakBonus = consecutiveCorrect >= 2 ? consecutiveCorrect * 50 : 0;

  return baseScore + speedBonus + streakBonus;
}

/**
 * Aggregates complete session performance statistics.
 */
export function calculatePatternMasterSessionStats(
  results: PatternQuestionResult[],
  totalQuestions: number,
  sessionStartTime: number,
  completedTimestamp?: number
): PatternMasterSessionStats {
  const completedAt = new Date(completedTimestamp || Date.now()).toISOString();
  const totalDurationMs = Math.max(0, (completedTimestamp || Date.now()) - sessionStartTime);

  const questionsAnswered = results.length;
  const correctCount = results.filter((r) => r.isCorrect).length;

  const totalScoreRaw = results.reduce((sum, r) => sum + r.score, 0);
  const finalScore = Math.max(0, totalScoreRaw);

  const accuracyPercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const highestDifficulty = results.reduce((max, r) => Math.max(max, r.difficulty), 1);

  const totalTimeSpent = results.reduce((sum, r) => sum + r.timeSpentMs, 0);
  const avgResponseTimeMs =
    questionsAnswered > 0 ? Math.round(totalTimeSpent / questionsAnswered) : 0;

  return {
    totalQuestions,
    questionsAnswered,
    correctCount,
    accuracyPercentage,
    finalScore,
    highestDifficulty,
    avgResponseTimeMs,
    totalDurationMs,
    completedAt,
  };
}

/**
 * Initializes clean state for a new Pattern Master game session.
 */
export function createInitialPatternMasterState(
  customQuestions?: PatternQuestion[],
  startTimestamp: number = Date.now(),
  prng?: () => number,
  startingTier: number = 1
): PatternMasterState {
  let questions: PatternQuestion[];

  if (customQuestions && validateQuestionBank(customQuestions)) {
    questions = customQuestions;
  } else {
    questions = selectSessionQuestions(
      PATTERN_QUESTION_BANK,
      TOTAL_PATTERN_MASTER_QUESTIONS,
      prng,
      startingTier
    );
  }

  const initialDifficulty = questions.length > 0 ? questions[0].difficulty : 1;

  return {
    phase: 'question',
    currentIndex: 0,
    totalQuestions: questions.length,
    questions,
    consecutiveCorrect: 0,
    score: 0,
    results: [],
    currentLevel: initialDifficulty,
    highestLevelReached: initialDifficulty,
    questionStartTime: startTimestamp,
    sessionStartTime: startTimestamp,
  };
}

/**
 * Pure state reducer driving Pattern Master gameplay.
 */
export function patternMasterReducer(
  state: PatternMasterState,
  action: PatternMasterAction
): PatternMasterState {
  switch (action.type) {
    case 'SELECT_OPTION': {
      if (state.phase !== 'question') {
        return state;
      }
      return {
        ...state,
        selectedOptionIndex: action.optionIndex,
      };
    }

    case 'SUBMIT_ANSWER': {
      // Prevent submission if not in question phase or no option selected
      if (state.phase !== 'question' || state.selectedOptionIndex === undefined) {
        return state;
      }

      const currentQuestion = state.questions[state.currentIndex];
      if (!currentQuestion) {
        return state;
      }

      const isCorrect = state.selectedOptionIndex === currentQuestion.correctIndex;
      const timeSpentMs = Math.max(0, action.responseTimestamp - state.questionStartTime);
      const nextConsecutive = isCorrect ? state.consecutiveCorrect + 1 : 0;

      const roundScore = calculatePatternScore(
        currentQuestion.difficulty,
        isCorrect,
        timeSpentMs,
        PATTERN_MASTER_TIME_LIMIT_MS,
        state.consecutiveCorrect
      );

      const nextScore = Math.max(0, state.score + roundScore);

      const result: PatternQuestionResult = {
        questionId: currentQuestion.id,
        category: currentQuestion.category,
        difficulty: currentQuestion.difficulty,
        selectedIndex: state.selectedOptionIndex,
        correctIndex: currentQuestion.correctIndex,
        isCorrect,
        score: roundScore,
        timeSpentMs,
      };

      return {
        ...state,
        phase: 'feedback',
        isCurrentAnswerCorrect: isCorrect,
        currentRoundScore: roundScore,
        consecutiveCorrect: nextConsecutive,
        score: nextScore,
        results: [...state.results, result],
      };
    }

    case 'NEXT_QUESTION': {
      if (state.phase !== 'feedback') {
        return state;
      }

      const nextIndex = state.currentIndex + 1;

      // Check if session reached final question
      if (nextIndex >= state.totalQuestions) {
        const stats = calculatePatternMasterSessionStats(
          state.results,
          state.totalQuestions,
          state.sessionStartTime,
          action.nextTimestamp
        );

        return {
          ...state,
          phase: 'completed',
          sessionStats: stats,
        };
      }

      const nextQuestion = state.questions[nextIndex];
      const nextLevel = nextQuestion ? nextQuestion.difficulty : state.currentLevel;

      return {
        ...state,
        phase: 'question',
        currentIndex: nextIndex,
        currentLevel: nextLevel,
        highestLevelReached: Math.max(state.highestLevelReached, nextLevel),
        selectedOptionIndex: undefined,
        isCurrentAnswerCorrect: undefined,
        currentRoundScore: undefined,
        questionStartTime: action.nextTimestamp,
      };
    }

    case 'PAUSE_GAME': {
      if (state.phase === 'completed' || state.phase === 'paused') {
        return state;
      }
      return {
        ...state,
        previousPhase: state.phase,
        phase: 'paused',
      };
    }

    case 'RESUME_GAME': {
      if (state.phase !== 'paused') {
        return state;
      }
      return {
        ...state,
        phase: state.previousPhase || 'question',
        previousPhase: undefined,
      };
    }

    case 'RESTART_GAME': {
      return createInitialPatternMasterState(
        action.questions,
        action.startTimestamp || Date.now(),
        undefined,
        action.startingTier || 1
      );
    }

    default:
      return state;
  }
}
