import {
  QUESTION_BANK,
  getCuratedQuestionsForSession,
  calculateQuestionScore,
  calculateLogicQuestSessionStats,
  createInitialLogicQuestState,
  logicQuestReducer,
  LogicQuestion,
  QuestionResult,
} from '../src/games/logic-quest';

describe('Logic Quest Game Engine & Question Bank', () => {
  describe('Question Bank Integrity & Validation', () => {
    it('contains at least 20 validated questions', () => {
      expect(QUESTION_BANK.length).toBeGreaterThanOrEqual(20);
    });

    it('covers all three required categories: number-sequence, odd-one-out, deductive-reasoning', () => {
      const categories = new Set(QUESTION_BANK.map((q) => q.category));
      expect(categories.has('number-sequence')).toBe(true);
      expect(categories.has('odd-one-out')).toBe(true);
      expect(categories.has('deductive-reasoning')).toBe(true);
    });

    it('enforces strict schema and valid fields on every question', () => {
      const ids = new Set<string>();

      QUESTION_BANK.forEach((q) => {
        // Unique ID
        expect(ids.has(q.id)).toBe(false);
        ids.add(q.id);

        // Difficulty bounds (1 to 6)
        expect(q.difficulty).toBeGreaterThanOrEqual(1);
        expect(q.difficulty).toBeLessThanOrEqual(6);

        // Prompts
        expect(typeof q.prompt).toBe('string');
        expect(q.prompt.trim().length).toBeGreaterThan(5);
        expect(typeof q.promptMl).toBe('string');
        expect(q.promptMl.trim().length).toBeGreaterThan(5);

        // Options
        expect(Array.isArray(q.options)).toBe(true);
        expect(q.options).toHaveLength(4);
        q.options.forEach((opt) => {
          expect(typeof opt).toBe('string');
          expect(opt.trim().length).toBeGreaterThan(0);
        });

        // Malayalam Options
        expect(Array.isArray(q.optionsMl)).toBe(true);
        expect(q.optionsMl).toHaveLength(4);
        q.optionsMl.forEach((opt) => {
          expect(typeof opt).toBe('string');
          expect(opt.trim().length).toBeGreaterThan(0);
        });

        // Correct Index
        expect(Number.isInteger(q.correctIndex)).toBe(true);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThanOrEqual(3);

        // Explanations
        expect(typeof q.explanation).toBe('string');
        expect(q.explanation.trim().length).toBeGreaterThan(10);
        expect(typeof q.explanationMl).toBe('string');
        expect(q.explanationMl.trim().length).toBeGreaterThan(10);
      });
    });

    it('verifies that each question has 4 unique options (no duplicate choices)', () => {
      QUESTION_BANK.forEach((q) => {
        const uniqueOptions = new Set(q.options.map((o) => o.toLowerCase().trim()));
        expect(uniqueOptions.size).toBe(4);
      });
    });

    describe('getCuratedQuestionsForSession', () => {
      it('returns exactly 10 questions sorted in ascending difficulty by default', () => {
        const sessionQuestions = getCuratedQuestionsForSession(10);
        expect(sessionQuestions).toHaveLength(10);

        for (let i = 0; i < sessionQuestions.length - 1; i++) {
          expect(sessionQuestions[i].difficulty).toBeLessThanOrEqual(
            sessionQuestions[i + 1].difficulty
          );
        }
      });

      it('includes questions from all three categories in the session', () => {
        const sessionQuestions = getCuratedQuestionsForSession(10);
        const categories = new Set(sessionQuestions.map((q) => q.category));
        expect(categories.has('number-sequence')).toBe(true);
        expect(categories.has('odd-one-out')).toBe(true);
        expect(categories.has('deductive-reasoning')).toBe(true);
      });

      it('safely clamps requested count if out of range', () => {
        const smallSession = getCuratedQuestionsForSession(3);
        expect(smallSession).toHaveLength(3);

        const clampedSession = getCuratedQuestionsForSession(100);
        expect(clampedSession.length).toBeLessThanOrEqual(QUESTION_BANK.length);
      });
    });
  });

  describe('Scoring Formula (calculateQuestionScore)', () => {
    it('awards base score + max speed bonus + streak bonus for fast correct answers', () => {
      // Difficulty 2, responseTime 3000ms (<= 5000ms), streak 2
      // Base: 100 * 2 = 200
      // Speed bonus: 50 * 2 = 100
      // Streak bonus: 2 * 20 = 40
      // Total: 340
      const score = calculateQuestionScore(true, 2, 3000, 2);
      expect(score).toBe(340);
    });

    it('scales speed bonus linearly between 5s and 15s', () => {
      // Difficulty 4, responseTime 10000ms (midpoint of 5s-15s => 50% speed bonus)
      // Base: 100 * 4 = 400
      // Speed bonus: (50 * 4) * 0.5 = 100
      // Streak bonus: 0
      // Total: 500
      const score = calculateQuestionScore(true, 4, 10000, 0);
      expect(score).toBe(500);
    });

    it('gives 0 speed bonus if response time exceeds 15 seconds', () => {
      // Difficulty 3, responseTime 16000ms, streak 1
      // Base: 100 * 3 = 300
      // Speed: 0
      // Streak bonus: 1 * 20 = 20
      // Total: 320
      const score = calculateQuestionScore(true, 3, 16000, 1);
      expect(score).toBe(320);
    });

    it('always scores 0 points for incorrect answers regardless of speed or streak', () => {
      expect(calculateQuestionScore(false, 6, 1000, 5)).toBe(0);
      expect(calculateQuestionScore(false, 1, 500, 0)).toBe(0);
    });

    it('handles negative or invalid response times gracefully', () => {
      const scoreNegative = calculateQuestionScore(true, 2, -100, 0);
      // Treated as max speed bonus (responseTime <= 5000)
      expect(scoreNegative).toBe(300); // 200 + 100

      const scoreNan = calculateQuestionScore(true, 2, NaN, 0);
      expect(scoreNan).toBe(200); // Base score only
    });
  });

  describe('Session Statistics (calculateLogicQuestSessionStats)', () => {
    const mockResults: QuestionResult[] = [
      {
        questionId: 'q1',
        category: 'number-sequence',
        difficulty: 1,
        selectedIndex: 1,
        correctIndex: 1,
        isCorrect: true,
        timeSpentMs: 3000,
        score: 150,
      },
      {
        questionId: 'q2',
        category: 'odd-one-out',
        difficulty: 2,
        selectedIndex: 0,
        correctIndex: 2,
        isCorrect: false,
        timeSpentMs: 7000,
        score: 0,
      },
      {
        questionId: 'q3',
        category: 'deductive-reasoning',
        difficulty: 3,
        selectedIndex: 3,
        correctIndex: 3,
        isCorrect: true,
        timeSpentMs: 5000,
        score: 450,
      },
    ];

    it('calculates aggregate statistics correctly', () => {
      const stats = calculateLogicQuestSessionStats(mockResults, 10000);
      expect(stats.totalQuestions).toBe(3);
      expect(stats.questionsAnswered).toBe(3);
      expect(stats.correctCount).toBe(2);
      expect(stats.finalScore).toBe(600);
      expect(stats.accuracyPercentage).toBe(67); // 2/3 = 66.67% => 67%
      expect(stats.highestDifficulty).toBe(3);
      expect(stats.avgResponseTimeMs).toBe(5000); // (3000 + 7000 + 5000) / 3 = 5000
      expect(stats.totalDurationMs).toBe(10000);
    });

    it('handles empty results safely without division by zero', () => {
      const emptyStats = calculateLogicQuestSessionStats([], 0);
      expect(emptyStats.totalQuestions).toBe(0);
      expect(emptyStats.correctCount).toBe(0);
      expect(emptyStats.accuracyPercentage).toBe(0);
      expect(emptyStats.avgResponseTimeMs).toBe(0);
      expect(emptyStats.finalScore).toBe(0);
    });
  });

  describe('Logic Quest Reducer & Game Flow', () => {
    it('creates a clean initial state', () => {
      const state = createInitialLogicQuestState();
      expect(state.phase).toBe('question');
      expect(state.currentIndex).toBe(0);
      expect(state.totalQuestions).toBe(10);
      expect(state.score).toBe(0);
      expect(state.consecutiveCorrect).toBe(0);
      expect(state.selectedOptionIndex).toBeUndefined();
      expect(state.results).toHaveLength(0);
      expect(state.sessionStats).toBeUndefined();
    });

    it('handles option selection and ignores invalid options', () => {
      let state = createInitialLogicQuestState();
      state = logicQuestReducer(state, { type: 'SELECT_OPTION', optionIndex: 2 });
      expect(state.selectedOptionIndex).toBe(2);

      // Clamps or ignores out of bounds index
      state = logicQuestReducer(state, { type: 'SELECT_OPTION', optionIndex: 10 });
      expect(state.selectedOptionIndex).toBe(2);
    });

    it('transitions to feedback phase upon submitting an answer', () => {
      let state = createInitialLogicQuestState();
      const firstQ = state.questions[0];
      const correctIdx = firstQ.correctIndex;

      state = logicQuestReducer(state, { type: 'SELECT_OPTION', optionIndex: correctIdx });
      state = logicQuestReducer(state, {
        type: 'SUBMIT_ANSWER',
        responseTimestamp: state.questionStartTime + 4000,
      });

      expect(state.phase).toBe('feedback');
      expect(state.isCurrentAnswerCorrect).toBe(true);
      expect(state.consecutiveCorrect).toBe(1);
      expect(state.score).toBeGreaterThan(0);
      expect(state.results).toHaveLength(1);
      expect(state.results[0].isCorrect).toBe(true);
    });

    it('resets streak to 0 upon incorrect submission', () => {
      let state = createInitialLogicQuestState();
      state.consecutiveCorrect = 3;
      const firstQ = state.questions[0];
      const incorrectIdx = (firstQ.correctIndex + 1) % 4;

      state = logicQuestReducer(state, { type: 'SELECT_OPTION', optionIndex: incorrectIdx });
      state = logicQuestReducer(state, {
        type: 'SUBMIT_ANSWER',
        responseTimestamp: state.questionStartTime + 4000,
      });

      expect(state.phase).toBe('feedback');
      expect(state.isCurrentAnswerCorrect).toBe(false);
      expect(state.consecutiveCorrect).toBe(0);
      expect(state.currentRoundScore).toBe(0);
      expect(state.results[0].isCorrect).toBe(false);
    });

    it('prevents double submission or submitting without option selection', () => {
      let state = createInitialLogicQuestState();
      // No option selected
      const unselectedState = logicQuestReducer(state, {
        type: 'SUBMIT_ANSWER',
        responseTimestamp: Date.now(),
      });
      expect(unselectedState).toBe(state); // No-op

      // Select option and submit
      state = logicQuestReducer(state, { type: 'SELECT_OPTION', optionIndex: 0 });
      state = logicQuestReducer(state, { type: 'SUBMIT_ANSWER', responseTimestamp: Date.now() });
      expect(state.phase).toBe('feedback');

      // Attempt second submission while in feedback phase
      const doubleSubmitState = logicQuestReducer(state, {
        type: 'SUBMIT_ANSWER',
        responseTimestamp: Date.now(),
      });
      expect(doubleSubmitState).toBe(state); // No-op
    });

    it('advances through questions and completes session after the final question', () => {
      // Create a short 2-question session for test efficiency
      const shortQuestions: LogicQuestion[] = QUESTION_BANK.slice(0, 2);
      let state = createInitialLogicQuestState(shortQuestions);
      expect(state.totalQuestions).toBe(2);

      // Question 1
      state = logicQuestReducer(state, {
        type: 'SELECT_OPTION',
        optionIndex: shortQuestions[0].correctIndex,
      });
      state = logicQuestReducer(state, {
        type: 'SUBMIT_ANSWER',
        responseTimestamp: state.questionStartTime + 2000,
      });
      expect(state.phase).toBe('feedback');

      state = logicQuestReducer(state, {
        type: 'NEXT_QUESTION',
        nextTimestamp: state.questionStartTime + 3000,
      });
      expect(state.phase).toBe('question');
      expect(state.currentIndex).toBe(1);
      expect(state.selectedOptionIndex).toBeUndefined();

      // Question 2 (Final)
      state = logicQuestReducer(state, {
        type: 'SELECT_OPTION',
        optionIndex: shortQuestions[1].correctIndex,
      });
      state = logicQuestReducer(state, {
        type: 'SUBMIT_ANSWER',
        responseTimestamp: state.questionStartTime + 2500,
      });
      expect(state.phase).toBe('feedback');

      state = logicQuestReducer(state, {
        type: 'NEXT_QUESTION',
        nextTimestamp: state.questionStartTime + 4000,
      });
      expect(state.phase).toBe('completed');
      expect(state.sessionStats).not.toBeNull();
      expect(state.sessionStats?.totalQuestions).toBe(2);
      expect(state.sessionStats?.correctCount).toBe(2);
      expect(state.sessionStats?.accuracyPercentage).toBe(100);
    });

    it('supports pause, resume, and restart workflows safely', () => {
      let state = createInitialLogicQuestState();
      state = logicQuestReducer(state, { type: 'PAUSE_GAME' });
      expect(state.phase).toBe('paused');

      state = logicQuestReducer(state, { type: 'RESUME_GAME' });
      expect(state.phase).toBe('question');

      // In feedback phase
      state = logicQuestReducer(state, { type: 'SELECT_OPTION', optionIndex: 1 });
      state = logicQuestReducer(state, { type: 'SUBMIT_ANSWER', responseTimestamp: Date.now() });
      expect(state.phase).toBe('feedback');

      state = logicQuestReducer(state, { type: 'PAUSE_GAME' });
      expect(state.phase).toBe('paused');

      state = logicQuestReducer(state, { type: 'RESUME_GAME' });
      expect(state.phase).toBe('feedback'); // Resumes back to feedback!

      // Restart resets score and index
      state = logicQuestReducer(state, { type: 'RESTART_GAME' });
      expect(state.phase).toBe('question');
      expect(state.currentIndex).toBe(0);
      expect(state.score).toBe(0);
      expect(state.results).toHaveLength(0);
    });
  });
});
