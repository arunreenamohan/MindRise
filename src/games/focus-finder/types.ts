export type FocusFinderShape =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'hexagon';

export type FocusFinderColorKey =
  | 'cyan'
  | 'amber'
  | 'emerald'
  | 'rose'
  | 'violet'
  | 'blue';

export type FocusFinderInnerPattern = 'solid' | 'ring' | 'cross' | 'dot';

export interface GridItem {
  id: string;
  shape: FocusFinderShape;
  colorKey: FocusFinderColorKey;
  pattern: FocusFinderInnerPattern;
  isTarget: boolean;
  row: number;
  col: number;
}

export interface FocusFinderTarget {
  shape: FocusFinderShape;
  colorKey: FocusFinderColorKey;
  pattern: FocusFinderInnerPattern;
}

export interface FocusFinderLevelConfig {
  level: number; // 1 to 6
  rows: number;
  cols: number;
  totalItems: number;
  timeLimitMs: number;
  conjunctionDistractorRatio: number; // 0 to 1
  includePatternDistractors: boolean;
}

export interface FocusFinderRoundConfig {
  roundNumber: number;
  level: number;
  rows: number;
  cols: number;
  totalItems: number;
  timeLimitMs: number;
  target: FocusFinderTarget;
  items: GridItem[];
  targetIndex: number;
}

export type FocusFinderPhase =
  | 'countdown'
  | 'searching'
  | 'feedback'
  | 'paused'
  | 'completed';

export type RoundOutcome = 'hit' | 'miss' | 'timeout';

export interface FocusFinderRoundResult {
  roundNumber: number;
  level: number;
  outcome: RoundOutcome;
  selectedIndex?: number;
  targetIndex: number;
  responseTimeMs: number;
  score: number;
}

export interface FocusFinderSessionStats {
  totalRounds: number;
  roundsCompleted: number;
  targetHits: number;
  misses: number;
  timeouts: number;
  accuracyPercentage: number;
  finalScore: number;
  highestLevel: number;
  bestFindTimeMs?: number;
  avgFindTimeMs?: number;
  totalDurationMs: number;
  completedAt: string;
}

export interface FocusFinderState {
  phase: FocusFinderPhase;
  previousPhase?: FocusFinderPhase;
  currentRound: number; // 1 to 10
  totalRounds: number; // 10
  currentLevel: number; // 1 to 6
  highestLevelReached: number;
  score: number;
  consecutiveHits: number;
  currentRoundConfig: FocusFinderRoundConfig;
  selectedItemIndex?: number;
  lastRoundOutcome?: RoundOutcome;
  lastRoundScore?: number;
  roundsHistory: FocusFinderRoundResult[];
  roundStartTime: number;
  sessionStartTime: number;
  sessionStats?: FocusFinderSessionStats;
}

export type FocusFinderAction =
  | { type: 'START_ROUND'; roundStartTime: number }
  | { type: 'TAP_ITEM'; itemIndex: number; tapTimestamp: number }
  | { type: 'TIMEOUT_ROUND'; timeoutTimestamp: number }
  | { type: 'NEXT_ROUND'; nextStartTime: number; prng?: () => number }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESUME_GAME' }
  | { type: 'RESTART_GAME'; startTimestamp?: number; prng?: () => number; initialLevel?: number };
