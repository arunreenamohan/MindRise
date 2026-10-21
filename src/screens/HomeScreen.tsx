import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatBadge } from '../components/StatBadge';
import {
  BrainIcon,
  FlameIcon,
  ZapIcon,
  TargetIcon,
  GridIcon,
  SparklesIcon,
} from '../components/SvgIcons';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { colors, typography } = useTheme();
  const { t } = useLocalization();

  const handleStartDailyWorkout = () => {
    // Navigates directly to the flagship drill for Phase 2/start
    navigation.navigate('GameIntro', { gameId: 'memory-matrix' });
  };

  const handleNavigateTrain = () => {
    navigation.navigate('Train');
  };

  const handleOpenGame = (gameId: string) => {
    navigation.navigate('GameIntro', { gameId });
  };

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      {/* Header Welcome Bar */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
            {t.home.greetingGuest}
          </Text>
          <Text style={[typography.h1, { color: colors.textPrimary, marginTop: 2 }]}>
            MindRise
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          style={[styles.profileAvatar, { backgroundColor: colors.primaryMuted, borderColor: colors.primaryLight }]}
          activeOpacity={0.7}
        >
          <BrainIcon size={22} color={colors.primaryLight} />
        </TouchableOpacity>
      </View>

      {/* Daily Workout Hero Card */}
      <Card variant="highlighted" style={styles.workoutCard}>
        <View style={styles.workoutBadgeRow}>
          <StatBadge label={t.home.dailyWorkoutTag} variant="primary" icon={<SparklesIcon size={12} color={colors.primaryLight} />} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>3 DRILLS • 5 MINS</Text>
        </View>

        <Text style={[typography.h2, { color: colors.textPrimary, marginTop: 8 }]}>
          {t.home.dailyWorkoutTitle}
        </Text>
        <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 4, marginBottom: 16 }]}>
          {t.home.dailyWorkoutDesc}
        </Text>

        <Button
          title={t.home.startWorkoutCta}
          onPress={handleStartDailyWorkout}
          variant="primary"
          size="md"
          icon={<ZapIcon size={16} color="#FFFFFF" />}
        />
      </Card>

      {/* Streak Section (Honest Empty State) */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t.home.streakTitle}
        </Text>
      </View>

      <Card variant="elevated" style={styles.streakCard}>
        <View style={styles.streakRow}>
          <View style={[styles.streakIconWrapper, { backgroundColor: 'rgba(255, 83, 118, 0.12)' }]}>
            <FlameIcon size={30} color={colors.speed} />
          </View>
          <View style={styles.streakInfo}>
            <Text style={[typography.h2, { color: colors.textPrimary }]}>
              {t.home.streakEmptyCount}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
              {t.home.streakEmptyDesc}
            </Text>
          </View>
        </View>
      </Card>

      {/* Quick Access to Games */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t.home.quickTrainTitle}
        </Text>
        <TouchableOpacity onPress={handleNavigateTrain} activeOpacity={0.7}>
          <Text style={[typography.label, { color: colors.primaryLight }]}>
            {t.home.viewAllGames}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickGrid}>
        {/* Quick Item 1: Memory Matrix */}
        <Card
          variant="elevated"
          onPress={() => handleOpenGame('memory-matrix')}
          style={styles.quickCard}
        >
          <View style={styles.quickCardHeader}>
            <View style={[styles.gameIconBadge, { backgroundColor: 'rgba(124, 92, 252, 0.16)' }]}>
              <GridIcon size={22} color={colors.primaryLight} />
            </View>
            <StatBadge label="PHASE 2" variant="primary" size="sm" />
          </View>
          <Text style={[typography.h3, { color: colors.textPrimary, marginTop: 12 }]}>
            Memory Matrix
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]} numberOfLines={2}>
            Spatial pattern recall
          </Text>
        </Card>

        {/* Quick Item 2: Focus Finder */}
        <Card
          variant="elevated"
          onPress={() => handleOpenGame('focus-finder')}
          style={styles.quickCard}
        >
          <View style={styles.quickCardHeader}>
            <View style={[styles.gameIconBadge, { backgroundColor: 'rgba(0, 212, 178, 0.16)' }]}>
              <TargetIcon size={22} color={colors.attention} />
            </View>
            <StatBadge label="PHASE 3" variant="neutral" size="sm" />
          </View>
          <Text style={[typography.h3, { color: colors.textPrimary, marginTop: 12 }]}>
            Focus Finder
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]} numberOfLines={2}>
            Visual anomaly search
          </Text>
        </Card>
      </View>

      {/* Daily Mind Insight */}
      <Card variant="outlined" style={styles.quoteCard}>
        <Text style={[typography.bodyMedium, styles.quoteText, { color: colors.textSecondary }]}>
          {t.home.mindQuote}
        </Text>
        <Text style={[typography.caption, styles.quoteAuthor, { color: colors.primaryLight }]}>
          — {t.home.mindQuoteAuthor}
        </Text>
      </Card>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTextGroup: {
    flex: 1,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutCard: {
    marginBottom: 24,
  },
  workoutBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 12,
  },
  streakCard: {
    padding: 16,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  streakInfo: {
    flex: 1,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickCard: {
    flex: 1,
    padding: 14,
  },
  quickCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteCard: {
    marginTop: 24,
    padding: 16,
  },
  quoteText: {
    fontStyle: 'italic',
    lineHeight: 22,
  },
  quoteAuthor: {
    marginTop: 8,
    textAlign: 'right',
  },
});
