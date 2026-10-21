import {
  generateSequence,
  getNumberRecallLevelConfig,
  computeNextNumberRecallLevel,
  calculateNumberRecallRoundScore,
  computeNumberRecallSessionStats,
  countMatchedDigits,
  createInitialNumberRecallState,
  numberRecallReducer,
  MIN_LEVEL,
  MAX_LEVEL,
  TOTAL_SESSION_ROUNDS,
  MAX_STRIKES,
} from '../src/games/number-recall';
import { en } from '../src/localization/en';
import { ml } from '../src/localization/ml';

describe('Number Recall — Pure Game Engine & Lifecycle', () => {
  describe('Sequence Generator', () => {
    it('generates exact sequence length for various requested lengths', () => {
      [2, 3, 4, 5, 6, 7, 8, 9, 10, 12].forEach((len) => {
        const seq = generateSequence({ length: len });
        expect(seq).toHaveLength(len);
        expect(typeof seq).toBe('string');
        expect(/^\d+$/.test(seq)).toBe(true);
      });
    });

    it('strictly preserves leading zeros in sequences', () => {
      // Deterministic RNG that returns 0 on the first call
      let callCount = 0;
      const mockRng = () => {
        callCount++;
        if (callCount === 1) return 0.05; // 0
        if (callCount === 2) return 0.45; // 4
        if (callCount === 3) return 0.85; // 8
        return 0.25; // 2
      };

      const seq = generateSequence({ length: 4, rng: mockRng });
      expect(seq).toBe('0482');
      expect(seq.startsWith('0')).toBe(true);
      expect(seq.length).toBe(4);
    });

    it('rejects invalid or out-of-range sequence lengths', () => {
      expect(() => generateSequence({ length: 1 })).toThrow(/Invalid sequence length/);
      expect(() => generateSequence({ length: 0 })).toThrow(/Invalid sequence length/);
      expect(() => generateSequence({ length: -3 })).toThrow(/Invalid sequence length/);
      expect(() => generateSequence({ length: 16 })).toThrow(/Invalid sequence length/);
      expect(() => generateSequence({ length: 3.5 })).toThrow(/Invalid sequence length/);
    });

    it('prevents degenerate sequences where all digits are identical for length >= 3', () => {
      // Constant RNG returning 0.3 for all calls -> all digits would be 3
      const constantRng = () => 0.3;
      const seq = generateSequence({ length: 4, rng: constantRng });
      expect(seq).toHaveLength(4);
      // Last digit should be altered to prevent '3333'
      expect(seq).toBe('3334');
      const allIdentical = seq.split('').every((d) => d === seq[0]);
      expect(allIdentical).toBe(false);
    });
  });

  describe('Difficulty Progression Curve', () => {
    it('provides valid LevelConfig for all documented levels 1 to 12', () => {
      for (let lvl = MIN_LEVEL; lvl <= MAX_LEVEL; lvl++) {
        const config = getNumberRecallLevelConfig(lvl);
        expect(config.level).toBe(lvl);
        expect(config.sequenceLength).toBeGreaterThanOrEqual(3);
        expect(config.sequenceLength).toBeLessThanOrEqual(9);
        expect(config.displayDurationMs).toBeGreaterThanOrEqual(2000);
      }
    });

    it('clamps levels below MIN_LEVEL and above MAX_LEVEL', () => {
      expect(getNumberRecallLevelConfig(0).level).toBe(MIN_LEVEL);
      expect(getNumberRecallLevelConfig(-5).level).toBe(MIN_LEVEL);
      expect(getNumberRecallLevelConfig(15).level).toBe(MAX_LEVEL);
      expect(getNumberRecallLevelConfig(99).level).toBe(MAX_LEVEL);
      expect(getNumberRecallLevelConfig(NaN).level).toBe(MIN_LEVEL);
    });

    it('advances level on correct answer and steps down on incorrect answer', () => {
      expect(computeNextNumberRecallLevel(1, true)).toBe(2);
      expect(computeNextNumberRecallLevel(5, true)).toBe(6);
      expect(computeNextNumberRecallLevel(MAX_LEVEL, true)).toBe(MAX_LEVEL); // clamped

      expect(computeNextNumberRecallLevel(5, false)).toBe(4);
      expect(computeNextNumberRecallLevel(MIN_LEVEL, false)).toBe(MIN_LEVEL); // floored
      expect(computeNextNumberRecallLevel(NaN, true)).toBe(2);
    });
  });

  describe('Scoring Engine', () => {
    it('accurately counts matching digit positions while preserving leading zeros', () => {
      expect(countMatchedDigits('0123', '0123')).toBe(4);
      expect(countMatchedDigits('0123', '0199')).toBe(2);
      expect(countMatchedDigits('0123', '9123')).toBe(3);
      expect(countMatchedDigits('0123', '9999')).toBe(0);
      expect(countMatchedDigits('0123', '01')).toBe(2);
      expect(countMatchedDigits('0123', '')).toBe(0);
    });

    it('calculates deterministic round score for a clean, fast match', () => {
      const result = calculateNumberRecallRoundScore({
        level: 3,
        targetSequence: '0482',
        submittedSequence: '0482',
        recallDurationMs: 2000,
        consecutiveCorrectRounds: 1,
      });

      // Sequence length: 4 digits, Level: 3
      // Base: 4 * 100 * 3 = 1200
      // Perfect bonus: 250 * 3 = 750
      // Speed bonus: ((8000 - 2000) / 100) * 3 = 60 * 3 = 180
      // Penalty: 0
      // Multiplier: 1.0x
      // Total: 1200 + 750 + 180 = 2130
      expect(result.isCorrect).toBe(true);
      expect(result.matchedDigitsCount).toBe(4);
      expect(result.basePoints).toBe(1200);
      expect(result.perfectBonus).toBe(750);
      expect(result.speedBonus).toBe(180);
      expect(result.penalty).toBe(0);
      expect(result.roundScore).toBe(2130);
    });

    it('calculates partial credit and penalty for mismatch with no speed/perfect bonus', () => {
      const result = calculateNumberRecallRoundScore({
        level: 2,
        targetSequence: '1234',
        submittedSequence: '1299',
        recallDurationMs: 1500,
        consecutiveCorrectRounds: 0,
      });

      // Target: 4 digits, matched: 2, unmatched: 2. Level: 2
      // Base: 2 * 25 * 2 = 100
      // Perfect bonus: 0
      // Speed bonus: 0
      // Penalty: 2 * 50 * 2 = 200
      // Raw: 100 - 200 = -100 -> floored to 0
      expect(result.isCorrect).toBe(false);
      expect(result.matchedDigitsCount).toBe(2);
      expect(result.basePoints).toBe(100);
      expect(result.perfectBonus).toBe(0);
      expect(result.speedBonus).toBe(0);
      expect(result.penalty).toBe(200);
      expect(result.roundScore).toBe(0);
    });

    it('applies streak multiplier for consecutive correct rounds', () => {
      const streak1 = calculateNumberRecallRoundScore({
        level: 1,
        targetSequence: '123',
        submittedSequence: '123',
        recallDurationMs: 8000,
        consecutiveCorrectRounds: 1,
      });
      const streak2 = calculateNumberRecallRoundScore({
        level: 1,
        targetSequence: '123',
        submittedSequence: '123',
        recallDurationMs: 8000,
        consecutiveCorrectRounds: 2,
      });
      const streak3 = calculateNumberRecallRoundScore({
        level: 1,
        targetSequence: '123',
        submittedSequence: '123',
        recallDurationMs: 8000,
        consecutiveCorrectRounds: 3,
      });

      // Base: 3 * 100 = 300; Perfect: 250; Speed: 0 -> Raw: 550
      expect(streak1.roundScore).toBe(550); // 1.0x
      expect(streak2.roundScore).toBe(Math.round(550 * 1.25)); // 688
      expect(streak3.roundScore).toBe(Math.round(550 * 1.5)); // 825
    });

    it('computes accurate session summary stats with zero-safe accuracy', () => {
      const history = [
        {
          round: 1,
          level: 1,
          sequenceLength: 3,
          targetSequence: '123',
          submittedSequence: '123',
          isCorrect: true,
          matchedDigitsCount: 3,
          recallDurationMs: 2000,
          roundScore: 500,
        },
        {
          round: 2,
          level: 2,
          sequenceLength: 4,
          targetSequence: '4567',
          submittedSequence: '4599',
          isCorrect: false,
          matchedDigitsCount: 2,
          recallDurationMs: 3000,
          roundScore: 50,
        },
      ];

      const stats = computeNumberRecallSessionStats(history, 10, Date.now() - 6000);
      expect(stats.finalScore).toBe(550);
      expect(stats.roundsCompleted).toBe(2);
      expect(stats.totalRounds).toBe(10);
      expect(stats.highestLevel).toBe(2);
      expect(stats.maxDigitSpan).toBe(3); // Round 1 was correct with length 3
      expect(stats.perfectRounds).toBe(1);
      // Accuracy: (3 + 2) / (3 + 4) = 5 / 7 = 71%
      expect(stats.accuracyPercentage).toBe(71);

      // Empty history handling
      const emptyStats = computeNumberRecallSessionStats([], 10, 0);
      expect(emptyStats.accuracyPercentage).toBe(0);
      expect(emptyStats.finalScore).toBe(0);
    });
  });

  describe('Number Recall Reducer & State Machine', () => {
    it('initializes clean default state', () => {
      const state = createInitialNumberRecallState(1);
      expect(state.phase).toBe('countdown');
      expect(state.currentRound).toBe(1);
      expect(state.totalRounds).toBe(TOTAL_SESSION_ROUNDS);
      expect(state.currentLevel).toBe(1);
      expect(state.strikesRemaining).toBe(MAX_STRIKES);
      expect(state.score).toBe(0);
      expect(state.inputSequence).toBe('');
      expect(state.targetSequence).toBe('');
    });

    it('handles countdown to display transition', () => {
      let state = createInitialNumberRecallState(1);
      state = numberRecallReducer(state, {
        type: 'START_DISPLAY',
        targetSequence: '059',
        displayDurationMs: 2400,
        timestamp: 1000,
      });

      expect(state.phase).toBe('display');
      expect(state.targetSequence).toBe('059');
      expect(state.displayDurationMs).toBe(2400);

      // Interactions outside recall phase must be ignored
      const ignoredAppend = numberRecallReducer(state, { type: 'APPEND_DIGIT', digit: '5' });
      expect(ignoredAppend.inputSequence).toBe('');

      const ignoredSubmit = numberRecallReducer(state, { type: 'SUBMIT_ANSWER' });
      expect(ignoredSubmit.phase).toBe('display');
    });

    it('transitions to recall and accepts keypad inputs with length constraint', () => {
      let state = createInitialNumberRecallState(1);
      state = numberRecallReducer(state, {
        type: 'START_DISPLAY',
        targetSequence: '048',
        displayDurationMs: 2400,
      });
      state = numberRecallReducer(state, { type: 'START_RECALL', timestamp: 3400 });

      expect(state.phase).toBe('recall');
      expect(state.recallStartTime).toBe(3400);

      // Type '0' (leading zero)
      state = numberRecallReducer(state, { type: 'APPEND_DIGIT', digit: '0' });
      expect(state.inputSequence).toBe('0');

      // Type '4'
      state = numberRecallReducer(state, { type: 'APPEND_DIGIT', digit: '4' });
      expect(state.inputSequence).toBe('04');

      // Backspace / Delete
      state = numberRecallReducer(state, { type: 'DELETE_DIGIT' });
      expect(state.inputSequence).toBe('0');

      // Re-enter '4' and '8'
      state = numberRecallReducer(state, { type: 'APPEND_DIGIT', digit: '4' });
      state = numberRecallReducer(state, { type: 'APPEND_DIGIT', digit: '8' });
      expect(state.inputSequence).toBe('048');

      // Attempting to type beyond target sequence length must be blocked
      state = numberRecallReducer(state, { type: 'APPEND_DIGIT', digit: '9' });
      expect(state.inputSequence).toBe('048');

      // Clear input
      state = numberRecallReducer(state, { type: 'CLEAR_INPUT' });
      expect(state.inputSequence).toBe('');

      // Non-digit input ignored
      state = numberRecallReducer(state, { type: 'APPEND_DIGIT', digit: 'a' });
      expect(state.inputSequence).toBe('');
    });

    it('evaluates correct answer on submission and prevents duplicate scoring', () => {
      let state = createInitialNumberRecallState(1);
      state = numberRecallReducer(state, {
        type: 'START_DISPLAY',
        targetSequence: '719',
        displayDurationMs: 2400,
        timestamp: 1000,
      });
      state = numberRecallReducer(state, { type: 'START_RECALL', timestamp: 3400 });
      state = numberRecallReducer(state, { type: 'APPEND_DIGIT', digit: '7' });
      state = numberRecallReducer(state, { type: 'APPEND_DIGIT', digit: '1' });
      state = numberRecallReducer(state, { type: 'APPEND_DIGIT', digit: '9' });

      // First submit
      state = numberRecallReducer(state, { type: 'SUBMIT_ANSWER', timestamp: 4400 });
      expect(state.phase).toBe('round-feedback');
      expect(state.score).toBeGreaterThan(0);
      expect(state.strikesRemaining).toBe(MAX_STRIKES);
      expect(state.roundHistory).toHaveLength(1);
      expect(state.roundHistory[0].isCorrect).toBe(true);

      const scoreAfterFirstSubmit = state.score;

      // Duplicate submission while in feedback must be blocked!
      state = numberRecallReducer(state, { type: 'SUBMIT_ANSWER', timestamp: 4500 });
      expect(state.score).toBe(scoreAfterFirstSubmit);
      expect(state.roundHistory).toHaveLength(1);
    });

    it('deducts strike and handles round failure on incorrect submission', () => {
      let state = createInitialNumberRecallState(1);
      state = numberRecallReducer(state, {
        type: 'START_DISPLAY',
        targetSequence: '520',
        displayDurationMs: 2400,
        timestamp: 1000,
      });
      state = numberRecallReducer(state, { type: 'START_RECALL', timestamp: 3400 });
      state = numberRecallReducer(state, { type: 'APPEND_DIGIT', digit: '9' });
      state = numberRecallReducer(state, { type: 'APPEND_DIGIT', digit: '9' });
      state = numberRecallReducer(state, { type: 'APPEND_DIGIT', digit: '9' });

      state = numberRecallReducer(state, { type: 'SUBMIT_ANSWER', timestamp: 5000 });
      expect(state.phase).toBe('round-feedback');
      expect(state.strikesRemaining).toBe(MAX_STRIKES - 1);
      expect(state.roundHistory[0].isCorrect).toBe(false);
      expect(state.consecutiveCorrectRounds).toBe(0);
    });

    it('transitions to game-over when all strikes are exhausted', () => {
      let state = createInitialNumberRecallState(1);
      state = { ...state, strikesRemaining: 1 };

      state = numberRecallReducer(state, {
        type: 'START_DISPLAY',
        targetSequence: '123',
        displayDurationMs: 2400,
      });
      state = numberRecallReducer(state, { type: 'START_RECALL' });
      state = numberRecallReducer(state, { type: 'APPEND_DIGIT', digit: '9' });
      state = numberRecallReducer(state, { type: 'SUBMIT_ANSWER' });

      expect(state.strikesRemaining).toBe(0);
      expect(state.phase).toBe('round-feedback');

      // End feedback -> game-over!
      state = numberRecallReducer(state, { type: 'END_ROUND_FEEDBACK' });
      expect(state.phase).toBe('game-over');
      expect(state.sessionStats).not.toBeNull();
      expect(state.sessionStats?.gameId).toBe('number-recall');
    });

    it('transitions to completed when all 10 rounds are finished', () => {
      let state = createInitialNumberRecallState(1);
      state = {
        ...state,
        currentRound: TOTAL_SESSION_ROUNDS,
        phase: 'round-feedback',
        roundHistory: [
          {
            round: TOTAL_SESSION_ROUNDS,
            level: 1,
            sequenceLength: 3,
            targetSequence: '123',
            submittedSequence: '123',
            isCorrect: true,
            matchedDigitsCount: 3,
            recallDurationMs: 2000,
            roundScore: 500,
          },
        ],
      };

      state = numberRecallReducer(state, { type: 'END_ROUND_FEEDBACK' });
      expect(state.phase).toBe('completed');
      expect(state.sessionStats).not.toBeNull();
    });

    it('preserves speed bonus across pause and resume during recall phase', () => {
      let state = createInitialNumberRecallState(1);
      state = numberRecallReducer(state, {
        type: 'START_DISPLAY',
        targetSequence: '123',
        displayDurationMs: 2400,
        timestamp: 1000,
      });
      state = numberRecallReducer(state, { type: 'START_RECALL', timestamp: 3400 });

      // Player pauses at T=4400 (1000ms into recall)
      state = numberRecallReducer(state, { type: 'PAUSE_GAME', timestamp: 4400 });
      expect(state.phase).toBe('paused');
      expect(state.pausedAt).toBe(4400);

      // Player resumes at T=14400 (10000ms pause)
      state = numberRecallReducer(state, { type: 'RESUME_GAME', timestamp: 14400 });
      expect(state.phase).toBe('recall');
      expect(state.pausedAt).toBeNull();
      // recallStartTime shifted forward by 10000ms: 3400 + 10000 = 13400
      expect(state.recallStartTime).toBe(13400);

      // Player enters answer and submits at T=15400 (1000ms after resume; 2000ms total active recall)
      state = numberRecallReducer(state, { type: 'APPEND_DIGIT', digit: '1' });
      state = numberRecallReducer(state, { type: 'APPEND_DIGIT', digit: '2' });
      state = numberRecallReducer(state, { type: 'APPEND_DIGIT', digit: '3' });
      state = numberRecallReducer(state, { type: 'SUBMIT_ANSWER', timestamp: 15400 });

      // Active recall duration must be 2000ms, NOT 12000ms!
      expect(state.roundHistory[0].recallDurationMs).toBe(2000);
      expect(state.roundHistory[0].isCorrect).toBe(true);
      expect(state.roundHistory[0].roundScore).toBeGreaterThan(0);
    });

    it('handles pause during countdown, display, and feedback safely', () => {
      // Pause during countdown
      let state = createInitialNumberRecallState(1);
      state = numberRecallReducer(state, { type: 'PAUSE_GAME', timestamp: 1000 });
      expect(state.phase).toBe('paused');
      state = numberRecallReducer(state, { type: 'RESUME_GAME', timestamp: 2000 });
      expect(state.phase).toBe('countdown');

      // Pause during display
      state = numberRecallReducer(state, {
        type: 'START_DISPLAY',
        targetSequence: '567',
        displayDurationMs: 2400,
        timestamp: 3000,
      });
      state = numberRecallReducer(state, { type: 'PAUSE_GAME', timestamp: 4000 });
      expect(state.phase).toBe('paused');
      state = numberRecallReducer(state, { type: 'RESUME_GAME', timestamp: 6000 });
      expect(state.phase).toBe('display');
    });

    it('restarts session cleanly to countdown phase', () => {
      let state = createInitialNumberRecallState(1);
      state = { ...state, currentRound: 5, score: 2000, strikesRemaining: 1 };
      state = numberRecallReducer(state, { type: 'RESTART_GAME', timestamp: 8000 });

      expect(state.phase).toBe('countdown');
      expect(state.currentRound).toBe(1);
      expect(state.score).toBe(0);
      expect(state.strikesRemaining).toBe(MAX_STRIKES);
    });
  });

  describe('Localization Completeness', () => {
    it('verifies all numberRecall localization keys are present and non-empty in English and Malayalam', () => {
      expect(en.numberRecall).toBeDefined();
      expect(ml.numberRecall).toBeDefined();

      const enKeys = Object.keys(en.numberRecall).sort();
      const mlKeys = Object.keys(ml.numberRecall).sort();
      expect(enKeys).toEqual(mlKeys);

      enKeys.forEach((key) => {
        const enVal = (en.numberRecall as Record<string, string>)[key];
        const mlVal = (ml.numberRecall as Record<string, string>)[key];
        expect(typeof enVal).toBe('string');
        expect(enVal.length).toBeGreaterThan(0);
        expect(typeof mlVal).toBe('string');
        expect(mlVal.length).toBeGreaterThan(0);
      });
    });
  });
});
