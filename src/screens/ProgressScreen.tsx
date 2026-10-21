import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
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
} from '../components/SvgIcons';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';

type ProgressScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Progress'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const ProgressScreen: React.FC = () => {
  const navigation = useNavigation<ProgressScreenNavigationProp>();
  const { colors, typography } = useTheme();
  const { t } = useLocalization();

  const handleStartWorkout = () => {
    navigation.navigate('Train');
  };

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      <Header
        title={t.progress.screenTitle}
        subtitle={t.progress.screenSubtitle}
      />

      {/* MindRise Index Hero Card (Honest Uncalibrated State) */}
      <Card variant="highlighted" style={styles.indexCard}>
        <View style={styles.indexHeaderRow}>
          <StatBadge label="COGNITIVE BASELINE" variant="primary" icon={<SparklesIcon size={12} color={colors.primaryLight} />} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>INDEX RANGE: 0 - 1000</Text>
        </View>

        <View style={styles.indexContentRow}>
          <View style={styles.indexLeft}>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
              {t.progress.mindIndexTitle}
            </Text>
            <Text style={[typography.statNumber, { color: colors.textPrimary, marginTop: 4 }]}>
              ---
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textMuted, marginTop: 4 }]}>
              {t.progress.mindIndexEmpty}
            </Text>
          </View>

          <View style={[styles.dialCircle, { borderColor: colors.borderLight, backgroundColor: colors.backgroundSecondary }]}>
            <BrainIcon size={38} color={colors.primaryLight} />
          </View>
        </View>
      </Card>

      {/* Stats Summary Grid (All Zero / Empty - Honest tracking) */}
      <View style={styles.statsGrid}>
        <Card variant="elevated" style={styles.statCard}>
          <TargetIcon size={20} color={colors.attention} />
          <Text style={[typography.h2, { color: colors.textPrimary, marginTop: 8 }]}>0</Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
            {t.progress.statWorkouts}
          </Text>
        </Card>

        <Card variant="elevated" style={styles.statCard}>
          <ClockIcon size={20} color={colors.primaryLight} />
          <Text style={[typography.h2, { color: colors.textPrimary, marginTop: 8 }]}>0</Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
            {t.progress.statMinutes}
          </Text>
        </Card>

        <Card variant="elevated" style={styles.statCard}>
          <FlameIcon size={20} color={colors.speed} />
          <Text style={[typography.h2, { color: colors.textPrimary, marginTop: 8 }]}>0</Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
            {t.progress.statStreak}
          </Text>
        </Card>
      </View>

      {/* Cognitive Domains Breakdown */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t.progress.domainsTitle}
        </Text>
      </View>

      <Card variant="elevated" style={styles.domainsCard}>
        {[
          { name: 'Memory', color: colors.memory, score: 0 },
          { name: 'Attention', color: colors.attention, score: 0 },
          { name: 'Processing Speed', color: colors.speed, score: 0 },
          { name: 'Logical Reasoning', color: colors.logic, score: 0 },
        ].map((domain, idx) => (
          <View key={domain.name} style={[styles.domainRow, idx > 0 && { marginTop: 14 }]}>
            <View style={styles.domainLabelRow}>
              <Text style={[typography.label, { color: colors.textPrimary }]}>{domain.name}</Text>
              <Text style={[typography.bodySmall, { color: colors.textMuted }]}>Uncalibrated</Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: colors.backgroundHigher }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: domain.color,
                    width: `${Math.max(domain.score, 4)}%`,
                    opacity: 0.35,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </Card>

      {/* Training History Empty State Card */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          Training History
        </Text>
      </View>

      <Card variant="outlined" style={styles.emptyHistoryCard}>
        <View style={[styles.emptyIconCircle, { backgroundColor: colors.backgroundSecondary }]}>
          <ChartIcon size={32} color={colors.textSecondary} />
        </View>
        <Text style={[typography.h3, { color: colors.textPrimary, marginTop: 12, textAlign: 'center' }]}>
          {t.progress.emptyHistoryTitle}
        </Text>
        <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 22 }]}>
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
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 36,
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
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  domainsCard: {
    padding: 16,
    marginBottom: 20,
  },
  domainRow: {
    gap: 6,
  },
  domainLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
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
});
