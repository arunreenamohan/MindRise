import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatBadge } from '../components/StatBadge';
import {
  BrainIcon,
  SparklesIcon,
  CheckCircleIcon,
  ClockIcon,
  FlameIcon,
  TargetIcon,
  ZapIcon,
  GridIcon,
  LayersIcon,
  CpuIcon,
  ArrowRightIcon,
  CrownIcon,
} from '../components/SvgIcons';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';
import { entitlementService } from '../services/EntitlementService';
import {
  workoutRepository,
  DailyWorkoutRecord,
  WorkoutDrill,
  WorkoutStreakResult,
} from '../workout';
import { getGameById } from '../games/registry';
import { GameId } from '../games/types';
import {
  difficultyRepository,
  GameDifficultyProfile,
  STARTING_DIFFICULTY_BOUNDS,
} from '../difficulty';

type DailyWorkoutScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const DailyWorkoutScreen: React.FC = () => {
  const navigation = useNavigation<DailyWorkoutScreenNavigationProp>();
  const { colors, typography } = useTheme();
  const { t } = useLocalization();

  const [isPro, setIsPro] = useState<boolean>(entitlementService.isProSync());
  const [workout, setWorkout] = useState<DailyWorkoutRecord | null>(null);
  const [streak, setStreak] = useState<WorkoutStreakResult>({ currentStreak: 0, bestStreak: 0 });
  const [difficultyProfiles, setDifficultyProfiles] = useState<Record<GameId, GameDifficultyProfile> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = entitlementService.subscribe((state) => {
      if (isMounted) {
        setIsPro(state.isPro);
      }
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const loadWorkoutData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [currentWorkout, workoutStreak, diffProfiles] = await Promise.all([
        workoutRepository.getOrCreateTodayWorkout(),
        workoutRepository.getWorkoutStreak(),
        difficultyRepository.getAllProfiles(),
      ]);
      setWorkout(currentWorkout);
      setStreak(workoutStreak);
      setDifficultyProfiles(diffProfiles);
    } catch {
      // Graceful fallback to existing state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWorkoutData();
    }, [loadWorkoutData])
  );

  const handleLaunchDrill = (drillIndex: number) => {
    if (!workout) return;
    const drill = workout.drills[drillIndex];
    if (!drill) return;

    const completedCount = workout.drills.filter((d) => d.status === 'completed').length;
    const isCompleted = workout.status === 'completed' || completedCount === 3;
    if (isCompleted && !isPro) {
      navigation.navigate('PaywallModal');
      return;
    }

    navigation.navigate('GameIntro', {
      gameId: drill.gameId,
      workoutMode: true,
      drillIndex,
    });
  };

  const handleStartOrContinue = () => {
    if (!workout) return;
    const nextIndex = workout.drills.findIndex((d) => d.status !== 'completed');
    if (nextIndex >= 0) {
      handleLaunchDrill(nextIndex);
    }
  };

  const handleResetWorkoutPress = () => {
    if (!isPro) {
      navigation.navigate('PaywallModal');
      return;
    }
    setShowResetModal(true);
  };

  const handleConfirmReset = async () => {
    setShowResetModal(false);
    if (!isPro) {
      navigation.navigate('PaywallModal');
      return;
    }
    try {
      setIsLoading(true);
      const freshWorkout = await workoutRepository.resetTodayWorkout();
      setWorkout(freshWorkout);
    } catch {
      // Graceful handling
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getGameIcon = (gameId: GameId, color: string) => {
    switch (gameId) {
      case 'memory-matrix':
        return <GridIcon size={26} color={color} />;
      case 'number-recall':
        return <LayersIcon size={26} color={color} />;
      case 'focus-finder':
        return <TargetIcon size={26} color={color} />;
      case 'quick-reaction':
        return <ZapIcon size={26} color={color} />;
      case 'pattern-master':
        return <CpuIcon size={26} color={color} />;
      case 'logic-quest':
      default:
        return <BrainIcon size={26} color={color} />;
    }
  };

  const getDrillAccentColor = (drill: WorkoutDrill): string => {
    switch (drill.category) {
      case 'memory':
        return colors.memory;
      case 'attention-speed':
        return drill.gameId === 'quick-reaction' ? colors.speed : colors.attention;
      case 'reasoning':
        return drill.gameId === 'pattern-master' ? colors.problemSolving : colors.logic;
      default:
        return colors.primary;
    }
  };

  if (isLoading && !workout) {
    return (
      <ScreenContainer>
        <Header title={t.dailyWorkout.screenTitle} onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
        </View>
      </ScreenContainer>
    );
  }

  if (!workout) {
    return null;
  }

  const completedCount = workout.drills.filter((d) => d.status === 'completed').length;
  const isWorkoutCompleted = workout.status === 'completed' || completedCount === 3;
  const currentDrillIndex = workout.drills.findIndex((d) => d.status !== 'completed');

  // Render Completed Summary View
  if (isWorkoutCompleted) {
    return (
      <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
        <Header
          title={t.dailyWorkout.screenTitle}
          onBack={() => navigation.goBack()}
          rightElement={
            <StatBadge
              label={t.dailyWorkout.statusCompleted.toUpperCase()}
              variant="success"
              size="sm"
            />
          }
        />

        {/* Celebration Hero */}
        <View style={styles.resultsHero}>
          <View
            style={[
              styles.resultsBadgeCircle,
              {
                backgroundColor: `${colors.primaryLight}22`,
                borderColor: colors.primaryLight,
              },
            ]}
          >
            <BrainIcon size={52} color={colors.primaryLight} />
          </View>

          <StatBadge
            label={t.dailyWorkout.completeTitle.toUpperCase()}
            variant="primary"
            icon={<SparklesIcon size={12} color={colors.primaryLight} />}
            style={styles.resultsStatusBadge}
          />

          <Text style={[typography.h1, styles.resultTitle, { color: colors.textPrimary }]}>
            {t.dailyWorkout.completeTitle}
          </Text>
          <Text style={[typography.bodyMedium, styles.resultSubtitle, { color: colors.textSecondary }]}>
            {t.dailyWorkout.completeSubtitle}
          </Text>
        </View>

        {/* 4-Stat Metrics Grid */}
        <View style={styles.metricsGrid}>
          <Card variant="elevated" style={styles.metricCard}>
            <View style={styles.metricHeaderRow}>
              <ClockIcon size={16} color={colors.primaryLight} />
              <Text style={[typography.caption, styles.metricHeaderLabel, { color: colors.textMuted }]}>
                {t.dailyWorkout.totalTimeLabel.toUpperCase()}
              </Text>
            </View>
            <Text style={[typography.h2, styles.metricValue, { color: colors.textPrimary }]}>
              {formatDuration(workout.totalDurationMs)}
            </Text>
          </Card>

          <Card variant="elevated" style={styles.metricCard}>
            <View style={styles.metricHeaderRow}>
              <TargetIcon size={16} color={colors.attention} />
              <Text style={[typography.caption, styles.metricHeaderLabel, { color: colors.textMuted }]}>
                {t.dailyWorkout.averageAccuracyLabel.toUpperCase()}
              </Text>
            </View>
            <Text style={[typography.h2, styles.metricValue, { color: colors.attention }]}>
              {workout.averageAccuracy}%
            </Text>
          </Card>

          <Card variant="elevated" style={styles.metricCard}>
            <View style={styles.metricHeaderRow}>
              <CheckCircleIcon size={16} color="#10B981" />
              <Text style={[typography.caption, styles.metricHeaderLabel, { color: colors.textMuted }]}>
                {t.dailyWorkout.drillsCompletedLabel.toUpperCase()}
              </Text>
            </View>
            <Text style={[typography.h2, styles.metricValue, styles.successColor]}>
              3 / 3
            </Text>
          </Card>

          <Card variant="elevated" style={styles.metricCard}>
            <View style={styles.metricHeaderRow}>
              <FlameIcon size={16} color={colors.speed} />
              <Text style={[typography.caption, styles.metricHeaderLabel, { color: colors.textMuted }]}>
                {t.dailyWorkout.streakLabel.toUpperCase()}
              </Text>
            </View>
            <Text style={[typography.h2, styles.metricValue, { color: colors.speed }]}>
              {streak.currentStreak} {t.dailyWorkout.daysUnit}
            </Text>
          </Card>
        </View>

        {/* Individual Drill Performance Breakdown */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>
            {t.dailyWorkout.breakdownTitle}
          </Text>
        </View>

        {workout.drills.map((drill) => {
          const game = getGameById(drill.gameId);
          const accent = getDrillAccentColor(drill);
          return (
            <Card key={drill.id} variant="elevated" style={styles.breakdownCard}>
              <View style={styles.drillCardHeader}>
                <View style={[styles.drillIconWrapper, { backgroundColor: `${accent}22` }]}>
                  {getGameIcon(drill.gameId, accent)}
                </View>
                <View style={styles.drillInfo}>
                  <View style={styles.drillBadgeRow}>
                    <StatBadge label={`DRILL ${drill.order}`} variant="primary" size="sm" />
                    <StatBadge label={drill.categoryLabel.toUpperCase()} variant="neutral" size="sm" />
                  </View>
                  <Text style={[typography.h3, styles.breakdownGameTitle, { color: colors.textPrimary }]}>
                    {game?.defaultName ?? drill.gameId}
                  </Text>
                </View>
              </View>

              <View style={[styles.breakdownStatsRow, { borderColor: colors.border }]}>
                <View style={styles.breakdownStatCol}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {t.dailyWorkout.drillScoreLabel.toUpperCase()}
                  </Text>
                  <Text style={[typography.label, styles.breakdownStatValue, { color: colors.textPrimary }]}>
                    {drill.score?.toLocaleString() ?? '—'}
                  </Text>
                </View>

                <View style={[styles.breakdownStatCol, styles.statBorder, { borderColor: colors.border }]}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {t.dailyWorkout.drillAccuracyLabel.toUpperCase()}
                  </Text>
                  <Text style={[typography.label, styles.breakdownStatValue, { color: colors.attention }]}>
                    {typeof drill.accuracyPercentage === 'number' ? `${drill.accuracyPercentage}%` : '—'}
                  </Text>
                </View>

                <View style={styles.breakdownStatCol}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {t.dailyWorkout.totalTimeLabel.toUpperCase()}
                  </Text>
                  <Text style={[typography.label, styles.breakdownStatValue, { color: colors.textSecondary }]}>
                    {typeof drill.durationMs === 'number' ? formatDuration(drill.durationMs) : '—'}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })}

        {/* Pro Daily Workout Limit Notice if on Free tier */}
        {!isPro && (
          <Card
            variant="highlighted"
            style={[
              styles.proLimitCard,
              {
                borderColor: colors.primaryLight,
                backgroundColor: 'rgba(124, 92, 252, 0.1)',
              },
            ]}
          >
            <View style={styles.proLimitHeaderRow}>
              <CrownIcon size={22} color={colors.primaryLight} />
              <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: 8 }]}>
                {t.dailyWorkout.limitReachedBadge}
              </Text>
            </View>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 6, lineHeight: 20 }]}>
              {t.dailyWorkout.dailyLimitNotice}
            </Text>
            <Button
              title={t.dailyWorkout.upgradeUnlimitedWorkoutsCta}
              onPress={() => navigation.navigate('PaywallModal')}
              variant="primary"
              size="md"
              icon={<CrownIcon size={16} color="#FFFFFF" />}
              style={styles.proLimitBtn}
            />
          </Card>
        )}

        {/* Bottom Done Actions */}
        <View style={styles.bottomCtaGroup}>
          <Button
            title={t.dailyWorkout.doneCta}
            onPress={() => navigation.goBack()}
            variant="primary"
            size="lg"
            icon={<CheckCircleIcon size={18} color="#FFFFFF" />}
          />
          <Button
            title={isPro ? t.dailyWorkout.resetWorkoutCta : `${t.dailyWorkout.resetWorkoutCta} (Pro)`}
            onPress={handleResetWorkoutPress}
            variant="ghost"
            size="md"
            style={styles.resetBtn}
          />
        </View>

        {/* Non-clinical disclaimer */}
        <Text style={[typography.caption, styles.disclaimerText, { color: colors.textMuted }]}>
          {t.dailyWorkout.disclaimerText}
        </Text>

        {/* Reset Confirmation Modal */}
        <Modal
          visible={showResetModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowResetModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Card variant="elevated" style={styles.modalContent}>
              <Text style={[typography.h2, styles.modalTitle, { color: colors.textPrimary }]}>
                {t.dailyWorkout.resetConfirmTitle}
              </Text>
              <Text style={[typography.bodyMedium, styles.modalBody, { color: colors.textSecondary }]}>
                {t.dailyWorkout.resetConfirmMessage}
              </Text>
              <Button
                title={t.dailyWorkout.resetWorkoutCta}
                onPress={handleConfirmReset}
                variant="primary"
                size="md"
                style={styles.modalActionBtn}
              />
              <Button
                title={t.common.cancel}
                onPress={() => setShowResetModal(false)}
                variant="secondary"
                size="md"
                style={styles.modalActionBtn}
              />
            </Card>
          </View>
        </Modal>
      </ScreenContainer>
    );
  }

  // Active / In-Progress Workout View
  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      <Header
        title={t.dailyWorkout.screenTitle}
        onBack={() => navigation.goBack()}
        rightElement={
          <StatBadge
            label={`${completedCount}/3 ${t.dailyWorkout.statusCompleted.toUpperCase()}`}
            variant={completedCount > 0 ? 'primary' : 'neutral'}
            size="sm"
          />
        }
      />

      {/* Routine Hero Overview Card */}
      <Card variant="highlighted" style={styles.heroOverviewCard}>
        <View style={styles.heroBadgeRow}>
          <StatBadge
            label={t.dailyWorkout.todayTag.toUpperCase()}
            variant="primary"
            icon={<SparklesIcon size={12} color={colors.primaryLight} />}
          />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {t.dailyWorkout.drillsCount.toUpperCase()} • {t.dailyWorkout.estimatedDuration}
          </Text>
        </View>

        <Text style={[typography.h2, styles.heroSubtitle, { color: colors.textPrimary }]}>
          {t.dailyWorkout.screenSubtitle}
        </Text>

        {/* Segmented 3-Step Progress Indicator */}
        <View style={styles.segmentedProgressRow}>
          {workout.drills.map((d, idx) => {
            const isCompleted = d.status === 'completed';
            const isActive = idx === currentDrillIndex;
            const segmentColor = isCompleted
              ? '#10B981'
              : isActive
              ? colors.primaryLight
              : colors.borderLight;

            return (
              <View
                key={d.id}
                style={[
                  styles.progressSegment,
                  { backgroundColor: segmentColor },
                ]}
              />
            );
          })}
        </View>
      </Card>

      {/* Drills Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t.dailyWorkout.drillsCount}
        </Text>
      </View>

      {/* 3 Drill Cards */}
      {workout.drills.map((drill, index) => {
        const game = getGameById(drill.gameId);
        const isCompleted = drill.status === 'completed';
        const isNext = index === currentDrillIndex;
        const accent = getDrillAccentColor(drill);
        const profile = difficultyProfiles?.[drill.gameId];
        const bounds = STARTING_DIFFICULTY_BOUNDS[drill.gameId];
        const isTier = bounds?.isTierBased ?? false;
        const levelVal = profile?.startingLevel ?? bounds?.defaultStartingLevel ?? 1;
        const levelLabel = isTier
          ? `${t.dailyWorkout.tierBadge.toUpperCase()} ${levelVal}`
          : `${t.dailyWorkout.levelBadge.toUpperCase()} ${levelVal}`;

        return (
          <Card
            key={drill.id}
            variant={isNext ? 'highlighted' : 'elevated'}
            onPress={() => {
              if (!isCompleted) {
                handleLaunchDrill(index);
              }
            }}
            style={styles.drillCard}
          >
            <View style={styles.drillCardHeader}>
              <View style={[styles.drillIconWrapper, { backgroundColor: `${accent}22` }]}>
                {getGameIcon(drill.gameId, accent)}
              </View>

              <View style={styles.drillInfo}>
                <View style={styles.drillBadgeRow}>
                  <StatBadge
                    label={`${t.dailyWorkout.stepNumber.toUpperCase()} ${drill.order}`}
                    variant={isCompleted ? 'success' : isNext ? 'primary' : 'neutral'}
                    size="sm"
                  />
                  <StatBadge label={drill.categoryLabel.toUpperCase()} variant="neutral" size="sm" />
                  <StatBadge label={levelLabel} variant="neutral" size="sm" />
                </View>

                <Text style={[typography.h3, styles.drillTitle, { color: colors.textPrimary }]}>
                  {game?.defaultName ?? drill.gameId}
                </Text>

                <Text
                  style={[typography.bodySmall, styles.drillDesc, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {game?.shortDescription ?? ''}
                </Text>
              </View>
            </View>

            {/* Drill Status Bar */}
            <View style={[styles.drillStatusRow, { borderColor: colors.border }]}>
              {isCompleted ? (
                <View style={styles.drillDoneRow}>
                  <CheckCircleIcon size={18} color="#10B981" />
                  <Text style={[typography.label, styles.drillDoneText]}>
                    {t.dailyWorkout.statusCompleted}: {drill.score?.toLocaleString() ?? 0} pts (
                    {drill.accuracyPercentage ?? 0}%)
                  </Text>
                </View>
              ) : isNext ? (
                <View style={styles.drillNextRow}>
                  <StatBadge
                    label={t.dailyWorkout.readyBadge}
                    variant="primary"
                    icon={<ZapIcon size={12} color={colors.primaryLight} />}
                    size="sm"
                  />
                  <Text style={[typography.caption, styles.drillDurationText, { color: colors.primaryLight }]}>
                    ~{drill.estimatedDurationMins} {t.common.minutes}
                  </Text>
                </View>
              ) : (
                <View style={styles.drillQueuedRow}>
                  <ClockIcon size={16} color={colors.textMuted} />
                  <Text style={[typography.caption, styles.drillQueuedText, { color: colors.textMuted }]}>
                    {t.dailyWorkout.statusQueued} (~{drill.estimatedDurationMins} {t.common.minutes})
                  </Text>
                </View>
              )}

              {isNext && (
                <View style={[styles.arrowCircle, { backgroundColor: colors.primaryMuted }]}>
                  <ArrowRightIcon size={14} color={colors.primaryLight} />
                </View>
              )}
            </View>
          </Card>
        );
      })}

      {/* Main Start/Continue Action CTA */}
      <View style={styles.bottomCtaGroup}>
        <Button
          title={
            completedCount === 0
              ? `${t.dailyWorkout.startWorkoutCta} (1/3)`
              : `${t.dailyWorkout.continueToNextDrill} (${completedCount + 1}/3)`
          }
          onPress={handleStartOrContinue}
          variant="primary"
          size="lg"
          icon={<ZapIcon size={18} color="#FFFFFF" />}
        />

        {completedCount > 0 && (
          <Button
            title={t.dailyWorkout.resetWorkoutCta}
            onPress={() => setShowResetModal(true)}
            variant="ghost"
            size="md"
            style={styles.resetBtn}
          />
        )}
      </View>

      {/* Non-clinical disclaimer */}
      <Text style={[typography.caption, styles.disclaimerText, { color: colors.textMuted }]}>
        {t.dailyWorkout.disclaimerText}
      </Text>

      {/* Reset Confirmation Modal */}
      <Modal
        visible={showResetModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card variant="elevated" style={styles.modalContent}>
            <Text style={[typography.h2, styles.modalTitle, { color: colors.textPrimary }]}>
              {t.dailyWorkout.resetConfirmTitle}
            </Text>
            <Text style={[typography.bodyMedium, styles.modalBody, { color: colors.textSecondary }]}>
              {t.dailyWorkout.resetConfirmMessage}
            </Text>
            <Button
              title={t.dailyWorkout.resetWorkoutCta}
              onPress={handleConfirmReset}
              variant="primary"
              size="md"
              style={styles.modalActionBtn}
            />
            <Button
              title={t.common.cancel}
              onPress={() => setShowResetModal(false)}
              variant="secondary"
              size="md"
              style={styles.modalActionBtn}
            />
          </Card>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  heroOverviewCard: {
    marginBottom: 20,
    padding: 18,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroSubtitle: {
    marginTop: 10,
  },
  segmentedProgressRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  progressSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 12,
  },
  drillCard: {
    marginBottom: 14,
    padding: 16,
  },
  drillCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  drillIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  drillInfo: {
    flex: 1,
  },
  drillBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  drillTitle: {
    marginTop: 6,
  },
  drillDesc: {
    marginTop: 2,
  },
  drillStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  drillDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drillDoneText: {
    color: '#10B981',
    marginLeft: 6,
  },
  drillNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drillDurationText: {
    marginLeft: 8,
  },
  drillQueuedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drillQueuedText: {
    marginLeft: 6,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomCtaGroup: {
    marginTop: 18,
    gap: 10,
  },
  resetBtn: {
    marginTop: 2,
  },
  disclaimerText: {
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 24,
    paddingHorizontal: 16,
  },
  resultsHero: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  resultsBadgeCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultsStatusBadge: {
    marginBottom: 8,
  },
  resultTitle: {
    marginTop: 8,
  },
  resultSubtitle: {
    marginTop: 4,
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    padding: 14,
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricHeaderLabel: {
    marginLeft: 6,
  },
  metricValue: {
    marginTop: 6,
  },
  successColor: {
    color: '#10B981',
  },
  breakdownCard: {
    marginBottom: 12,
    padding: 16,
  },
  breakdownGameTitle: {
    marginTop: 4,
  },
  breakdownStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  breakdownStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownStatValue: {
    marginTop: 2,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalBody: {
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  modalActionBtn: {
    width: '100%',
    marginTop: 10,
  },
  proLimitCard: {
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
  },
  proLimitHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proLimitBtn: {
    marginTop: 12,
  },
});
