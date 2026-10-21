import {
  PATTERN_QUESTION_BANK,
  validateQuestionBank,
  selectSessionQuestions,
  calculatePatternScore,
  calculatePatternMasterSessionStats,
  createInitialPatternMasterState,
  patternMasterReducer,
  PATTERN_MASTER_TIME_LIMIT_MS,
  PatternCategory,
  PatternQuestion,
  PatternQuestionResult,
} from '../src/games/pattern-master';

// Simple deterministic Mulberry32 PRNG for reproducible tests
function createSeededPrng(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('Pattern Master Engine & Question Bank', () => {
  describe('Question Bank Validation & Integrity', () => {
    it('contains at least 24 validated questions', () => {
      expect(PATTERN_QUESTION_BANK.length).toBeGreaterThanOrEqual(24);
      expect(validateQuestionBank(PATTERN_QUESTION_BANK)).toBe(true);
    });

    it('covers all three pattern categories: visual-pattern, number-sequence, and missing-tile', () => {
      const categories = new Set<PatternCategory>(PATTERN_QUESTION_BANK.map((q) => q.category));
      expect(categories.has('visual-pattern')).toBe(true);
      expect(categories.has('number-sequence')).toBe(true);
      expect(categories.has('missing-tile')).toBe(true);
      expect(categories.size).toBe(3);
    });

    it('distributes questions across difficulty levels 1 through 6', () => {
      const levels = new Set(PATTERN_QUESTION_BANK.map((q) => q.difficulty));
      for (let lvl = 1; lvl <= 6; lvl++) {
        expect(levels.has(lvl)).toBe(true);
      }
    });

    it('enforces unique question IDs across the entire bank', () => {
      const ids = PATTERN_QUESTION_BANK.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('guarantees each question has 4 unique selectable options (no duplicate choices)', () => {
      PATTERN_QUESTION_BANK.forEach((q) => {
        expect(q.options).toHaveLength(4);
        const uniqueEn = new Set(q.options.map((opt) => opt.trim()));
        expect(uniqueEn.size).toBe(4);

        expect(q.optionsMl).toHaveLength(4);
        const uniqueMl = new Set(q.optionsMl.map((opt) => opt.trim()));
        expect(uniqueMl.size).toBe(4);
      });
    });

    it('ensures each question has exactly one valid correctIndex (0 to 3)', () => {
      PATTERN_QUESTION_BANK.forEach((q) => {
        expect(Number.isInteger(q.correctIndex)).toBe(true);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThanOrEqual(3);
      });
    });

    it('provides clear bilingual titles, prompts, and explanations for every puzzle', () => {
      PATTERN_QUESTION_BANK.forEach((q) => {
        expect(q.title.trim().length).toBeGreaterThan(3);
        expect(q.titleMl.trim().length).toBeGreaterThan(3);
        expect(q.prompt.trim().length).toBeGreaterThan(5);
        expect(q.promptMl.trim().length).toBeGreaterThan(5);
        expect(q.explanation.trim().length).toBeGreaterThan(10);
        expect(q.explanationMl.trim().length).toBeGreaterThan(10);
      });
    });

    it('validates structural representation for missing-tile matrices', () => {
      const matrixQuestions = PATTERN_QUESTION_BANK.filter((q) => q.category === 'missing-tile');
      expect(matrixQuestions.length).toBeGreaterThanOrEqual(6);
      matrixQuestions.forEach((q) => {
        expect(q.gridMatrix).toBeDefined();
        expect(q.gridMatrix!.length).toBeGreaterThanOrEqual(2);
        q.gridMatrix!.forEach((row) => {
          expect(row.length).toBeGreaterThanOrEqual(2);
        });
      });
    });

    it('rejects question bank with invalid correctIndex or duplicate options', () => {
      const badIndexQuestion: PatternQuestion = {
        id: 'bad-1',
        category: 'visual-pattern',
        difficulty: 1,
        title: 'Bad Title',
        titleMl: 'ബാഡ് ശീർഷകം',
        prompt: 'Bad index test',
        promptMl: 'ബാഡ് ടെസ്റ്റ്',
        options: ['A', 'B', 'C', 'D'],
        optionsMl: ['എ', 'ബി', 'സി', 'ഡി'],
        correctIndex: 4, // invalid index
        explanation: 'Test explanation here',
        explanationMl: 'ടെസ്റ്റ് വിവരണം ഇവിടെ',
      };
      expect(validateQuestionBank([badIndexQuestion])).toBe(false);
      expect(() => validateQuestionBank([badIndexQuestion], true)).toThrow('correctIndex');

      const dupOptionsQuestion: PatternQuestion = {
        id: 'bad-2',
        category: 'number-sequence',
        difficulty: 1,
        title: 'Dup Title',
        titleMl: 'ഡ്യൂപ് ശീർഷകം',
        prompt: 'Duplicate option test',
        promptMl: 'ഡ്യൂപ്ലിക്കേറ്റ് ടെസ്റ്റ്',
        options: ['A', 'A', 'C', 'D'], // duplicate
        optionsMl: ['എ', 'ബി', 'സി', 'ഡി'],
        correctIndex: 0,
        explanation: 'Test explanation here',
        explanationMl: 'ടെസ്റ്റ് വിവരണം ഇവിടെ',
      };
      expect(validateQuestionBank([dupOptionsQuestion])).toBe(false);
      expect(() => validateQuestionBank([dupOptionsQuestion], true)).toThrow('duplicate options');
    });
  });

  describe('selectSessionQuestions', () => {
    it('selects exactly 10 questions sorted monotonically by difficulty', () => {
      const prng = createSeededPrng(42);
      const selected = selectSessionQuestions(PATTERN_QUESTION_BANK, 10, prng);
      expect(selected).toHaveLength(10);

      for (let i = 0; i < selected.length - 1; i++) {
        expect(selected[i].difficulty).toBeLessThanOrEqual(selected[i + 1].difficulty);
      }
    });

    it('includes all three categories in the selected session', () => {
      const prng = createSeededPrng(99);
      const selected = selectSessionQuestions(PATTERN_QUESTION_BANK, 10, prng);
      const categories = new Set<PatternCategory>(selected.map((q) => q.category));
      expect(categories.has('visual-pattern')).toBe(true);
      expect(categories.has('number-sequence')).toBe(true);
      expect(categories.has('missing-tile')).toBe(true);
    });

    it('produces deterministic selection given the same PRNG seed', () => {
      const run1 = selectSessionQuestions(PATTERN_QUESTION_BANK, 10, createSeededPrng(12345));
      const run2 = selectSessionQuestions(PATTERN_QUESTION_BANK, 10, createSeededPrng(12345));
      expect(run1.map((q) => q.id)).toEqual(run2.map((q) => q.id));
    });

    it('handles count requests larger than question bank gracefully', () => {
      const all = selectSessionQuestions(PATTERN_QUESTION_BANK, 50);
      expect(all.length).toBe(PATTERN_QUESTION_BANK.length);
    });
  });

  describe('calculatePatternScore', () => {
    it('verifies standard time limit is 20 seconds', () => {
      expect(PATTERN_MASTER_TIME_LIMIT_MS).toBe(20000);
    });

    it('computes correct base score scaled by difficulty', () => {
      // timeSpentMs = timeLimitMs (no speed bonus), streak = 0
      const scoreDiff1 = calculatePatternScore(1, true, PATTERN_MASTER_TIME_LIMIT_MS, PATTERN_MASTER_TIME_LIMIT_MS, 0);
      expect(scoreDiff1).toBe(200);

      const scoreDiff3 = calculatePatternScore(3, true, PATTERN_MASTER_TIME_LIMIT_MS, PATTERN_MASTER_TIME_LIMIT_MS, 0);
      expect(scoreDiff3).toBe(600);

      const scoreDiff6 = calculatePatternScore(6, true, PATTERN_MASTER_TIME_LIMIT_MS, PATTERN_MASTER_TIME_LIMIT_MS, 0);
      expect(scoreDiff6).toBe(1200);
    });

    it('rewards faster answers with speed bonus', () => {
      // Difficulty 2 base = 400. Speed ratio at 5000ms out of 20000ms = 0.75.
      // Speed bonus = 0.75 * 100 * 2 = 150.
      const fastScore = calculatePatternScore(2, true, 5000, 20000, 0);
      expect(fastScore).toBe(400 + 150);

      const slowScore = calculatePatternScore(2, true, 19000, 20000, 0);
      expect(fastScore).toBeGreaterThan(slowScore);
    });

    it('rewards streak bonus when consecutiveCorrect >= 2', () => {
      const streak2 = calculatePatternScore(1, true, 20000, 20000, 2);
      expect(streak2).toBe(200 + 100); // 200 base + 2 * 50

      const streak4 = calculatePatternScore(1, true, 20000, 20000, 4);
      expect(streak4).toBe(200 + 200); // 200 base + 4 * 50

      const streak1 = calculatePatternScore(1, true, 20000, 20000, 1);
      expect(streak1).toBe(200); // no bonus for streak < 2
    });

    it('penalizes incorrect answers with a fixed negative penalty', () => {
      const wrongScore = calculatePatternScore(3, false, 4000, 20000, 5);
      expect(wrongScore).toBe(-40);
    });

    it('clamps difficulty bounds between 1 and 6', () => {
      const lowClamped = calculatePatternScore(0, true, 20000, 20000, 0);
      expect(lowClamped).toBe(200);

      const highClamped = calculatePatternScore(10, true, 20000, 20000, 0);
      expect(highClamped).toBe(1200);
    });
  });

  describe('calculatePatternMasterSessionStats', () => {
    it('aggregates results into complete session statistics', () => {
      const results: PatternQuestionResult[] = [
        {
          questionId: 'pm-vp-01',
          category: 'visual-pattern',
          difficulty: 1,
          selectedIndex: 1,
          correctIndex: 1,
          isCorrect: true,
          score: 280,
          timeSpentMs: 4000,
        },
        {
          questionId: 'pm-ns-02',
          category: 'number-sequence',
          difficulty: 2,
          selectedIndex: 0,
          correctIndex: 2,
          isCorrect: false,
          score: -40,
          timeSpentMs: 6000,
        },
        {
          questionId: 'pm-mt-03',
          category: 'missing-tile',
          difficulty: 3,
          selectedIndex: 2,
          correctIndex: 2,
          isCorrect: true,
          score: 750,
          timeSpentMs: 5000,
        },
      ];

      const stats = calculatePatternMasterSessionStats(results, 3, 1000, 16000);
      expect(stats.totalQuestions).toBe(3);
      expect(stats.questionsAnswered).toBe(3);
      expect(stats.correctCount).toBe(2);
      expect(stats.accuracyPercentage).toBe(67); // Math.round(2/3 * 100) = 67
      expect(stats.finalScore).toBe(280 - 40 + 750); // 990
      expect(stats.highestDifficulty).toBe(3);
      expect(stats.avgResponseTimeMs).toBe(5000); // (4000 + 6000 + 5000) / 3
      expect(stats.totalDurationMs).toBe(15000);
    });

    it('handles empty session results safely without dividing by zero', () => {
      const stats = calculatePatternMasterSessionStats([], 10, 1000, 2000);
      expect(stats.totalQuestions).toBe(10);
      expect(stats.questionsAnswered).toBe(0);
      expect(stats.correctCount).toBe(0);
      expect(stats.accuracyPercentage).toBe(0);
      expect(stats.finalScore).toBe(0);
      expect(stats.avgResponseTimeMs).toBe(0);
    });

    it('ensures finalScore is clamped to at least 0 even if negative penalties exceed points', () => {
      const negativeResults: PatternQuestionResult[] = [
        {
          questionId: 'pm-01',
          category: 'visual-pattern',
          difficulty: 1,
          selectedIndex: 0,
          correctIndex: 1,
          isCorrect: false,
          score: -40,
          timeSpentMs: 3000,
        },
      ];

      const stats = calculatePatternMasterSessionStats(negativeResults, 1, 1000, 4000);
      expect(stats.finalScore).toBe(0);
    });
  });

  describe('patternMasterReducer Gameplay State Machine', () => {
    const mockQuestions: PatternQuestion[] = [
      {
        id: 'test-1',
        category: 'visual-pattern',
        difficulty: 1,
        title: 'Visual Test 1',
        titleMl: 'വിഷ്വൽ ടെസ്റ്റ് 1',
        prompt: 'Test Q1',
        promptMl: 'ടെസ്റ്റ് ചോദ്യം 1',
        options: ['A', 'B', 'C', 'D'],
        optionsMl: ['എ', 'ബി', 'സി', 'ഡി'],
        correctIndex: 1,
        explanation: 'Q1 explanation',
        explanationMl: 'ചോദ്യം 1 വിവരണം',
      },
      {
        id: 'test-2',
        category: 'number-sequence',
        difficulty: 2,
        title: 'Number Test 2',
        titleMl: 'നമ്പർ ടെസ്റ്റ് 2',
        prompt: 'Test Q2',
        promptMl: 'ടെസ്റ്റ് ചോദ്യം 2',
        options: ['10', '20', '30', '40'],
        optionsMl: ['10', '20', '30', '40'],
        correctIndex: 2,
        explanation: 'Q2 explanation',
        explanationMl: 'ചോദ്യം 2 വിവരണം',
      },
    ];

    it('initializes clean game state', () => {
      const state = createInitialPatternMasterState(mockQuestions, 1000);
      expect(state.phase).toBe('question');
      expect(state.currentIndex).toBe(0);
      expect(state.totalQuestions).toBe(2);
      expect(state.score).toBe(0);
      expect(state.consecutiveCorrect).toBe(0);
      expect(state.currentLevel).toBe(1);
      expect(state.selectedOptionIndex).toBeUndefined();
      expect(state.results).toHaveLength(0);
    });

    it('selects option in question phase and updates selectedOptionIndex', () => {
      const state = createInitialPatternMasterState(mockQuestions, 1000);
      const nextState = patternMasterReducer(state, {
        type: 'SELECT_OPTION',
        optionIndex: 1,
      });

      expect(nextState.selectedOptionIndex).toBe(1);
    });

    it('ignores option selection during non-question phases', () => {
      const state = createInitialPatternMasterState(mockQuestions, 1000);
      const pausedState = patternMasterReducer(state, { type: 'PAUSE_GAME' });

      const tapState = patternMasterReducer(pausedState, {
        type: 'SELECT_OPTION',
        optionIndex: 2,
      });
      expect(tapState.selectedOptionIndex).toBeUndefined();
    });

    it('prevents submission if no option has been selected', () => {
      const state = createInitialPatternMasterState(mockQuestions, 1000);
      const submitState = patternMasterReducer(state, {
        type: 'SUBMIT_ANSWER',
        responseTimestamp: 3000,
      });

      // Remains in question phase, score unchanged
      expect(submitState.phase).toBe('question');
      expect(submitState.results).toHaveLength(0);
    });

    it('evaluates correct answer and transitions to feedback phase', () => {
      let state = createInitialPatternMasterState(mockQuestions, 1000);
      state = patternMasterReducer(state, { type: 'SELECT_OPTION', optionIndex: 1 }); // Correct index is 1

      state = patternMasterReducer(state, {
        type: 'SUBMIT_ANSWER',
        responseTimestamp: 5000, // 4000ms spent
      });

      expect(state.phase).toBe('feedback');
      expect(state.isCurrentAnswerCorrect).toBe(true);
      expect(state.consecutiveCorrect).toBe(1);
      expect(state.results).toHaveLength(1);
      expect(state.results[0].isCorrect).toBe(true);
      expect(state.score).toBeGreaterThan(0);
    });

    it('evaluates incorrect answer, applies penalty, and resets streak', () => {
      let state = createInitialPatternMasterState(mockQuestions, 1000);
      state.consecutiveCorrect = 3;
      state.score = 500;

      state = patternMasterReducer(state, { type: 'SELECT_OPTION', optionIndex: 0 }); // Wrong (correct is 1)
      state = patternMasterReducer(state, {
        type: 'SUBMIT_ANSWER',
        responseTimestamp: 3000,
      });

      expect(state.phase).toBe('feedback');
      expect(state.isCurrentAnswerCorrect).toBe(false);
      expect(state.consecutiveCorrect).toBe(0);
      expect(state.score).toBe(500 - 40);
      expect(state.results).toHaveLength(1);
      expect(state.results[0].isCorrect).toBe(false);
    });

    it('prevents duplicate submissions from rapid taps (idempotency)', () => {
      let state = createInitialPatternMasterState(mockQuestions, 1000);
      state = patternMasterReducer(state, { type: 'SELECT_OPTION', optionIndex: 1 });
      state = patternMasterReducer(state, {
        type: 'SUBMIT_ANSWER',
        responseTimestamp: 4000,
      });

      const firstScore = state.score;
      const firstResultsCount = state.results.length;

      // Second submission tap in feedback phase
      const duplicateTapState = patternMasterReducer(state, {
        type: 'SUBMIT_ANSWER',
        responseTimestamp: 4100,
      });

      expect(duplicateTapState.score).toBe(firstScore);
      expect(duplicateTapState.results).toHaveLength(firstResultsCount);
    });

    it('advances to next question, updating index, level, and clearing selections', () => {
      let state = createInitialPatternMasterState(mockQuestions, 1000);
      state = patternMasterReducer(state, { type: 'SELECT_OPTION', optionIndex: 1 });
      state = patternMasterReducer(state, { type: 'SUBMIT_ANSWER', responseTimestamp: 4000 });

      state = patternMasterReducer(state, {
        type: 'NEXT_QUESTION',
        nextTimestamp: 4500,
      });

      expect(state.phase).toBe('question');
      expect(state.currentIndex).toBe(1);
      expect(state.currentLevel).toBe(2);
      expect(state.selectedOptionIndex).toBeUndefined();
      expect(state.isCurrentAnswerCorrect).toBeUndefined();
      expect(state.currentRoundScore).toBeUndefined();
      expect(state.questionStartTime).toBe(4500);
    });

    it('completes the session after the final question and computes final sessionStats', () => {
      let state = createInitialPatternMasterState(mockQuestions, 1000);

      // Question 1
      state = patternMasterReducer(state, { type: 'SELECT_OPTION', optionIndex: 1 });
      state = patternMasterReducer(state, { type: 'SUBMIT_ANSWER', responseTimestamp: 3000 });
      state = patternMasterReducer(state, { type: 'NEXT_QUESTION', nextTimestamp: 3500 });

      // Question 2 (final question)
      state = patternMasterReducer(state, { type: 'SELECT_OPTION', optionIndex: 2 });
      state = patternMasterReducer(state, { type: 'SUBMIT_ANSWER', responseTimestamp: 6000 });
      state = patternMasterReducer(state, { type: 'NEXT_QUESTION', nextTimestamp: 6500 });

      expect(state.phase).toBe('completed');
      expect(state.sessionStats).toBeDefined();
      expect(state.sessionStats?.totalQuestions).toBe(2);
      expect(state.sessionStats?.correctCount).toBe(2);
      expect(state.sessionStats?.accuracyPercentage).toBe(100);
    });

    it('pauses and resumes without loss of gameplay state', () => {
      let state = createInitialPatternMasterState(mockQuestions, 1000);
      state = patternMasterReducer(state, { type: 'SELECT_OPTION', optionIndex: 1 });

      // Pause
      state = patternMasterReducer(state, { type: 'PAUSE_GAME' });
      expect(state.phase).toBe('paused');
      expect(state.previousPhase).toBe('question');
      expect(state.selectedOptionIndex).toBe(1);

      // Resume
      state = patternMasterReducer(state, { type: 'RESUME_GAME' });
      expect(state.phase).toBe('question');
      expect(state.selectedOptionIndex).toBe(1);
      expect(state.previousPhase).toBeUndefined();
    });

    it('restarts game with clean initial state', () => {
      let state = createInitialPatternMasterState(mockQuestions, 1000);
      state = patternMasterReducer(state, { type: 'SELECT_OPTION', optionIndex: 1 });
      state = patternMasterReducer(state, { type: 'SUBMIT_ANSWER', responseTimestamp: 3000 });

      state = patternMasterReducer(state, {
        type: 'RESTART_GAME',
        questions: mockQuestions,
        startTimestamp: 10000,
      });

      expect(state.phase).toBe('question');
      expect(state.currentIndex).toBe(0);
      expect(state.score).toBe(0);
      expect(state.results).toHaveLength(0);
      expect(state.questionStartTime).toBe(10000);
    });
  });
});
