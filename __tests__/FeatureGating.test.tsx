import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { LocalizationProvider } from '../src/localization/LocalizationContext';
import { GameIntroScreen } from '../src/screens/GameIntroScreen';
import { ProgressScreen } from '../src/screens/ProgressScreen';
import { DailyWorkoutScreen } from '../src/screens/DailyWorkoutScreen';
import { Button } from '../src/components/Button';
import { entitlementService } from '../src/services/EntitlementService';
import { difficultyRepository } from '../src/difficulty';
import { historyRepository } from '../src/history';
import { workoutRepository, DailyWorkoutRecord } from '../src/workout';
import { MINDRISE_SKUS } from '../src/types/iap';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReplace = jest.fn();

let mockRouteParams: { gameId: string; workoutMode?: boolean; drillIndex?: number } = {
  gameId: 'memory-matrix',
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      replace: mockReplace,
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
    useFocusEffect: (cb: () => void) => {
      const ReactLocal = require('react');
      ReactLocal.useEffect(() => {
        cb();
      }, [cb]);
    },
  };
});

describe('MindRise Free vs. Pro Feature Gating', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await entitlementService.resetEntitlementForTesting();
    historyRepository.resetCacheForTesting();
    await historyRepository.clearHistory();
    await workoutRepository.clearAllWorkoutsForTesting();
    difficultyRepository.resetCacheForTesting();
  });

  afterEach(async () => {
    await entitlementService.destroy();
  });

  const renderWithProviders = async (component: React.ReactElement) => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <ThemeProvider>
          <LocalizationProvider>{component}</LocalizationProvider>
        </ThemeProvider>
      );
    });

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await new Promise<void>((resolve) => setTimeout(() => resolve(), 15));
      });
    }

    return renderer!;
  };

  describe('1. Game Launch Gate (GameIntroScreen)', () => {
    it('Free tier allows starting a level-based game at Level 4', async () => {
      mockRouteParams = { gameId: 'memory-matrix' };
      jest.spyOn(difficultyRepository, 'getStartingDifficulty').mockResolvedValue({
        gameId: 'memory-matrix',
        startingLevel: 4,
        highestLevelUnlocked: 4,
        lastEvaluatedSessionId: null,
        lastAdaptedAt: null,
        adaptationReason: 'initial_baseline',
        evaluatedSessionIds: [],
      });

      const renderer = await renderWithProviders(<GameIntroScreen />);
      const treeStr = JSON.stringify(renderer.toJSON());
      expect(treeStr).toContain('Level 4');
      expect(treeStr).not.toContain('PRO REQUIRED');

      const buttons = renderer.root.findAllByType(Button);
      const startButton = buttons[buttons.length - 1];
      expect(startButton.props.title).toBe('Start Cognitive Drill');

      await act(async () => {
        startButton.props.onPress();
      });

      expect(mockNavigate).toHaveBeenCalledWith('MemoryMatrixGame', {
        initialLevel: 4,
        drillIndex: undefined,
        workoutMode: undefined,
      });
      expect(mockNavigate).not.toHaveBeenCalledWith('PaywallModal');

      await act(async () => {
        renderer.unmount();
      });
    });

    it('Free tier blocks Level 5+ and routes to PaywallModal', async () => {
      mockRouteParams = { gameId: 'memory-matrix' };
      jest.spyOn(difficultyRepository, 'getStartingDifficulty').mockResolvedValue({
        gameId: 'memory-matrix',
        startingLevel: 5,
        highestLevelUnlocked: 5,
        lastEvaluatedSessionId: null,
        lastAdaptedAt: null,
        adaptationReason: 'sustained_performance',
        evaluatedSessionIds: [],
      });

      const renderer = await renderWithProviders(<GameIntroScreen />);
      const treeStr = JSON.stringify(renderer.toJSON());
      expect(treeStr).toContain('PRO REQUIRED');
      expect(treeStr).toContain('Level 5');

      const buttons = renderer.root.findAllByType(Button);
      const startButton = buttons[buttons.length - 1];
      expect(startButton.props.title).toBe('Unlock Level 5+ with Pro');

      await act(async () => {
        startButton.props.onPress();
      });

      expect(mockNavigate).toHaveBeenCalledWith('PaywallModal');
      expect(mockNavigate).not.toHaveBeenCalledWith('MemoryMatrixGame', expect.anything());

      await act(async () => {
        renderer.unmount();
      });
    });

    it('Pro tier allows starting at Level 5+ directly into the game', async () => {
      await entitlementService.setEntitlementForTesting(MINDRISE_SKUS.ANNUAL);
      mockRouteParams = { gameId: 'memory-matrix' };
      jest.spyOn(difficultyRepository, 'getStartingDifficulty').mockResolvedValue({
        gameId: 'memory-matrix',
        startingLevel: 6,
        highestLevelUnlocked: 6,
        lastEvaluatedSessionId: null,
        lastAdaptedAt: null,
        adaptationReason: 'sustained_performance',
        evaluatedSessionIds: [],
      });

      const renderer = await renderWithProviders(<GameIntroScreen />);
      const treeStr = JSON.stringify(renderer.toJSON());
      expect(treeStr).not.toContain('PRO REQUIRED');

      const buttons = renderer.root.findAllByType(Button);
      const startButton = buttons[buttons.length - 1];
      expect(startButton.props.title).toBe('Start Cognitive Drill');

      await act(async () => {
        startButton.props.onPress();
      });

      expect(mockNavigate).toHaveBeenCalledWith('MemoryMatrixGame', {
        initialLevel: 6,
        drillIndex: undefined,
        workoutMode: undefined,
      });

      await act(async () => {
        renderer.unmount();
      });
    });

    it('Free tier allows Tier 1 for tier-based games and blocks Tier 2+', async () => {
      mockRouteParams = { gameId: 'logic-quest' };

      // Case A: Tier 1 allowed for free user
      jest.spyOn(difficultyRepository, 'getStartingDifficulty').mockResolvedValue({
        gameId: 'logic-quest',
        startingLevel: 1,
        highestLevelUnlocked: 1,
        lastEvaluatedSessionId: null,
        lastAdaptedAt: null,
        adaptationReason: 'initial_baseline',
        evaluatedSessionIds: [],
      });

      let renderer = await renderWithProviders(<GameIntroScreen />);
      let buttons = renderer.root.findAllByType(Button);
      let startButton = buttons[buttons.length - 1];
      expect(startButton.props.title).toBe('Start Cognitive Drill');

      await act(async () => {
        startButton.props.onPress();
      });
      expect(mockNavigate).toHaveBeenCalledWith('LogicQuestGame', {
        initialLevel: 1,
        drillIndex: undefined,
        workoutMode: undefined,
      });

      await act(async () => {
        renderer.unmount();
      });
      mockNavigate.mockClear();

      // Case B: Tier 2 blocked for free user
      jest.spyOn(difficultyRepository, 'getStartingDifficulty').mockResolvedValue({
        gameId: 'logic-quest',
        startingLevel: 2,
        highestLevelUnlocked: 2,
        lastEvaluatedSessionId: null,
        lastAdaptedAt: null,
        adaptationReason: 'sustained_performance',
        evaluatedSessionIds: [],
      });

      renderer = await renderWithProviders(<GameIntroScreen />);
      buttons = renderer.root.findAllByType(Button);
      startButton = buttons[buttons.length - 1];
      expect(startButton.props.title).toBe('Unlock Tier 2+ with Pro');

      await act(async () => {
        startButton.props.onPress();
      });
      expect(mockNavigate).toHaveBeenCalledWith('PaywallModal');
      expect(mockNavigate).not.toHaveBeenCalledWith('LogicQuestGame', expect.anything());

      await act(async () => {
        renderer.unmount();
      });
    });

    it('Pro tier allows starting Tier 2+ directly in tier-based games', async () => {
      await entitlementService.setEntitlementForTesting(MINDRISE_SKUS.MONTHLY);
      mockRouteParams = { gameId: 'logic-quest' };
      jest.spyOn(difficultyRepository, 'getStartingDifficulty').mockResolvedValue({
        gameId: 'logic-quest',
        startingLevel: 2,
        highestLevelUnlocked: 2,
        lastEvaluatedSessionId: null,
        lastAdaptedAt: null,
        adaptationReason: 'sustained_performance',
        evaluatedSessionIds: [],
      });

      const renderer = await renderWithProviders(<GameIntroScreen />);
      const buttons = renderer.root.findAllByType(Button);
      const startButton = buttons[buttons.length - 1];
      expect(startButton.props.title).toBe('Start Cognitive Drill');

      await act(async () => {
        startButton.props.onPress();
      });

      expect(mockNavigate).toHaveBeenCalledWith('LogicQuestGame', {
        initialLevel: 2,
        drillIndex: undefined,
        workoutMode: undefined,
      });

      await act(async () => {
        renderer.unmount();
      });
    });
  });

  describe('2. Analytics Gate (ProgressScreen)', () => {
    it('Free tier displays last 7 days of performance by default', async () => {
      const renderer = await renderWithProviders(<ProgressScreen />);
      const treeStr = JSON.stringify(renderer.toJSON());

      expect(treeStr).toContain('Cognitive Analytics');
      expect(treeStr).toContain('7D');
      expect(treeStr).toContain('30D');
      expect(treeStr).toContain('90D');
      expect(treeStr).toContain('ALL');
      // On 7D scope, locked card is NOT visible
      expect(treeStr).not.toContain('Unlock Lifetime Trends');

      await act(async () => {
        renderer.unmount();
      });
    });

    it('Free tier switching to 30D, 90D, or ALL shows locked card with Paywall CTA', async () => {
      const renderer = await renderWithProviders(<ProgressScreen />);

      // Find the touchable pills for scopes
      const touchables = renderer.root.findAllByType(TouchableOpacity);
      // The 30D pill has accessibilityRole="tab" and label containing "30D"
      const pill30D = touchables.find((t) => t.props.accessibilityLabel?.includes('30D'));
      expect(pill30D).toBeDefined();

      await act(async () => {
        pill30D?.props.onPress();
      });

      const treeStr = JSON.stringify(renderer.toJSON());
      expect(treeStr).toContain('Unlock Lifetime Trends');
      expect(treeStr).toContain('PRO FEATURE');

      // Find Unlock Lifetime Trends CTA button
      const buttons = renderer.root.findAllByType(Button);
      const unlockBtn = buttons.find((b) => b.props.title === 'Unlock Lifetime Trends');
      expect(unlockBtn).toBeDefined();

      await act(async () => {
        unlockBtn?.props.onPress();
      });

      expect(mockNavigate).toHaveBeenCalledWith('PaywallModal');

      await act(async () => {
        renderer.unmount();
      });
    });

    it('Pro tier switching to 30D or 90D renders full analytics without locked card', async () => {
      await entitlementService.setEntitlementForTesting(MINDRISE_SKUS.ANNUAL);
      const renderer = await renderWithProviders(<ProgressScreen />);

      const touchables = renderer.root.findAllByType(TouchableOpacity);
      const pill90D = touchables.find((t) => t.props.accessibilityLabel?.includes('90D'));
      expect(pill90D).toBeDefined();

      await act(async () => {
        pill90D?.props.onPress();
      });

      const treeStr = JSON.stringify(renderer.toJSON());
      // No locked card for Pro users
      expect(treeStr).not.toContain('Unlock Lifetime Trends');
      expect(treeStr).toContain('DRILL SCORE AVERAGE');

      await act(async () => {
        renderer.unmount();
      });
    });
  });

  describe('3. Daily Workout Limit', () => {
    it('Free tier limits user to 1 completed daily workout; reset navigates to PaywallModal', async () => {
      // Seed a completed workout for today
      const today = new Date();
      const mockWorkout: DailyWorkoutRecord = {
        id: 'workout_today_completed',
        schemaVersion: 1,
        dateKey: today.toISOString().split('T')[0],
        status: 'completed',
        drills: [
          {
            id: 'drill_1',
            order: 1,
            gameId: 'memory-matrix',
            category: 'memory',
            categoryLabel: 'Memory',
            estimatedDurationMins: 3,
            status: 'completed',
            score: 3000,
            accuracyPercentage: 90,
            durationMs: 120000,
          },
          {
            id: 'drill_2',
            order: 2,
            gameId: 'quick-reaction',
            category: 'attention-speed',
            categoryLabel: 'Speed',
            estimatedDurationMins: 2,
            status: 'completed',
            score: 2800,
            accuracyPercentage: 85,
            durationMs: 100000,
          },
          {
            id: 'drill_3',
            order: 3,
            gameId: 'logic-quest',
            category: 'reasoning',
            categoryLabel: 'Reasoning',
            estimatedDurationMins: 3,
            status: 'completed',
            score: 3200,
            accuracyPercentage: 95,
            durationMs: 110000,
          },
        ],
        currentDrillIndex: 3,
        totalDurationMs: 330000,
        averageAccuracy: 90,
      };

      await workoutRepository.saveWorkout(mockWorkout);

      const renderer = await renderWithProviders(<DailyWorkoutScreen />);
      const treeStr = JSON.stringify(renderer.toJSON());

      expect(treeStr).toContain('DAILY LIMIT REACHED');
      expect(treeStr).toContain('Unlock Unlimited Workouts');

      // Attempting to tap Reset Workout
      const buttons = renderer.root.findAllByType(Button);
      const resetBtn = buttons.find((b) => b.props.title?.includes('Reset Workout'));
      expect(resetBtn).toBeDefined();

      await act(async () => {
        resetBtn?.props.onPress();
      });

      expect(mockNavigate).toHaveBeenCalledWith('PaywallModal');

      // Attempting to tap Unlock Unlimited Workouts button
      const upgradeBtn = buttons.find((b) => b.props.title === 'Unlock Unlimited Workouts');
      expect(upgradeBtn).toBeDefined();

      mockNavigate.mockClear();
      await act(async () => {
        upgradeBtn?.props.onPress();
      });
      expect(mockNavigate).toHaveBeenCalledWith('PaywallModal');

      await act(async () => {
        renderer.unmount();
      });
    });

    it('Pro tier allows resetting and replaying today workout', async () => {
      await entitlementService.setEntitlementForTesting(MINDRISE_SKUS.LIFETIME);

      const today = new Date();
      const mockWorkout: DailyWorkoutRecord = {
        id: 'workout_today_pro',
        schemaVersion: 1,
        dateKey: today.toISOString().split('T')[0],
        status: 'completed',
        drills: [
          {
            id: 'drill_1',
            order: 1,
            gameId: 'memory-matrix',
            category: 'memory',
            categoryLabel: 'Memory',
            estimatedDurationMins: 3,
            status: 'completed',
            score: 3000,
            accuracyPercentage: 90,
            durationMs: 120000,
          },
          {
            id: 'drill_2',
            order: 2,
            gameId: 'quick-reaction',
            category: 'attention-speed',
            categoryLabel: 'Speed',
            estimatedDurationMins: 2,
            status: 'completed',
            score: 2800,
            accuracyPercentage: 85,
            durationMs: 100000,
          },
          {
            id: 'drill_3',
            order: 3,
            gameId: 'logic-quest',
            category: 'reasoning',
            categoryLabel: 'Reasoning',
            estimatedDurationMins: 3,
            status: 'completed',
            score: 3200,
            accuracyPercentage: 95,
            durationMs: 110000,
          },
        ],
        currentDrillIndex: 3,
        totalDurationMs: 330000,
        averageAccuracy: 90,
      };

      await workoutRepository.saveWorkout(mockWorkout);

      const renderer = await renderWithProviders(<DailyWorkoutScreen />);
      const treeStr = JSON.stringify(renderer.toJSON());

      expect(treeStr).not.toContain('DAILY LIMIT REACHED');

      const buttons = renderer.root.findAllByType(Button);
      const resetBtn = buttons.find((b) => b.props.title === 'Reset Workout');
      expect(resetBtn).toBeDefined();

      await act(async () => {
        resetBtn?.props.onPress();
      });

      // Does NOT route to PaywallModal; opens modal
      expect(mockNavigate).not.toHaveBeenCalledWith('PaywallModal');

      await act(async () => {
        renderer.unmount();
      });
    });
  });
});
