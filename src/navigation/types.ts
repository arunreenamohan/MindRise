import { NavigatorScreenParams } from '@react-navigation/native';
import { GameId } from '../games/types';

export type MainTabParamList = {
  Home: undefined;
  Train: undefined;
  Progress: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  DailyWorkout: undefined;
  GameIntro: { gameId: GameId; workoutMode?: boolean; drillIndex?: number };
  MemoryMatrixGame: { workoutMode?: boolean; drillIndex?: number; initialLevel?: number } | undefined;
  NumberRecallGame: { workoutMode?: boolean; drillIndex?: number; initialLevel?: number } | undefined;
  QuickReactionGame: { workoutMode?: boolean; drillIndex?: number; initialLevel?: number } | undefined;
  LogicQuestGame: { workoutMode?: boolean; drillIndex?: number; initialLevel?: number } | undefined;
  FocusFinderGame: { workoutMode?: boolean; drillIndex?: number; initialLevel?: number } | undefined;
  PatternMasterGame: { workoutMode?: boolean; drillIndex?: number; initialLevel?: number } | undefined;
};

