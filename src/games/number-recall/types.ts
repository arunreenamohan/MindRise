export type NumberRecallPhase =
  | 'countdown'
  | 'display'
  | 'recall'
  | 'round-feedback'
  | 'paused'
  | 'game-over'
  | 'completed';

export interface NumberRecallLevelConfig {
  level: number;
  sequenceLength: number;
  displayDurationMs: number;
}

export interface NumberRecallRoundResult {
  round: number;
  level: number;
  sequenceLength: number;
  targetSequence: string;
  submittedSequence: string;
  isCorrect: boolean;
  matchedDigitsCount: number;
  recallDurationMs: number;
  roundScore: number;
}

export interface NumberRecallSessionStats {
  gameId: 'number-recall';
  completedAt: string;
  finalScore: number;
  accuracyPercentage: number;
  roundsCompleted: number;
  totalRounds: number;
  highestLevel: number;
  maxDigitSpan: number;
  perfectRounds: number;
  totalDurationMs: number;
}

export interface NumberRecallGameState {
  phase: NumberRecallPhase;
  previousPhase: NumberRecallPhase | null;
  currentRound: number;
  totalRounds: number;
  currentLevel: number;
  highestLevel: number;
  maxDigitSpan: number;
  strikesRemaining: number;
  maxStrikes: number;
  targetSequence: string;
  inputSequence: string;
  score: number;
  roundScore: number;
  consecutiveCorrectRounds: number;
  displayDurationMs: number;
  roundStartTime: number;
  recallStartTime: number;
  sessionStartTime: number;
  pausedAt: number | null;
  roundHistory: NumberRecallRoundResult[];
  sessionStats: NumberRecallSessionStats | null;
}

export type NumberRecallGameAction =
  | { type: 'START_GAME'; timestamp?: number; initialLevel?: number }
  | { type: 'START_DISPLAY'; targetSequence: string; displayDurationMs: number; timestamp?: number }
  | { type: 'START_RECALL'; timestamp?: number }
  | { type: 'APPEND_DIGIT'; digit: string; timestamp?: number }
  | { type: 'DELETE_DIGIT'; timestamp?: number }
  | { type: 'CLEAR_INPUT'; timestamp?: number }
  | { type: 'SUBMIT_ANSWER'; timestamp?: number }
  | { type: 'END_ROUND_FEEDBACK'; timestamp?: number }
  | { type: 'PAUSE_GAME'; timestamp?: number }
  | { type: 'RESUME_GAME'; timestamp?: number }
  | { type: 'RESTART_GAME'; timestamp?: number; initialLevel?: number };
