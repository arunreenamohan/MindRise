import {
  generatePattern,
  getLevelConfig,
  computeNextLevel,
  calculateRoundScore,
  computeSessionStats,
  createInitialGameState,
  matrixReducer,
  MIN_LEVEL,
  MAX_LEVEL,
  TOTAL_SESSION_ROUNDS,
  MAX_STRIKES,
} from '../src/games/memory-matrix';

describe('Memory Matrix — Pure Game Engine', () => {
  describe('Pattern Generator', () => {
    it('returns unique valid cell indices within grid bounds', () => {
      const totalCells = 16; // 4x4
      const targetCount = 5;
      const pattern = generatePattern({ totalCells, targetCount });

      expect(pattern).toHaveLength(targetCount);
      const unique = new Set(pattern);
      expect(unique.size).toBe(targetCount);

      pattern.forEach((idx) => {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(totalCells);
        expect(Number.isInteger(idx)).toBe(true);
      });
    });

    it('rejects invalid grid dimensions', () => {
      expect(() => generatePattern({ totalCells: 0, targetCount: 1 })).toThrow(
        /Invalid totalCells/
      );
      expect(() => generatePattern({ totalCells: 3, targetCount: 1 })).toThrow(
        /Invalid totalCells/
      );
      expect(() => generatePattern({ totalCells: 2.5, targetCount: 1 })).toThrow(
        /Invalid totalCells/
      );
    });

    it('rejects targetCount that exceeds available cells or is non-positive', () => {
      expect(() => generatePattern({ totalCells: 9, targetCount: 0 })).toThrow(
        /Invalid targetCount/
      );
      expect(() => generatePattern({ totalCells: 9, targetCount: -2 })).toThrow(
        /Invalid targetCount/
      );
      expect(() => generatePattern({ totalCells: 9, targetCount: 10 })).toThrow(
        /cannot exceed total available cells/
      );
    });

    it('produces deterministic output with injected pseudo-RNG', () => {
      // Deterministic pseudo-RNG returning constant values
      let callCount = 0;
      const mockRng = () => {
        callCount++;
        return 0; // always picks the first remaining item
      };

      const result = generatePattern({ totalCells: 9, targetCount: 3, rng: mockRng });
      expect(result).toEqual([0, 1, 2]);
      expect(callCount).toBe(3);
    });
  });

  describe('Difficulty Progression Curve', () => {
    it('provides valid LevelConfig for all documented levels 1 to 12', () => {
      for (let lvl = MIN_LEVEL; lvl <= MAX_LEVEL; lvl++) {
        const config = getLevelConfig(lvl);
        expect(config.level).toBe(lvl);
        expect([3, 4, 5, 6]).toContain(config.gridSize);
        expect(config.targetCount).toBeGreaterThanOrEqual(3);
        expect(config.targetCount).toBeLessThan(config.gridSize * config.gridSize);
        expect(config.previewDurationMs).toBeGreaterThanOrEqual(2000);
      }
    });

    it('clamps levels below MIN_LEVEL and above MAX_LEVEL', () => {
      expect(getLevelConfig(0).level).toBe(MIN_LEVEL);
      expect(getLevelConfig(-5).level).toBe(MIN_LEVEL);
      expect(getLevelConfig(15).level).toBe(MAX_LEVEL);
      expect(getLevelConfig(99).level).toBe(MAX_LEVEL);
    });

    it('advances level on perfect round and reduces on non-perfect round', () => {
      expect(computeNextLevel(1, true)).toBe(2);
      expect(computeNextLevel(5, true)).toBe(6);
      expect(computeNextLevel(MAX_LEVEL, true)).toBe(MAX_LEVEL); // capped

      expect(computeNextLevel(5, false)).toBe(4);
      expect(computeNextLevel(MIN_LEVEL, false)).toBe(MIN_LEVEL); // minimum clamped
    });
  });

  describe('Scoring Engine', () => {
    it('calculates deterministic round score for a clean, fast round', () => {
      const result = calculateRoundScore({
        level: 3,
        correctCount: 4,
        mistakesCount: 0,
        recallDurationMs: 2000,
        consecutivePerfectRounds: 1,
      });

      // Base: 4 * 100 * 3 = 1200
      // Perfect bonus: 250 * 3 = 750
      // Speed bonus: ((6000 - 2000) / 100) * 3 = 40 * 3 = 120
      // Penalty: 0
      // Total: 1200 + 750 + 120 = 2070
      expect(result.isPerfect).toBe(true);
      expect(result.basePoints).toBe(1200);
      expect(result.perfectBonus).toBe(750);
      expect(result.speedBonus).toBe(120);
      expect(result.penalty).toBe(0);
      expect(result.roundScore).toBe(2070);
    });

    it('applies penalty for mistakes and awards no speed/perfect bonus', () => {
      const result = calculateRoundScore({
        level: 2,
        correctCount: 3,
        mistakesCount: 1,
        recallDurationMs: 1500,
        consecutivePerfectRounds: 0,
      });

      // Base: 3 * 100 * 2 = 600
      // Perfect bonus: 0
      // Speed bonus: 0 (not perfect)
      // Penalty: 1 * 50 * 2 = 100
      // Total: 600 - 100 = 500
      expect(result.isPerfect).toBe(false);
      expect(result.perfectBonus).toBe(0);
      expect(result.speedBonus).toBe(0);
      expect(result.penalty).toBe(100);
      expect(result.roundScore).toBe(500);
    });

    it('never allows round score to be negative', () => {
      const result = calculateRoundScore({
        level: 1,
        correctCount: 0,
        mistakesCount: 5,
        recallDurationMs: 8000,
        consecutivePerfectRounds: 0,
      });

      expect(result.roundScore).toBe(0);
    });

    it('applies streak multiplier for consecutive perfect rounds', () => {
      const streak1 = calculateRoundScore({
        level: 1,
        correctCount: 3,
        mistakesCount: 0,
        recallDurationMs: 6000,
        consecutivePerfectRounds: 1,
      });
      const streak2 = calculateRoundScore({
        level: 1,
        correctCount: 3,
        mistakesCount: 0,
        recallDurationMs: 6000,
        consecutivePerfectRounds: 2,
      });
      const streak3 = calculateRoundScore({
        level: 1,
        correctCount: 3,
        mistakesCount: 0,
        recallDurationMs: 6000,
        consecutivePerfectRounds: 3,
      });

      // Raw for level 1, 3 targets, 0 speed: 300 + 250 = 550
      expect(streak1.roundScore).toBe(550); // 1.0x
      expect(streak2.roundScore).toBe(Math.round(550 * 1.25)); // 688
      expect(streak3.roundScore).toBe(Math.round(550 * 1.5)); // 825
    });

    it('computes accurate session summary stats', () => {
      const history = [
        {
          round: 1,
          level: 1,
          gridSize: 3,
          targetCount: 3,
          correctCount: 3,
          mistakesCount: 0,
          recallDurationMs: 2000,
          roundScore: 500,
          isPerfect: true,
        },
        {
          round: 2,
          level: 2,
          gridSize: 3,
          targetCount: 4,
          correctCount: 3,
          mistakesCount: 1,
          recallDurationMs: 3000,
          roundScore: 400,
          isPerfect: false,
        },
      ];

      const stats = computeSessionStats(history, 10, Date.now() - 5000);
      expect(stats.finalScore).toBe(900);
      expect(stats.roundsCompleted).toBe(2);
      expect(stats.totalRounds).toBe(10);
      expect(stats.highestLevel).toBe(2);
      expect(stats.perfectRounds).toBe(1);
      // Accuracy: (3 + 3) / (3 + 3 + 1) = 6 / 7 = 86%
      expect(stats.accuracyPercentage).toBe(86);
    });
  });

  describe('Matrix Reducer & Lifecycle State Machine', () => {
    it('initializes clean default state', () => {
      const state = createInitialGameState(1);
      expect(state.phase).toBe('countdown');
      expect(state.currentRound).toBe(1);
      expect(state.totalRounds).toBe(TOTAL_SESSION_ROUNDS);
      expect(state.currentLevel).toBe(1);
      expect(state.strikesRemaining).toBe(MAX_STRIKES);
      expect(state.score).toBe(0);
      expect(state.selectedIndices).toHaveLength(0);
      expect(state.mistakeIndices).toHaveLength(0);
    });

    it('transitions from preview to recall safely', () => {
      let state = createInitialGameState(1);
      state = matrixReducer(state, {
        type: 'START_PREVIEW',
        targetIndices: [1, 4, 7],
        previewDurationMs: 2500,
        timestamp: 1000,
      });

      expect(state.phase).toBe('preview');
      expect(state.targetIndices).toEqual([1, 4, 7]);

      // Tapping during preview phase MUST be ignored
      const tappedDuringPreview = matrixReducer(state, { type: 'TAP_TILE', tileIndex: 1 });
      expect(tappedDuringPreview.selectedIndices).toHaveLength(0);

      // Start recall phase
      state = matrixReducer(state, { type: 'START_RECALL', timestamp: 3500 });
      expect(state.phase).toBe('recall');
      expect(state.recallStartTime).toBe(3500);
    });

    it('handles correct tile taps and advances to round-feedback when all targets found', () => {
      let state = createInitialGameState(1);
      state = matrixReducer(state, {
        type: 'START_PREVIEW',
        targetIndices: [2, 5],
        previewDurationMs: 2000,
      });
      state = matrixReducer(state, { type: 'START_RECALL', timestamp: 2000 });

      // Tap first target
      state = matrixReducer(state, { type: 'TAP_TILE', tileIndex: 2, timestamp: 2500 });
      expect(state.selectedIndices).toEqual([2]);
      expect(state.phase).toBe('recall');

      // Duplicate tap on same tile MUST be ignored
      state = matrixReducer(state, { type: 'TAP_TILE', tileIndex: 2, timestamp: 2600 });
      expect(state.selectedIndices).toEqual([2]);

      // Tap second target -> round complete!
      state = matrixReducer(state, { type: 'TAP_TILE', tileIndex: 5, timestamp: 3000 });
      expect(state.selectedIndices).toEqual([2, 5]);
      expect(state.phase).toBe('round-feedback');
      expect(state.roundScore).toBeGreaterThan(0);
      expect(state.roundHistory).toHaveLength(1);
      expect(state.roundHistory[0].isPerfect).toBe(true);
    });

    it('handles mistakes, deducts strikes, and ends round if max mistakes reached', () => {
      let state = createInitialGameState(1);
      state = matrixReducer(state, {
        type: 'START_PREVIEW',
        targetIndices: [0, 1, 2],
        previewDurationMs: 2000,
      });
      state = matrixReducer(state, { type: 'START_RECALL', timestamp: 2000 });

      // First mistake
      state = matrixReducer(state, { type: 'TAP_TILE', tileIndex: 4, timestamp: 2500 });
      expect(state.mistakeIndices).toEqual([4]);
      expect(state.strikesRemaining).toBe(MAX_STRIKES - 1);
      expect(state.phase).toBe('recall'); // round continues

      // Duplicate tap on already-tapped mistake tile MUST be ignored
      state = matrixReducer(state, { type: 'TAP_TILE', tileIndex: 4, timestamp: 2600 });
      expect(state.mistakeIndices).toEqual([4]);
      expect(state.strikesRemaining).toBe(MAX_STRIKES - 1);

      // Second mistake -> round failed!
      state = matrixReducer(state, { type: 'TAP_TILE', tileIndex: 5, timestamp: 3000 });
      expect(state.mistakeIndices).toEqual([4, 5]);
      expect(state.phase).toBe('round-feedback');
      expect(state.roundHistory).toHaveLength(1);
      expect(state.roundHistory[0].isPerfect).toBe(false);
    });

    it('transitions to game-over when player runs out of strikes', () => {
      let state = createInitialGameState(1);
      // Manually set strikes to 1
      state = { ...state, strikesRemaining: 1 };
      state = matrixReducer(state, {
        type: 'START_PREVIEW',
        targetIndices: [0, 1],
        previewDurationMs: 2000,
      });
      state = matrixReducer(state, { type: 'START_RECALL' });

      // Tap wrong tile -> 0 strikes remaining!
      state = matrixReducer(state, { type: 'TAP_TILE', tileIndex: 8 });
      expect(state.strikesRemaining).toBe(0);
      expect(state.phase).toBe('round-feedback');

      // End round feedback -> game-over!
      state = matrixReducer(state, { type: 'END_ROUND_FEEDBACK' });
      expect(state.phase).toBe('game-over');
      expect(state.sessionStats).not.toBeNull();
      expect(state.sessionStats?.gameId).toBe('memory-matrix');
    });

    it('transitions to completed when all 10 rounds are finished', () => {
      let state = createInitialGameState(1);
      state = {
        ...state,
        currentRound: TOTAL_SESSION_ROUNDS,
        phase: 'round-feedback',
        roundHistory: [
          {
            round: TOTAL_SESSION_ROUNDS,
            level: 1,
            gridSize: 3,
            targetCount: 3,
            correctCount: 3,
            mistakesCount: 0,
            recallDurationMs: 2000,
            roundScore: 500,
            isPerfect: true,
          },
        ],
      };

      state = matrixReducer(state, { type: 'END_ROUND_FEEDBACK' });
      expect(state.phase).toBe('completed');
      expect(state.sessionStats).not.toBeNull();
      expect(state.sessionStats?.roundsCompleted).toBe(1);
    });

    it('supports pause, resume, and restart safely', () => {
      let state = createInitialGameState(1);
      state = matrixReducer(state, {
        type: 'START_PREVIEW',
        targetIndices: [1, 2],
        previewDurationMs: 2000,
      });
      state = matrixReducer(state, { type: 'START_RECALL' });

      // Pause
      state = matrixReducer(state, { type: 'PAUSE_GAME' });
      expect(state.phase).toBe('paused');
      expect(state.previousPhase).toBe('recall');

      // Taps during pause are ignored
      const tapPaused = matrixReducer(state, { type: 'TAP_TILE', tileIndex: 1 });
      expect(tapPaused.selectedIndices).toHaveLength(0);

      // Resume
      state = matrixReducer(state, { type: 'RESUME_GAME' });
      expect(state.phase).toBe('recall');
      expect(state.previousPhase).toBeNull();

      // Restart resets to countdown phase with full lives and 0 score
      state = matrixReducer(state, { type: 'RESTART_GAME', timestamp: 5000 });
      expect(state.phase).toBe('countdown');
      expect(state.currentRound).toBe(1);
      expect(state.score).toBe(0);
      expect(state.strikesRemaining).toBe(MAX_STRIKES);
    });

    it('supports pausing and resuming during countdown and round-feedback phases', () => {
      // 1. Pause during countdown
      let state = createInitialGameState(1);
      expect(state.phase).toBe('countdown');

      state = matrixReducer(state, { type: 'PAUSE_GAME', timestamp: 1000 });
      expect(state.phase).toBe('paused');
      expect(state.previousPhase).toBe('countdown');

      state = matrixReducer(state, { type: 'RESUME_GAME', timestamp: 2000 });
      expect(state.phase).toBe('countdown');
      expect(state.previousPhase).toBeNull();

      // 2. Pause during round-feedback
      state = matrixReducer(state, {
        type: 'START_PREVIEW',
        targetIndices: [0, 1],
        previewDurationMs: 2000,
        timestamp: 2500,
      });
      state = matrixReducer(state, { type: 'START_RECALL', timestamp: 4500 });
      state = matrixReducer(state, { type: 'TAP_TILE', tileIndex: 0, timestamp: 5000 });
      state = matrixReducer(state, { type: 'TAP_TILE', tileIndex: 1, timestamp: 5500 });
      expect(state.phase).toBe('round-feedback');

      state = matrixReducer(state, { type: 'PAUSE_GAME', timestamp: 5600 });
      expect(state.phase).toBe('paused');
      expect(state.previousPhase).toBe('round-feedback');

      state = matrixReducer(state, { type: 'RESUME_GAME', timestamp: 8000 });
      expect(state.phase).toBe('round-feedback');
      expect(state.previousPhase).toBeNull();
    });

    it('preserves speed bonus by excluding paused duration during recall', () => {
      let state = createInitialGameState(1);
      state = matrixReducer(state, {
        type: 'START_PREVIEW',
        targetIndices: [0],
        previewDurationMs: 2000,
        timestamp: 1000,
      });
      // Recall starts at T=3000
      state = matrixReducer(state, { type: 'START_RECALL', timestamp: 3000 });

      // Player pauses at T=4000 (1 second into recall)
      state = matrixReducer(state, { type: 'PAUSE_GAME', timestamp: 4000 });
      expect(state.phase).toBe('paused');
      expect(state.pausedAt).toBe(4000);

      // Player stays paused for 10 seconds (until T=14000)
      state = matrixReducer(state, { type: 'RESUME_GAME', timestamp: 14000 });
      expect(state.phase).toBe('recall');
      expect(state.pausedAt).toBeNull();
      // recallStartTime should have shifted forward from 3000 to 13000 (by 10000ms pause)
      expect(state.recallStartTime).toBe(13000);

      // Player taps target at T=15000 (1s after resume; 2s total active recall time)
      state = matrixReducer(state, { type: 'TAP_TILE', tileIndex: 0, timestamp: 15000 });
      expect(state.phase).toBe('round-feedback');

      // Recall duration should be 2000ms (15000 - 13000), NOT 12000ms!
      const lastRound = state.roundHistory[0];
      expect(lastRound.recallDurationMs).toBe(2000);
      expect(lastRound.isPerfect).toBe(true);

      // Under 6000ms limit, speed bonus is awarded!
      // Base (100) + Perfect (250) + Speed (floor((6000-2000)/100)=40) = 390
      expect(lastRound.roundScore).toBe(390);
    });

    it('initializes sessionStartTime on START_PREVIEW and tracks accurate session duration', () => {
      let state = createInitialGameState(1);
      expect(state.sessionStartTime).toBe(0);

      state = matrixReducer(state, {
        type: 'START_PREVIEW',
        targetIndices: [0],
        previewDurationMs: 2000,
        timestamp: 5000,
      });
      expect(state.sessionStartTime).toBe(5000);

      state = matrixReducer(state, { type: 'START_RECALL', timestamp: 7000 });
      state = matrixReducer(state, { type: 'TAP_TILE', tileIndex: 0, timestamp: 8000 });

      // End round feedback at T=25000 (total duration = 20000ms)
      state = { ...state, currentRound: TOTAL_SESSION_ROUNDS };
      state = matrixReducer(state, { type: 'END_ROUND_FEEDBACK', timestamp: 25000 });

      expect(state.phase).toBe('completed');
      expect(state.sessionStats).not.toBeNull();
      expect(state.sessionStats?.totalDurationMs).toBe(20000);
    });

    it('handles abnormal difficulty inputs gracefully', () => {
      expect(computeNextLevel(NaN, true)).toBe(2);
      expect(computeNextLevel(99, true)).toBe(MAX_LEVEL);
      expect(computeNextLevel(-10, false)).toBe(MIN_LEVEL);
      expect(computeNextLevel(MAX_LEVEL, true)).toBe(MAX_LEVEL);
      expect(computeNextLevel(MIN_LEVEL, false)).toBe(MIN_LEVEL);
    });
  });
});
