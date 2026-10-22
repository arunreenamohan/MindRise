import React, { useReducer, useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
  AppState,
  AppStateStatus,
  BackHandler,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { ScreenContainer } from '../components/ScreenContainer';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import {
  ArrowLeftIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
  FlameIcon,
  ArrowRightIcon,
} from '../components/SvgIcons';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';
import {
  createInitialFocusFinderState,
  focusFinderReducer,
  FocusFinderShapeView,
  FocusFinderShape,
  FocusFinderColorKey,
  FocusFinderInnerPattern,
} from '../games/focus-finder';
import { historyRepository, CURRENT_SCHEMA_VERSION, getLocalDateKey, GameSessionRecord } from '../history';
import { workoutRepository } from '../workout';

const getMonotonicTime = (): number => {
  const perf = (globalThis as unknown as { performance?: { now?: () => number } }).performance;
  if (perf && typeof perf.now === 'function') {
    return perf.now();
  }
  return Date.now();
};

type FocusFinderRouteProp = RouteProp<RootStackParamList, 'FocusFinderGame'>;

export const FocusFinderGameScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<FocusFinderRouteProp>();
  const { colors, typography } = useTheme();
  const { t, language } = useLocalization();
  const { width } = useWindowDimensions();

  const [state, dispatch] = useReducer(focusFinderReducer, undefined, () =>
    createInitialFocusFinderState(1)
  );

  const sessionIdRef = useRef<string>(historyRepository.generateSessionId('focus-finder'));
  const savedSessionIdRef = useRef<string | null>(null);

  const [countdown, setCountdown] = useState<number>(3);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [remainingTimeMs, setRemainingTimeMs] = useState<number>(10000);

  // Timers and tokens
  const roundTokenRef = useRef<number>(0);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (roundTimerIntervalRef.current) {
      clearInterval(roundTimerIntervalRef.current);
      roundTimerIntervalRef.current = null;
    }
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  // 1. Initial 3-2-1 Countdown
  useEffect(() => {
    if (state.phase === 'countdown') {
      clearAllTimers();
      setCountdown(3);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            dispatch({ type: 'START_ROUND', roundStartTime: getMonotonicTime() });
            return 0;
          }
          return prev - 1;
        });
      }, 750);
    }
    return () => clearAllTimers();
  }, [state.phase, clearAllTimers]);

  // 2. Active Searching Timer & Timeout Handling
  useEffect(() => {
    if (state.phase === 'searching') {
      roundTokenRef.current += 1;
      const currentToken = roundTokenRef.current;
      const limit = state.currentRoundConfig.timeLimitMs;
      setRemainingTimeMs(limit);

      const intervalStart = getMonotonicTime();
      roundTimerIntervalRef.current = setInterval(() => {
        if (roundTokenRef.current !== currentToken) return;

        const elapsed = getMonotonicTime() - intervalStart;
        const remaining = Math.max(0, limit - elapsed);
        setRemainingTimeMs(remaining);

        if (remaining <= 0) {
          if (roundTimerIntervalRef.current) {
            clearInterval(roundTimerIntervalRef.current);
            roundTimerIntervalRef.current = null;
          }
          dispatch({ type: 'TIMEOUT_ROUND', timeoutTimestamp: getMonotonicTime() });
        }
      }, 50);
    } else {
      if (roundTimerIntervalRef.current) {
        clearInterval(roundTimerIntervalRef.current);
        roundTimerIntervalRef.current = null;
      }
    }

    return () => {
      if (roundTimerIntervalRef.current) {
        clearInterval(roundTimerIntervalRef.current);
        roundTimerIntervalRef.current = null;
      }
    };
  }, [state.phase, state.currentRound, state.currentRoundConfig.timeLimitMs]);

  // 3. Feedback Transition to Next Round
  useEffect(() => {
    if (state.phase === 'feedback') {
      const currentToken = roundTokenRef.current;
      const delay = state.lastRoundOutcome === 'hit' ? 700 : 900;

      feedbackTimerRef.current = setTimeout(() => {
        if (roundTokenRef.current === currentToken) {
          dispatch({ type: 'NEXT_ROUND', nextStartTime: getMonotonicTime() });
        }
      }, delay);
    }
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
    };
  }, [state.phase, state.lastRoundOutcome]);

  // 4. AppState Background handling: pause game when backgrounded
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        dispatch({ type: 'PAUSE_GAME' });
      }
    });
    return () => subscription.remove();
  }, []);

  // 5. Android hardware back button
  useEffect(() => {
    const onBackPress = () => {
      if (state.phase === 'completed') {
        navigation.goBack();
        return true;
      }
      setShowExitConfirm(true);
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [state.phase, navigation]);

  // 6. Automatic Session Persistence on completion (exactly once)
  useEffect(() => {
    if (state.phase === 'completed' && state.sessionStats) {
      if (savedSessionIdRef.current !== sessionIdRef.current) {
        savedSessionIdRef.current = sessionIdRef.current;
        const stats = state.sessionStats;
        const sessionRecord: GameSessionRecord = {
          id: sessionIdRef.current,
          schemaVersion: CURRENT_SCHEMA_VERSION,
          gameId: 'focus-finder',
          startedAt: new Date(state.sessionStartTime || Date.now()).toISOString(),
          completedAt: stats.completedAt,
          dateKey: getLocalDateKey(new Date(stats.completedAt)),
          outcome: 'completed',
          finalScore: stats.finalScore,
          accuracyPercentage: stats.accuracyPercentage,
          roundsCompleted: stats.roundsCompleted,
          totalRounds: stats.totalRounds,
          highestLevel: stats.highestLevel,
          durationMs: stats.totalDurationMs,
          gameSpecificMetrics: {
            targetHits: stats.targetHits,
            misses: stats.misses,
            timeouts: stats.timeouts,
            bestFindTimeMs: stats.bestFindTimeMs,
            avgFindTimeMs: stats.avgFindTimeMs,
          },
        };
        historyRepository.saveSession(sessionRecord);

        if (route.params?.workoutMode && typeof route.params.drillIndex === 'number') {
          workoutRepository
            .recordDrillCompletion({
              dateKey: sessionRecord.dateKey,
              drillIndex: route.params.drillIndex,
              sessionRecord,
            })
            .catch(() => {});
        }
      }
    }
  }, [state.phase, state.sessionStats, state.sessionStartTime, route.params?.workoutMode, route.params?.drillIndex]);

  // Actions
  const handleItemPress = (index: number) => {
    if (state.phase !== 'searching') return;
    dispatch({ type: 'TAP_ITEM', itemIndex: index, tapTimestamp: getMonotonicTime() });
  };

  const handlePause = useCallback(() => {
    dispatch({ type: 'PAUSE_GAME' });
  }, []);

  const handleResume = useCallback(() => {
    dispatch({ type: 'RESUME_GAME' });
  }, []);

  const handleRestart = useCallback(() => {
    sessionIdRef.current = historyRepository.generateSessionId('focus-finder');
    savedSessionIdRef.current = null;
    clearAllTimers();
    dispatch({ type: 'RESTART_GAME', startTimestamp: Date.now() });
  }, [clearAllTimers]);

  const handleQuitConfirm = useCallback(() => {
    setShowExitConfirm(false);
    clearAllTimers();
    navigation.goBack();
  }, [clearAllTimers, navigation]);

  const handleBackPress = useCallback(() => {
    if (state.phase === 'completed') {
      navigation.goBack();
      return;
    }
    setShowExitConfirm(true);
  }, [state.phase, navigation]);

  // Shape and color localized label helper
  const getShapeName = (shape: FocusFinderShape): string => {
    switch (shape) {
      case 'circle':
        return t.focusFinder.shapeCircle;
      case 'square':
        return t.focusFinder.shapeSquare;
      case 'triangle':
        return t.focusFinder.shapeTriangle;
      case 'diamond':
        return t.focusFinder.shapeDiamond;
      case 'star':
        return t.focusFinder.shapeStar;
      case 'hexagon':
        return t.focusFinder.shapeHexagon;
      default:
        return shape;
    }
  };

  const getColorName = (colorKey: FocusFinderColorKey): string => {
    switch (colorKey) {
      case 'cyan':
        return t.focusFinder.colorCyan;
      case 'amber':
        return t.focusFinder.colorAmber;
      case 'emerald':
        return t.focusFinder.colorEmerald;
      case 'rose':
        return t.focusFinder.colorRose;
      case 'violet':
        return t.focusFinder.colorViolet;
      case 'blue':
        return t.focusFinder.colorBlue;
      default:
        return colorKey;
    }
  };

  const getPatternName = (pattern: FocusFinderInnerPattern): string => {
    switch (pattern) {
      case 'ring':
        return t.focusFinder.patternRing;
      case 'cross':
        return t.focusFinder.patternCross;
      case 'dot':
        return t.focusFinder.patternDot;
      case 'solid':
      default:
        return t.focusFinder.patternSolid;
    }
  };

  // Grid sizing calculations
  const { cols, items, target, targetIndex, timeLimitMs } = state.currentRoundConfig;
  const horizontalPadding = 32;
  const gridWidth = Math.min(width - horizontalPadding, 420);
  const cellGap = 8;
  const availableCellWidth = (gridWidth - (cols - 1) * cellGap) / cols;
  const cellSize = Math.max(46, Math.min(74, Math.floor(availableCellWidth)));
  const iconSize = Math.max(26, Math.min(42, Math.floor(cellSize * 0.58)));

  const timerRatio = Math.max(0, Math.min(1, remainingTimeMs / timeLimitMs));
  const timerBarColor =
    timerRatio > 0.4 ? colors.attention : timerRatio > 0.2 ? colors.warning : colors.error;

  const targetDescription = `${getColorName(target.colorKey)} ${getShapeName(target.shape)}${
    target.pattern !== 'solid' ? ` (${getPatternName(target.pattern)})` : ''
  }`;

  return (
    <ScreenContainer scrollable={false} contentContainerStyle={styles.container}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={[styles.headerIconBtn, { borderColor: colors.border }]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t.common.back}
        >
          <ArrowLeftIcon size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>
            {t.focusFinder.gameTitle}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handlePause}
          style={[styles.headerIconBtn, { borderColor: colors.border }]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t.focusFinder.pausedTitle}
        >
          <PauseIcon size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricPill}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {t.focusFinder.roundCounter}
          </Text>
          <Text style={[typography.label, { color: colors.textPrimary, marginTop: 2 }]}>
            {state.currentRound}/{state.totalRounds}
          </Text>
        </View>

        <View style={styles.metricPill}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {t.focusFinder.levelLabel}
          </Text>
          <Text style={[typography.label, { color: colors.attention, marginTop: 2 }]}>
            Lvl {state.currentLevel}
          </Text>
        </View>

        {state.consecutiveHits >= 2 && (
          <View style={styles.metricPill}>
            <Text style={[typography.caption, { color: colors.speed }]}>
              {t.focusFinder.streakLabel}
            </Text>
            <View style={styles.streakRow}>
              <FlameIcon size={12} color={colors.speed} />
              <Text style={[typography.label, { color: colors.speed, marginLeft: 2 }]}>
                x{state.consecutiveHits}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.metricPill}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {t.focusFinder.scoreLabel}
          </Text>
          <Text style={[typography.label, { color: colors.primaryLight, marginTop: 2 }]}>
            {state.score.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Target Instruction Card */}
      <Card variant="highlighted" style={styles.targetCard}>
        <View style={styles.targetContentRow}>
          <View
            style={[
              styles.targetShapeBox,
              { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight },
            ]}
          >
            <FocusFinderShapeView
              shape={target.shape}
              colorKey={target.colorKey}
              pattern={target.pattern}
              size={44}
              contrastBg={colors.backgroundSecondary}
            />
          </View>

          <View style={styles.targetInfo}>
            <Text style={[typography.caption, { color: colors.textMuted, textTransform: 'uppercase' }]}>
              {t.focusFinder.findPrompt}
            </Text>
            <Text style={[typography.h3, { color: colors.textPrimary, marginTop: 2 }]}>
              {targetDescription}
            </Text>
          </View>
        </View>

        {/* Timer Bar */}
        <View style={[styles.timerTrack, { backgroundColor: colors.backgroundSecondary }]}>
          <View
            style={[
              styles.timerFill,
              {
                width: `${timerRatio * 100}%`,
                backgroundColor: timerBarColor,
              },
            ]}
          />
        </View>
      </Card>

      {/* Grid Container */}
      <View style={styles.gridOuterContainer}>
        {state.phase === 'countdown' ? (
          <View style={styles.countdownOverlay}>
            <Text style={[typography.statNumber, styles.countdownNumber, { color: colors.primaryLight }]}>
              {countdown > 0 ? countdown : 'GO!'}
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 12 }]}>
              {language === 'ml' ? 'ശ്രദ്ധ കേന്ദ്രീകരിക്കുക...' : 'Sharpen your focus...'}
            </Text>
          </View>
        ) : (
          <View style={[styles.gridBoard, { width: gridWidth }]}>
            {items.map((item, index) => {
              const isSelected = state.selectedItemIndex === index;
              const isCorrectTarget = index === targetIndex;
              const isFeedback = state.phase === 'feedback';

              let cellBorderColor = colors.border;
              let cellBgColor = colors.card;

              if (isFeedback) {
                if (isCorrectTarget) {
                  cellBorderColor = colors.success;
                  cellBgColor = 'rgba(16, 185, 129, 0.2)';
                } else if (isSelected && !isCorrectTarget) {
                  cellBorderColor = colors.error;
                  cellBgColor = 'rgba(239, 68, 68, 0.2)';
                }
              }

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  disabled={state.phase !== 'searching'}
                  onPress={() => handleItemPress(index)}
                  style={[
                    styles.gridCell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: cellBgColor,
                      borderColor: cellBorderColor,
                    },
                  ]}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`${getColorName(item.colorKey)} ${getShapeName(item.shape)}`}
                >
                  <FocusFinderShapeView
                    shape={item.shape}
                    colorKey={item.colorKey}
                    pattern={item.pattern}
                    size={iconSize}
                    contrastBg={cellBgColor}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Bottom Feedback Toast Banner */}
      {state.phase === 'feedback' && (
        <Card
          variant="elevated"
          style={[
            styles.feedbackBanner,
            {
              backgroundColor:
                state.lastRoundOutcome === 'hit'
                  ? 'rgba(16, 185, 129, 0.16)'
                  : state.lastRoundOutcome === 'miss'
                  ? 'rgba(239, 68, 68, 0.16)'
                  : 'rgba(245, 158, 11, 0.16)',
              borderColor:
                state.lastRoundOutcome === 'hit'
                  ? colors.success
                  : state.lastRoundOutcome === 'miss'
                  ? colors.error
                  : colors.warning,
            },
          ]}
        >
          <View style={styles.feedbackRow}>
            {state.lastRoundOutcome === 'hit' ? (
              <CheckCircleIcon size={22} color={colors.success} />
            ) : (
              <ClockIcon size={22} color={state.lastRoundOutcome === 'miss' ? colors.error : colors.warning} />
            )}
            <View style={styles.feedbackTextGroup}>
              <Text
                style={[
                  typography.label,
                  {
                    color:
                      state.lastRoundOutcome === 'hit'
                        ? colors.success
                        : state.lastRoundOutcome === 'miss'
                        ? colors.error
                        : colors.warning,
                  },
                ]}
              >
                {state.lastRoundOutcome === 'hit'
                  ? t.focusFinder.hitFeedback
                  : state.lastRoundOutcome === 'miss'
                  ? t.focusFinder.missFeedback
                  : t.focusFinder.timeoutFeedback}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {state.lastRoundOutcome === 'hit'
                  ? `+${state.lastRoundScore} pts`
                  : state.lastRoundOutcome === 'miss'
                  ? '-50 pts'
                  : '0 pts'}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Pause Modal */}
      <Modal visible={state.phase === 'paused'} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <Card variant="elevated" style={styles.modalContent}>
            <View style={[styles.modalIconCircle, { backgroundColor: colors.backgroundSecondary }]}>
              <PauseIcon size={36} color={colors.primaryLight} />
            </View>

            <Text style={[typography.h2, styles.modalTitle, { color: colors.textPrimary }]}>
              {t.focusFinder.pausedTitle}
            </Text>

            <View style={styles.modalBtnGroup}>
              <Button
                title={t.focusFinder.resumeCta}
                onPress={handleResume}
                variant="primary"
                size="md"
                icon={<PlayIcon size={18} color="#FFFFFF" />}
                style={styles.modalBtn}
              />
              <Button
                title={t.focusFinder.restartCta}
                onPress={handleRestart}
                variant="secondary"
                size="md"
                icon={<RotateCcwIcon size={18} color={colors.textPrimary} />}
                style={styles.modalBtn}
              />
              <Button
                title={t.focusFinder.quitCta}
                onPress={() => setShowExitConfirm(true)}
                variant="secondary"
                size="md"
                style={styles.modalBtn}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Quit Confirmation Modal */}
      <Modal visible={showExitConfirm} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <Card variant="elevated" style={styles.modalContent}>
            <Text style={[typography.h2, styles.modalTitle, { color: colors.textPrimary }]}>
              {t.focusFinder.quitConfirmTitle}
            </Text>

            <Text style={[typography.bodyMedium, styles.modalBody, { color: colors.textSecondary }]}>
              {t.focusFinder.quitConfirmMessage}
            </Text>

            <View style={styles.modalBtnGroup}>
              <Button
                title={t.focusFinder.keepPlayingCta}
                onPress={() => setShowExitConfirm(false)}
                variant="primary"
                size="md"
                style={styles.modalBtn}
              />
              <Button
                title={t.focusFinder.exitSessionCta}
                onPress={handleQuitConfirm}
                variant="secondary"
                size="md"
                style={styles.modalBtn}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Completion Modal */}
      <Modal visible={state.phase === 'completed'} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <Card variant="elevated" style={styles.modalContent}>
            <View style={[styles.modalIconCircle, { backgroundColor: 'rgba(0, 212, 178, 0.16)' }]}>
              <SparklesIcon size={38} color={colors.attention} />
            </View>

            <Text style={[typography.h2, styles.modalTitle, { color: colors.textPrimary }]}>
              {t.focusFinder.sessionCompleteTitle}
            </Text>

            <Text style={[typography.bodyMedium, styles.modalBody, { color: colors.textSecondary }]}>
              {t.focusFinder.sessionCompleteSubtitle}
            </Text>

            {/* Score Hero Card */}
            <View style={[styles.resultsScoreBanner, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {t.focusFinder.finalScoreLabel.toUpperCase()}
              </Text>
              <Text style={[typography.statNumber, { color: colors.attention, marginTop: 4 }]}>
                {state.sessionStats?.finalScore.toLocaleString() ?? state.score.toLocaleString()}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {t.focusFinder.scoreSubtitle}
              </Text>
            </View>

            {/* Results Grid */}
            <View style={styles.resultsGrid}>
              <View style={styles.resultsGridItem}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.focusFinder.accuracyLabel}
                </Text>
                <Text style={[typography.label, { color: colors.success, marginTop: 2 }]}>
                  {state.sessionStats?.accuracyPercentage ?? 0}%
                </Text>
              </View>

              <View style={styles.resultsGridItem}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.focusFinder.highestLevelLabel}
                </Text>
                <Text style={[typography.label, { color: colors.textPrimary, marginTop: 2 }]}>
                  Lvl {state.sessionStats?.highestLevel ?? state.highestLevelReached}
                </Text>
              </View>

              <View style={styles.resultsGridItem}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.focusFinder.bestFindTimeLabel}
                </Text>
                <Text style={[typography.label, { color: colors.primaryLight, marginTop: 2 }]}>
                  {state.sessionStats?.bestFindTimeMs !== undefined
                    ? `${state.sessionStats.bestFindTimeMs}ms`
                    : '--'}
                </Text>
              </View>

              <View style={styles.resultsGridItem}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.focusFinder.avgFindTimeLabel}
                </Text>
                <Text style={[typography.label, { color: colors.primaryLight, marginTop: 2 }]}>
                  {state.sessionStats?.avgFindTimeMs !== undefined
                    ? `${state.sessionStats.avgFindTimeMs}ms`
                    : '--'}
                </Text>
              </View>
            </View>

            {/* Breakdown Details */}
            <View style={[styles.breakdownRow, { borderTopColor: colors.border }]}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {t.focusFinder.targetHitsLabel}: {state.sessionStats?.targetHits ?? 0}/{state.totalRounds} •{' '}
                {t.focusFinder.missesLabel}: {state.sessionStats?.misses ?? 0}
              </Text>
            </View>

            <View style={styles.modalBtnGroup}>
              {route.params?.workoutMode ? (
                <>
                  <Button
                    title={
                      route.params.drillIndex === 2
                        ? t.dailyWorkout.viewSummaryCta
                        : t.dailyWorkout.continueWorkoutCta
                    }
                    onPress={() => (navigation as any).navigate('DailyWorkout')}
                    variant="primary"
                    size="md"
                    icon={<ArrowRightIcon size={18} color="#FFFFFF" />}
                    style={styles.modalBtn}
                  />
                  <Button
                    title={t.focusFinder.playAgainCta}
                    onPress={handleRestart}
                    variant="secondary"
                    size="md"
                    style={styles.modalBtn}
                  />
                </>
              ) : (
                <>
                  <Button
                    title={t.focusFinder.playAgainCta}
                    onPress={handleRestart}
                    variant="primary"
                    size="md"
                    icon={<RotateCcwIcon size={18} color="#FFFFFF" />}
                    style={styles.modalBtn}
                  />
                  <Button
                    title={t.focusFinder.finishCta}
                    onPress={() => navigation.goBack()}
                    variant="secondary"
                    size="md"
                    style={styles.modalBtn}
                  />
                </>
              )}
            </View>
          </Card>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    paddingBottom: 24,
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  metricPill: {
    alignItems: 'center',
    flex: 1,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  targetCard: {
    padding: 12,
    marginVertical: 8,
  },
  targetContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetShapeBox: {
    width: 58,
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  targetInfo: {
    flex: 1,
  },
  timerTrack: {
    height: 5,
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 3,
  },
  gridOuterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
  countdownOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  countdownNumber: {
    fontSize: 72,
    lineHeight: 80,
  },
  gridBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  gridCell: {
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackBanner: {
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackTextGroup: {
    marginLeft: 10,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    alignItems: 'center',
    padding: 22,
  },
  modalIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalBody: {
    textAlign: 'center',
    lineHeight: 20,
    marginVertical: 10,
  },
  modalBtnGroup: {
    width: '100%',
    gap: 10,
    marginTop: 14,
  },
  modalBtn: {
    width: '100%',
  },
  resultsScoreBanner: {
    width: '100%',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 12,
  },
  resultsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginVertical: 6,
  },
  resultsGridItem: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  breakdownRow: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    marginTop: 6,
  },
});
