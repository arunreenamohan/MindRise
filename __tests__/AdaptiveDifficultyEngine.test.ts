import {
  evaluateGameDifficulty,
  isSessionEligibleForEvaluation,
} from '../src/difficulty/evaluationRules';
import { GameSessionRecord } from '../src/history/types';
import { getCuratedQuestionsForSession } from '../src/games/logic-quest/questionBank';
import {
  selectSessionQuestions,
  PATTERN_QUESTION_BANK,
} from '../src/games/pattern-master/questionBank';

describe('Adaptive Difficulty Engine - Eligibility Rules', () => {
  const baseValidSession: GameSessionRecord = {
    id: 'sess-001',
    schemaVersion: 1,
    gameId: 'memory-matrix',
    startedAt: '2026-10-23T09:59:15Z',
    completedAt: '2026-10-23T10:00:00Z',
    dateKey: '2026-10-23',
    finalScore: 1200,
    accuracyPercentage: 85,
    durationMs: 45000,
    roundsCompleted: 10,
    totalRounds: 10,
    highestLevel: 4,
    startingLevel: 1,
    outcome: 'completed',
    gameSpecificMetrics: {
      perfectRounds: 7,
    },
  };

  it('accepts valid completed sessions with realistic metrics and rounds', () => {
    expect(isSessionEligibleForEvaluation(baseValidSession)).toBe(true);
  });

  it('accepts valid game-over sessions if round requirements are met', () => {
    const gameOverSession: GameSessionRecord = {
      ...baseValidSession,
      outcome: 'game-over',
      roundsCompleted: 6,
      durationMs: 25000,
    };
    expect(isSessionEligibleForEvaluation(gameOverSession)).toBe(true);
  });

  it('rejects abandoned sessions', () => {
    const abandonedSession: GameSessionRecord = {
      ...baseValidSession,
      outcome: 'abandoned',
    };
    expect(isSessionEligibleForEvaluation(abandonedSession)).toBe(false);
  });

  it('rejects sessions with invalid, negative, or impossible metrics', () => {
    expect(isSessionEligibleForEvaluation({ ...baseValidSession, finalScore: -10 })).toBe(false);
    expect(isSessionEligibleForEvaluation({ ...baseValidSession, accuracyPercentage: -5 })).toBe(false);
    expect(isSessionEligibleForEvaluation({ ...baseValidSession, accuracyPercentage: 105 })).toBe(false);
    expect(isSessionEligibleForEvaluation({ ...baseValidSession, durationMs: 0 })).toBe(false);
    expect(isSessionEligibleForEvaluation({ ...baseValidSession, roundsCompleted: 0 })).toBe(false);
  });

  it('enforces game-specific minimum round thresholds', () => {
    // Memory Matrix requires >= 3 rounds
    expect(
      isSessionEligibleForEvaluation({
        ...baseValidSession,
        gameId: 'memory-matrix',
        roundsCompleted: 2,
      })
    ).toBe(false);

    // Number Recall requires >= 2 rounds
    expect(
      isSessionEligibleForEvaluation({
        ...baseValidSession,
        gameId: 'number-recall',
        roundsCompleted: 1,
      })
    ).toBe(false);

    // Quick Reaction requires >= 5 rounds
    expect(
      isSessionEligibleForEvaluation({
        ...baseValidSession,
        gameId: 'quick-reaction',
        roundsCompleted: 4,
      })
    ).toBe(false);

    // Logic Quest requires >= 4 rounds
    expect(
      isSessionEligibleForEvaluation({
        ...baseValidSession,
        gameId: 'logic-quest',
        roundsCompleted: 3,
      })
    ).toBe(false);
  });

  it('rejects unrealistically short durations relative to rounds', () => {
    // 8 rounds in 400ms is impossible humanly
    expect(
      isSessionEligibleForEvaluation({
        ...baseValidSession,
        roundsCompleted: 8,
        durationMs: 400,
      })
    ).toBe(false);
  });
});

