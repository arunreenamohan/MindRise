import { RootStackParamList, MainTabParamList } from '../src/navigation/types';
import { GameId } from '../src/games/types';
import { getGameById } from '../src/games/registry';

describe('MindRise Navigation Types and Parameter Contracts', () => {
  it('validates RootStackParamList accepts all 6 valid GameIds for GameIntro route', () => {
    const validGameIds: GameId[] = [
      'memory-matrix',
      'number-recall',
      'focus-finder',
      'pattern-master',
      'quick-reaction',
      'logic-quest',
    ];

    validGameIds.forEach((gameId) => {
      const params: RootStackParamList['GameIntro'] = { gameId };
      expect(params.gameId).toBe(gameId);
      const gameDef = getGameById(params.gameId);
      expect(gameDef).toBeDefined();
      expect(gameDef?.id).toBe(gameId);
    });
  });

  it('safely handles missing or unknown gameId in game intro resolution logic', () => {
    // Contract: if gameId is unknown or undefined, gracefully falls back to memory-matrix
    const resolveGame = (gameId?: string) => {
      return (gameId ? getGameById(gameId) : undefined) || getGameById('memory-matrix')!;
    };

    const fallbackForUndefined = resolveGame(undefined);
    expect(fallbackForUndefined.id).toBe('memory-matrix');

    const fallbackForUnknown = resolveGame('unknown-drill');
    expect(fallbackForUnknown.id).toBe('memory-matrix');

    const directLookup = resolveGame('focus-finder');
    expect(directLookup.id).toBe('focus-finder');
  });

  it('verifies all main tab route names match MainTabParamList keys', () => {
    const tabKeys: (keyof MainTabParamList)[] = ['Home', 'Train', 'Progress', 'Profile'];
    expect(tabKeys).toHaveLength(4);
    tabKeys.forEach((key) => {
      expect(typeof key).toBe('string');
    });
  });

  it('verifies RootStackParamList supports all 6 game routes with undefined params', () => {
    const mmRoute: keyof RootStackParamList = 'MemoryMatrixGame';
    const nrRoute: keyof RootStackParamList = 'NumberRecallGame';
    const qrRoute: keyof RootStackParamList = 'QuickReactionGame';
    const lqRoute: keyof RootStackParamList = 'LogicQuestGame';
    const ffRoute: keyof RootStackParamList = 'FocusFinderGame';
    const pmRoute: keyof RootStackParamList = 'PatternMasterGame';
    expect(mmRoute).toBe('MemoryMatrixGame');
    expect(nrRoute).toBe('NumberRecallGame');
    expect(qrRoute).toBe('QuickReactionGame');
    expect(lqRoute).toBe('LogicQuestGame');
    expect(ffRoute).toBe('FocusFinderGame');
    expect(pmRoute).toBe('PatternMasterGame');

    const stackRoutes: (keyof RootStackParamList)[] = [
      'Onboarding',
      'MainTabs',
      'GameIntro',
      'MemoryMatrixGame',
      'NumberRecallGame',
      'QuickReactionGame',
      'LogicQuestGame',
      'FocusFinderGame',
      'PatternMasterGame',
    ];
    expect(stackRoutes).toContain('MemoryMatrixGame');
    expect(stackRoutes).toContain('NumberRecallGame');
    expect(stackRoutes).toContain('QuickReactionGame');
    expect(stackRoutes).toContain('LogicQuestGame');
    expect(stackRoutes).toContain('FocusFinderGame');
    expect(stackRoutes).toContain('PatternMasterGame');
    expect(stackRoutes).toContain('GameIntro');
    expect(stackRoutes).toHaveLength(9);
  });
});
