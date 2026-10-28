import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CompositeNavigationProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { StatBadge } from '../components/StatBadge';
import { Button } from '../components/Button';
import { ScoreTrendSparkline } from '../components/ScoreTrendSparkline';
import { WeeklyActivityMatrix } from '../components/WeeklyActivityMatrix';
import {
  BrainIcon,
  ChartIcon,
  FlameIcon,
  ClockIcon,
  TargetIcon,
  SparklesIcon,
  GridIcon,
  LayersIcon,
  ZapIcon,
  CpuIcon,
  CheckCircleIcon,
  CrownIcon,
} from '../components/SvgIcons';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';
import { entitlementService } from '../services/EntitlementService';
import {
  historyRepository,
  GameSessionRecord,
  aggregateDashboardData,
} from '../history';
import { workoutRepository, DailyWorkoutRecord } from '../workout';

type ProgressScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Progress'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type AnalyticsScope = '7D' | '30D' | '90D' | 'ALL';

export const ProgressScreen: React.FC = () => {
  const navigation = useNavigation<ProgressScreenNavigationProp>();
  const { colors, typography } = useTheme();
  const { t } = useLocalization();

  const [selectedScope, setSelectedScope] = useState<AnalyticsScope>('7D');
  const [isPro, setIsPro] = useState<boolean>(entitlementService.isProSync());
  const [sessions, setSessions] = useState<GameSessionRecord[]>([]);
  const [workouts, setWorkouts] = useState<DailyWorkoutRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

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

  const loadProgressData = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const [fetchedSessions, fetchedWorkouts] = await Promise.all([
        historyRepository.getSessions(50),
        workoutRepository.getAllWorkouts(),
      ]);
      setSessions(fetchedSessions);
      setWorkouts(fetchedWorkouts);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProgressData();
  }, [loadProgressData]);

  useFocusEffect(
    useCallback(() => {
      loadProgressData();
    }, [loadProgressData])
  );

  const filteredData = useMemo(() => {
    const now = Date.now();
    let cutoffMs: number | null = null;
    if (selectedScope === '7D') {
      cutoffMs = now - 7 * 24 * 60 * 60 * 1000;
    } else if (selectedScope === '30D') {
      cutoffMs = now - 30 * 24 * 60 * 60 * 1000;
    } else if (selectedScope === '90D') {
      cutoffMs = now - 90 * 24 * 60 * 60 * 1000;
    }

    const safeSessions = Array.isArray(sessions) ? sessions : [];
    const safeWorkouts = Array.isArray(workouts) ? workouts : [];

    const scopedSessions = cutoffMs
      ? safeSessions.filter((s) => s && s.completedAt && new Date(s.completedAt).getTime() >= cutoffMs)
      : safeSessions;

    const scopedWorkouts = cutoffMs
      ? safeWorkouts.filter((w) => {
          if (!w || !w.dateKey) return false;
          const time = new Date(`${w.dateKey}T23:59:59Z`).getTime();
          return time >= cutoffMs;
        })
      : safeWorkouts;

    return {
      scopedSessions,
      scopedWorkouts,
    };
  }, [sessions, workouts, selectedScope]);

  const dashboard = useMemo(() => {
    return aggregateDashboardData(filteredData.scopedSessions, filteredData.scopedWorkouts, new Date());
  }, [filteredData]);

  const handleStartWorkout = () => {
    navigation.navigate('Train');
  };

  const getGameIcon = (gameId: string) => {
    switch (gameId) {
      case 'memory-matrix':
        return <GridIcon size={20} color={colors.primaryLight} />;
      case 'number-recall':
        return <LayersIcon size={20} color={colors.memory} />;
      case 'quick-reaction':
        return <ZapIcon size={20} color={colors.speed} />;
      case 'logic-quest':
        return <BrainIcon size={20} color={colors.primaryLight} />;
      case 'focus-finder':
        return <TargetIcon size={20} color={colors.attention} />;
      case 'pattern-master':
        return <CpuIcon size={20} color={colors.problemSolving} />;
      default:
        return <BrainIcon size={20} color={colors.primaryLight} />;
    }
  };

  const getGameDisplayName = (gameId: string) => {
    switch (gameId) {
      case 'memory-matrix':
        return t.memoryMatrix.gameTitle;
      case 'number-recall':
        return t.numberRecall.gameTitle;
      case 'quick-reaction':
        return t.quickReaction.gameTitle;
      case 'logic-quest':
        return t.logicQuest.gameTitle;
      case 'focus-finder':
        return t.focusFinder.gameTitle;
      case 'pattern-master':
        return t.patternMaster.gameTitle;
      default:
        return gameId;
    }
  };

  const formatDateDisplay = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const performanceIndex = dashboard.performanceIndex;
  const isScopeLocked = selectedScope !== '7D' && !isPro;

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      <Header
        title={t.progress.screenTitle}
        subtitle={t.progress.screenSubtitle}
      />

      {/* Error state banner if storage read failed */}
      {hasError && (
        <Card variant="outlined" style={[styles.errorCard, { borderColor: colors.error }]}>
          <Text style={[typography.bodyMedium, { color: colors.error }]}>
            {t.progress.errorLoading}
          </Text>
          <TouchableOpacity
            onPress={loadProgressData}
            style={styles.retryBtn}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t.progress.retryCta}
          >
            <Text style={[typography.label, { color: colors.primaryLight }]}>
              {t.progress.retryCta}
            </Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Analytics Time Scope Selector */}
      <View style={styles.scopeContainer} accessible={true} accessibilityRole="tablist">
        {(['7D', '30D', '90D', 'ALL'] as const).map((scope) => {
          const isSelected = selectedScope === scope;
          const isLocked = scope !== '7D' && !isPro;
          const label =
            scope === '7D'
              ? t.progress.scope7D
              : scope === '30D'
              ? t.progress.scope30D
              : scope === '90D'
              ? t.progress.scope90D
              : t.progress.scopeAll;

          return (
            <TouchableOpacity
              key={scope}
              style={[
                styles.scopePill,
                isSelected && { backgroundColor: colors.primary, borderColor: colors.primaryLight },
                !isSelected && { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
              ]}
              onPress={() => setSelectedScope(scope)}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${label} ${isLocked ? t.common.locked : ''}`}
            >
              <View style={styles.scopePillContent}>
                <Text
                  style={[
                    typography.label,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {label}
                </Text>
                {isLocked && (
                  <CrownIcon size={12} color={isSelected ? '#FFFFFF' : colors.primaryLight} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {isScopeLocked ? (
        /* Locked Scope Card for 30D / 90D / ALL */
        <Card
          variant="highlighted"
          style={[
            styles.lockedScopeCard,
            {
              borderColor: colors.primaryLight,
              backgroundColor: 'rgba(124, 92, 252, 0.08)',
            },
          ]}
        >
          <View style={[styles.lockedScopeIconCircle, { backgroundColor: 'rgba(124, 92, 252, 0.18)' }]}>
            <CrownIcon size={40} color={colors.primaryLight} />
          </View>

          <StatBadge
            label={t.progress.proFeatureBadge}
            variant="locked"
            size="sm"
            style={styles.lockedScopeBadge}
          />

          <Text style={[typography.h2, styles.lockedScopeTitle, { color: colors.textPrimary }]}>
            {t.progress.lockedScopeTitle}
          </Text>

          <Text style={[typography.bodyMedium, styles.lockedScopeSubtitle, { color: colors.textSecondary }]}>
            {t.progress.lockedScopeSubtitle}
          </Text>

          <Button
            title={t.progress.unlockTrendsCta}
            onPress={() => (navigation as any).navigate('PaywallModal')}
            variant="primary"
            size="lg"
            icon={<CrownIcon size={18} color="#FFFFFF" />}
            style={styles.lockedScopeBtn}
          />
        </Card>
      ) : (
        <>
          {/* Drill Score Average Hero Card */}
      <Card variant="highlighted" style={styles.indexCard}>
        <View style={styles.indexHeaderRow}>
          <StatBadge
            label={performanceIndex !== null ? t.progress.indexHeroBadge : t.progress.indexUncalibratedBadge}
            variant={performanceIndex !== null ? 'success' : 'primary'}
            icon={<SparklesIcon size={12} color={performanceIndex !== null ? colors.success : colors.primaryLight} />}
          />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            DRILL SCORE AVERAGE
          </Text>
        </View>

        <View style={styles.indexContentRow}>
          <View style={styles.indexLeft}>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
              {t.progress.mindIndexTitle}
            </Text>
            <Text style={[typography.statNumber, { color: colors.textPrimary, marginTop: 4 }]}>
              {performanceIndex !== null ? performanceIndex.toLocaleString() : '---'}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textMuted, marginTop: 4 }]}>
              {performanceIndex !== null
                ? `${dashboard.totalGameSessions} ${t.progress.statGameSessions.toLowerCase()}`
                : t.progress.mindIndexEmpty}
            </Text>
          </View>

          <View
            style={[
              styles.dialCircle,
              {
                borderColor: performanceIndex !== null ? colors.primaryLight : colors.borderLight,
                backgroundColor: colors.backgroundSecondary,
              },
            ]}
          >
            <BrainIcon size={38} color={performanceIndex !== null ? colors.primaryLight : colors.textMuted} />
          </View>
        </View>

        <Text style={[typography.caption, styles.disclaimerText, { color: colors.textMuted }]}>
          {t.progress.indexDisclaimer}
        </Text>
      </Card>

      {/* KPI Stats Summary Grid: Separate Daily Workouts from Game Sessions */}
      <View style={styles.statsGrid}>
        <Card variant="elevated" style={styles.statCard}>
          <CheckCircleIcon size={20} color="#10B981" />
          <Text style={[typography.h2, { color: colors.textPrimary, marginTop: 8 }]}>
            {dashboard.totalCompletedWorkouts}
          </Text>
          <Text style={[typography.caption, styles.statLabel, { color: colors.textMuted }]}>
            {t.progress.statDailyWorkouts}
          </Text>
        </Card>

        <Card variant="elevated" style={styles.statCard}>
          <TargetIcon size={20} color={colors.attention} />
          <Text style={[typography.h2, { color: colors.textPrimary, marginTop: 8 }]}>
            {dashboard.totalGameSessions}
          </Text>
          <Text style={[typography.caption, styles.statLabel, { color: colors.textMuted }]}>
            {t.progress.statGameSessions}
          </Text>
        </Card>

        <Card variant="elevated" style={styles.statCard}>
          <ClockIcon size={20} color={colors.primaryLight} />
          <Text style={[typography.h2, { color: colors.textPrimary, marginTop: 8 }]}>
            {dashboard.totalTrainingMinutes}
          </Text>
          <Text style={[typography.caption, styles.statLabel, { color: colors.textMuted }]}>
            {t.progress.statMinutes}
          </Text>
        </Card>

        <Card variant="elevated" style={styles.statCard}>
          <FlameIcon size={20} color={colors.speed} />
          <Text style={[typography.h2, { color: colors.textPrimary, marginTop: 8 }]}>
            {dashboard.workoutStreak.currentStreak}
          </Text>
          <Text style={[typography.caption, styles.statLabel, { color: colors.textMuted }]}>
            {t.progress.statWorkoutStreak}
          </Text>
        </Card>
      </View>

      {/* Best Streak Banner (if user has active streaks) */}
      {Math.max(dashboard.workoutStreak.bestStreak, dashboard.sessionStreak.bestStreak) > 0 && (
        <Card variant="outlined" style={styles.streakBanner}>
          <View style={styles.streakBannerRow}>
            <FlameIcon size={18} color={colors.speed} />
            <Text style={[typography.bodySmall, { color: colors.textPrimary, marginLeft: 8 }]}>
              {t.progress.bestStreakLabel}:{' '}
              <Text style={styles.streakBoldText}>
                {Math.max(dashboard.workoutStreak.bestStreak, dashboard.sessionStreak.bestStreak)}
              </Text>{' '}
              {t.progress.days}
            </Text>
          </View>
        </Card>
      )}

      {/* Seven-Day Activity Calendar Matrix */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t.progress.weeklyActivityTitle}
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
          {t.progress.weeklyActivitySubtitle}
        </Text>
      </View>

      <Card variant="elevated" style={styles.weeklyCard}>
        <WeeklyActivityMatrix days={dashboard.last7DaysActivity} />
      </Card>

      {/* Game Performance Breakdown Section */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t.progress.gameStatsTitle}
        </Text>
      </View>

      <View style={styles.gameCardsContainer}>
        {/* 1. Memory Matrix Breakdown */}
        <Card variant="elevated" style={styles.gameStatsCard}>
          <View style={styles.gameStatsHeader}>
            <View style={styles.gameStatsTitleGroup}>
              <View style={[styles.gameIconBadge, { backgroundColor: 'rgba(124, 92, 252, 0.16)' }]}>
                <GridIcon size={20} color={colors.primaryLight} />
              </View>
              <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: 10 }]}>
                {t.memoryMatrix.gameTitle}
              </Text>
            </View>
            <StatBadge
              label={`${dashboard.gameStats['memory-matrix'].sessionsCount} ${t.progress.sessionsCountLabel}`}
              variant="primary"
              size="sm"
            />
          </View>

          {/* Trend Sparkline */}
          <View style={styles.trendContainer}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {t.progress.trendTitle}
            </Text>
            <ScoreTrendSparkline
              scores={dashboard.gameStats['memory-matrix'].recentScores}
              color={colors.primaryLight}
              emptyLabel={t.progress.trendEmpty}
            />
          </View>

          <View style={[styles.gameMetricsGrid, { borderTopColor: colors.border }]}>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.highScoreLabel}</Text>
              <Text style={[typography.label, { color: colors.primaryLight, marginTop: 4 }]}>
                {dashboard.gameStats['memory-matrix'].highestScore.toLocaleString()}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricAccuracy}</Text>
              <Text style={[typography.label, { color: colors.attention, marginTop: 4 }]}>
                {dashboard.gameStats['memory-matrix'].avgAccuracy}%
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricLevel}</Text>
              <Text style={[typography.label, { color: colors.textPrimary, marginTop: 4 }]}>
                Lvl {dashboard.gameStats['memory-matrix'].highestLevel}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricPerfect}</Text>
              <Text style={[typography.label, { color: colors.success, marginTop: 4 }]}>
                {dashboard.gameStats['memory-matrix'].perfectRoundsTotal ?? 0}
              </Text>
            </View>
          </View>
        </Card>

        {/* 2. Number Recall Breakdown */}
        <Card variant="elevated" style={styles.gameStatsCard}>
          <View style={styles.gameStatsHeader}>
            <View style={styles.gameStatsTitleGroup}>
              <View style={[styles.gameIconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.16)' }]}>
                <LayersIcon size={20} color={colors.memory} />
              </View>
              <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: 10 }]}>
                {t.numberRecall.gameTitle}
              </Text>
            </View>
            <StatBadge
              label={`${dashboard.gameStats['number-recall'].sessionsCount} ${t.progress.sessionsCountLabel}`}
              variant="primary"
              size="sm"
            />
          </View>

          {/* Trend Sparkline */}
          <View style={styles.trendContainer}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {t.progress.trendTitle}
            </Text>
            <ScoreTrendSparkline
              scores={dashboard.gameStats['number-recall'].recentScores}
              color={colors.memory}
              emptyLabel={t.progress.trendEmpty}
            />
          </View>

          <View style={[styles.gameMetricsGrid, { borderTopColor: colors.border }]}>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.highScoreLabel}</Text>
              <Text style={[typography.label, { color: colors.primaryLight, marginTop: 4 }]}>
                {dashboard.gameStats['number-recall'].highestScore.toLocaleString()}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricAccuracy}</Text>
              <Text style={[typography.label, { color: colors.attention, marginTop: 4 }]}>
                {dashboard.gameStats['number-recall'].avgAccuracy}%
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricLevel}</Text>
              <Text style={[typography.label, { color: colors.textPrimary, marginTop: 4 }]}>
                Lvl {dashboard.gameStats['number-recall'].highestLevel}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.maxSpanLabel}</Text>
              <Text style={[typography.label, { color: colors.success, marginTop: 4 }]}>
                {dashboard.gameStats['number-recall'].maxDigitSpan ?? 0}d
              </Text>
            </View>
          </View>
        </Card>

        {/* 3. Quick Reaction Breakdown */}
        <Card variant="elevated" style={styles.gameStatsCard}>
          <View style={styles.gameStatsHeader}>
            <View style={styles.gameStatsTitleGroup}>
              <View style={[styles.gameIconBadge, { backgroundColor: 'rgba(255, 83, 118, 0.16)' }]}>
                <ZapIcon size={20} color={colors.speed} />
              </View>
              <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: 10 }]}>
                {t.quickReaction.gameTitle}
              </Text>
            </View>
            <StatBadge
              label={`${dashboard.gameStats['quick-reaction'].sessionsCount} ${t.progress.sessionsCountLabel}`}
              variant="primary"
              size="sm"
            />
          </View>

          {/* Trend Sparkline */}
          <View style={styles.trendContainer}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {t.progress.trendTitle}
            </Text>
            <ScoreTrendSparkline
              scores={dashboard.gameStats['quick-reaction'].recentScores}
              color={colors.speed}
              emptyLabel={t.progress.trendEmpty}
            />
          </View>

          <View style={[styles.gameMetricsGrid, { borderTopColor: colors.border }]}>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.highScoreLabel}</Text>
              <Text style={[typography.label, { color: colors.primaryLight, marginTop: 4 }]}>
                {dashboard.gameStats['quick-reaction'].highestScore.toLocaleString()}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricAccuracy}</Text>
              <Text style={[typography.label, { color: colors.attention, marginTop: 4 }]}>
                {dashboard.gameStats['quick-reaction'].avgAccuracy}%
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.bestReflexLabel}</Text>
              <Text style={[typography.label, { color: colors.speed, marginTop: 4 }]}>
                {dashboard.gameStats['quick-reaction'].bestReactionMs !== undefined
                  ? `${dashboard.gameStats['quick-reaction'].bestReactionMs}ms`
                  : '--'}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.avgReactionLabel}</Text>
              <Text style={[typography.label, { color: colors.success, marginTop: 4 }]}>
                {dashboard.gameStats['quick-reaction'].avgReactionMs !== undefined
                  ? `${dashboard.gameStats['quick-reaction'].avgReactionMs}ms`
                  : '--'}
              </Text>
            </View>
          </View>
        </Card>

        {/* 4. Logic Quest Breakdown */}
        <Card variant="elevated" style={styles.gameStatsCard}>
          <View style={styles.gameStatsHeader}>
            <View style={styles.gameStatsTitleGroup}>
              <View style={[styles.gameIconBadge, { backgroundColor: 'rgba(56, 189, 248, 0.16)' }]}>
                <BrainIcon size={20} color={colors.primaryLight} />
              </View>
              <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: 10 }]}>
                {t.logicQuest.gameTitle}
              </Text>
            </View>
            <StatBadge
              label={`${dashboard.gameStats['logic-quest'].sessionsCount} ${t.progress.sessionsCountLabel}`}
              variant="primary"
              size="sm"
            />
          </View>

          {/* Trend Sparkline */}
          <View style={styles.trendContainer}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {t.progress.trendTitle}
            </Text>
            <ScoreTrendSparkline
              scores={dashboard.gameStats['logic-quest'].recentScores}
              color={colors.primaryLight}
              emptyLabel={t.progress.trendEmpty}
            />
          </View>

          <View style={[styles.gameMetricsGrid, { borderTopColor: colors.border }]}>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.highScoreLabel}</Text>
              <Text style={[typography.label, { color: colors.primaryLight, marginTop: 4 }]}>
                {dashboard.gameStats['logic-quest'].highestScore.toLocaleString()}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricAccuracy}</Text>
              <Text style={[typography.label, { color: colors.attention, marginTop: 4 }]}>
                {dashboard.gameStats['logic-quest'].avgAccuracy}%
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricLevel}</Text>
              <Text style={[typography.label, { color: colors.textPrimary, marginTop: 4 }]}>
                Lvl {dashboard.gameStats['logic-quest'].highestLevel}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.avgTimeLabel}</Text>
              <Text style={[typography.label, { color: colors.success, marginTop: 4 }]}>
                {dashboard.gameStats['logic-quest'].avgResponseTimeMs !== undefined
                  ? `${(dashboard.gameStats['logic-quest'].avgResponseTimeMs / 1000).toFixed(1)}s`
                  : '--'}
              </Text>
            </View>
          </View>
        </Card>

        {/* 5. Focus Finder Breakdown */}
        <Card variant="elevated" style={styles.gameStatsCard}>
          <View style={styles.gameStatsHeader}>
            <View style={styles.gameStatsTitleGroup}>
              <View style={[styles.gameIconBadge, { backgroundColor: 'rgba(0, 212, 178, 0.16)' }]}>
                <TargetIcon size={20} color={colors.attention} />
              </View>
              <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: 10 }]}>
                {t.focusFinder.gameTitle}
              </Text>
            </View>
            <StatBadge
              label={`${dashboard.gameStats['focus-finder'].sessionsCount} ${t.progress.sessionsCountLabel}`}
              variant="primary"
              size="sm"
            />
          </View>

          {/* Trend Sparkline */}
          <View style={styles.trendContainer}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {t.progress.trendTitle}
            </Text>
            <ScoreTrendSparkline
              scores={dashboard.gameStats['focus-finder'].recentScores}
              color={colors.attention}
              emptyLabel={t.progress.trendEmpty}
            />
          </View>

          <View style={[styles.gameMetricsGrid, { borderTopColor: colors.border }]}>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.highScoreLabel}</Text>
              <Text style={[typography.label, { color: colors.primaryLight, marginTop: 4 }]}>
                {dashboard.gameStats['focus-finder'].highestScore.toLocaleString()}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricAccuracy}</Text>
              <Text style={[typography.label, { color: colors.attention, marginTop: 4 }]}>
                {dashboard.gameStats['focus-finder'].avgAccuracy}%
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricLevel}</Text>
              <Text style={[typography.label, { color: colors.textPrimary, marginTop: 4 }]}>
                Lvl {dashboard.gameStats['focus-finder'].highestLevel}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.bestSearchLabel}</Text>
              <Text style={[typography.label, { color: colors.success, marginTop: 4 }]}>
                {dashboard.gameStats['focus-finder'].bestFindTimeMs !== undefined
                  ? `${dashboard.gameStats['focus-finder'].bestFindTimeMs}ms`
                  : '--'}
              </Text>
            </View>
          </View>
        </Card>

        {/* 6. Pattern Master Breakdown */}
        <Card variant="elevated" style={styles.gameStatsCard}>
          <View style={styles.gameStatsHeader}>
            <View style={styles.gameStatsTitleGroup}>
              <View style={[styles.gameIconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.16)' }]}>
                <CpuIcon size={20} color={colors.problemSolving} />
              </View>
              <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: 10 }]}>
                {t.patternMaster.gameTitle}
              </Text>
            </View>
            <StatBadge
              label={`${dashboard.gameStats['pattern-master'].sessionsCount} ${t.progress.sessionsCountLabel}`}
              variant="primary"
              size="sm"
            />
          </View>

          {/* Trend Sparkline */}
          <View style={styles.trendContainer}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {t.progress.trendTitle}
            </Text>
            <ScoreTrendSparkline
              scores={dashboard.gameStats['pattern-master'].recentScores}
              color={colors.problemSolving}
              emptyLabel={t.progress.trendEmpty}
            />
          </View>

          <View style={[styles.gameMetricsGrid, { borderTopColor: colors.border }]}>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.highScoreLabel}</Text>
              <Text style={[typography.label, { color: colors.primaryLight, marginTop: 4 }]}>
                {dashboard.gameStats['pattern-master'].highestScore.toLocaleString()}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricAccuracy}</Text>
              <Text style={[typography.label, { color: colors.attention, marginTop: 4 }]}>
                {dashboard.gameStats['pattern-master'].avgAccuracy}%
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricLevel}</Text>
              <Text style={[typography.label, { color: colors.textPrimary, marginTop: 4 }]}>
                Lvl {dashboard.gameStats['pattern-master'].highestLevel}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.avgTimeLabel}</Text>
              <Text style={[typography.label, { color: colors.success, marginTop: 4 }]}>
                {dashboard.gameStats['pattern-master'].avgResponseTimeMs !== undefined
                  ? `${(dashboard.gameStats['pattern-master'].avgResponseTimeMs / 1000).toFixed(1)}s`
                  : '--'}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Cognitive Battery Status Header */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t.progress.allDrillsActiveTitle}
        </Text>
      </View>

      <Card variant="outlined" style={styles.roadmapCard}>
        <View style={styles.roadmapRow}>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
            {t.progress.allDrillsActiveSubtitle}
          </Text>
          <StatBadge label="6/6 READY" variant="success" size="sm" />
        </View>
      </Card>

      {/* Training History Section */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t.progress.recentActivityTitle}
        </Text>
      </View>

      {isLoading && dashboard.recentSessions.length === 0 ? (
        <View style={styles.loaderWrapper}>
          <ActivityIndicator size="small" color={colors.primaryLight} />
        </View>
      ) : dashboard.recentSessions.length === 0 ? (
        /* Empty State */
        <Card variant="outlined" style={styles.emptyHistoryCard}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.backgroundSecondary }]}>
            <ChartIcon size={32} color={colors.textSecondary} />
          </View>
          <Text style={[typography.h3, { color: colors.textPrimary, marginTop: 12, textAlign: 'center' }]}>
            {t.progress.emptyHistoryTitle}
          </Text>
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 22 },
            ]}
          >
            {t.progress.emptyHistoryMessage}
          </Text>

          <Button
            title={t.progress.startFirstWorkout}
            onPress={handleStartWorkout}
            variant="primary"
            size="md"
            style={styles.emptyCta}
          />
        </Card>
      ) : (
        /* Populated Recent Sessions List */
        <View style={styles.historyList}>
          {dashboard.recentSessions.map((session) => {
            const outcomeLabel =
              session.outcome === 'completed'
                ? t.progress.sessionOutcomeCompleted
                : session.outcome === 'abandoned'
                ? t.progress.sessionOutcomeAbandoned
                : t.progress.sessionOutcomeConcluded;

            const outcomeVariant =
              session.outcome === 'completed'
                ? 'success'
                : 'warning';

            return (
              <Card
                key={session.id}
                variant="elevated"
                style={styles.sessionCard}
                accessible={true}
                accessibilityLabel={`${getGameDisplayName(session.gameId)}, ${outcomeLabel}, score ${session.finalScore}`}
              >
                <View style={styles.sessionCardHeader}>
                  <View style={styles.sessionGameInfo}>
                    <View style={[styles.sessionIconWrapper, { backgroundColor: colors.backgroundSecondary }]}>
                      {getGameIcon(session.gameId)}
                    </View>
                    <View style={styles.sessionTitleWrapper}>
                      <Text style={[typography.label, { color: colors.textPrimary }]}>
                        {getGameDisplayName(session.gameId)}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                        {formatDateDisplay(session.completedAt)}
                      </Text>
                    </View>
                  </View>

                  <StatBadge
                    label={outcomeLabel}
                    variant={outcomeVariant}
                    size="sm"
                  />
                </View>

                {/* Metrics Row */}
                <View style={[styles.sessionMetricsRow, { borderTopColor: colors.border }]}>
                  <View style={styles.sessionMetricItem}>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricScore}</Text>
                    <Text style={[typography.label, { color: colors.primaryLight, marginTop: 2 }]}>
                      +{session.finalScore.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.sessionMetricItem}>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricAccuracy}</Text>
                    <Text style={[typography.label, { color: colors.attention, marginTop: 2 }]}>
                      {session.accuracyPercentage}%
                    </Text>
                  </View>

                  <View style={styles.sessionMetricItem}>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricLevel}</Text>
                    <Text style={[typography.label, { color: colors.textPrimary, marginTop: 2 }]}>
                      Lvl {session.highestLevel}
                    </Text>
                  </View>

                  {session.gameSpecificMetrics?.maxDigitSpan !== undefined && (
                    <View style={styles.sessionMetricItem}>
                      <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricSpan}</Text>
                      <Text style={[typography.label, { color: colors.success, marginTop: 2 }]}>
                        {session.gameSpecificMetrics.maxDigitSpan}d
                      </Text>
                    </View>
                  )}

                  {session.gameSpecificMetrics?.bestReactionMs !== undefined && (
                    <View style={styles.sessionMetricItem}>
                      <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.bestReactionLabel}</Text>
                      <Text style={[typography.label, { color: colors.speed, marginTop: 2 }]}>
                        {session.gameSpecificMetrics.bestReactionMs}ms
                      </Text>
                    </View>
                  )}

                  {session.gameSpecificMetrics?.avgResponseTimeMs !== undefined && (
                    <View style={styles.sessionMetricItem}>
                      <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.avgTimeLabel}</Text>
                      <Text style={[typography.label, { color: colors.success, marginTop: 2 }]}>
                        {(session.gameSpecificMetrics.avgResponseTimeMs / 1000).toFixed(1)}s
                      </Text>
                    </View>
                  )}

                  {session.gameSpecificMetrics?.bestFindTimeMs !== undefined && (
                    <View style={styles.sessionMetricItem}>
                      <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.bestSearchLabel}</Text>
                      <Text style={[typography.label, { color: colors.attention, marginTop: 2 }]}>
                        {session.gameSpecificMetrics.bestFindTimeMs}ms
                      </Text>
                    </View>
                  )}

                  {session.gameSpecificMetrics?.perfectRounds !== undefined &&
                    session.gameSpecificMetrics?.maxDigitSpan === undefined &&
                    session.gameSpecificMetrics?.bestReactionMs === undefined &&
                    session.gameSpecificMetrics?.avgResponseTimeMs === undefined &&
                    session.gameSpecificMetrics?.bestFindTimeMs === undefined && (
                      <View style={styles.sessionMetricItem}>
                        <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricPerfect}</Text>
                        <Text style={[typography.label, { color: colors.success, marginTop: 2 }]}>
                          {session.gameSpecificMetrics.perfectRounds}
                        </Text>
                      </View>
                    )}
                </View>
              </Card>
            );
          })}
        </View>
      )}
        </>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 36,
  },
  errorCard: {
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retryBtn: {
    paddingHorizontal: 8,
  },
  indexCard: {
    padding: 18,
    marginBottom: 16,
  },
  indexHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  indexContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  indexLeft: {
    flex: 1,
  },
  dialCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: {
    marginTop: 2,
    textAlign: 'center',
    fontSize: 10,
  },
  streakBanner: {
    padding: 12,
    marginBottom: 16,
    borderRadius: 12,
  },
  streakBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBoldText: {
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 8,
    marginTop: 8,
  },
  weeklyCard: {
    padding: 14,
    marginBottom: 16,
  },
  disclaimerText: {
    marginTop: 10,
    lineHeight: 18,
    textAlign: 'center',
  },
  gameCardsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  gameStatsCard: {
    padding: 16,
  },
  gameStatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gameStatsTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  gameMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  metricColumn: {
    alignItems: 'center',
  },
  roadmapCard: {
    padding: 16,
    marginBottom: 20,
  },
  roadmapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loaderWrapper: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCta: {
    marginTop: 18,
    width: '100%',
  },
  historyList: {
    gap: 12,
  },
  sessionCard: {
    padding: 14,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sessionGameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sessionTitleWrapper: {},
  sessionMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 2,
  },
  sessionMetricItem: {
    alignItems: 'center',
  },
  scopeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  scopePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopePillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lockedScopeCard: {
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
  },
  lockedScopeIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  lockedScopeBadge: {
    marginBottom: 12,
  },
  lockedScopeTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  lockedScopeSubtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  lockedScopeBtn: {
    width: '100%',
  },
});