describe('Adaptive Difficulty Engine - Evaluation Window and Step Rules', () => {
  const createMockSession = (
    overrides: Partial<GameSessionRecord>
  ): GameSessionRecord => ({
    id: `sess-${Math.random().toString(36).substring(2, 8)}`,
    schemaVersion: 1,
    gameId: 'memory-matrix',
    startedAt: new Date(Date.now() - 40000).toISOString(),
    completedAt: new Date().toISOString(),
    dateKey: '2026-10-23',
    finalScore: 1000,
    accuracyPercentage: 88,
    durationMs: 40000,
    roundsCompleted: 10,
    totalRounds: 10,
    highestLevel: 3,
    startingLevel: 1,
    outcome: 'completed',
    gameSpecificMetrics: {
      perfectRounds: 6,
    },
    ...overrides,
  });

  it('maintains unchanged difficulty when fewer than 3 qualifying sessions are available', () => {
    const session1 = createMockSession({ accuracyPercentage: 95, highestLevel: 5 });
    const session2 = createMockSession({ accuracyPercentage: 95, highestLevel: 5 });

    // 0 sessions
    const res0 = evaluateGameDifficulty('memory-matrix', 1, []);
    expect(res0.nextStartingLevel).toBe(1);
    expect(res0.reason).toBe('unchanged');

    // 1 session
    const res1 = evaluateGameDifficulty('memory-matrix', 1, [session1]);
    expect(res1.nextStartingLevel).toBe(1);
    expect(res1.reason).toBe('unchanged');

    // 2 sessions
    const res2 = evaluateGameDifficulty('memory-matrix', 1, [session1, session2]);
    expect(res2.nextStartingLevel).toBe(1);
    expect(res2.reason).toBe('unchanged');
  });

  it('filters out ineligible sessions when collecting the 3-session evaluation window', () => {
    const valid1 = createMockSession({ accuracyPercentage: 90, highestLevel: 4, gameSpecificMetrics: { perfectRounds: 7 } });
    const abandoned = createMockSession({ outcome: 'abandoned', accuracyPercentage: 100 });
    const valid2 = createMockSession({ accuracyPercentage: 92, highestLevel: 4, gameSpecificMetrics: { perfectRounds: 7 } });
    const zeroRounds = createMockSession({ roundsCompleted: 0, accuracyPercentage: 100 });
    const valid3 = createMockSession({ accuracyPercentage: 88, highestLevel: 4, gameSpecificMetrics: { perfectRounds: 7 } });

    const eligible = [valid1, abandoned, valid2, zeroRounds, valid3].filter(isSessionEligibleForEvaluation);
    expect(eligible.length).toBe(3);

    const result = evaluateGameDifficulty('memory-matrix', 1, eligible);
    expect(result.nextStartingLevel).toBe(2);
    expect(result.reason).toBe('sustained_performance');
  });

  it('adjusts by at most one step at a time', () => {
    // 3 stellar sessions starting at Level 1, reaching Level 8
    const sessions = [
      createMockSession({ accuracyPercentage: 100, highestLevel: 8, gameSpecificMetrics: { perfectRounds: 8 } }),
      createMockSession({ accuracyPercentage: 100, highestLevel: 8, gameSpecificMetrics: { perfectRounds: 8 } }),
      createMockSession({ accuracyPercentage: 100, highestLevel: 8, gameSpecificMetrics: { perfectRounds: 8 } }),
    ];

    const result = evaluateGameDifficulty('memory-matrix', 1, sessions);
    // Even though player reached level 8, next starting level only steps from 1 to 2!
    expect(result.nextStartingLevel).toBe(2);
    expect(result.reason).toBe('sustained_performance');
  });

  it('keeps difficulty unchanged on mixed performance in the 3-session window', () => {
    const sessions = [
      createMockSession({ accuracyPercentage: 95, highestLevel: 4, gameSpecificMetrics: { perfectRounds: 6 } }), // Strong
      createMockSession({ accuracyPercentage: 40, outcome: 'game-over', highestLevel: 1, roundsCompleted: 5 }), // Struggled
      createMockSession({ accuracyPercentage: 70, highestLevel: 2, gameSpecificMetrics: { perfectRounds: 3 } }), // Average
    ];

    const result = evaluateGameDifficulty('memory-matrix', 2, sessions);
    expect(result.nextStartingLevel).toBe(2);
    expect(result.reason).toBe('unchanged');
  });
});

