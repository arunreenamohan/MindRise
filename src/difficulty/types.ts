import { GameId } from '../games/types';

export const CURRENT_DIFFICULTY_SCHEMA_VERSION = 1;
export const DIFFICULTY_STORAGE_KEY = '@mindrise_game_difficulty_v1';
export const EVALUATION_WINDOW_SIZE = 3;

export type AdaptationReason =
  | 'initial_baseline'
  | 'sustained_performance'
  | 'sustained_struggle'
  | 'unchanged'
  | 'manual_reset';

export interface StartingDifficultyBounds {
  minStartingLevel: number;
  maxStartingLevel: number;
  defaultStartingLevel: number;
  isTierBased: boolean;
}

export const STARTING_DIFFICULTY_BOUNDS: Record<GameId, StartingDifficultyBounds> = {
  'memory-matrix': {
    minStartingLevel: 1,
    maxStartingLevel: 8,
    defaultStartingLevel: 1,
    isTierBased: false,
  },
  'number-recall': {
    minStartingLevel: 1,
    maxStartingLevel: 7,
    defaultStartingLevel: 1,
    isTierBased: false,
  },
  'quick-reaction': {
    minStartingLevel: 1,
    maxStartingLevel: 4,
    defaultStartingLevel: 1,
    isTierBased: false,
  },
  'focus-finder': {
    minStartingLevel: 1,
    maxStartingLevel: 4,
    defaultStartingLevel: 1,
    isTierBased: false,
  },
  'logic-quest': {
    minStartingLevel: 1,
    maxStartingLevel: 3,
    defaultStartingLevel: 1,
    isTierBased: true,
  },
  'pattern-master': {
    minStartingLevel: 1,
    maxStartingLevel: 3,
    defaultStartingLevel: 1,
    isTierBased: true,
  },
};

export interface GameDifficultyProfile {
  gameId: GameId;
  startingLevel: number;
  highestLevelUnlocked: number;
  lastEvaluatedSessionId: string | null;
  lastAdaptedAt: string | null;
  adaptationReason: AdaptationReason;
  evaluatedSessionIds: string[];
}

export interface DifficultyAdjustmentResult {
  nextStartingLevel: number;
  reason: AdaptationReason;
}
