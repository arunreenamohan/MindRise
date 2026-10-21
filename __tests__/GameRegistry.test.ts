import { GAMES_LIST, GAMES_REGISTRY, getGameById } from '../src/games/registry';
import { GameId } from '../src/games/types';

describe('MindRise Game Domain & Registry', () => {
  const allExpectedIds: GameId[] = [
    'memory-matrix',
    'number-recall',
    'focus-finder',
    'pattern-master',
    'quick-reaction',
    'logic-quest',
  ];

  it('contains all 6 required cognitive games', () => {
    expect(GAMES_LIST).toHaveLength(6);
    allExpectedIds.forEach((id) => {
      expect(GAMES_REGISTRY[id]).toBeDefined();
      expect(getGameById(id)?.id).toBe(id);
    });
  });

  it('enforces unique and valid kebab-case game IDs across all entries', () => {
    const ids = GAMES_LIST.map((game) => game.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(6);

    const kebabRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    ids.forEach((id) => {
      expect(id).toMatch(kebabRegex);
      expect(GAMES_REGISTRY[id].id).toBe(id);
    });
  });

  it('handles game lookup for known IDs accurately', () => {
    allExpectedIds.forEach((id) => {
      const game = getGameById(id);
      expect(game).toBeDefined();
      expect(game?.id).toBe(id);
      expect(typeof game?.defaultName).toBe('string');
      expect(game?.defaultName.length).toBeGreaterThan(0);
    });
  });

  it('returns undefined for invalid or unknown game IDs without throwing', () => {
    expect(getGameById('unknown-game')).toBeUndefined();
    expect(getGameById('')).toBeUndefined();
    expect(getGameById('MEMORY-MATRIX')).toBeUndefined();
    expect(getGameById('non-existent-id')).toBeUndefined();
    expect(getGameById('null')).toBeUndefined();
  });

  it('marks Memory Matrix as the flagship Phase 2 drill', () => {
    const memoryMatrix = getGameById('memory-matrix');
    expect(memoryMatrix).toBeDefined();
    expect(memoryMatrix?.isFlagship).toBe(true);
    expect(memoryMatrix?.status).toBe('ready-phase2');
    expect(memoryMatrix?.category).toBe('memory');
  });

  it('enforces verified game status across catalogue entries', () => {
    const readyPhase2Games = GAMES_LIST.filter((g) => g.status === 'ready-phase2');
    const readyPhase3Games = GAMES_LIST.filter((g) => g.status === 'ready-phase3');
    const readyPhase5Games = GAMES_LIST.filter((g) => g.status === 'ready-phase5');
    const readyPhase6Games = GAMES_LIST.filter((g) => g.status === 'ready-phase6');
    const inDevelopmentGames = GAMES_LIST.filter((g) => g.status === 'in-development');

    // Exactly 1 flagship game prepared for Phase 2 implementation
    expect(readyPhase2Games).toHaveLength(1);
    expect(readyPhase2Games[0].id).toBe('memory-matrix');

    // Exactly 1 game prepared for Phase 3 implementation
    expect(readyPhase3Games).toHaveLength(1);
    expect(readyPhase3Games[0].id).toBe('number-recall');

    // Exactly 1 game prepared for Phase 5 implementation
    expect(readyPhase5Games).toHaveLength(1);
    expect(readyPhase5Games[0].id).toBe('quick-reaction');

    // Exactly 1 game prepared for Phase 6 implementation
    expect(readyPhase6Games).toHaveLength(1);
    expect(readyPhase6Games[0].id).toBe('logic-quest');

    // Exactly 2 games in development for subsequent milestones (focus-finder, pattern-master)
    expect(inDevelopmentGames).toHaveLength(2);

    // No game should claim full production release before implementation
    GAMES_LIST.forEach((g) => {
      expect(['ready-phase2', 'ready-phase3', 'ready-phase5', 'ready-phase6', 'in-development']).toContain(g.status);
    });
  });

  it('covers the required cognitive domains with valid accent color keys', () => {
    const categories = new Set(GAMES_LIST.map((g) => g.category));
    expect(categories.has('memory')).toBe(true);
    expect(categories.has('attention')).toBe(true);
    expect(categories.has('speed')).toBe(true);
    expect(categories.has('problemSolving')).toBe(true);
    expect(categories.has('logic')).toBe(true);

    GAMES_LIST.forEach((g) => {
      expect(['memory', 'speed', 'attention', 'logic', 'problemSolving']).toContain(g.accentColorKey);
    });
  });

  it('provides complete parameter specs and instructions for all 6 games', () => {
    GAMES_LIST.forEach((game) => {
      expect(game.detailedInstructions.length).toBeGreaterThanOrEqual(3);
      expect(game.cognitiveBenefits.length).toBeGreaterThanOrEqual(2);
      expect(game.specs.estimatedDurationMins).toBeGreaterThan(0);
      expect(game.specs.totalRounds).toBeGreaterThan(0);
      expect(game.specs.difficultyLevels).toBeGreaterThan(0);
    });
  });
});