describe('Adaptive Difficulty Engine - Rules Per Game', () => {
  const makeGameSessions = (
    gameId: GameSessionRecord['gameId'],
    items: Partial<GameSessionRecord>[]
  ): GameSessionRecord[] =>
    items.map((item, idx) => ({
      id: `session-${gameId}-${idx}`,
      schemaVersion: 1,
      gameId,
      startedAt: new Date(Date.now() - (4 - idx) * 3600000).toISOString(),
      completedAt: new Date(Date.now() - (3 - idx) * 3600000).toISOString(),
      dateKey: '2026-10-23',
      finalScore: 1000,
      accuracyPercentage: 80,
      durationMs: 35000,
      roundsCompleted: 10,
      totalRounds: 10,
      highestLevel: 2,
      startingLevel: 1,
      outcome: 'completed',
      ...item,
    }));

  describe('Memory Matrix (Levels 1-8)', () => {
    it('promotes starting level after 3 strong sessions', () => {
      const sessions = makeGameSessions('memory-matrix', [
        { accuracyPercentage: 88, highestLevel: 4, startingLevel: 1, gameSpecificMetrics: { perfectRounds: 6 } },
        { accuracyPercentage: 85, highestLevel: 3, startingLevel: 1, gameSpecificMetrics: { perfectRounds: 7 } },
        { accuracyPercentage: 90, highestLevel: 4, startingLevel: 1, gameSpecificMetrics: { perfectRounds: 8 } },
      ]);
      const res = evaluateGameDifficulty('memory-matrix', 1, sessions);
      expect(res.nextStartingLevel).toBe(2);
      expect(res.reason).toBe('sustained_performance');
    });

    it('demotes starting level after 3 struggling sessions', () => {
      const sessions = makeGameSessions('memory-matrix', [
        { accuracyPercentage: 40, highestLevel: 3, startingLevel: 3, outcome: 'game-over', roundsCompleted: 5 },
        { accuracyPercentage: 45, highestLevel: 3, startingLevel: 3, outcome: 'game-over', roundsCompleted: 4 },
        { accuracyPercentage: 35, highestLevel: 3, startingLevel: 3, outcome: 'game-over', roundsCompleted: 5 },
      ]);
      const res = evaluateGameDifficulty('memory-matrix', 3, sessions);
      expect(res.nextStartingLevel).toBe(2);
      expect(res.reason).toBe('sustained_struggle');
    });

    it('clamps strictly to minimum bounds (Level 1)', () => {
      const sessions = makeGameSessions('memory-matrix', [
        { accuracyPercentage: 30, outcome: 'game-over', highestLevel: 1, startingLevel: 1, roundsCompleted: 4 },
        { accuracyPercentage: 35, outcome: 'game-over', highestLevel: 1, startingLevel: 1, roundsCompleted: 4 },
        { accuracyPercentage: 40, outcome: 'game-over', highestLevel: 1, startingLevel: 1, roundsCompleted: 5 },
      ]);
      const res = evaluateGameDifficulty('memory-matrix', 1, sessions);
      expect(res.nextStartingLevel).toBe(1);
    });

    it('clamps strictly to maximum bounds (Level 8)', () => {
      const sessions = makeGameSessions('memory-matrix', [
        { accuracyPercentage: 95, highestLevel: 10, startingLevel: 8, gameSpecificMetrics: { perfectRounds: 8 } },
        { accuracyPercentage: 92, highestLevel: 10, startingLevel: 8, gameSpecificMetrics: { perfectRounds: 8 } },
        { accuracyPercentage: 90, highestLevel: 10, startingLevel: 8, gameSpecificMetrics: { perfectRounds: 7 } },
      ]);
      const res = evaluateGameDifficulty('memory-matrix', 8, sessions);
      expect(res.nextStartingLevel).toBe(8);
    });
  });

  describe('Number Recall (Levels 1-7)', () => {
    it('promotes starting level after 3 sessions with high span reached', () => {
      const sessions = makeGameSessions('number-recall', [
        { accuracyPercentage: 88, startingLevel: 1, outcome: 'completed', gameSpecificMetrics: { maxDigitSpan: 5 } },
        { accuracyPercentage: 90, startingLevel: 1, outcome: 'completed', gameSpecificMetrics: { maxDigitSpan: 6 } },
        { accuracyPercentage: 86, startingLevel: 1, outcome: 'completed', gameSpecificMetrics: { maxDigitSpan: 5 } },
      ]);
      const res = evaluateGameDifficulty('number-recall', 1, sessions);
      expect(res.nextStartingLevel).toBe(2);
      expect(res.reason).toBe('sustained_performance');
    });

    it('demotes starting level after 3 struggling sessions', () => {
      const sessions = makeGameSessions('number-recall', [
        { accuracyPercentage: 40, startingLevel: 3, outcome: 'game-over', roundsCompleted: 3, gameSpecificMetrics: { maxDigitSpan: 3 } },
        { accuracyPercentage: 45, startingLevel: 3, outcome: 'game-over', roundsCompleted: 4, gameSpecificMetrics: { maxDigitSpan: 4 } },
        { accuracyPercentage: 35, startingLevel: 3, outcome: 'game-over', roundsCompleted: 3, gameSpecificMetrics: { maxDigitSpan: 3 } },
      ]);
      const res = evaluateGameDifficulty('number-recall', 3, sessions);
      expect(res.nextStartingLevel).toBe(2);
      expect(res.reason).toBe('sustained_struggle');
    });

    it('clamps at level 7 max and level 1 min', () => {
      const promoSessions = makeGameSessions('number-recall', [
        { accuracyPercentage: 95, startingLevel: 7, outcome: 'completed', gameSpecificMetrics: { maxDigitSpan: 11 } },
        { accuracyPercentage: 95, startingLevel: 7, outcome: 'completed', gameSpecificMetrics: { maxDigitSpan: 11 } },
        { accuracyPercentage: 95, startingLevel: 7, outcome: 'completed', gameSpecificMetrics: { maxDigitSpan: 11 } },
      ]);
      expect(evaluateGameDifficulty('number-recall', 7, promoSessions).nextStartingLevel).toBe(7);

      const demoSessions = makeGameSessions('number-recall', [
        { accuracyPercentage: 30, startingLevel: 1, outcome: 'game-over', roundsCompleted: 3, gameSpecificMetrics: { maxDigitSpan: 2 } },
        { accuracyPercentage: 30, startingLevel: 1, outcome: 'game-over', roundsCompleted: 3, gameSpecificMetrics: { maxDigitSpan: 2 } },
        { accuracyPercentage: 30, startingLevel: 1, outcome: 'game-over', roundsCompleted: 3, gameSpecificMetrics: { maxDigitSpan: 2 } },
      ]);
      expect(evaluateGameDifficulty('number-recall', 1, demoSessions).nextStartingLevel).toBe(1);
    });
  });

  describe('Quick Reaction (Levels 1-4)', () => {
    it('promotes when 3 sessions have fast reaction times and >= 80% accuracy', () => {
      const sessions = makeGameSessions('quick-reaction', [
        { accuracyPercentage: 90, roundsCompleted: 10, outcome: 'completed', gameSpecificMetrics: { medianReactionMs: 270, falseStarts: 0 } },
        { accuracyPercentage: 90, roundsCompleted: 10, outcome: 'completed', gameSpecificMetrics: { medianReactionMs: 280, falseStarts: 0 } },
        { accuracyPercentage: 100, roundsCompleted: 10, outcome: 'completed', gameSpecificMetrics: { medianReactionMs: 250, falseStarts: 1 } },
      ]);
      const res = evaluateGameDifficulty('quick-reaction', 1, sessions);
      expect(res.nextStartingLevel).toBe(2);
      expect(res.reason).toBe('sustained_performance');
    });

    it('demotes when reaction times are slow or accuracy is low across 3 sessions', () => {
      const sessions = makeGameSessions('quick-reaction', [
        { accuracyPercentage: 50, roundsCompleted: 8, outcome: 'completed', gameSpecificMetrics: { medianReactionMs: 520, falseStarts: 2, timeouts: 3 } },
        { accuracyPercentage: 55, roundsCompleted: 7, outcome: 'game-over', gameSpecificMetrics: { medianReactionMs: 490, falseStarts: 2, timeouts: 2 } },
        { accuracyPercentage: 40, roundsCompleted: 6, outcome: 'game-over', gameSpecificMetrics: { medianReactionMs: 550, falseStarts: 1, timeouts: 3 } },
      ]);
      const res = evaluateGameDifficulty('quick-reaction', 2, sessions);
      expect(res.nextStartingLevel).toBe(1);
      expect(res.reason).toBe('sustained_struggle');
    });
  });

  describe('Focus Finder (Levels 1-4)', () => {
    it('promotes when search speeds and accuracy are sustained high', () => {
      const sessions = makeGameSessions('focus-finder', [
        { accuracyPercentage: 90, highestLevel: 2, startingLevel: 1, outcome: 'completed', gameSpecificMetrics: { avgFindTimeMs: 2200 } },
        { accuracyPercentage: 85, highestLevel: 2, startingLevel: 1, outcome: 'completed', gameSpecificMetrics: { avgFindTimeMs: 2100 } },
        { accuracyPercentage: 95, highestLevel: 2, startingLevel: 1, outcome: 'completed', gameSpecificMetrics: { avgFindTimeMs: 1900 } },
      ]);
      const res = evaluateGameDifficulty('focus-finder', 1, sessions);
      expect(res.nextStartingLevel).toBe(2);
      expect(res.reason).toBe('sustained_performance');
    });

    it('demotes when search speeds are slow or error rate is high', () => {
      const sessions = makeGameSessions('focus-finder', [
        { accuracyPercentage: 45, outcome: 'game-over', gameSpecificMetrics: { avgFindTimeMs: 7000, misses: 3, timeouts: 2 } },
        { accuracyPercentage: 40, outcome: 'game-over', gameSpecificMetrics: { avgFindTimeMs: 6800, misses: 2, timeouts: 2 } },
        { accuracyPercentage: 48, outcome: 'game-over', gameSpecificMetrics: { avgFindTimeMs: 7200, misses: 4, timeouts: 1 } },
      ]);
      const res = evaluateGameDifficulty('focus-finder', 3, sessions);
      expect(res.nextStartingLevel).toBe(2);
      expect(res.reason).toBe('sustained_struggle');
    });
  });

  describe('Logic Quest (Tiers 1-3)', () => {
    it('promotes from Tier 1 to Tier 2 after 3 sessions with >= 80% accuracy', () => {
      const sessions = makeGameSessions('logic-quest', [
        { accuracyPercentage: 85, outcome: 'completed', gameSpecificMetrics: { avgResponseTimeMs: 4000 } },
        { accuracyPercentage: 90, outcome: 'completed', gameSpecificMetrics: { avgResponseTimeMs: 4500 } },
        { accuracyPercentage: 80, outcome: 'completed', gameSpecificMetrics: { avgResponseTimeMs: 5000 } },
      ]);
      const res = evaluateGameDifficulty('logic-quest', 1, sessions);
      expect(res.nextStartingLevel).toBe(2);
      expect(res.reason).toBe('sustained_performance');
    });

    it('demotes from Tier 2 to Tier 1 after 3 sessions with <= 50% accuracy', () => {
      const sessions = makeGameSessions('logic-quest', [
        { accuracyPercentage: 40, outcome: 'completed', gameSpecificMetrics: { avgResponseTimeMs: 6000 } },
        { accuracyPercentage: 30, outcome: 'completed', gameSpecificMetrics: { avgResponseTimeMs: 6200 } },
        { accuracyPercentage: 45, outcome: 'completed', gameSpecificMetrics: { avgResponseTimeMs: 5800 } },
      ]);
      const res = evaluateGameDifficulty('logic-quest', 2, sessions);
      expect(res.nextStartingLevel).toBe(1);
      expect(res.reason).toBe('sustained_struggle');
    });

    it('clamps at Tier 3 maximum', () => {
      const sessions = makeGameSessions('logic-quest', [
        { accuracyPercentage: 90, outcome: 'completed', gameSpecificMetrics: { avgResponseTimeMs: 3500 } },
        { accuracyPercentage: 95, outcome: 'completed', gameSpecificMetrics: { avgResponseTimeMs: 3800 } },
        { accuracyPercentage: 90, outcome: 'completed', gameSpecificMetrics: { avgResponseTimeMs: 4000 } },
      ]);
      const res = evaluateGameDifficulty('logic-quest', 3, sessions);
      expect(res.nextStartingLevel).toBe(3);
    });
  });

  describe('Pattern Master (Tiers 1-3)', () => {
    it('promotes from Tier 1 to Tier 2 after 3 sessions with >= 80% accuracy', () => {
      const sessions = makeGameSessions('pattern-master', [
        { accuracyPercentage: 88, outcome: 'completed', gameSpecificMetrics: { avgResponseTimeMs: 5000 } },
        { accuracyPercentage: 85, outcome: 'completed', gameSpecificMetrics: { avgResponseTimeMs: 5200 } },
        { accuracyPercentage: 92, outcome: 'completed', gameSpecificMetrics: { avgResponseTimeMs: 4800 } },
      ]);
      const res = evaluateGameDifficulty('pattern-master', 1, sessions);
      expect(res.nextStartingLevel).toBe(2);
      expect(res.reason).toBe('sustained_performance');
    });

    it('demotes from Tier 3 to Tier 2 after 3 sessions with <= 50% accuracy', () => {
      const sessions = makeGameSessions('pattern-master', [
        { accuracyPercentage: 40, outcome: 'completed', gameSpecificMetrics: { avgResponseTimeMs: 7000 } },
        { accuracyPercentage: 35, outcome: 'completed', gameSpecificMetrics: { avgResponseTimeMs: 7500 } },
        { accuracyPercentage: 45, outcome: 'completed', gameSpecificMetrics: { avgResponseTimeMs: 6800 } },
      ]);
      const res = evaluateGameDifficulty('pattern-master', 3, sessions);
      expect(res.nextStartingLevel).toBe(2);
      expect(res.reason).toBe('sustained_struggle');
    });
  });

  describe('Handling Legacy History Sessions Lacking startingLevel', () => {
    it('gracefully processes legacy sessions without throwing or fabricating false levels', () => {
      const legacySessions = makeGameSessions('memory-matrix', [
        { startingLevel: undefined, highestLevel: 4, accuracyPercentage: 88, gameSpecificMetrics: { perfectRounds: 7 } },
        { startingLevel: undefined, highestLevel: 4, accuracyPercentage: 88, gameSpecificMetrics: { perfectRounds: 7 } },
        { startingLevel: undefined, highestLevel: 4, accuracyPercentage: 88, gameSpecificMetrics: { perfectRounds: 7 } },
      ]);

      const res = evaluateGameDifficulty('memory-matrix', 1, legacySessions);
      expect(res.nextStartingLevel).toBe(2);
      expect(res.reason).toBe('sustained_performance');
    });
  });
});

