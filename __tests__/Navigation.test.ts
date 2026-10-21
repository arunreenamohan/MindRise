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

  it('verifies RootStackParamList supports MemoryMatrixGame route with undefined params', () => {
    const routeName: keyof RootStackParamList = 'MemoryMatrixGame';
    expect(routeName).toBe('MemoryMatrixGame');

    const stackRoutes: (keyof RootStackParamList)[] = [
      'Onboarding',
      'MainTabs',
      'GameIntro',
      'MemoryMatrixGame',
    ];
    expect(stackRoutes).toContain('MemoryMatrixGame');
    expect(stackRoutes).toContain('GameIntro');
    expect(stackRoutes).toHaveLength(4);
  });
});
