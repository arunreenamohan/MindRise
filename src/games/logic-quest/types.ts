export type LogicCategory = 'number-sequence' | 'odd-one-out' | 'deductive-reasoning';

export interface LogicQuestion {
  id: string;
  category: LogicCategory;
  difficulty: number; // 1 to 6
  prompt: string;
  promptMl: string;
  options: string[];
  optionsMl: string[];
  correctIndex: number; // 0 to options.length - 1
  explanation: string;
  explanationMl: string;
}

export interface QuestionResult {
  questionId: string;
  category: LogicCategory;
  difficulty: number;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  score: number;
  timeSpentMs: number;
}

export interface LogicQuestSessionStats {
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

export type LogicQuestPhase = 'question' | 'feedback' | 'paused' | 'completed';

export interface LogicQuestState {
  phase: LogicQuestPhase;
  currentIndex: number;
  totalQuestions: number;
  questions: LogicQuestion[];
  selectedOptionIndex?: number;
  isCurrentAnswerCorrect?: boolean;
  currentRoundScore?: number;
  consecutiveCorrect: number;
  score: number;
  results: QuestionResult[];
  currentLevel: number;
  highestLevelReached: number;
  questionStartTime: number;
  sessionStartTime: number;
  previousPhase?: LogicQuestPhase;
  sessionStats?: LogicQuestSessionStats;
}

export type LogicQuestAction =
  | { type: 'SELECT_OPTION'; optionIndex: number }
  | { type: 'SUBMIT_ANSWER'; responseTimestamp: number }
  | { type: 'NEXT_QUESTION'; nextTimestamp: number }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESUME_GAME' }
  | { type: 'RESTART_GAME'; questions?: LogicQuestion[]; startingTier?: number };
