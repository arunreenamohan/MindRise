import React, { useState, useCallback } from 'react';
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
} from '../components/SvgIcons';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';
import {
  historyRepository,
  GameSessionRecord,
  HistorySummary,
  calculateDrillPerformanceIndex,
} from '../history';

type ProgressScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Progress'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const ProgressScreen: React.FC = () => {
  const navigation = useNavigation<ProgressScreenNavigationProp>();
  const { colors, typography } = useTheme();
  const { t } = useLocalization();

  const [sessions, setSessions] = useState<GameSessionRecord[]>([]);
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const loadProgressData = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const [fetchedSessions, fetchedSummary] = await Promise.all([
        historyRepository.getSessions(25),
        historyRepository.getHistorySummary(),
      ]);
      setSessions(fetchedSessions);
      setSummary(fetchedSummary);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgressData();
    }, [loadProgressData])
  );

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

  const totalMinutes = summary ? Math.round(summary.totalDurationMs / 60000) : 0;

  // Transparent Drill Performance Index: average score across completed qualifying workouts
  const performanceIndex = summary
    ? calculateDrillPerformanceIndex(summary.totalScore, summary.totalWorkouts)
    : null;

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

      {/* Drill Performance Hero Card */}
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
                ? `${summary?.totalWorkouts} ${t.progress.statWorkouts.toLowerCase()}`
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

      {/* Stats Summary Grid */}
      <View style={styles.statsGrid}>
        <Card variant="elevated" style={styles.statCard}>
          <TargetIcon size={20} color={colors.attention} />
          <Text style={[typography.h2, { color: colors.textPrimary, marginTop: 8 }]}>
            {summary?.totalWorkouts ?? 0}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
            {t.progress.statWorkouts}
          </Text>
        </Card>

        <Card variant="elevated" style={styles.statCard}>
          <ClockIcon size={20} color={colors.primaryLight} />
          <Text style={[typography.h2, { color: colors.textPrimary, marginTop: 8 }]}>
            {totalMinutes}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
            {t.progress.statMinutes}
          </Text>
        </Card>

        <Card variant="elevated" style={styles.statCard}>
          <FlameIcon size={20} color={colors.speed} />
          <Text style={[typography.h2, { color: colors.textPrimary, marginTop: 8 }]}>
            {summary?.currentStreak ?? 0}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
            {t.progress.statStreak}
          </Text>
        </Card>
      </View>

      {/* Best Streak Banner (if user has active streaks) */}
      {(summary?.bestStreak ?? 0) > 0 && (
        <Card variant="outlined" style={styles.streakBanner}>
          <View style={styles.streakBannerRow}>
            <FlameIcon size={18} color={colors.speed} />
            <Text style={[typography.bodySmall, { color: colors.textPrimary, marginLeft: 8 }]}>
              {t.progress.bestStreakLabel}: <Text style={{ fontWeight: '700' }}>{summary?.bestStreak}</Text> {t.progress.days}
            </Text>
          </View>
        </Card>
      )}

      {/* Game Performance Breakdown Section */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t.progress.gameStatsTitle}
        </Text>
      </View>

      <View style={styles.gameCardsContainer}>
        {/* Memory Matrix Breakdown */}
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
              label={`${summary?.gameStats['memory-matrix']?.sessionsCount ?? 0} ${t.progress.sessionsCountLabel}`}
              variant="primary"
              size="sm"
            />
          </View>

          <View style={[styles.gameMetricsGrid, { borderTopColor: colors.border }]}>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.highScoreLabel}</Text>
              <Text style={[typography.label, { color: colors.primaryLight, marginTop: 4 }]}>
                {summary?.gameStats['memory-matrix']?.highestScore.toLocaleString() ?? '0'}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricAccuracy}</Text>
              <Text style={[typography.label, { color: colors.attention, marginTop: 4 }]}>
                {summary?.gameStats['memory-matrix']?.avgAccuracy ?? 0}%
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricLevel}</Text>
              <Text style={[typography.label, { color: colors.textPrimary, marginTop: 4 }]}>
                Lvl {summary?.gameStats['memory-matrix']?.highestLevel ?? 1}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricPerfect}</Text>
              <Text style={[typography.label, { color: colors.success, marginTop: 4 }]}>
                {summary?.gameStats['memory-matrix']?.perfectRoundsTotal ?? 0}
              </Text>
            </View>
          </View>
        </Card>

        {/* Number Recall Breakdown */}
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
              label={`${summary?.gameStats['number-recall']?.sessionsCount ?? 0} ${t.progress.sessionsCountLabel}`}
              variant="primary"
              size="sm"
            />
          </View>

          <View style={[styles.gameMetricsGrid, { borderTopColor: colors.border }]}>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.highScoreLabel}</Text>
              <Text style={[typography.label, { color: colors.primaryLight, marginTop: 4 }]}>
                {summary?.gameStats['number-recall']?.highestScore.toLocaleString() ?? '0'}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricAccuracy}</Text>
              <Text style={[typography.label, { color: colors.attention, marginTop: 4 }]}>
                {summary?.gameStats['number-recall']?.avgAccuracy ?? 0}%
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricLevel}</Text>
              <Text style={[typography.label, { color: colors.textPrimary, marginTop: 4 }]}>
                Lvl {summary?.gameStats['number-recall']?.highestLevel ?? 1}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.maxSpanLabel}</Text>
              <Text style={[typography.label, { color: colors.success, marginTop: 4 }]}>
                {summary?.gameStats['number-recall']?.maxDigitSpan ?? 0}d
              </Text>
            </View>
          </View>
        </Card>

        {/* Quick Reaction Breakdown */}
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
              label={`${summary?.gameStats['quick-reaction']?.sessionsCount ?? 0} ${t.progress.sessionsCountLabel}`}
              variant="primary"
              size="sm"
            />
          </View>

          <View style={[styles.gameMetricsGrid, { borderTopColor: colors.border }]}>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.highScoreLabel}</Text>
              <Text style={[typography.label, { color: colors.primaryLight, marginTop: 4 }]}>
                {summary?.gameStats['quick-reaction']?.highestScore.toLocaleString() ?? '0'}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.metricAccuracy}</Text>
              <Text style={[typography.label, { color: colors.attention, marginTop: 4 }]}>
                {summary?.gameStats['quick-reaction']?.avgAccuracy ?? 0}%
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.bestReactionLabel}</Text>
              <Text style={[typography.label, { color: colors.speed, marginTop: 4 }]}>
                {summary?.gameStats['quick-reaction']?.bestReactionMs !== undefined
                  ? `${summary.gameStats['quick-reaction'].bestReactionMs}ms`
                  : '--'}
              </Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t.progress.avgReactionLabel}</Text>
              <Text style={[typography.label, { color: colors.success, marginTop: 4 }]}>
                {summary?.gameStats['quick-reaction']?.avgReactionMs !== undefined
                  ? `${summary.gameStats['quick-reaction'].avgReactionMs}ms`
                  : '--'}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Roadmap Drills Header */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t.progress.roadmapDrillsTitle}
        </Text>
      </View>

      <Card variant="outlined" style={styles.roadmapCard}>
        <View style={styles.roadmapRow}>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Focus Finder (Attention)</Text>
          <StatBadge label="ROADMAP" variant="primary" size="sm" />
        </View>
        <View style={[styles.roadmapRow, { marginTop: 12 }]}>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Logic Quest (Reasoning)</Text>
          <StatBadge label="ROADMAP" variant="primary" size="sm" />
        </View>
      </Card>

      {/* Training History Section */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t.progress.recentActivityTitle}
        </Text>
      </View>

      {isLoading && sessions.length === 0 ? (
        <View style={styles.loaderWrapper}>
          <ActivityIndicator size="small" color={colors.primaryLight} />
        </View>
      ) : sessions.length === 0 ? (
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
          {sessions.map((session) => {
            const outcomeLabel =
              session.outcome === 'completed'
                ? t.progress.sessionOutcomeCompleted
                : session.outcome === 'abandoned'
                ? t.progress.sessionOutcomeAbandoned
                : t.progress.sessionOutcomeConcluded;

            const outcomeVariant =
              session.outcome === 'completed'
                ? 'success'
                : session.outcome === 'abandoned'
                ? 'warning'
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

                  {session.gameSpecificMetrics?.perfectRounds !== undefined &&
                    session.gameSpecificMetrics?.maxDigitSpan === undefined &&
                    session.gameSpecificMetrics?.bestReactionMs === undefined && (
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
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
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
  sectionHeader: {
    marginBottom: 10,
    marginTop: 6,
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
    marginBottom: 12,
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
});
