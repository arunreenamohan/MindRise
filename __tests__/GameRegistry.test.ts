import { GAMES_LIST, GAMES_REGISTRY, getGameById } from '../src/games/registry';

describe('MindRise Game Domain & Registry', () => {
  it('contains all 6 required cognitive games', () => {
    expect(GAMES_LIST).toHaveLength(6);
    const expectedIds = [
      'memory-matrix',
      'number-recall',
      'focus-finder',
      'pattern-master',
      'quick-reaction',
      'logic-quest',
    ];
    expectedIds.forEach((id) => {
      expect(GAMES_REGISTRY[id]).toBeDefined();
      expect(getGameById(id)?.id).toBe(id);
    });
  });

  it('marks Memory Matrix as the flagship Phase 2 drill', () => {
    const memoryMatrix = getGameById('memory-matrix');
    expect(memoryMatrix).toBeDefined();
    expect(memoryMatrix?.isFlagship).toBe(true);
    expect(memoryMatrix?.status).toBe('ready-phase2');
    expect(memoryMatrix?.category).toBe('memory');
  });

  it('marks the remaining 5 games as in-development for Phase 3', () => {
    const phase3Games = [
      'number-recall',
      'focus-finder',
      'pattern-master',
      'quick-reaction',
      'logic-quest',
    ];
    phase3Games.forEach((id) => {
      const game = getGameById(id);
      expect(game?.status).toBe('in-development');
      expect(game?.isFlagship).toBe(false);
    });
  });

  it('provides complete parameter specs and instructions for all 6 games', () => {
    GAMES_LIST.forEach((game) => {
      expect(game.detailedInstructions.length).toBeGreaterThanOrEqual(3);
      expect(game.cognitiveBenefits.length).toBeGreaterThanOrEqual(2);
      expect(game.specs.estimatedDurationMins).toBeGreaterThan(0);
      expect(game.specs.totalRounds).toBeGreaterThan(0);
    });
  });
});
