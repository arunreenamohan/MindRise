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
  GameIntro: { gameId: GameId };
  MemoryMatrixGame: undefined;
  NumberRecallGame: undefined;
  QuickReactionGame: undefined;
  LogicQuestGame: undefined;
  FocusFinderGame: undefined;
  PatternMasterGame: undefined;
};

