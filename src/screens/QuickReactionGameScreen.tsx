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
import { StatBadge } from '../components/StatBadge';
import {
  ArrowLeftIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  ZapIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
} from '../components/SvgIcons';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';
import {
  createInitialQuickReactionState,
  quickReactionReducer,
  getQuickReactionLevelConfig,
} from '../games/quick-reaction';
import { historyRepository, CURRENT_SCHEMA_VERSION, getLocalDateKey, GameSessionRecord } from '../history';
import { workoutRepository } from '../workout';

const getMonotonicTime = (): number => {
  const perf = (globalThis as unknown as { performance?: { now?: () => number } }).performance;
  if (perf && typeof perf.now === 'function') {
    return perf.now();
  }
  return Date.now();
};

import { difficultyRepository } from '../difficulty';

type QuickReactionRouteProp = RouteProp<RootStackParamList, 'QuickReactionGame'>;

export const QuickReactionGameScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<QuickReactionRouteProp>();
  const { colors, typography } = useTheme();
  const { t } = useLocalization();
  const { width } = useWindowDimensions();

  const initialLevel = Math.max(
    1,
    Math.min(4, Math.round(route.params?.initialLevel ?? 1))
  );

  const [state, dispatch] = useReducer(quickReactionReducer, undefined, () =>
    createInitialQuickReactionState(initialLevel)
  );

  const sessionIdRef = useRef<string>(historyRepository.generateSessionId('quick-reaction'));
  const savedSessionIdRef = useRef<string | null>(null);

  const [countdown, setCountdown] = useState<number>(3);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  // Timers
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Round token to prevent any stale async callbacks from affecting newer rounds
  const roundTokenRef = useRef<number>(0);

  const clearAllTimers = useCallback(() => {
    if (waitTimerRef.current) {
      clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // 1. Initial Countdown
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
            const waitMs = state.targetWaitDurationMs;
            dispatch({ type: 'START_WAITING', waitDurationMs: waitMs });
            return 0;
          }
          return prev - 1;
        });
      }, 800);
    }
    return () => clearAllTimers();
  }, [state.phase, state.currentLevel, state.targetWaitDurationMs, clearAllTimers]);

  // 2. Waiting Phase Handler: schedules the green trigger
  useEffect(() => {
    if (state.phase === 'waiting') {
      clearAllTimers();
      roundTokenRef.current += 1;
      const currentToken = roundTokenRef.current;

      waitTimerRef.current = setTimeout(() => {
        // Only trigger if token matches current active round
        if (roundTokenRef.current === currentToken) {
          dispatch({
            type: 'SHOW_TRIGGER',
            triggerTimestamp: getMonotonicTime(),
          });
        }
      }, state.targetWaitDurationMs);
    }
    return () => {
      if (waitTimerRef.current) {
        clearTimeout(waitTimerRef.current);
        waitTimerRef.current = null;
      }
    };
  }, [state.phase, state.targetWaitDurationMs, clearAllTimers]);

  // 3. Trigger Phase Handler: sets response timeout limit
  useEffect(() => {
    if (state.phase === 'trigger') {
      if (waitTimerRef.current) {
        clearTimeout(waitTimerRef.current);
        waitTimerRef.current = null;
      }
      roundTokenRef.current += 1;
      const currentToken = roundTokenRef.current;
      const config = getQuickReactionLevelConfig(state.currentLevel);

      timeoutTimerRef.current = setTimeout(() => {
        if (roundTokenRef.current === currentToken) {
          dispatch({ type: 'TIMEOUT_TRIGGER' });
        }
      }, config.timeoutDurationMs);
    }
    return () => {
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
        timeoutTimerRef.current = null;
      }
    };
  }, [state.phase, state.currentLevel]);

  // 4. Round Feedback Phase Handler: shows feedback interstitial then advances
  useEffect(() => {
    if (state.phase === 'round-feedback') {
      clearAllTimers();
      roundTokenRef.current += 1;
      const currentToken = roundTokenRef.current;

      feedbackTimerRef.current = setTimeout(() => {
        if (roundTokenRef.current === currentToken) {
          dispatch({ type: 'END_ROUND_FEEDBACK' });
        }
      }, 1400);
    }
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
    };
  }, [state.phase, clearAllTimers]);

  // 5. AppState Lifecycle Handling (Pause when app goes to background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        clearAllTimers();
        dispatch({ type: 'PAUSE_GAME' });
      }
    });
    return () => {
      subscription.remove();
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // 6. Automatic Session History Persistence
  useEffect(() => {
    if (state.phase === 'completed' && state.sessionStats) {
      if (savedSessionIdRef.current !== sessionIdRef.current) {
        savedSessionIdRef.current = sessionIdRef.current;
        const stats = state.sessionStats;
        const sessionRecord: GameSessionRecord = {
          id: sessionIdRef.current,
          schemaVersion: CURRENT_SCHEMA_VERSION,
          gameId: 'quick-reaction',
          startedAt: new Date(state.sessionStartTime || Date.now()).toISOString(),
          completedAt: stats.completedAt,
          dateKey: getLocalDateKey(new Date(stats.completedAt)),
          outcome: 'completed',
          finalScore: stats.finalScore,
          accuracyPercentage: stats.accuracyPercentage,
          roundsCompleted: stats.roundsCompleted,
          totalRounds: stats.totalRounds,
          highestLevel: stats.highestLevel,
          startingLevel: initialLevel,
          durationMs: stats.totalDurationMs,
          gameSpecificMetrics: {
            bestReactionMs: stats.bestReactionMs,
            avgReactionMs: stats.avgReactionMs,
            medianReactionMs: stats.medianReactionMs,
            validHits: stats.validHits,
            falseStarts: stats.falseStarts,
            timeouts: stats.timeouts,
          },
        };
        historyRepository.saveSession(sessionRecord);
        difficultyRepository.processSessionCompletion(sessionRecord).catch(() => {});

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
  }, [state.phase, state.sessionStats, state.sessionStartTime, route.params?.workoutMode, route.params?.drillIndex, initialLevel]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // Primary Gameplay Tap Action
  const handleTargetPress = useCallback(() => {
    if (state.phase === 'waiting' || state.phase === 'trigger') {
      const now = getMonotonicTime();
      clearAllTimers();
      dispatch({ type: 'RECORD_TAP', tapTimestamp: now });
    }
  }, [state.phase, clearAllTimers]);

  // Pause & Resume
  const handlePause = useCallback(() => {
    clearAllTimers();
    dispatch({ type: 'PAUSE_GAME' });
  }, [clearAllTimers]);

  const handleResume = useCallback(() => {
    if (state.previousPhase === 'countdown') {
      setCountdown(3);
    }
    dispatch({ type: 'RESUME_GAME' });
  }, [state.previousPhase]);

  const handleRestart = useCallback(() => {
    clearAllTimers();
    setCountdown(3);
    sessionIdRef.current = historyRepository.generateSessionId('quick-reaction');
    savedSessionIdRef.current = null;
    dispatch({ type: 'RESTART_GAME', initialLevel });
  }, [clearAllTimers, initialLevel]);

  const handleQuitConfirm = useCallback(() => {
    clearAllTimers();
    setShowExitConfirm(false);
    navigation.goBack();
  }, [clearAllTimers, navigation]);

  const handleBackPress = useCallback(() => {
    if (state.phase === 'completed') {
      navigation.goBack();
      return;
    }
    clearAllTimers();
    dispatch({ type: 'PAUSE_GAME' });
    setShowExitConfirm(true);
  }, [state.phase, clearAllTimers, navigation]);

  // Android Hardware Back Button
  useEffect(() => {
    const onHardwareBack = () => {
      handleBackPress();
      return true;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => backSub.remove();
  }, [handleBackPress]);

  // Dynamic visual styles for stimulus zone
  const stimulusSize = Math.min(width - 48, 300);

  const renderFeedbackContent = () => {
    if (state.currentRoundOutcome === 'hit') {
      const isFast = (state.currentRoundReactionMs || 0) < 250;
      return (
        <View style={styles.feedbackContainer}>
          <View style={[styles.feedbackBadge, { backgroundColor: 'rgba(16, 185, 129, 0.16)' }]}>
            <ZapIcon size={36} color={colors.speed} />
          </View>
          <Text style={[typography.h1, { color: colors.textPrimary, marginTop: 12 }]}>
            {state.currentRoundReactionMs} {t.quickReaction.ms}
          </Text>
          <Text style={[typography.label, { color: colors.speed, marginTop: 4 }]}>
            {isFast ? t.quickReaction.hitFeedbackFast : t.quickReaction.hitFeedbackNormal}
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 4 }]}>
            +{state.currentRoundScore} {t.progress.pts}
          </Text>
        </View>
      );
    }

    if (state.currentRoundOutcome === 'false-start') {
      return (
        <View style={styles.feedbackContainer}>
          <View style={[styles.feedbackBadge, { backgroundColor: 'rgba(239, 68, 68, 0.16)' }]}>
            <RotateCcwIcon size={36} color={colors.error} />
          </View>
          <Text style={[typography.h2, { color: colors.error, marginTop: 12 }]}>
            {t.quickReaction.falseStartFeedback}
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 6, textAlign: 'center' }]}>
            {t.quickReaction.falseStartSub}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 6 }]}>
            +0 {t.progress.pts}
          </Text>
        </View>
      );
    }

    if (state.currentRoundOutcome === 'timeout') {
      return (
        <View style={styles.feedbackContainer}>
          <View style={[styles.feedbackBadge, { backgroundColor: 'rgba(245, 158, 11, 0.16)' }]}>
            <ClockIcon size={36} color={colors.warning} />
          </View>
          <Text style={[typography.h2, { color: colors.warning, marginTop: 12 }]}>
            {t.quickReaction.timeoutFeedback}
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 6, textAlign: 'center' }]}>
            {t.quickReaction.timeoutSub}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 6 }]}>
            +0 {t.progress.pts}
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <ScreenContainer scrollable={false} contentContainerStyle={styles.container}>
      {/* Top Navigation & Status Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={[styles.iconButton, { backgroundColor: colors.backgroundSecondary }]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t.common.back}
        >
          <ArrowLeftIcon size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.statsGroup}>
          <StatBadge
            label={`${t.quickReaction.roundCounter} ${state.currentRound}/${state.totalRounds}`}
            variant="neutral"
            size="md"
          />
          <StatBadge
            label={`${t.quickReaction.levelLabel} ${state.currentLevel}`}
            variant="primary"
            size="md"
            style={{ marginLeft: 6 }}
          />
        </View>

        <TouchableOpacity
          onPress={handlePause}
          style={[styles.iconButton, { backgroundColor: colors.backgroundSecondary }]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t.quickReaction.pausedTitle}
        >
          <PauseIcon size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Score Header */}
      <View style={styles.scoreHeader}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {t.quickReaction.scoreLabel.toUpperCase()}
        </Text>
        <Text style={[typography.h2, { color: colors.primaryLight, marginTop: 2 }]}>
          {state.score.toLocaleString()}
        </Text>
      </View>

      {/* Main Interactive Field */}
      <View style={styles.centerArea}>
        {state.phase === 'countdown' ? (
          <View style={styles.countdownWrapper}>
            <Text style={[typography.statNumber, { color: colors.primaryLight, fontSize: 80, lineHeight: 88 }]}>
              {countdown}
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 16, textAlign: 'center' }]}>
              {t.quickReaction.countdownHint}
            </Text>
          </View>
        ) : state.phase === 'round-feedback' ? (
          renderFeedbackContent()
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleTargetPress}
            style={[
              styles.stimulusZone,
              {
                width: stimulusSize,
                height: stimulusSize,
                borderRadius: stimulusSize / 2,
                backgroundColor: state.phase === 'trigger' ? '#10B981' : colors.backgroundElevated,
                borderColor: state.phase === 'trigger' ? '#34D399' : colors.border,
              },
            ]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={
              state.phase === 'trigger' ? t.quickReaction.triggerPhase : t.quickReaction.waitPhase
            }
          >
            {state.phase === 'trigger' ? (
              <View style={styles.stimulusInner}>
                <ZapIcon size={56} color="#FFFFFF" />
                <Text style={[typography.h1, { color: '#FFFFFF', marginTop: 12, fontWeight: '800' }]}>
                  {t.quickReaction.triggerPhase}
                </Text>
              </View>
            ) : (
              <View style={styles.stimulusInner}>
                <ClockIcon size={44} color={colors.warning} />
                <Text style={[typography.h3, { color: colors.textSecondary, marginTop: 12 }]}>
                  {t.quickReaction.waitPhase}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Pause Modal Overlay */}
      <Modal
        visible={state.phase === 'paused' && !showExitConfirm}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalBackdrop}>
          <Card variant="elevated" style={styles.modalCard}>
            <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}>
              {t.quickReaction.pausedTitle}
            </Text>
            <View style={styles.modalBtnGroup}>
              <Button
                title={t.quickReaction.resumeCta}
                onPress={handleResume}
                variant="primary"
                size="lg"
                icon={<PlayIcon size={18} color="#FFFFFF" />}
              />
              <Button
                title={t.quickReaction.restartCta}
                onPress={handleRestart}
                variant="secondary"
                size="md"
                style={{ marginTop: 10 }}
                icon={<RotateCcwIcon size={18} color={colors.primaryLight} />}
              />
              <Button
                title={t.quickReaction.quitCta}
                onPress={() => setShowExitConfirm(true)}
                variant="ghost"
                size="md"
                style={{ marginTop: 6 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Exit Confirmation Dialog */}
      <Modal
        visible={showExitConfirm}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalBackdrop}>
          <Card variant="elevated" style={styles.modalCard}>
            <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}>
              {t.quickReaction.quitConfirmTitle}
            </Text>
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.textSecondary, textAlign: 'center', marginTop: 8 },
              ]}
            >
              {t.quickReaction.quitConfirmMessage}
            </Text>
            <View style={[styles.modalBtnGroup, { marginTop: 20 }]}>
              <Button
                title={t.quickReaction.keepPlayingCta}
                onPress={() => setShowExitConfirm(false)}
                variant="primary"
                size="lg"
              />
              <Button
                title={t.quickReaction.exitSessionCta}
                onPress={handleQuitConfirm}
                variant="ghost"
                size="md"
                style={{ marginTop: 10 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Results / Session Completed Modal */}
      <Modal
        visible={state.phase === 'completed'}
        transparent={false}
        animationType="slide"
      >
        <ScreenContainer scrollable={true} contentContainerStyle={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <View style={[styles.resultBadgeCircle, { backgroundColor: 'rgba(16, 185, 129, 0.16)' }]}>
              <CheckCircleIcon size={44} color={colors.speed} />
            </View>
            <Text style={[typography.h1, { color: colors.textPrimary, marginTop: 16, textAlign: 'center' }]}>
              {t.quickReaction.sessionCompleteTitle}
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 6, textAlign: 'center' }]}>
              {t.quickReaction.sessionCompleteSubtitle}
            </Text>
          </View>

          {/* Primary Score Highlight */}
          <Card variant="highlighted" style={styles.scoreHighlightCard}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {t.quickReaction.finalScoreLabel.toUpperCase()}
            </Text>
            <Text style={[typography.statNumber, { color: colors.primaryLight, fontSize: 44, lineHeight: 52, marginTop: 4 }]}>
              {state.sessionStats?.finalScore.toLocaleString() ?? state.score.toLocaleString()}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
              {t.quickReaction.scoreSubtitle}
            </Text>
          </Card>

          {/* Speed & Accuracy Breakdown Metrics */}
          <Card variant="elevated" style={styles.statsGridCard}>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.quickReaction.bestReactionLabel}
                </Text>
                <Text style={[typography.h2, { color: colors.speed, marginTop: 4 }]}>
                  {state.sessionStats?.bestReactionMs !== undefined
                    ? `${state.sessionStats.bestReactionMs} ${t.quickReaction.ms}`
                    : '--'}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.quickReaction.avgReactionLabel}
                </Text>
                <Text style={[typography.h2, { color: colors.primaryLight, marginTop: 4 }]}>
                  {state.sessionStats?.avgReactionMs !== undefined
                    ? `${state.sessionStats.avgReactionMs} ${t.quickReaction.ms}`
                    : '--'}
                </Text>
              </View>
            </View>

            <View style={[styles.statsRow, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 16, paddingTop: 16 }]}>
              <View style={styles.statBox}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.quickReaction.medianReactionLabel}
                </Text>
                <Text style={[typography.h2, { color: colors.attention, marginTop: 4 }]}>
                  {state.sessionStats?.medianReactionMs !== undefined
                    ? `${state.sessionStats.medianReactionMs} ${t.quickReaction.ms}`
                    : '--'}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.quickReaction.accuracyLabel}
                </Text>
                <Text style={[typography.h2, { color: colors.success, marginTop: 4 }]}>
                  {state.sessionStats?.accuracyPercentage ?? 0}%
                </Text>
              </View>
            </View>

            <View style={[styles.statsRow, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 16, paddingTop: 16 }]}>
              <View style={styles.statBox}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.quickReaction.validHitsLabel}
                </Text>
                <Text style={[typography.label, { color: colors.textPrimary, marginTop: 4 }]}>
                  {state.sessionStats?.validHits ?? 0}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.quickReaction.falseStartsLabel}
                </Text>
                <Text style={[typography.label, { color: colors.error, marginTop: 4 }]}>
                  {state.sessionStats?.falseStarts ?? 0}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.quickReaction.timeoutsLabel}
                </Text>
                <Text style={[typography.label, { color: colors.warning, marginTop: 4 }]}>
                  {state.sessionStats?.timeouts ?? 0}
                </Text>
              </View>
            </View>
          </Card>

          {/* Action CTAs */}
          <View style={styles.resultActions}>
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
                  size="lg"
                  icon={<ArrowRightIcon size={18} color="#FFFFFF" />}
                />
                <Button
                  title={t.quickReaction.playAgainCta}
                  onPress={handleRestart}
                  variant="secondary"
                  size="md"
                  style={styles.finishBtn}
                />
              </>
            ) : (
              <>
                <Button
                  title={t.quickReaction.playAgainCta}
                  onPress={handleRestart}
                  variant="primary"
                  size="lg"
                  icon={<RotateCcwIcon size={18} color="#FFFFFF" />}
                />
                <Button
                  title={t.quickReaction.finishCta}
                  onPress={() => navigation.goBack()}
                  variant="secondary"
                  size="md"
                  style={styles.finishBtn}
                />
              </>
            )}
          </View>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreHeader: {
    alignItems: 'center',
    marginTop: 8,
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stimulusZone: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  stimulusInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  feedbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  feedbackBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    alignItems: 'center',
  },
  modalBtnGroup: {
    width: '100%',
    marginTop: 24,
  },
  resultContainer: {
    padding: 24,
    alignItems: 'center',
  },
  resultHeader: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  resultBadgeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreHighlightCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 16,
  },
  statsGridCard: {
    width: '100%',
    padding: 16,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  resultActions: {
    width: '100%',
    marginTop: 8,
    marginBottom: 32,
  },
  finishBtn: {
    marginTop: 12,
  },
});
