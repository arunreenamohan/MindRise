import React, { useReducer, useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { StatBadge } from '../components/StatBadge';
import {
  ArrowLeftIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  HeartIcon,
  SparklesIcon,
  CheckCircleIcon,
  ZapIcon,
  LayersIcon,
  DeleteIcon,
} from '../components/SvgIcons';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';
import {
  createInitialNumberRecallState,
  numberRecallReducer,
  generateSequence,
  getNumberRecallLevelConfig,
} from '../games/number-recall';

export const NumberRecallGameScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, typography, radius } = useTheme();
  const { t } = useLocalization();
  const { width } = useWindowDimensions();

  const [state, dispatch] = useReducer(numberRecallReducer, undefined, () =>
    createInitialNumberRecallState(1)
  );

  const [countdown, setCountdown] = useState<number>(3);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // 1. Initial Countdown Handling
  useEffect(() => {
    if (state.phase === 'countdown') {
      setCountdown(3);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            // Transition into round 1 sequence display
            const config = getNumberRecallLevelConfig(state.currentLevel);
            const sequence = generateSequence({ length: config.sequenceLength });
            dispatch({
              type: 'START_DISPLAY',
              targetSequence: sequence,
              displayDurationMs: config.displayDurationMs,
            });
            return 0;
          }
          return prev - 1;
        });
      }, 800);
    }
    return () => clearTimers();
  }, [state.phase, state.currentLevel, clearTimers]);

  // 2. Display Phase Timer Handling
  useEffect(() => {
    if (state.phase === 'display') {
      clearTimers();
      // If sequence hasn't been generated yet for this round, generate it
      if (state.targetSequence.length === 0) {
        const config = getNumberRecallLevelConfig(state.currentLevel);
        const sequence = generateSequence({ length: config.sequenceLength });
        dispatch({
          type: 'START_DISPLAY',
          targetSequence: sequence,
          displayDurationMs: config.displayDurationMs,
        });
        return;
      }

      timerRef.current = setTimeout(() => {
        dispatch({ type: 'START_RECALL' });
      }, state.displayDurationMs);
    }
    return () => clearTimers();
  }, [state.phase, state.displayDurationMs, state.targetSequence.length, state.currentLevel, clearTimers]);

  // 3. Round Feedback Phase Timer Handling
  useEffect(() => {
    if (state.phase === 'round-feedback') {
      clearTimers();
      timerRef.current = setTimeout(() => {
        dispatch({ type: 'END_ROUND_FEEDBACK' });
      }, 1500);
    }
    return () => clearTimers();
  }, [state.phase, clearTimers]);

  // 4. AppState / Background Interruption Safety
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        clearTimers();
        dispatch({ type: 'PAUSE_GAME' });
      }
    });
    return () => {
      subscription.remove();
      clearTimers();
    };
  }, [clearTimers]);

  // Unmount Cleanup
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // Keypad Actions
  const handleDigitPress = (digit: string) => {
    if (state.phase !== 'recall') return;
    dispatch({ type: 'APPEND_DIGIT', digit });
  };

  const handleDeletePress = () => {
    if (state.phase !== 'recall') return;
    dispatch({ type: 'DELETE_DIGIT' });
  };

  const handleClearPress = () => {
    if (state.phase !== 'recall') return;
    dispatch({ type: 'CLEAR_INPUT' });
  };

  const handleSubmitPress = () => {
    if (state.phase !== 'recall') return;
    if (state.inputSequence.length === 0) return;
    dispatch({ type: 'SUBMIT_ANSWER' });
  };

  const handlePause = useCallback(() => {
    clearTimers();
    dispatch({ type: 'PAUSE_GAME' });
  }, [clearTimers]);

  const handleResume = useCallback(() => {
    if (state.previousPhase === 'countdown') {
      setCountdown(3);
    }
    dispatch({ type: 'RESUME_GAME' });
  }, [state.previousPhase]);

  const handleRestart = useCallback(() => {
    clearTimers();
    setCountdown(3);
    dispatch({ type: 'RESTART_GAME' });
  }, [clearTimers]);

  const handleQuitConfirm = useCallback(() => {
    clearTimers();
    setShowExitConfirm(false);
    navigation.goBack();
  }, [clearTimers, navigation]);

  const handleBackPress = useCallback(() => {
    if (state.phase === 'completed' || state.phase === 'game-over') {
      navigation.goBack();
      return;
    }
    clearTimers();
    dispatch({ type: 'PAUSE_GAME' });
    setShowExitConfirm(true);
  }, [state.phase, clearTimers, navigation]);

  // Hardware Back Button (Android)
  useEffect(() => {
    const onHardwareBack = () => {
      if (showExitConfirm) {
        setShowExitConfirm(false);
        if (state.phase === 'paused') {
          handleResume();
        }
        return true;
      }
      handleBackPress();
      return true;
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => backSubscription.remove();
  }, [showExitConfirm, state.phase, handleBackPress, handleResume]);

  // Keypad layout metrics
  const keypadMetrics = useMemo(() => {
    const maxKeypadWidth = Math.min(width - 32, 360);
    const keyGap = 8;
    const keyWidth = Math.floor((maxKeypadWidth - keyGap * 2) / 3);
    const keyHeight = 54;
    return { maxKeypadWidth, keyGap, keyWidth, keyHeight };
  }, [width]);

  // Render Result Screen
  if (state.phase === 'completed' || state.phase === 'game-over') {
    const isSuccess = state.phase === 'completed';
    const stats = state.sessionStats;

    return (
      <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
        <View style={styles.resultsHero}>
          <View
            style={[
              styles.resultsBadgeCircle,
              {
                backgroundColor: isSuccess ? `${colors.primaryLight}22` : `${colors.warning}22`,
                borderColor: isSuccess ? colors.primaryLight : colors.warning,
              },
            ]}
          >
            <LayersIcon size={52} color={isSuccess ? colors.primaryLight : colors.warning} />
          </View>

          <StatBadge
            label={isSuccess ? 'SESSION COMPLETED' : 'SESSION CONCLUDED'}
            variant={isSuccess ? 'primary' : 'warning'}
            icon={<SparklesIcon size={12} color={isSuccess ? colors.primaryLight : colors.warning} />}
            style={styles.resultsStatusBadge}
          />

          <Text style={[typography.h1, { color: colors.textPrimary, marginTop: 8 }]}>
            {isSuccess ? t.numberRecall.sessionCompleteTitle : t.numberRecall.gameOverTitle}
          </Text>
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
            ]}
          >
            {isSuccess
              ? t.numberRecall.sessionCompleteSubtitle
              : t.numberRecall.gameOverSubtitle}
          </Text>
        </View>

        {/* Big Score Card */}
        <Card variant="highlighted" style={styles.scoreSummaryCard}>
          <Text style={[typography.caption, { color: colors.primaryLight }]}>
            {t.numberRecall.finalScoreLabel.toUpperCase()}
          </Text>
          <Text style={[typography.statNumber, { color: colors.textPrimary, marginTop: 6 }]}>
            {stats?.finalScore.toLocaleString() ?? state.score.toLocaleString()}
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
            {t.numberRecall.scoreSubtitle}
          </Text>
        </Card>

        {/* 4-Stat Metrics Grid */}
        <View style={styles.metricsGrid}>
          <Card variant="elevated" style={styles.metricCard}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {t.numberRecall.accuracyLabel}
            </Text>
            <Text style={[typography.h2, { color: colors.attention, marginTop: 6 }]}>
              {stats?.accuracyPercentage ?? 0}%
            </Text>
          </Card>

          <Card variant="elevated" style={styles.metricCard}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {t.numberRecall.maxSpanLabel}
            </Text>
            <Text style={[typography.h2, { color: colors.primaryLight, marginTop: 6 }]}>
              {stats?.maxDigitSpan ?? state.maxDigitSpan} {t.numberRecall.digitsLabel}
            </Text>
          </Card>

          <Card variant="elevated" style={styles.metricCard}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {t.numberRecall.perfectRoundsLabel}
            </Text>
            <Text style={[typography.h2, { color: colors.success, marginTop: 6 }]}>
              {stats?.perfectRounds ?? 0} / {stats?.roundsCompleted ?? 0}
            </Text>
          </Card>

          <Card variant="elevated" style={styles.metricCard}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {t.numberRecall.roundsPlayedLabel}
            </Text>
            <Text style={[typography.h2, { color: colors.textPrimary, marginTop: 6 }]}>
              {stats?.roundsCompleted ?? 0} / {state.totalRounds}
            </Text>
          </Card>
        </View>

        {/* Actions */}
        <View style={styles.resultsActions}>
          <Button
            title={t.numberRecall.playAgainCta}
            onPress={handleRestart}
            variant="primary"
            size="lg"
            icon={<RotateCcwIcon size={18} color="#FFFFFF" />}
          />
          <Button
            title={t.numberRecall.finishCta}
            onPress={() => navigation.goBack()}
            variant="secondary"
            size="md"
            style={styles.finishBtn}
          />
        </View>
      </ScreenContainer>
    );
  }

  // Active Game View
  const lastRound = state.roundHistory[state.roundHistory.length - 1];
  const isRoundFeedbackCorrect = state.phase === 'round-feedback' && lastRound?.isCorrect;
  const targetLen =
    state.phase === 'round-feedback' && lastRound
      ? lastRound.sequenceLength
      : state.targetSequence.length || getNumberRecallLevelConfig(state.currentLevel).sequenceLength;

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleBackPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[styles.circleBtn, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}
        >
          <ArrowLeftIcon size={18} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.pillsRow}>
          <StatBadge
            label={`${t.numberRecall.roundCounter.toUpperCase()} ${state.currentRound}/${state.totalRounds}`}
            variant="neutral"
            size="sm"
          />
          <StatBadge
            label={`${t.numberRecall.levelLabel.toUpperCase()} ${state.currentLevel}`}
            variant="primary"
            size="sm"
          />
        </View>

        <TouchableOpacity
          onPress={handlePause}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Pause"
          style={[styles.circleBtn, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}
        >
          <PauseIcon size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Lives / Strikes and Score Header */}
      <View style={styles.statsBar}>
        <View style={styles.livesRow}>
          {[1, 2, 3].map((strikeNum) => {
            const isRemaining = strikeNum <= state.strikesRemaining;
            return (
              <View key={strikeNum} style={styles.heartWrapper}>
                <HeartIcon
                  size={20}
                  color={isRemaining ? colors.speed : colors.borderLight}
                  filled={isRemaining}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.scoreRow}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {t.numberRecall.scoreLabel.toUpperCase()}:
          </Text>
          <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: 6 }]}>
            {state.score}
          </Text>
          {state.consecutiveCorrectRounds >= 2 && (
            <StatBadge
              label={`${state.consecutiveCorrectRounds}x STREAK`}
              variant="accent"
              size="sm"
              style={styles.streakBadge}
            />
          )}
        </View>
      </View>

      {/* Phase Banner */}
      <Card
        variant={state.phase === 'display' ? 'highlighted' : 'elevated'}
        style={styles.instructionBanner}
      >
        {state.phase === 'countdown' && (
          <View style={styles.bannerContent}>
            <Text style={[typography.h2, { color: colors.primaryLight, textAlign: 'center' }]}>
              {countdown > 0 ? countdown : 'START!'}
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>
              {t.numberRecall.countdownHint}
            </Text>
          </View>
        )}

        {state.phase === 'display' && (
          <View style={styles.bannerContent}>
            <View style={styles.bannerTitleRow}>
              <SparklesIcon size={18} color={colors.primaryLight} />
              <Text style={[typography.label, { color: colors.primaryLight, marginLeft: 6 }]}>
                {t.numberRecall.memorizePhase}
              </Text>
            </View>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>
              {state.targetSequence.length} {t.numberRecall.digitsLabel}
            </Text>
          </View>
        )}

        {state.phase === 'recall' && (
          <View style={styles.bannerContent}>
            <View style={styles.bannerTitleRow}>
              <ZapIcon size={18} color={colors.warning} />
              <Text style={[typography.label, { color: colors.textPrimary, marginLeft: 6 }]}>
                {t.numberRecall.recallPhase}
              </Text>
            </View>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>
              {state.inputSequence.length} / {state.targetSequence.length} {t.numberRecall.digitsLabel}
            </Text>
          </View>
        )}

        {state.phase === 'round-feedback' && (
          <View style={styles.bannerContent}>
            <Text
              style={[
                typography.label,
                { color: isRoundFeedbackCorrect ? colors.success : colors.speed, textAlign: 'center' },
              ]}
            >
              {isRoundFeedbackCorrect
                ? t.numberRecall.correctFeedback
                : t.numberRecall.incorrectFeedback}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>
              {isRoundFeedbackCorrect
                ? `+${state.roundScore} ${t.numberRecall.correctFeedbackSub}`
                : t.numberRecall.incorrectFeedbackSub}
            </Text>
          </View>
        )}
      </Card>

      {/* Main Display / Input Area */}
      <View style={styles.displayAreaWrapper}>
        {state.phase === 'display' && (
          <View style={styles.sequenceContainer}>
            <View style={styles.digitsRow}>
              {state.targetSequence.split('').map((char, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.digitTile,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.primaryLight,
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <Text style={[styles.digitText, { color: '#FFFFFF' }]}>{char}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {(state.phase === 'recall' || state.phase === 'countdown' || state.phase === 'paused') && (
          <View style={styles.sequenceContainer}>
            <View style={styles.digitsRow}>
              {Array.from({ length: targetLen }, (_, idx) => {
                const char = state.inputSequence[idx];
                const isCurrent = idx === state.inputSequence.length && state.phase === 'recall';
                const hasChar = char !== undefined;

                return (
                  <View
                    key={idx}
                    accessibilityLabel={`Digit position ${idx + 1}: ${hasChar ? char : 'empty'}`}
                    style={[
                      styles.digitTile,
                      {
                        backgroundColor: hasChar
                          ? colors.backgroundElevated
                          : colors.backgroundSecondary,
                        borderColor: isCurrent
                          ? colors.primaryLight
                          : hasChar
                          ? colors.borderLight
                          : colors.border,
                        borderWidth: isCurrent ? 2 : 1.5,
                        borderRadius: radius.md,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.digitText,
                        { color: hasChar ? colors.textPrimary : colors.textMuted },
                      ]}
                    >
                      {hasChar ? char : isCurrent ? '_' : ' '}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {state.phase === 'round-feedback' && lastRound && (
          <View style={styles.feedbackContainer}>
            <View style={styles.feedbackRow}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {t.numberRecall.targetLength}:
              </Text>
              <View style={styles.feedbackDigitsRow}>
                {lastRound.targetSequence.split('').map((char, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.smallDigitTile,
                      {
                        backgroundColor: isRoundFeedbackCorrect
                          ? `${colors.success}33`
                          : `${colors.primaryLight}33`,
                        borderColor: isRoundFeedbackCorrect ? colors.success : colors.primaryLight,
                        borderRadius: radius.sm,
                      },
                    ]}
                  >
                    <Text style={[styles.smallDigitText, { color: colors.textPrimary }]}>
                      {char}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.feedbackRow, { marginTop: 8 }]}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {t.numberRecall.enteredDigits}:
              </Text>
              <View style={styles.feedbackDigitsRow}>
                {lastRound.submittedSequence.split('').map((char, idx) => {
                  const isMatch = lastRound.targetSequence[idx] === char;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.smallDigitTile,
                        {
                          backgroundColor: isMatch
                            ? `${colors.success}33`
                            : `${colors.error}33`,
                          borderColor: isMatch ? colors.success : colors.error,
                          borderRadius: radius.sm,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.smallDigitText,
                          { color: isMatch ? colors.success : colors.error },
                        ]}
                      >
                        {char}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Numeric Keypad Area */}
      <View style={[styles.keypadContainer, { width: keypadMetrics.maxKeypadWidth }]}>
        {/* Row 1: 1, 2, 3 */}
        <View style={styles.keypadRow}>
          {['1', '2', '3'].map((digit) => (
            <TouchableOpacity
              key={digit}
              onPress={() => handleDigitPress(digit)}
              disabled={state.phase !== 'recall'}
              activeOpacity={0.65}
              accessibilityRole="button"
              accessibilityLabel={digit}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              style={[
                styles.keyButton,
                {
                  width: keypadMetrics.keyWidth,
                  height: keypadMetrics.keyHeight,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  opacity: state.phase === 'recall' ? 1 : 0.45,
                },
              ]}
            >
              <Text style={[styles.keyText, { color: colors.textPrimary }]}>{digit}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Row 2: 4, 5, 6 */}
        <View style={styles.keypadRow}>
          {['4', '5', '6'].map((digit) => (
            <TouchableOpacity
              key={digit}
              onPress={() => handleDigitPress(digit)}
              disabled={state.phase !== 'recall'}
              activeOpacity={0.65}
              accessibilityRole="button"
              accessibilityLabel={digit}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              style={[
                styles.keyButton,
                {
                  width: keypadMetrics.keyWidth,
                  height: keypadMetrics.keyHeight,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  opacity: state.phase === 'recall' ? 1 : 0.45,
                },
              ]}
            >
              <Text style={[styles.keyText, { color: colors.textPrimary }]}>{digit}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Row 3: 7, 8, 9 */}
        <View style={styles.keypadRow}>
          {['7', '8', '9'].map((digit) => (
            <TouchableOpacity
              key={digit}
              onPress={() => handleDigitPress(digit)}
              disabled={state.phase !== 'recall'}
              activeOpacity={0.65}
              accessibilityRole="button"
              accessibilityLabel={digit}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              style={[
                styles.keyButton,
                {
                  width: keypadMetrics.keyWidth,
                  height: keypadMetrics.keyHeight,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  opacity: state.phase === 'recall' ? 1 : 0.45,
                },
              ]}
            >
              <Text style={[styles.keyText, { color: colors.textPrimary }]}>{digit}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Row 4: Clear, 0, Delete */}
        <View style={styles.keypadRow}>
          <TouchableOpacity
            onPress={handleClearPress}
            disabled={state.phase !== 'recall' || state.inputSequence.length === 0}
            activeOpacity={0.65}
            accessibilityRole="button"
            accessibilityLabel={t.numberRecall.clearCta}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            style={[
              styles.keyButton,
              styles.actionKeyButton,
              {
                width: keypadMetrics.keyWidth,
                height: keypadMetrics.keyHeight,
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
                borderRadius: radius.md,
                opacity: state.phase === 'recall' && state.inputSequence.length > 0 ? 1 : 0.35,
              },
            ]}
          >
            <Text style={[styles.actionKeyText, { color: colors.textSecondary }]}>
              {t.numberRecall.clearCta}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDigitPress('0')}
            disabled={state.phase !== 'recall'}
            activeOpacity={0.65}
            accessibilityRole="button"
            accessibilityLabel="0"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            style={[
              styles.keyButton,
              {
                width: keypadMetrics.keyWidth,
                height: keypadMetrics.keyHeight,
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radius.md,
                opacity: state.phase === 'recall' ? 1 : 0.45,
              },
            ]}
          >
            <Text style={[styles.keyText, { color: colors.textPrimary }]}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeletePress}
            disabled={state.phase !== 'recall' || state.inputSequence.length === 0}
            activeOpacity={0.65}
            accessibilityRole="button"
            accessibilityLabel={t.numberRecall.deleteCta}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            style={[
              styles.keyButton,
              styles.actionKeyButton,
              {
                width: keypadMetrics.keyWidth,
                height: keypadMetrics.keyHeight,
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
                borderRadius: radius.md,
                opacity: state.phase === 'recall' && state.inputSequence.length > 0 ? 1 : 0.35,
              },
            ]}
          >
            <DeleteIcon
              size={22}
              color={
                state.phase === 'recall' && state.inputSequence.length > 0
                  ? colors.textSecondary
                  : colors.textMuted
              }
            />
          </TouchableOpacity>
        </View>

        {/* Big Submit Button */}
        <View style={styles.submitRow}>
          <Button
            title={t.numberRecall.submitCta}
            onPress={handleSubmitPress}
            disabled={state.phase !== 'recall' || state.inputSequence.length === 0}
            variant="primary"
            size="lg"
            icon={<CheckCircleIcon size={18} color="#FFFFFF" />}
            style={styles.submitBtn}
          />
        </View>
      </View>

      {/* Pause Modal */}
      <Modal visible={state.phase === 'paused'} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <Card variant="elevated" style={styles.pauseCard}>
            <View style={[styles.pauseIconCircle, { backgroundColor: colors.primaryMuted }]}>
              <PauseIcon size={32} color={colors.primaryLight} />
            </View>
            <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}>
              {t.numberRecall.pausedTitle}
            </Text>
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
              ]}
            >
              Current Session: Round {state.currentRound} of {state.totalRounds} • Score: {state.score}
            </Text>

            <View style={styles.pauseActions}>
              <Button
                title={t.numberRecall.resumeCta}
                onPress={handleResume}
                variant="primary"
                size="md"
                icon={<PlayIcon size={18} color="#FFFFFF" />}
              />
              <Button
                title={t.numberRecall.restartCta}
                onPress={handleRestart}
                variant="secondary"
                size="md"
                icon={<RotateCcwIcon size={18} color={colors.textPrimary} />}
              />
              <Button
                title={t.numberRecall.quitCta}
                onPress={() => setShowExitConfirm(true)}
                variant="ghost"
                size="md"
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Quit Confirmation Modal */}
      <Modal visible={showExitConfirm} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <Card variant="elevated" style={styles.quitCard}>
            <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}>
              {t.numberRecall.quitConfirmTitle}
            </Text>
            <Text
              style={[
                typography.bodyMedium,
                {
                  color: colors.textSecondary,
                  marginTop: 8,
                  textAlign: 'center',
                  lineHeight: 22,
                },
              ]}
            >
              {t.numberRecall.quitConfirmMessage}
            </Text>

            <View style={styles.quitActions}>
              <Button
                title={t.numberRecall.keepPlayingCta}
                onPress={() => {
                  setShowExitConfirm(false);
                  if (state.phase === 'paused') {
                    handleResume();
                  }
                }}
                variant="primary"
                size="md"
              />
              <Button
                title={t.numberRecall.exitSessionCta}
                onPress={handleQuitConfirm}
                variant="danger"
                size="md"
              />
            </View>
          </Card>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statsBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  livesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartWrapper: {
    marginRight: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakBadge: {
    marginLeft: 8,
  },
  instructionBanner: {
    width: '100%',
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
  },
  bannerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayAreaWrapper: {
    width: '100%',
    minHeight: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 8,
  },
  sequenceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  digitTile: {
    width: 44,
    height: 56,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 26,
    fontWeight: '700',
  },
  feedbackContainer: {
    width: '100%',
    padding: 12,
    alignItems: 'center',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackDigitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  smallDigitTile: {
    width: 28,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallDigitText: {
    fontSize: 16,
    fontWeight: '700',
  },
  keypadContainer: {
    marginTop: 14,
    alignItems: 'center',
    gap: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  keyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionKeyButton: {
    borderWidth: 1,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '600',
  },
  actionKeyText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  submitRow: {
    width: '100%',
    marginTop: 8,
  },
  submitBtn: {
    width: '100%',
  },
  resultsHero: {
    alignItems: 'center',
    textAlign: 'center',
    marginVertical: 16,
  },
  resultsBadgeCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  resultsStatusBadge: {
    marginBottom: 8,
  },
  scoreSummaryCard: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
    marginVertical: 16,
  },
  metricsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 8,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    alignItems: 'center',
  },
  resultsActions: {
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  finishBtn: {
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pauseCard: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  pauseIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pauseActions: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  quitCard: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  quitActions: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
});
