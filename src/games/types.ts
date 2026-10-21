export type GameId =
  | 'memory-matrix'
  | 'number-recall'
  | 'focus-finder'
  | 'pattern-master'
  | 'quick-reaction'
  | 'logic-quest';

export type CognitiveCategory = 'memory' | 'attention' | 'speed' | 'logic' | 'problemSolving';

export type GameStatus =
  | 'ready-phase2'
  | 'ready-phase3'
  | 'ready-phase5'
  | 'ready-phase6'
  | 'in-development';

export interface GameParameterSpecs {
  estimatedDurationMins: number;
  totalRounds: number;
  difficultyLevels: number;
  adaptivePacing: boolean;
}

export interface GameDefinition {
  id: GameId;
  nameKey: string;
  defaultName: string;
  category: CognitiveCategory;
  categoryLabel: string;
  shortDescription: string;
  detailedInstructions: string[];
  cognitiveBenefits: string[];
  specs: GameParameterSpecs;
  status: GameStatus;
  accentColorKey: keyof import('../theme/colors').ThemeColors;
  isFlagship: boolean;
}
