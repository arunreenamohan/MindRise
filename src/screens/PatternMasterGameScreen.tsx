import React, { useReducer, useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
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
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
  FlameIcon,
  CpuIcon,
  LayersIcon,
  ArrowRightIcon,
} from '../components/SvgIcons';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';
import {
  createInitialPatternMasterState,
  patternMasterReducer,
  PatternCategory,
} from '../games/pattern-master';
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

type PatternMasterRouteProp = RouteProp<RootStackParamList, 'PatternMasterGame'>;

export const PatternMasterGameScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<PatternMasterRouteProp>();
  const { colors, typography } = useTheme();
  const { t, language } = useLocalization();

  const initialTier = Math.max(
    1,
    Math.min(3, Math.round(route.params?.initialLevel ?? 1))
  );

  const [state, dispatch] = useReducer(patternMasterReducer, undefined, () =>
    createInitialPatternMasterState(undefined, Date.now(), Math.random, initialTier)
  );

  const sessionIdRef = useRef<string>(historyRepository.generateSessionId('pattern-master'));
  const savedSessionIdRef = useRef<string | null>(null);

  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  // AppState Background handling: pause game when backgrounded
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        dispatch({ type: 'PAUSE_GAME' });
      }
    });
    return () => subscription.remove();
  }, []);

  // Android hardware back button handling
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

  // Automatic Session Persistence on completion (exactly once)
  useEffect(() => {
    if (state.phase === 'completed' && state.sessionStats) {
      if (savedSessionIdRef.current !== sessionIdRef.current) {
        savedSessionIdRef.current = sessionIdRef.current;
        const stats = state.sessionStats;
        const sessionRecord: GameSessionRecord = {
          id: sessionIdRef.current,
          schemaVersion: CURRENT_SCHEMA_VERSION,
          gameId: 'pattern-master',
          startedAt: new Date(state.sessionStartTime || Date.now()).toISOString(),
          completedAt: stats.completedAt,
          dateKey: getLocalDateKey(new Date(stats.completedAt)),
          outcome: 'completed',
          finalScore: stats.finalScore,
          accuracyPercentage: stats.accuracyPercentage,
          roundsCompleted: stats.questionsAnswered,
          totalRounds: stats.totalQuestions,
          highestLevel: stats.highestDifficulty,
          startingLevel: initialTier,
          durationMs: stats.totalDurationMs,
          gameSpecificMetrics: {
            correctAnswers: stats.correctCount,
            questionsAnswered: stats.questionsAnswered,
            avgResponseTimeMs: stats.avgResponseTimeMs,
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
  }, [state.phase, state.sessionStats, state.sessionStartTime, route.params?.workoutMode, route.params?.drillIndex, initialTier]);

  // Actions
  const handleOptionPress = (index: number) => {
    if (state.phase !== 'question') return;
    dispatch({ type: 'SELECT_OPTION', optionIndex: index });
  };

  const handleSubmit = () => {
    if (state.phase !== 'question' || state.selectedOptionIndex === undefined) return;
    dispatch({ type: 'SUBMIT_ANSWER', responseTimestamp: getMonotonicTime() });
  };

  const handleNextQuestion = () => {
    if (state.phase !== 'feedback') return;
    dispatch({ type: 'NEXT_QUESTION', nextTimestamp: getMonotonicTime() });
  };

  const handlePause = useCallback(() => {
    dispatch({ type: 'PAUSE_GAME' });
  }, []);

  const handleResume = useCallback(() => {
    dispatch({ type: 'RESUME_GAME' });
  }, []);

  const handleRestart = useCallback(() => {
    sessionIdRef.current = historyRepository.generateSessionId('pattern-master');
    savedSessionIdRef.current = null;
    dispatch({ type: 'RESTART_GAME', startTimestamp: Date.now(), startingTier: initialTier });
  }, [initialTier]);

  const handleQuitConfirm = useCallback(() => {
    setShowExitConfirm(false);
    navigation.goBack();
  }, [navigation]);

  const handleBackPress = useCallback(() => {
    if (state.phase === 'completed') {
      navigation.goBack();
      return;
    }
    setShowExitConfirm(true);
  }, [state.phase, navigation]);

  const currentQuestion = state.questions[state.currentIndex];
  if (!currentQuestion) {
    return null;
  }

  const isMalayalam = language === 'ml';
  const promptText = isMalayalam ? currentQuestion.promptMl : currentQuestion.prompt;
  const titleText = isMalayalam ? currentQuestion.titleMl : currentQuestion.title;
  const optionsList = isMalayalam ? currentQuestion.optionsMl : currentQuestion.options;
  const explanationText = isMalayalam ? currentQuestion.explanationMl : currentQuestion.explanation;

  const getCategoryLabel = (category: PatternCategory): string => {
    switch (category) {
      case 'visual-pattern':
        return t.patternMaster.categoryVisualPattern;
      case 'number-sequence':
        return t.patternMaster.categoryNumberSequence;
      case 'missing-tile':
        return t.patternMaster.categoryMissingTile;
      default:
        return category;
    }
  };

  const getCategoryIcon = (category: PatternCategory) => {
    switch (category) {
      case 'visual-pattern':
        return <CpuIcon size={14} color={colors.problemSolving} />;
      case 'number-sequence':
        return <LayersIcon size={14} color={colors.problemSolving} />;
      case 'missing-tile':
      default:
        return <SparklesIcon size={14} color={colors.problemSolving} />;
    }
  };

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      {/* Header */}
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
            {t.patternMaster.gameTitle}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handlePause}
          style={[styles.headerIconBtn, { borderColor: colors.border }]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t.patternMaster.pausedTitle}
        >
          <PauseIcon size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricPill}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {t.patternMaster.questionCounter}
          </Text>
          <Text style={[typography.label, { color: colors.textPrimary, marginTop: 2 }]}>
            {state.currentIndex + 1}/{state.totalQuestions}
          </Text>
        </View>

        <View style={styles.metricPill}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {t.patternMaster.levelLabel}
          </Text>
          <Text style={[typography.label, { color: colors.problemSolving, marginTop: 2 }]}>
            Lvl {currentQuestion.difficulty}
          </Text>
        </View>

        {state.consecutiveCorrect >= 2 && (
          <View style={styles.metricPill}>
            <Text style={[typography.caption, { color: colors.speed }]}>
              {t.patternMaster.streakLabel}
            </Text>
            <View style={styles.streakRow}>
              <FlameIcon size={12} color={colors.speed} />
              <Text style={[typography.label, { color: colors.speed, marginLeft: 2 }]}>
                x{state.consecutiveCorrect}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.metricPill}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {t.patternMaster.scoreLabel}
          </Text>
          <Text style={[typography.label, { color: colors.primaryLight, marginTop: 2 }]}>
            {state.score.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Category Pill */}
      <View style={styles.categoryRow}>
        <StatBadge
          label={getCategoryLabel(currentQuestion.category).toUpperCase()}
          variant="primary"
          size="sm"
          icon={getCategoryIcon(currentQuestion.category)}
        />
        <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 8 }]}>
          {titleText}
        </Text>
      </View>

      {/* Question Card */}
      <Card variant="highlighted" style={styles.questionCard}>
        <Text style={[typography.h3, styles.promptText, { color: colors.textPrimary }]}>
          {promptText}
        </Text>

        {/* Missing-Tile Grid Matrix Preview (if puzzle has 2D matrix) */}
        {currentQuestion.gridMatrix && (
          <View style={[styles.matrixContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
            {currentQuestion.gridMatrix.map((row, rowIdx) => (
              <View key={`row_${rowIdx}`} style={styles.matrixRow}>
                {row.map((cell, colIdx) => {
                  const isMissingCell = cell === '?';
                  return (
                    <View
                      key={`cell_${rowIdx}_${colIdx}`}
                      style={[
                        styles.matrixCell,
                        {
                          backgroundColor: isMissingCell ? 'rgba(245, 158, 11, 0.2)' : colors.card,
                          borderColor: isMissingCell ? colors.problemSolving : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.h3,
                          {
                            color: isMissingCell ? colors.problemSolving : colors.textPrimary,
                            fontWeight: isMissingCell ? '800' : '600',
                          },
                        ]}
                      >
                        {cell}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Answer Options */}
      <View style={styles.optionsContainer}>
        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase' }]}>
          {t.patternMaster.selectPrompt}
        </Text>

        {optionsList.map((option, idx) => {
          const isSelected = state.selectedOptionIndex === idx;
          const isCorrect = idx === currentQuestion.correctIndex;
          const isFeedback = state.phase === 'feedback';

          let cardBorderColor = colors.border;
          let cardBgColor = colors.card;
          let letterBgColor = colors.backgroundSecondary;
          let letterTextColor = colors.textSecondary;

          if (isFeedback) {
            if (isCorrect) {
              cardBorderColor = colors.success;
              cardBgColor = 'rgba(16, 185, 129, 0.16)';
              letterBgColor = colors.success;
              letterTextColor = '#FFFFFF';
            } else if (isSelected && !isCorrect) {
              cardBorderColor = colors.error;
              cardBgColor = 'rgba(239, 68, 68, 0.16)';
              letterBgColor = colors.error;
              letterTextColor = '#FFFFFF';
            }
          } else if (isSelected) {
            cardBorderColor = colors.problemSolving;
            cardBgColor = 'rgba(245, 158, 11, 0.12)';
            letterBgColor = colors.problemSolving;
            letterTextColor = '#FFFFFF';
          }

          const optionLetter = String.fromCharCode(65 + idx); // A, B, C, D

          return (
            <TouchableOpacity
              key={`opt_${idx}`}
              activeOpacity={0.7}
              disabled={state.phase !== 'question'}
              onPress={() => handleOptionPress(idx)}
              style={[
                styles.optionCard,
                {
                  backgroundColor: cardBgColor,
                  borderColor: cardBorderColor,
                },
              ]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Option ${optionLetter}: ${option}`}
            >
              <View style={[styles.optionLetterBadge, { backgroundColor: letterBgColor }]}>
                <Text style={[typography.label, { color: letterTextColor }]}>
                  {optionLetter}
                </Text>
              </View>

              <Text
                style={[
                  typography.bodyMedium,
                  styles.optionText,
                  {
                    color: isFeedback && isCorrect ? colors.success : colors.textPrimary,
                    fontWeight: isSelected || (isFeedback && isCorrect) ? '700' : '400',
                  },
                ]}
              >
                {option}
              </Text>

              {isFeedback && isCorrect && (
                <CheckCircleIcon size={20} color={colors.success} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Immediate Feedback Banner with Explanation */}
      {state.phase === 'feedback' && (
        <Card
          variant="elevated"
          style={[
            styles.feedbackBanner,
            {
              backgroundColor: state.isCurrentAnswerCorrect
                ? 'rgba(16, 185, 129, 0.14)'
                : 'rgba(239, 68, 68, 0.14)',
              borderColor: state.isCurrentAnswerCorrect ? colors.success : colors.error,
            },
          ]}
        >
          <View style={styles.feedbackHeaderRow}>
            {state.isCurrentAnswerCorrect ? (
              <CheckCircleIcon size={22} color={colors.success} />
            ) : (
              <ClockIcon size={22} color={colors.error} />
            )}
            <View style={styles.feedbackTitleGroup}>
              <Text
                style={[
                  typography.label,
                  {
                    color: state.isCurrentAnswerCorrect ? colors.success : colors.error,
                  },
                ]}
              >
                {state.isCurrentAnswerCorrect
                  ? t.patternMaster.correctFeedback
                  : t.patternMaster.incorrectFeedback}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {state.isCurrentAnswerCorrect
                  ? `+${state.currentRoundScore} pts`
                  : '-40 pts'}
              </Text>
            </View>
          </View>

          {/* Explanation */}
          <View style={[styles.explanationBox, { borderTopColor: colors.borderLight }]}>
            <View style={styles.explanationHeader}>
              <CpuIcon size={14} color={colors.problemSolving} />
              <Text style={[typography.caption, { color: colors.problemSolving, marginLeft: 6, fontWeight: '700' }]}>
                {t.patternMaster.explanationTitle}
              </Text>
            </View>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4, lineHeight: 18 }]}>
              {explanationText}
            </Text>
          </View>
        </Card>
      )}

      {/* Action CTA Button */}
      <View style={styles.ctaWrapper}>
        {state.phase === 'question' ? (
          <Button
            title={t.patternMaster.submitCta}
            onPress={handleSubmit}
            disabled={state.selectedOptionIndex === undefined}
            variant="primary"
            size="lg"
          />
        ) : state.phase === 'feedback' ? (
          <Button
            title={t.patternMaster.nextQuestionCta}
            onPress={handleNextQuestion}
            variant="primary"
            size="lg"
          />
        ) : null}
      </View>

      {/* Pause Modal */}
      <Modal visible={state.phase === 'paused'} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <Card variant="elevated" style={styles.modalContent}>
            <View style={[styles.modalIconCircle, { backgroundColor: colors.backgroundSecondary }]}>
              <PauseIcon size={36} color={colors.problemSolving} />
            </View>

            <Text style={[typography.h2, styles.modalTitle, { color: colors.textPrimary }]}>
              {t.patternMaster.pausedTitle}
            </Text>

            <View style={styles.modalBtnGroup}>
              <Button
                title={t.patternMaster.resumeCta}
                onPress={handleResume}
                variant="primary"
                size="md"
                icon={<PlayIcon size={18} color="#FFFFFF" />}
                style={styles.modalBtn}
              />
              <Button
                title={t.patternMaster.restartCta}
                onPress={handleRestart}
                variant="secondary"
                size="md"
                icon={<RotateCcwIcon size={18} color={colors.textPrimary} />}
                style={styles.modalBtn}
              />
              <Button
                title={t.patternMaster.quitCta}
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
              {t.patternMaster.quitConfirmTitle}
            </Text>

            <Text style={[typography.bodyMedium, styles.modalBody, { color: colors.textSecondary }]}>
              {t.patternMaster.quitConfirmMessage}
            </Text>

            <View style={styles.modalBtnGroup}>
              <Button
                title={t.patternMaster.keepPlayingCta}
                onPress={() => setShowExitConfirm(false)}
                variant="primary"
                size="md"
                style={styles.modalBtn}
              />
              <Button
                title={t.patternMaster.exitSessionCta}
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
            <View style={[styles.modalIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.16)' }]}>
              <SparklesIcon size={38} color={colors.problemSolving} />
            </View>

            <Text style={[typography.h2, styles.modalTitle, { color: colors.textPrimary }]}>
              {t.patternMaster.sessionCompleteTitle}
            </Text>

            <Text style={[typography.bodyMedium, styles.modalBody, { color: colors.textSecondary }]}>
              {t.patternMaster.sessionCompleteSubtitle}
            </Text>

            {/* Score Hero Card */}
            <View style={[styles.resultsScoreBanner, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {t.patternMaster.finalScoreLabel.toUpperCase()}
              </Text>
              <Text style={[typography.statNumber, { color: colors.problemSolving, marginTop: 4 }]}>
                {state.sessionStats?.finalScore.toLocaleString() ?? state.score.toLocaleString()}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {t.patternMaster.scoreSubtitle}
              </Text>
            </View>

            {/* Results Grid */}
            <View style={styles.resultsGrid}>
              <View style={styles.resultsGridItem}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.patternMaster.accuracyLabel}
                </Text>
                <Text style={[typography.label, { color: colors.success, marginTop: 2 }]}>
                  {state.sessionStats?.accuracyPercentage ?? 0}%
                </Text>
              </View>

              <View style={styles.resultsGridItem}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.patternMaster.highestLevelLabel}
                </Text>
                <Text style={[typography.label, { color: colors.textPrimary, marginTop: 2 }]}>
                  Lvl {state.sessionStats?.highestDifficulty ?? state.highestLevelReached}
                </Text>
              </View>

              <View style={styles.resultsGridItem}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.patternMaster.correctQuestionsLabel}
                </Text>
                <Text style={[typography.label, { color: colors.primaryLight, marginTop: 2 }]}>
                  {state.sessionStats?.correctCount ?? 0}/{state.totalQuestions}
                </Text>
              </View>

              <View style={styles.resultsGridItem}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.patternMaster.avgTimeLabel}
                </Text>
                <Text style={[typography.label, { color: colors.primaryLight, marginTop: 2 }]}>
                  {state.sessionStats?.avgResponseTimeMs !== undefined
                    ? `${(state.sessionStats.avgResponseTimeMs / 1000).toFixed(1)}s`
                    : '--'}
                </Text>
              </View>
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
                    title={t.patternMaster.playAgainCta}
                    onPress={handleRestart}
                    variant="secondary"
                    size="md"
                    style={styles.modalBtn}
                  />
                </>
              ) : (
                <>
                  <Button
                    title={t.patternMaster.playAgainCta}
                    onPress={handleRestart}
                    variant="primary"
                    size="md"
                    icon={<RotateCcwIcon size={18} color="#FFFFFF" />}
                    style={styles.modalBtn}
                  />
                  <Button
                    title={t.patternMaster.finishCta}
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
    paddingBottom: 32,
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
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  questionCard: {
    padding: 18,
    marginVertical: 6,
  },
  promptText: {
    lineHeight: 28,
  },
  matrixContainer: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  matrixRow: {
    flexDirection: 'row',
    gap: 8,
  },
  matrixCell: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsContainer: {
    marginTop: 14,
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  optionLetterBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  feedbackBanner: {
    marginTop: 16,
    padding: 14,
    borderWidth: 1,
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackTitleGroup: {
    marginLeft: 10,
    flex: 1,
  },
  explanationBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaWrapper: {
    marginTop: 20,
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
});
