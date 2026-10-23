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
  FlameIcon,
  SparklesIcon,
  CpuIcon,
  LayersIcon,
  BrainIcon,
  ArrowRightIcon,
} from '../components/SvgIcons';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';
import {
  createInitialLogicQuestState,
  logicQuestReducer,
  LogicCategory,
} from '../games/logic-quest';
import { historyRepository, CURRENT_SCHEMA_VERSION, getLocalDateKey, GameSessionRecord } from '../history';
import { workoutRepository } from '../workout';

import { difficultyRepository } from '../difficulty';

type LogicQuestRouteProp = RouteProp<RootStackParamList, 'LogicQuestGame'>;

export const LogicQuestGameScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<LogicQuestRouteProp>();
  const { colors, typography } = useTheme();
  const { t, language } = useLocalization();

  const initialTier = Math.max(
    1,
    Math.min(3, Math.round(route.params?.initialLevel ?? 1))
  );

  const [state, dispatch] = useReducer(logicQuestReducer, undefined, () =>
    createInitialLogicQuestState(undefined, initialTier)
  );

  const sessionIdRef = useRef<string>(historyRepository.generateSessionId('logic-quest'));
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

  // Automatic Session Persistence on completion
  useEffect(() => {
    if (state.phase === 'completed' && state.sessionStats) {
      if (savedSessionIdRef.current !== sessionIdRef.current) {
        savedSessionIdRef.current = sessionIdRef.current;
        const stats = state.sessionStats;
        const sessionRecord: GameSessionRecord = {
          id: sessionIdRef.current,
          schemaVersion: CURRENT_SCHEMA_VERSION,
          gameId: 'logic-quest',
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
    dispatch({ type: 'SUBMIT_ANSWER', responseTimestamp: Date.now() });
  };

  const handleNextQuestion = () => {
    if (state.phase !== 'feedback') return;
    dispatch({ type: 'NEXT_QUESTION', nextTimestamp: Date.now() });
  };

  const handlePause = useCallback(() => {
    dispatch({ type: 'PAUSE_GAME' });
  }, []);

  const handleResume = useCallback(() => {
    dispatch({ type: 'RESUME_GAME' });
  }, []);

  const handleRestart = useCallback(() => {
    sessionIdRef.current = historyRepository.generateSessionId('logic-quest');
    savedSessionIdRef.current = null;
    dispatch({ type: 'RESTART_GAME', startingTier: initialTier });
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
    dispatch({ type: 'PAUSE_GAME' });
    setShowExitConfirm(true);
  }, [state.phase, navigation]);

  // Hardware Back Button (Android)
  useEffect(() => {
    const onHardwareBack = () => {
      handleBackPress();
      return true;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => backSub.remove();
  }, [handleBackPress]);

  const currentQ = state.questions[state.currentIndex];

  const getCategoryMeta = (category?: LogicCategory) => {
    switch (category) {
      case 'number-sequence':
        return {
          label: t.logicQuest.categoryNumberSequence,
          icon: <LayersIcon size={14} color={colors.memory} />,
          badgeVariant: 'neutral' as const,
        };
      case 'odd-one-out':
        return {
          label: t.logicQuest.categoryOddOneOut,
          icon: <CpuIcon size={14} color={colors.attention} />,
          badgeVariant: 'warning' as const,
        };
      case 'deductive-reasoning':
      default:
        return {
          label: t.logicQuest.categoryDeductive,
          icon: <BrainIcon size={14} color={colors.primaryLight} />,
          badgeVariant: 'primary' as const,
        };
    }
  };

  const currentCategoryMeta = getCategoryMeta(currentQ?.category);

  // Localized texts for current question
  const isMl = language === 'ml';
  const promptText = currentQ ? (isMl ? currentQ.promptMl : currentQ.prompt) : '';
  const optionsList = currentQ ? (isMl ? currentQ.optionsMl : currentQ.options) : [];
  const explanationText = currentQ ? (isMl ? currentQ.explanationMl : currentQ.explanation) : '';

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      {/* Top Bar */}
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

        <View style={styles.headerPills}>
          <StatBadge
            label={`${t.logicQuest.questionCounter} ${state.currentIndex + 1}/${state.totalQuestions}`}
            variant="neutral"
            size="md"
          />
          <StatBadge
            label={`${t.logicQuest.levelLabel} ${currentQ?.difficulty || state.currentLevel}`}
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
          accessibilityLabel={t.logicQuest.pausedTitle}
        >
          <PauseIcon size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Score and Streak Bar */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreGroup}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {t.logicQuest.scoreLabel.toUpperCase()}
          </Text>
          <Text style={[typography.h2, { color: colors.primaryLight, marginTop: 2 }]}>
            {state.score.toLocaleString()}
          </Text>
        </View>

        {state.consecutiveCorrect >= 2 && (
          <View style={[styles.streakBadge, { backgroundColor: 'rgba(255, 83, 118, 0.14)' }]}>
            <FlameIcon size={16} color={colors.speed} />
            <Text style={[typography.label, { color: colors.speed, marginLeft: 6 }]}>
              {state.consecutiveCorrect} STREAK
            </Text>
          </View>
        )}
      </View>

      {/* Main Question Card */}
      {currentQ && (
        <Card variant="elevated" style={styles.questionCard}>
          <View style={styles.categoryRow}>
            <StatBadge
              label={currentCategoryMeta.label.toUpperCase()}
              icon={currentCategoryMeta.icon}
              variant={currentCategoryMeta.badgeVariant}
              size="sm"
            />
          </View>

          <Text style={[typography.h2, styles.promptText, { color: colors.textPrimary }]}>
            {promptText}
          </Text>
        </Card>
      )}

      {/* Options List */}
      <View style={styles.optionsContainer}>
        {optionsList.map((opt, idx) => {
          const isSelected = state.selectedOptionIndex === idx;
          const isFeedbackPhase = state.phase === 'feedback';
          const isCorrect = idx === currentQ?.correctIndex;

          let optionBg = colors.backgroundElevated;
          let optionBorder = colors.border;
          let textColor = colors.textPrimary;

          if (isFeedbackPhase) {
            if (isCorrect) {
              optionBg = 'rgba(16, 185, 129, 0.16)';
              optionBorder = '#10B981';
              textColor = colors.success;
            } else if (isSelected && !isCorrect) {
              optionBg = 'rgba(239, 68, 68, 0.16)';
              optionBorder = colors.error;
              textColor = colors.error;
            }
          } else if (isSelected) {
            optionBg = 'rgba(124, 92, 252, 0.16)';
            optionBorder = colors.primaryLight;
            textColor = colors.primaryLight;
          }

          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.75}
              onPress={() => handleOptionPress(idx)}
              disabled={isFeedbackPhase}
              style={[
                styles.optionCard,
                {
                  backgroundColor: optionBg,
                  borderColor: optionBorder,
                },
              ]}
              accessible={true}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Option ${idx + 1}: ${opt}`}
            >
              <View
                style={[
                  styles.optionLetterBadge,
                  {
                    backgroundColor: isSelected
                      ? isFeedbackPhase
                        ? isCorrect
                          ? '#10B981'
                          : colors.error
                        : colors.primary
                      : colors.backgroundSecondary,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.label,
                    {
                      color: isSelected ? '#FFFFFF' : colors.textSecondary,
                    },
                  ]}
                >
                  {String.fromCharCode(65 + idx)}
                </Text>
              </View>

              <Text style={[typography.bodyLarge, styles.optionText, { color: textColor }]}>
                {opt}
              </Text>

              {isFeedbackPhase && isCorrect && (
                <CheckCircleIcon size={20} color="#10B981" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Immediate Feedback Box & Explanation (Feedback Phase) */}
      {state.phase === 'feedback' && (
        <Card variant="highlighted" style={styles.feedbackCard}>
          <View style={styles.feedbackHeader}>
            <View
              style={[
                styles.feedbackIconBadge,
                {
                  backgroundColor: state.isCurrentAnswerCorrect
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(239, 68, 68, 0.2)',
                },
              ]}
            >
              {state.isCurrentAnswerCorrect ? (
                <CheckCircleIcon size={22} color={colors.success} />
              ) : (
                <RotateCcwIcon size={22} color={colors.error} />
              )}
            </View>

            <View style={styles.feedbackTitleGroup}>
              <Text
                style={[
                  typography.h3,
                  { color: state.isCurrentAnswerCorrect ? colors.success : colors.error },
                ]}
              >
                {state.isCurrentAnswerCorrect
                  ? t.logicQuest.correctFeedback
                  : t.logicQuest.incorrectFeedback}
              </Text>
              <Text style={[typography.label, { color: colors.primaryLight, marginTop: 2 }]}>
                +{state.currentRoundScore || 0} {t.progress.pts}
              </Text>
            </View>
          </View>

          <View style={[styles.explanationBox, { borderTopColor: colors.border }]}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {t.logicQuest.explanationTitle}
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 6, lineHeight: 20 }]}>
              {explanationText}
            </Text>
          </View>
        </Card>
      )}

      {/* Bottom CTA Button */}
      <View style={styles.bottomCtaWrapper}>
        {state.phase === 'question' ? (
          <Button
            title={t.logicQuest.submitCta}
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            disabled={state.selectedOptionIndex === undefined}
          />
        ) : state.phase === 'feedback' ? (
          <Button
            title={t.logicQuest.nextQuestionCta}
            onPress={handleNextQuestion}
            variant="primary"
            size="lg"
            icon={<SparklesIcon size={18} color="#FFFFFF" />}
          />
        ) : null}
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
              {t.logicQuest.pausedTitle}
            </Text>
            <View style={styles.modalBtnGroup}>
              <Button
                title={t.logicQuest.resumeCta}
                onPress={handleResume}
                variant="primary"
                size="lg"
                icon={<PlayIcon size={18} color="#FFFFFF" />}
              />
              <Button
                title={t.logicQuest.restartCta}
                onPress={handleRestart}
                variant="secondary"
                size="md"
                style={{ marginTop: 10 }}
                icon={<RotateCcwIcon size={18} color={colors.primaryLight} />}
              />
              <Button
                title={t.logicQuest.quitCta}
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
              {t.logicQuest.quitConfirmTitle}
            </Text>
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.textSecondary, textAlign: 'center', marginTop: 8 },
              ]}
            >
              {t.logicQuest.quitConfirmMessage}
            </Text>
            <View style={[styles.modalBtnGroup, { marginTop: 20 }]}>
              <Button
                title={t.logicQuest.keepPlayingCta}
                onPress={() => setShowExitConfirm(false)}
                variant="primary"
                size="lg"
              />
              <Button
                title={t.logicQuest.exitSessionCta}
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
            <View style={[styles.resultBadgeCircle, { backgroundColor: 'rgba(124, 92, 252, 0.16)' }]}>
              <SparklesIcon size={44} color={colors.primaryLight} />
            </View>
            <Text style={[typography.h1, { color: colors.textPrimary, marginTop: 16, textAlign: 'center' }]}>
              {t.logicQuest.sessionCompleteTitle}
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 6, textAlign: 'center' }]}>
              {t.logicQuest.sessionCompleteSubtitle}
            </Text>
          </View>

          {/* Primary Score Highlight */}
          <Card variant="highlighted" style={styles.scoreHighlightCard}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {t.logicQuest.finalScoreLabel.toUpperCase()}
            </Text>
            <Text style={[typography.statNumber, { color: colors.primaryLight, fontSize: 44, lineHeight: 52, marginTop: 4 }]}>
              {state.sessionStats?.finalScore.toLocaleString() ?? state.score.toLocaleString()}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
              {t.logicQuest.scoreSubtitle}
            </Text>
          </Card>

          {/* Metrics Grid Card */}
          <Card variant="elevated" style={styles.statsGridCard}>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.logicQuest.accuracyLabel}
                </Text>
                <Text style={[typography.h2, { color: colors.success, marginTop: 4 }]}>
                  {state.sessionStats?.accuracyPercentage ?? 0}%
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.logicQuest.correctQuestionsLabel}
                </Text>
                <Text style={[typography.h2, { color: colors.primaryLight, marginTop: 4 }]}>
                  {state.sessionStats?.correctCount ?? 0} / {state.sessionStats?.totalQuestions ?? 0}
                </Text>
              </View>
            </View>

            <View style={[styles.statsRow, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 16, paddingTop: 16 }]}>
              <View style={styles.statBox}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.logicQuest.avgTimeLabel}
                </Text>
                <Text style={[typography.h2, { color: colors.attention, marginTop: 4 }]}>
                  {state.sessionStats?.avgResponseTimeMs !== undefined
                    ? `${(state.sessionStats.avgResponseTimeMs / 1000).toFixed(1)}${t.logicQuest.secondsShort}`
                    : '--'}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {t.logicQuest.highestLevelLabel}
                </Text>
                <Text style={[typography.h2, { color: colors.textPrimary, marginTop: 4 }]}>
                  Lvl {state.sessionStats?.highestDifficulty ?? 1}
                </Text>
              </View>
            </View>
          </Card>

          {/* Action Buttons */}
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
                  title={t.logicQuest.playAgainCta}
                  onPress={handleRestart}
                  variant="secondary"
                  size="md"
                  style={styles.finishBtn}
                />
              </>
            ) : (
              <>
                <Button
                  title={t.logicQuest.playAgainCta}
                  onPress={handleRestart}
                  variant="primary"
                  size="lg"
                  icon={<RotateCcwIcon size={18} color="#FFFFFF" />}
                />
                <Button
                  title={t.logicQuest.finishCta}
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
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
  headerPills: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  scoreGroup: {
    justifyContent: 'center',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  questionCard: {
    padding: 18,
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  promptText: {
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 10,
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  optionLetterBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    lineHeight: 22,
  },
  feedbackCard: {
    padding: 16,
    marginBottom: 20,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedbackIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  feedbackTitleGroup: {
    flex: 1,
  },
  explanationBox: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  bottomCtaWrapper: {
    marginTop: 4,
    marginBottom: 24,
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
