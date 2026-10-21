export type GamePhase =
  | 'countdown'
  | 'preview'
  | 'recall'
  | 'round-feedback'
  | 'paused'
  | 'game-over'
  | 'completed';

export type TileStatus =
  | 'neutral'
  | 'preview-target'
  | 'correct'
  | 'incorrect'
  | 'missed';

export interface LevelConfig {
  level: number;
  gridSize: number; // gridSize x gridSize tiles
  targetCount: number;
  previewDurationMs: number;
}

export interface RoundResult {
  round: number;
  level: number;
  gridSize: number;
  targetCount: number;
  correctCount: number;
  mistakesCount: number;
  recallDurationMs: number;
  roundScore: number;
  isPerfect: boolean;
}

export interface MemoryMatrixSessionStats {
  gameId: 'memory-matrix';
  completedAt: string;
  finalScore: number;
  accuracyPercentage: number;
  roundsCompleted: number;
  totalRounds: number;
  highestLevel: number;
  perfectRounds: number;
  totalDurationMs: number;
}

export interface GameState {
  phase: GamePhase;
  previousPhase: GamePhase | null;
  currentRound: number;
  totalRounds: number;
  currentLevel: number;
  highestLevel: number;
  strikesRemaining: number;
  maxStrikes: number;
  gridSize: number;
  targetIndices: number[];
  selectedIndices: number[];
  mistakeIndices: number[];
  score: number;
  roundScore: number;
  consecutivePerfectRounds: number;
  previewDurationMs: number;
  roundStartTime: number;
  recallStartTime: number;
  sessionStartTime: number;
  roundHistory: RoundResult[];
  sessionStats: MemoryMatrixSessionStats | null;
}

export type GameAction =
  | { type: 'START_GAME'; timestamp?: number }
  | { type: 'START_PREVIEW'; targetIndices: number[]; previewDurationMs: number; timestamp?: number }
  | { type: 'START_RECALL'; timestamp?: number }
  | { type: 'TAP_TILE'; tileIndex: number; timestamp?: number }
  | { type: 'END_ROUND_FEEDBACK'; timestamp?: number }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESUME_GAME' }
  | { type: 'RESTART_GAME'; timestamp?: number };
