export type PatternCategory = 'visual-pattern' | 'number-sequence' | 'missing-tile';

export interface PatternQuestion {
  id: string;
  category: PatternCategory;
  difficulty: number; // 1 to 6
  title: string;
  titleMl: string;
  prompt: string;
  promptMl: string;
  gridMatrix?: string[][]; // Optional 2x2 or 3x3 matrix for missing-tile puzzles
  options: string[];
  optionsMl: string[];
  correctIndex: number; // 0 to 3
  explanation: string;
  explanationMl: string;
}

export interface PatternQuestionResult {
  questionId: string;
  category: PatternCategory;
  difficulty: number;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  score: number;
  timeSpentMs: number;
}

export interface PatternMasterSessionStats {
  totalQuestions: number;
  questionsAnswered: number;
  correctCount: number;
  accuracyPercentage: number;
  finalScore: number;
  highestDifficulty: number;
  avgResponseTimeMs: number;
  totalDurationMs: number;
  completedAt: string;
}

export type PatternMasterPhase =
  | 'question'
  | 'feedback'
  | 'paused'
  | 'completed';

export interface PatternMasterState {
  phase: PatternMasterPhase;
  previousPhase?: PatternMasterPhase;
  currentIndex: number; // 0-indexed (0 to totalQuestions - 1)
  totalQuestions: number; // 10
  questions: PatternQuestion[];
  selectedOptionIndex?: number;
  isCurrentAnswerCorrect?: boolean;
  currentRoundScore?: number;
  consecutiveCorrect: number;
  score: number;
  results: PatternQuestionResult[];
  currentLevel: number;
  highestLevelReached: number;
  questionStartTime: number;
  sessionStartTime: number;
  sessionStats?: PatternMasterSessionStats;
}

export type PatternMasterAction =
  | { type: 'SELECT_OPTION'; optionIndex: number }
  | { type: 'SUBMIT_ANSWER'; responseTimestamp: number }
  | { type: 'NEXT_QUESTION'; nextTimestamp: number }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESUME_GAME' }
  | { type: 'RESTART_GAME'; questions?: PatternQuestion[]; startTimestamp?: number };
