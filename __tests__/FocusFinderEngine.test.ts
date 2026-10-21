import {
  generateFocusFinderRound,
  calculateFocusFinderScore,
  calculateFocusFinderSessionStats,
  createInitialFocusFinderState,
  focusFinderReducer,
  getFocusFinderLevelConfig,
  FOCUS_FINDER_LEVEL_CONFIGS,
  TOTAL_FOCUS_FINDER_ROUNDS,
  FocusFinderRoundResult,
} from '../src/games/focus-finder';

// Simple deterministic Mulberry32 PRNG for reproducible testing
function createSeededPrng(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('Focus Finder Engine — Core Mechanics & Difficulty', () => {
  describe('Level Configurations and Boundaries', () => {
    it('provides valid configurations across levels 1 through 6', () => {
      for (let lvl = 1; lvl <= 6; lvl++) {
        const config = getFocusFinderLevelConfig(lvl);
        expect(config.level).toBe(lvl);
        expect(config.rows).toBeGreaterThanOrEqual(3);
        expect(config.cols).toBeGreaterThanOrEqual(3);
        expect(config.totalItems).toBe(config.rows * config.cols);
        expect(config.timeLimitMs).toBeGreaterThan(0);
      }
    });

    it('clamps invalid or out-of-bounds difficulty levels', () => {
      expect(getFocusFinderLevelConfig(0).level).toBe(1);
      expect(getFocusFinderLevelConfig(-5).level).toBe(1);
      expect(getFocusFinderLevelConfig(7).level).toBe(6);
      expect(getFocusFinderLevelConfig(99).level).toBe(6);
      expect(getFocusFinderLevelConfig(2.7).level).toBe(3);
    });

    it('scales grid items and decreases time limit monotonically as level increases', () => {
      for (let lvl = 1; lvl < 6; lvl++) {
        const current = FOCUS_FINDER_LEVEL_CONFIGS[lvl];
        const next = FOCUS_FINDER_LEVEL_CONFIGS[lvl + 1];
        expect(next.totalItems).toBeGreaterThanOrEqual(current.totalItems);
        expect(next.timeLimitMs).toBeLessThanOrEqual(current.timeLimitMs);
      }
    });
  });

  describe('Round Generation & Target Uniqueness', () => {
    it('generates a round with exactly one unique target', () => {
      const prng = createSeededPrng(12345);
      const round = generateFocusFinderRound(1, 1, prng);

      expect(round.items).toHaveLength(round.totalItems);
      const targets = round.items.filter((item) => item.isTarget);
      expect(targets).toHaveLength(1);
      expect(round.targetIndex).toBe(round.items.indexOf(targets[0]));

      // Target item must match target description
      const targetItem = targets[0];
      expect(targetItem.shape).toBe(round.target.shape);
      expect(targetItem.colorKey).toBe(round.target.colorKey);
      expect(targetItem.pattern).toBe(round.target.pattern);
    });

    it('guarantees no distractor has identical attributes to the target', () => {
      // Test across 50 seeded rounds at multiple levels
      for (let seed = 100; seed < 150; seed++) {
        const prng = createSeededPrng(seed);
        const level = (seed % 6) + 1;
        const round = generateFocusFinderRound(1, level, prng);

        round.items.forEach((item, idx) => {
          if (idx === round.targetIndex) {
            expect(item.isTarget).toBe(true);
          } else {
            expect(item.isTarget).toBe(false);
            const isIdentical =
              item.shape === round.target.shape &&
              item.colorKey === round.target.colorKey &&
              item.pattern === round.target.pattern;
            expect(isIdentical).toBe(false);
          }
        });
      }
    });

    it('generates deterministic rounds given the same PRNG seed', () => {
      const prng1 = createSeededPrng(42);
      const round1 = generateFocusFinderRound(3, 4, prng1);

      const prng2 = createSeededPrng(42);
      const round2 = generateFocusFinderRound(3, 4, prng2);

      expect(round1.targetIndex).toBe(round2.targetIndex);
      expect(round1.target).toEqual(round2.target);
      expect(round1.items).toEqual(round2.items);
    });

    it('introduces conjunction distractors at higher levels', () => {
      const prng = createSeededPrng(999);
      const round = generateFocusFinderRound(5, 5, prng);

      const distractors = round.items.filter((item) => !item.isTarget);
      const sharesShapeOrColor = distractors.some(
        (d) => d.shape === round.target.shape || d.colorKey === round.target.colorKey
      );
      expect(sharesShapeOrColor).toBe(true);
    });
  });

  describe('Scoring Formula', () => {
    it('awards base score and speed bonus for valid hits', () => {
      const level = 2;
      const timeLimitMs = 9000;
      // Instant hit (0ms latency) -> max speed bonus
      const maxScore = calculateFocusFinderScore(level, 'hit', 0, timeLimitMs, 0);
      // base = 2 * 200 = 400. speedBonus = 150 * 2 = 300. total = 700
      expect(maxScore).toBe(700);

      // Hit at half time limit (4500ms)
      const halfTimeScore = calculateFocusFinderScore(level, 'hit', 4500, timeLimitMs, 0);
      // speedRatio = 0.5 -> speedBonus = 150. total = 550
      expect(halfTimeScore).toBe(550);

      // Hit at expiry (9000ms) -> 0 speed bonus
      const minScore = calculateFocusFinderScore(level, 'hit', 9000, timeLimitMs, 0);
      expect(minScore).toBe(400);
    });

    it('awards streak bonus when consecutiveHits >= 2', () => {
      const level = 1;
      const timeLimitMs = 10000;
      const scoreNoStreak = calculateFocusFinderScore(level, 'hit', 5000, timeLimitMs, 1);
      const scoreWithStreak2 = calculateFocusFinderScore(level, 'hit', 5000, timeLimitMs, 2);
      const scoreWithStreak3 = calculateFocusFinderScore(level, 'hit', 5000, timeLimitMs, 3);

      expect(scoreWithStreak2 - scoreNoStreak).toBe(80); // 2 * 40
      expect(scoreWithStreak3 - scoreWithStreak2).toBe(40); // 120 - 80 = 40
    });

    it('penalizes incorrect selections with -50 points', () => {
      const missScore = calculateFocusFinderScore(3, 'miss', 1200, 8000, 4);
      expect(missScore).toBe(-50);
    });

    it('awards 0 points on timeout', () => {
      const timeoutScore = calculateFocusFinderScore(4, 'timeout', 7000, 7000, 0);
      expect(timeoutScore).toBe(0);
    });

    it('handles negative or excessive response times safely', () => {
      const scoreNegative = calculateFocusFinderScore(1, 'hit', -500, 10000, 0);
      expect(scoreNegative).toBe(350); // clamped to 0 -> max speed bonus

      const scoreExcess = calculateFocusFinderScore(1, 'hit', 15000, 10000, 0);
      expect(scoreExcess).toBe(200); // clamped to timeLimit -> 0 speed bonus
    });
  });

  describe('Session Statistics Calculation', () => {
    it('aggregates statistics accurately for a completed session', () => {
      const rounds: FocusFinderRoundResult[] = [
        { roundNumber: 1, level: 1, outcome: 'hit', targetIndex: 2, responseTimeMs: 1200, score: 300 },
        { roundNumber: 2, level: 1, outcome: 'hit', targetIndex: 4, responseTimeMs: 800, score: 350 },
        { roundNumber: 3, level: 2, outcome: 'miss', targetIndex: 0, responseTimeMs: 1500, score: -50 },
        { roundNumber: 4, level: 1, outcome: 'timeout', targetIndex: 3, responseTimeMs: 10000, score: 0 },
        { roundNumber: 5, level: 1, outcome: 'hit', targetIndex: 1, responseTimeMs: 1000, score: 280 },
      ];

      const startTime = 1000000;
      const endTime = 1030000;
      const stats = calculateFocusFinderSessionStats(rounds, 5, startTime, endTime);

      expect(stats.totalRounds).toBe(5);
      expect(stats.roundsCompleted).toBe(5);
      expect(stats.targetHits).toBe(3);
      expect(stats.misses).toBe(1);
      expect(stats.timeouts).toBe(1);
      expect(stats.accuracyPercentage).toBe(60); // 3/5 = 60%
      expect(stats.finalScore).toBe(880); // 300 + 350 - 50 + 0 + 280 = 880
      expect(stats.highestLevel).toBe(2);
      expect(stats.bestFindTimeMs).toBe(800);
      expect(stats.avgFindTimeMs).toBe(1000); // (1200 + 800 + 1000) / 3 = 1000
      expect(stats.totalDurationMs).toBe(30000);
    });

    it('floors finalScore at zero if penalties exceed gains', () => {
      const rounds: FocusFinderRoundResult[] = [
        { roundNumber: 1, level: 1, outcome: 'miss', targetIndex: 1, responseTimeMs: 500, score: -50 },
      ];
      const stats = calculateFocusFinderSessionStats(rounds, 1, Date.now());
      expect(stats.finalScore).toBe(0);
    });
  });

  describe('Focus Finder Reducer & State Machine', () => {
    it('initializes to countdown phase with round 1 and level 1', () => {
      const state = createInitialFocusFinderState(1, 1000);
      expect(state.phase).toBe('countdown');
      expect(state.currentRound).toBe(1);
      expect(state.totalRounds).toBe(TOTAL_FOCUS_FINDER_ROUNDS);
      expect(state.currentLevel).toBe(1);
      expect(state.score).toBe(0);
      expect(state.consecutiveHits).toBe(0);
      expect(state.roundsHistory).toHaveLength(0);
    });

    it('transitions to searching on START_ROUND', () => {
      const initial = createInitialFocusFinderState(1, 1000);
      const next = focusFinderReducer(initial, { type: 'START_ROUND', roundStartTime: 2000 });
      expect(next.phase).toBe('searching');
      expect(next.roundStartTime).toBe(2000);
    });

    it('processes correct target tap: awards score, increments streak, transitions to feedback', () => {
      const prng = createSeededPrng(111);
      let state = createInitialFocusFinderState(1, 1000, prng);
      state = focusFinderReducer(state, { type: 'START_ROUND', roundStartTime: 2000 });

      const targetIdx = state.currentRoundConfig.targetIndex;
      state = focusFinderReducer(state, { type: 'TAP_ITEM', itemIndex: targetIdx, tapTimestamp: 3000 });

      expect(state.phase).toBe('feedback');
      expect(state.lastRoundOutcome).toBe('hit');
      expect(state.consecutiveHits).toBe(1);
      expect(state.score).toBeGreaterThan(0);
      expect(state.roundsHistory).toHaveLength(1);
      expect(state.roundsHistory[0].outcome).toBe('hit');
    });

    it('processes distractor tap: penalizes score, resets streak, transitions to feedback', () => {
      const prng = createSeededPrng(222);
      let state = createInitialFocusFinderState(1, 1000, prng);
      state = focusFinderReducer(state, { type: 'START_ROUND', roundStartTime: 2000 });

      const wrongIdx = (state.currentRoundConfig.targetIndex + 1) % state.currentRoundConfig.totalItems;
      state = focusFinderReducer(state, { type: 'TAP_ITEM', itemIndex: wrongIdx, tapTimestamp: 3000 });

      expect(state.phase).toBe('feedback');
      expect(state.lastRoundOutcome).toBe('miss');
      expect(state.consecutiveHits).toBe(0);
      expect(state.score).toBe(0); // floored at 0
      expect(state.lastRoundScore).toBe(-50);
    });

    it('strictly rejects repeated taps and prevents duplicate scoring', () => {
      const prng = createSeededPrng(333);
      let state = createInitialFocusFinderState(1, 1000, prng);
      state = focusFinderReducer(state, { type: 'START_ROUND', roundStartTime: 2000 });

      const targetIdx = state.currentRoundConfig.targetIndex;
      // First tap
      state = focusFinderReducer(state, { type: 'TAP_ITEM', itemIndex: targetIdx, tapTimestamp: 3000 });
      const scoreAfterFirstTap = state.score;
      expect(state.phase).toBe('feedback');

      // Subsequent rapid taps while in feedback phase
      state = focusFinderReducer(state, { type: 'TAP_ITEM', itemIndex: targetIdx, tapTimestamp: 3100 });
      state = focusFinderReducer(state, { type: 'TAP_ITEM', itemIndex: targetIdx, tapTimestamp: 3200 });

      expect(state.score).toBe(scoreAfterFirstTap);
      expect(state.roundsHistory).toHaveLength(1);
    });

    it('handles TIMEOUT_ROUND properly', () => {
      const prng = createSeededPrng(444);
      let state = createInitialFocusFinderState(2, 1000, prng);
      state = focusFinderReducer(state, { type: 'START_ROUND', roundStartTime: 2000 });

      state = focusFinderReducer(state, { type: 'TIMEOUT_ROUND', timeoutTimestamp: 11000 });
      expect(state.phase).toBe('feedback');
      expect(state.lastRoundOutcome).toBe('timeout');
      expect(state.lastRoundScore).toBe(0);
      expect(state.roundsHistory).toHaveLength(1);
    });

    it('adapts difficulty upwards after 2 consecutive hits on NEXT_ROUND', () => {
      const prng = createSeededPrng(555);
      let state = createInitialFocusFinderState(1, 1000, prng);
      state = focusFinderReducer(state, { type: 'START_ROUND', roundStartTime: 1000 });

      // Round 1 hit
      state = focusFinderReducer(state, {
        type: 'TAP_ITEM',
        itemIndex: state.currentRoundConfig.targetIndex,
        tapTimestamp: 1500,
      });
      state = focusFinderReducer(state, { type: 'NEXT_ROUND', nextStartTime: 2000, prng });
      expect(state.currentRound).toBe(2);
      expect(state.currentLevel).toBe(1); // 1 hit, not yet 2

      // Round 2 hit (consecutiveHits becomes 2)
      state = focusFinderReducer(state, {
        type: 'TAP_ITEM',
        itemIndex: state.currentRoundConfig.targetIndex,
        tapTimestamp: 2500,
      });
      state = focusFinderReducer(state, { type: 'NEXT_ROUND', nextStartTime: 3000, prng });
      expect(state.currentRound).toBe(3);
      expect(state.currentLevel).toBe(2); // increased to level 2!
      expect(state.highestLevelReached).toBe(2);
    });

    it('transitions to completed phase after final round', () => {
      const prng = createSeededPrng(666);
      let state = createInitialFocusFinderState(1, 1000, prng);

      for (let r = 1; r <= TOTAL_FOCUS_FINDER_ROUNDS; r++) {
        state = focusFinderReducer(state, { type: 'START_ROUND', roundStartTime: r * 1000 });
        state = focusFinderReducer(state, {
          type: 'TAP_ITEM',
          itemIndex: state.currentRoundConfig.targetIndex,
          tapTimestamp: r * 1000 + 500,
        });
        state = focusFinderReducer(state, { type: 'NEXT_ROUND', nextStartTime: r * 1000 + 800, prng });
      }

      expect(state.phase).toBe('completed');
      expect(state.sessionStats).toBeDefined();
      expect(state.sessionStats?.roundsCompleted).toBe(10);
      expect(state.sessionStats?.targetHits).toBe(10);
      expect(state.sessionStats?.accuracyPercentage).toBe(100);
    });

    it('handles pause, resume, and restart safely', () => {
      let state = createInitialFocusFinderState(1, 1000);
      state = focusFinderReducer(state, { type: 'START_ROUND', roundStartTime: 2000 });
      expect(state.phase).toBe('searching');

      state = focusFinderReducer(state, { type: 'PAUSE_GAME' });
      expect(state.phase).toBe('paused');

      state = focusFinderReducer(state, { type: 'RESUME_GAME' });
      expect(state.phase).toBe('searching');

      state = focusFinderReducer(state, { type: 'RESTART_GAME', startTimestamp: 5000 });
      expect(state.phase).toBe('countdown');
      expect(state.currentRound).toBe(1);
      expect(state.score).toBe(0);
    });
  });
});
