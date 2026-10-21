import {
  LEVEL_CONFIGS,
  MAX_LEVEL,
  TOTAL_ROUNDS,
  SPEED_BONUS_BENCHMARK_MS,
  MAX_SPEED_BONUS_POINTS,
  BASE_ROUND_POINTS,
  getQuickReactionLevelConfig,
  getRandomWaitDuration,
  calculateRoundScore,
  calculateSessionStats,
  createInitialQuickReactionState,
  quickReactionReducer,
} from '../src/games/quick-reaction';
import { RoundResult } from '../src/games/quick-reaction/types';

describe('Quick Reaction — Pure Game Engine & Scoring', () => {
  describe('Level Configs & Difficulty Boundaries', () => {
    it('defines 6 levels with progressively tighter wait and timeout intervals', () => {
      expect(Object.keys(LEVEL_CONFIGS)).toHaveLength(6);
      for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
        const config = getQuickReactionLevelConfig(lvl);
        expect(config.level).toBe(lvl);
        expect(config.minWaitMs).toBeGreaterThanOrEqual(750);
        expect(config.maxWaitMs).toBeLessThanOrEqual(3000);
        expect(config.minWaitMs).toBeLessThan(config.maxWaitMs);
        expect(config.timeoutDurationMs).toBeGreaterThanOrEqual(1500);
        expect(config.timeoutDurationMs).toBeLessThanOrEqual(2000);
      }
    });

    it('safely clamps out-of-range levels to valid boundaries [1, 6]', () => {
      expect(getQuickReactionLevelConfig(0).level).toBe(1);
      expect(getQuickReactionLevelConfig(-5).level).toBe(1);
      expect(getQuickReactionLevelConfig(7).level).toBe(6);
      expect(getQuickReactionLevelConfig(99).level).toBe(6);
      expect(getQuickReactionLevelConfig(NaN).level).toBe(1);
    });
  });

  describe('Randomized Wait Duration Generator', () => {
    it('returns exact min and max bounds for mock random inputs (0 and 1)', () => {
      const minWait = 1000;
      const maxWait = 3000;

      const atMin = getRandomWaitDuration(minWait, maxWait, () => 0);
      expect(atMin).toBe(1000);

      const atMax = getRandomWaitDuration(minWait, maxWait, () => 1);
      expect(atMax).toBe(3000);

      const atMid = getRandomWaitDuration(minWait, maxWait, () => 0.5);
      expect(atMid).toBe(2000);
    });

    it('gracefully handles inverted or degenerate ranges', () => {
      const result = getRandomWaitDuration(2000, 1000, () => 0.5);
      expect(result).toBe(2000);
    });
  });

  describe('Deterministic Scoring Engine', () => {
    it('verifies baseline scoring constants', () => {
      expect(BASE_ROUND_POINTS).toBe(100);
      expect(MAX_SPEED_BONUS_POINTS).toBe(250);
      expect(SPEED_BONUS_BENCHMARK_MS).toBe(500);
    });

    it('awards maximum speed bonus (250 pts) for reaction times <= 150ms at level 1', () => {
      // Base: 100, Max Bonus: 250, Level 1 multiplier: 1.0 -> 350 pts
      const score150 = calculateRoundScore(150, 1);
      expect(score150).toBe(350);

      const score100 = calculateRoundScore(100, 1);
      expect(score100).toBe(350);

      const score50 = calculateRoundScore(50, 1);
      expect(score50).toBe(350);
    });

    it('awards 0 speed bonus for reaction times >= 500ms at level 1', () => {
      // Base: 100, Bonus: 0 -> 100 pts
      const score500 = calculateRoundScore(500, 1);
      expect(score500).toBe(100);

      const score750 = calculateRoundScore(750, 1);
      expect(score750).toBe(100);
    });

    it('linearly scales speed bonus between 150ms and 500ms', () => {
      // At 325ms (midpoint of 150 and 500): fraction = (500 - 325) / 350 = 0.5
      // bonus = Math.round(250 * 0.5) = 125. Base + bonus = 225
      const scoreMid = calculateRoundScore(325, 1);
      expect(scoreMid).toBe(225);

      // Slower reactions strictly yield less than or equal points
      const faster = calculateRoundScore(200, 1);
      const slower = calculateRoundScore(400, 1);
      expect(faster).toBeGreaterThan(slower);
    });

    it('applies level multiplier correctly across levels 1 to 6', () => {
      // Level 1: 1.0x (score 350)
      expect(calculateRoundScore(150, 1)).toBe(350);

      // Level 2: 1.1x -> 350 * 1.1 = 385
      expect(calculateRoundScore(150, 2)).toBe(385);

      // Level 3: 1.2x -> 350 * 1.2 = 420
      expect(calculateRoundScore(150, 3)).toBe(420);

      // Level 6: 1.5x -> 350 * 1.5 = 525
      expect(calculateRoundScore(150, 6)).toBe(525);
    });

    it('returns 0 score for invalid, zero, negative, or non-finite reaction times', () => {
      expect(calculateRoundScore(0, 1)).toBe(0);
      expect(calculateRoundScore(-100, 1)).toBe(0);
      expect(calculateRoundScore(NaN, 1)).toBe(0);
      expect(calculateRoundScore(Infinity, 1)).toBe(0);
      expect(calculateRoundScore(-Infinity, 1)).toBe(0);
    });
  });

  describe('Session Statistics Aggregator', () => {
    it('computes exact average, median, and best latency for odd samples', () => {
      const rounds: RoundResult[] = [
        { roundNumber: 1, outcome: 'hit', reactionTimeMs: 300, score: 240, level: 1 },
        { roundNumber: 2, outcome: 'hit', reactionTimeMs: 200, score: 310, level: 1 },
        { roundNumber: 3, outcome: 'hit', reactionTimeMs: 250, score: 280, level: 1 },
      ];

      const stats = calculateSessionStats(rounds, 10000, 1, 3);
      expect(stats.validHits).toBe(3);
      expect(stats.falseStarts).toBe(0);
      expect(stats.timeouts).toBe(0);
      expect(stats.bestReactionMs).toBe(200);
      expect(stats.avgReactionMs).toBe(250); // (300 + 200 + 250) / 3 = 250
      expect(stats.medianReactionMs).toBe(250);
      expect(stats.finalScore).toBe(830);
      expect(stats.accuracyPercentage).toBe(100);
    });

    it('computes exact median for even samples by averaging middle values', () => {
      const rounds: RoundResult[] = [
        { roundNumber: 1, outcome: 'hit', reactionTimeMs: 200, score: 310, level: 1 },
        { roundNumber: 2, outcome: 'hit', reactionTimeMs: 240, score: 280, level: 1 },
        { roundNumber: 3, outcome: 'hit', reactionTimeMs: 260, score: 270, level: 1 },
        { roundNumber: 4, outcome: 'hit', reactionTimeMs: 320, score: 230, level: 1 },
      ];

      const stats = calculateSessionStats(rounds, 12000, 1, 4);
      // Middle two: 240 and 260 -> median is 250
      expect(stats.medianReactionMs).toBe(250);
      expect(stats.bestReactionMs).toBe(200);
      expect(stats.avgReactionMs).toBe(255); // 1020 / 4 = 255
    });

    it('accurately accounts for false starts and timeouts without corrupting latency stats', () => {
      const rounds: RoundResult[] = [
        { roundNumber: 1, outcome: 'hit', reactionTimeMs: 220, score: 300, level: 1 },
        { roundNumber: 2, outcome: 'false-start', score: 0, level: 1 },
        { roundNumber: 3, outcome: 'timeout', score: 0, level: 1 },
        { roundNumber: 4, outcome: 'hit', reactionTimeMs: 260, score: 270, level: 1 },
      ];

      const stats = calculateSessionStats(rounds, 15000, 1, 4);
      expect(stats.validHits).toBe(2);
      expect(stats.falseStarts).toBe(1);
      expect(stats.timeouts).toBe(1);
      expect(stats.bestReactionMs).toBe(220);
      expect(stats.avgReactionMs).toBe(240); // (220 + 260) / 2
      expect(stats.medianReactionMs).toBe(240);
      expect(stats.accuracyPercentage).toBe(50); // 2 out of 4
      expect(stats.finalScore).toBe(570);
    });

    it('returns undefined latency metrics when no valid hits occurred', () => {
      const rounds: RoundResult[] = [
        { roundNumber: 1, outcome: 'false-start', score: 0, level: 1 },
        { roundNumber: 2, outcome: 'timeout', score: 0, level: 1 },
      ];

      const stats = calculateSessionStats(rounds, 5000, 1, 2);
      expect(stats.validHits).toBe(0);
      expect(stats.falseStarts).toBe(1);
      expect(stats.timeouts).toBe(1);
      expect(stats.bestReactionMs).toBeUndefined();
      expect(stats.avgReactionMs).toBeUndefined();
      expect(stats.medianReactionMs).toBeUndefined();
      expect(stats.accuracyPercentage).toBe(0);
      expect(stats.finalScore).toBe(0);
    });
  });

  describe('Reducer State Transitions & Concurrency Invariants', () => {
    it('initializes to countdown phase at level 1 with round 1', () => {
      const state = createInitialQuickReactionState(1);
      expect(state.phase).toBe('countdown');
      expect(state.currentRound).toBe(1);
      expect(state.totalRounds).toBe(TOTAL_ROUNDS);
      expect(state.currentLevel).toBe(1);
      expect(state.score).toBe(0);
      expect(state.roundsHistory).toHaveLength(0);
    });

    it('records a false start if user taps during waiting phase', () => {
      let state = createInitialQuickReactionState(2);
      state = quickReactionReducer(state, { type: 'START_WAITING', waitDurationMs: 1500 });
      expect(state.phase).toBe('waiting');

      state = quickReactionReducer(state, { type: 'RECORD_TAP', tapTimestamp: 1000 });
      expect(state.phase).toBe('round-feedback');
      expect(state.currentRoundOutcome).toBe('false-start');
      expect(state.currentRoundReactionMs).toBeUndefined();
      expect(state.currentRoundScore).toBe(0);
      expect(state.currentLevel).toBe(1); // Dropped by 1
      expect(state.roundsHistory).toHaveLength(1);
      expect(state.roundsHistory[0].outcome).toBe('false-start');
    });

    it('records a valid hit with measured reaction time during trigger phase', () => {
      let state = createInitialQuickReactionState(1);
      state = quickReactionReducer(state, { type: 'START_WAITING', waitDurationMs: 1200 });
      state = quickReactionReducer(state, { type: 'SHOW_TRIGGER', triggerTimestamp: 2000 });
      expect(state.phase).toBe('trigger');

      state = quickReactionReducer(state, { type: 'RECORD_TAP', tapTimestamp: 2240 });
      expect(state.phase).toBe('round-feedback');
      expect(state.currentRoundOutcome).toBe('hit');
      expect(state.currentRoundReactionMs).toBe(240);
      expect(state.currentRoundScore).toBeGreaterThan(0);
      expect(state.score).toBe(state.currentRoundScore!);
      expect(state.roundsHistory).toHaveLength(1);
      expect(state.roundsHistory[0].outcome).toBe('hit');
    });

    it('records a timeout when response window expires without a tap', () => {
      let state = createInitialQuickReactionState(3);
      state = quickReactionReducer(state, { type: 'START_WAITING', waitDurationMs: 1000 });
      state = quickReactionReducer(state, { type: 'SHOW_TRIGGER', triggerTimestamp: 1000 });
      expect(state.phase).toBe('trigger');

      state = quickReactionReducer(state, { type: 'TIMEOUT_TRIGGER' });
      expect(state.phase).toBe('round-feedback');
      expect(state.currentRoundOutcome).toBe('timeout');
      expect(state.currentRoundReactionMs).toBeUndefined();
      expect(state.currentRoundScore).toBe(0);
      expect(state.currentLevel).toBe(2); // Dropped by 1
      expect(state.roundsHistory).toHaveLength(1);
      expect(state.roundsHistory[0].outcome).toBe('timeout');
    });

    it('strictly ignores rapid repeated taps after round has settled into round-feedback', () => {
      let state = createInitialQuickReactionState(1);
      state = quickReactionReducer(state, { type: 'START_WAITING', waitDurationMs: 1200 });
      state = quickReactionReducer(state, { type: 'SHOW_TRIGGER', triggerTimestamp: 2000 });

      // First tap settles the round
      state = quickReactionReducer(state, { type: 'RECORD_TAP', tapTimestamp: 2220 });
      const initialScore = state.score;
      expect(state.phase).toBe('round-feedback');

      // Subsequent duplicate taps must be ignored
      const state2 = quickReactionReducer(state, { type: 'RECORD_TAP', tapTimestamp: 2230 });
      const state3 = quickReactionReducer(state2, { type: 'RECORD_TAP', tapTimestamp: 2250 });
      expect(state3.score).toBe(initialScore);
      expect(state3.roundsHistory).toHaveLength(1);
    });

    it('advances difficulty level after 2 consecutive fast reactions (<350ms)', () => {
      let state = createInitialQuickReactionState(1);

      // Hit 1: 250ms (fast)
      state = quickReactionReducer(state, { type: 'START_WAITING', waitDurationMs: 1000 });
      state = quickReactionReducer(state, { type: 'SHOW_TRIGGER', triggerTimestamp: 1000 });
      state = quickReactionReducer(state, { type: 'RECORD_TAP', tapTimestamp: 1250 });
      expect(state.currentLevel).toBe(1); // Needs 2 consecutive
      expect(state.consecutiveFastHits).toBe(1);

      state = quickReactionReducer(state, { type: 'END_ROUND_FEEDBACK' });

      // Hit 2: 240ms (fast)
      state = quickReactionReducer(state, { type: 'SHOW_TRIGGER', triggerTimestamp: 3000 });
      state = quickReactionReducer(state, { type: 'RECORD_TAP', tapTimestamp: 3240 });
      expect(state.currentLevel).toBe(2); // Level advanced!
      expect(state.consecutiveFastHits).toBe(0);
    });

    it('advances rounds sequentially up to 10 then transitions to completed', () => {
      let state = createInitialQuickReactionState(1);

      for (let r = 1; r <= 10; r++) {
        expect(state.currentRound).toBe(r);
        state = quickReactionReducer(state, { type: 'START_WAITING', waitDurationMs: 1000 });
        state = quickReactionReducer(state, { type: 'SHOW_TRIGGER', triggerTimestamp: 1000 });
        state = quickReactionReducer(state, { type: 'RECORD_TAP', tapTimestamp: 1250 });
        expect(state.phase).toBe('round-feedback');
        state = quickReactionReducer(state, { type: 'END_ROUND_FEEDBACK' });
      }

      expect(state.phase).toBe('completed');
      expect(state.sessionStats).toBeDefined();
      expect(state.sessionStats?.roundsCompleted).toBe(10);
      expect(state.sessionStats?.validHits).toBe(10);
    });

    it('safely handles pause and resume without allowing trigger pre-emption', () => {
      let state = createInitialQuickReactionState(1);
      state = quickReactionReducer(state, { type: 'START_WAITING', waitDurationMs: 1500 });
      state = quickReactionReducer(state, { type: 'SHOW_TRIGGER', triggerTimestamp: 2000 });

      // Paused while trigger is showing
      state = quickReactionReducer(state, { type: 'PAUSE_GAME' });
      expect(state.phase).toBe('paused');

      // Resumed: must reset back to waiting phase so player cannot pause to instant-tap
      state = quickReactionReducer(state, { type: 'RESUME_GAME' });
      expect(state.phase).toBe('waiting');
      expect(state.triggerTimestamp).toBeUndefined();
    });

    it('resets completely to initial state on RESTART_GAME', () => {
      let state = createInitialQuickReactionState(3);
      state = quickReactionReducer(state, { type: 'START_WAITING', waitDurationMs: 1000 });
      state = quickReactionReducer(state, { type: 'SHOW_TRIGGER', triggerTimestamp: 1000 });
      state = quickReactionReducer(state, { type: 'RECORD_TAP', tapTimestamp: 1200 });
      expect(state.score).toBeGreaterThan(0);

      state = quickReactionReducer(state, { type: 'RESTART_GAME' });
      expect(state.phase).toBe('countdown');
      expect(state.currentRound).toBe(1);
      expect(state.currentLevel).toBe(1);
      expect(state.score).toBe(0);
      expect(state.roundsHistory).toHaveLength(0);
    });
  });
});
