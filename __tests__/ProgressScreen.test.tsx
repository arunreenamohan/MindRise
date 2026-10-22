import React, { useEffect } from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { LocalizationProvider, useLocalization } from '../src/localization/LocalizationContext';
import { ProgressScreen } from '../src/screens/ProgressScreen';
import { historyRepository } from '../src/history';
import { workoutRepository } from '../src/workout';
import { GameSessionRecord } from '../src/history/types';

describe('ProgressScreen Integration & Rendering', () => {
  beforeEach(async () => {
    historyRepository.resetCacheForTesting();
    await historyRepository.clearHistory();
    await workoutRepository.clearAllWorkoutsForTesting();
    jest.clearAllMocks();
  });

  const renderWithProviders = async (language: 'en' | 'ml' = 'en') => {
    const LanguageSetter: React.FC<{ targetLang: 'en' | 'ml' }> = ({ targetLang }) => {
      const { setLanguage } = useLocalization();
      useEffect(() => {
        setLanguage(targetLang);
      }, [targetLang, setLanguage]);
      return <ProgressScreen />;
    };

    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <NavigationContainer>
          <ThemeProvider>
            <LocalizationProvider>
              <LanguageSetter targetLang={language} />
            </LocalizationProvider>
          </ThemeProvider>
        </NavigationContainer>
      );
    });
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(() => resolve(undefined), 10));
      });
    }
    return renderer!;
  };

  it('renders clean empty state with Start First Workout CTA when history is empty', async () => {
    const renderer = await renderWithProviders('en');
    const tree = renderer.toJSON();
    expect(tree).toBeDefined();

    const stringified = JSON.stringify(tree);
    expect(stringified).toContain('Cognitive Analytics');
    expect(stringified).toContain('No Sessions Logged Yet');
    expect(stringified).toContain('Start First Workout');
    expect(stringified).toContain('6/6 READY');

    await act(async () => {
      renderer.unmount();
    });
  });

  it('renders populated dashboard with separate workout and session counts, 7-day matrix, and game cards', async () => {
    // 1. Seed completed workout
    const today = new Date('2026-10-22T08:00:00Z');
    await workoutRepository.getOrCreateTodayWorkout(today);
    const mockSession: GameSessionRecord = {
      id: 'mm_test_1',
      schemaVersion: 1,
      gameId: 'memory-matrix',
      startedAt: '2026-10-22T08:00:00Z',
      completedAt: '2026-10-22T08:02:00Z',
      dateKey: '2026-10-22',
      outcome: 'completed',
      finalScore: 3500,
      accuracyPercentage: 90,
      roundsCompleted: 10,
      totalRounds: 10,
      highestLevel: 4,
      durationMs: 120000,
      gameSpecificMetrics: {
        perfectRounds: 3,
      },
    };

    await historyRepository.saveSession(mockSession);
    await workoutRepository.recordDrillCompletion({
      dateKey: '2026-10-22',
      drillIndex: 0,
      sessionRecord: mockSession,
    });
    await workoutRepository.recordDrillCompletion({
      dateKey: '2026-10-22',
      drillIndex: 1,
      sessionRecord: { ...mockSession, id: 'drill_2', finalScore: 4000 },
    });
    await workoutRepository.recordDrillCompletion({
      dateKey: '2026-10-22',
      drillIndex: 2,
      sessionRecord: { ...mockSession, id: 'drill_3', finalScore: 4500 },
    });

    const renderer = await renderWithProviders('en');
    const stringified = JSON.stringify(renderer.toJSON());

    // Header & KPIs
    expect(stringified).toContain('Cognitive Analytics');
    expect(stringified).toContain('Daily Workouts');
    expect(stringified).toContain('Game Sessions');
    expect(stringified).toContain('Workout Streak');

    // 7-day matrix & game cards
    expect(stringified).toContain('7-Day Activity');
    expect(stringified).toContain('Memory Matrix');
    expect(stringified).toContain('Number Recall');
    expect(stringified).toContain('Quick Reaction');
    expect(stringified).toContain('Logic Quest');
    expect(stringified).toContain('Focus Finder');
    expect(stringified).toContain('Pattern Master');

    // Recent activity list
    expect(stringified).toContain('Recent Training Sessions');
    expect(stringified).toContain('3,500');

    await act(async () => {
      renderer.unmount();
    });
  });

  it('renders correctly in Malayalam when locale is set to ml', async () => {
    const renderer = await renderWithProviders('ml');
    const stringified = JSON.stringify(renderer.toJSON());

    // Malayalam strings
    expect(stringified).toContain('നിങ്ങളുടെ പുരോഗതി'); // screenTitle
    expect(stringified).toContain('പ്രതിദിന വർക്ക്ഔട്ടുകൾ'); // statDailyWorkouts
    expect(stringified).toContain('ഗെയിം സെഷനുകൾ'); // statGameSessions
    expect(stringified).toContain('7 ദിവസത്തെ വിവരങ്ങൾ'); // weeklyActivityTitle
    expect(stringified).toContain('മെമ്മറി മാട്രിക്സ്'); // game title
    expect(stringified).toContain('വിവരങ്ങൾ ഒന്നും രേഖപ്പെടുത്തിയിട്ടില്ല'); // emptyHistoryTitle

    await act(async () => {
      renderer.unmount();
    });
  });

  it('renders error state when storage read fails and provides working retry', async () => {
    const originalGetSessions = historyRepository.getSessions;
    historyRepository.getSessions = jest.fn().mockRejectedValueOnce(new Error('Storage failure'));

    const renderer = await renderWithProviders('en');
    let stringified = JSON.stringify(renderer.toJSON());

    expect(stringified).toContain('Unable to load training history.');
    expect(stringified).toContain('Retry');

    // Restore and retry
    historyRepository.getSessions = originalGetSessions;

    // Find retry button
    const retryButtons = renderer.root.findAll((node) => node.props.accessibilityLabel === 'Retry');
    expect(retryButtons.length).toBeGreaterThan(0);

    await act(async () => {
      retryButtons[0].props.onPress();
    });

    stringified = JSON.stringify(renderer.toJSON());
    expect(stringified).not.toContain('Unable to load training history.');

    await act(async () => {
      renderer.unmount();
    });
  });
});
