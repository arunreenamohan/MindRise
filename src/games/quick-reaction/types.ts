export type RoundOutcome = 'hit' | 'false-start' | 'timeout';

export type QuickReactionPhase =
  | 'countdown'
  | 'waiting'
  | 'trigger'
  | 'round-feedback'
  | 'paused'
  | 'completed';

export interface LevelConfig {
  level: number;
  minWaitMs: number;
  maxWaitMs: number;
  timeoutDurationMs: number;
}

export interface RoundResult {
  roundNumber: number;
  outcome: RoundOutcome;
  reactionTimeMs?: number;
  score: number;
  level: number;
  waitDurationMs?: number;
}

export interface QuickReactionSessionStats {
  totalRounds: number;
  roundsCompleted: number;
  validHits: number;
  falseStarts: number;
  timeouts: number;
  bestReactionMs?: number;
  avgReactionMs?: number;
  medianReactionMs?: number;
  finalScore: number;
  accuracyPercentage: number;
  highestLevel: number;
  totalDurationMs: number;
  completedAt: string;
}

export interface QuickReactionState {
  phase: QuickReactionPhase;
  previousPhase?: QuickReactionPhase;
  currentRound: number; // 1-indexed (1 to 10)
  totalRounds: number; // 10
  currentLevel: number; // 1 to 6
  highestLevelReached: number;
  consecutiveFastHits: number;
  score: number;
  roundsHistory: RoundResult[];
  currentRoundOutcome?: RoundOutcome;
  currentRoundReactionMs?: number;
  currentRoundScore?: number;
  triggerTimestamp?: number;
  targetWaitDurationMs: number;
  sessionStartTime?: number;
  sessionStats?: QuickReactionSessionStats;
}

export type QuickReactionAction =
  | { type: 'START_COUNTDOWN' }
  | { type: 'START_WAITING'; waitDurationMs: number }
  | { type: 'SHOW_TRIGGER'; triggerTimestamp: number }
  | { type: 'RECORD_TAP'; tapTimestamp: number }
  | { type: 'TIMEOUT_TRIGGER' }
  | { type: 'END_ROUND_FEEDBACK' }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESUME_GAME' }
  | { type: 'RESTART_GAME' };