describe('Question Bank Tier Selection & Balance', () => {
  describe('Logic Quest Tier Question Selection', () => {
    it('curates questions respecting starting tier preferences', () => {
      const tier1Questions = getCuratedQuestionsForSession(10, 1);
      const tier3Questions = getCuratedQuestionsForSession(10, 3);

      expect(tier1Questions.length).toBe(10);
      expect(tier3Questions.length).toBe(10);

      const tier1EasyCount = tier1Questions.filter((q) => q.difficulty === 1).length;
      const tier3HardCount = tier3Questions.filter((q) => q.difficulty === 3).length;

      expect(tier1EasyCount).toBeGreaterThanOrEqual(2);
      expect(tier3HardCount).toBeGreaterThanOrEqual(2);
    });

    it('maintains broad category coverage across logic categories', () => {
      const questions = getCuratedQuestionsForSession(10, 2);
      const categories = new Set(questions.map((q) => q.category));

      // Must cover all 3 distinct logic categories in a 10-question session
      expect(categories.size).toBe(3);
    });
  });

  describe('Pattern Master Tier Question Selection', () => {
    it('curates questions according to pattern tier settings', () => {
      const tier1Questions = selectSessionQuestions(PATTERN_QUESTION_BANK, 8, Math.random, 1);
      const tier3Questions = selectSessionQuestions(PATTERN_QUESTION_BANK, 8, Math.random, 3);

      expect(tier1Questions.length).toBe(8);
      expect(tier3Questions.length).toBe(8);

      // Tier 1 pool is difficulty <= 3
      expect(tier1Questions.every((q) => q.difficulty <= 3)).toBe(true);
      // Tier 3 pool is difficulty >= 3
      expect(tier3Questions.every((q) => q.difficulty >= 3)).toBe(true);
    });

    it('maintains pattern category variety across selections', () => {
      const questions = selectSessionQuestions(PATTERN_QUESTION_BANK, 8, Math.random, 2);
      const categories = new Set(questions.map((q) => q.category));

      // Covers multiple categories
      expect(categories.size).toBeGreaterThanOrEqual(2);
    });
  });
});
