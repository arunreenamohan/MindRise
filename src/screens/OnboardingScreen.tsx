import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatBadge } from '../components/StatBadge';
import { BrainIcon, ZapIcon, ClockIcon, ShieldCheckIcon, SparklesIcon } from '../components/SvgIcons';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';
import { setOnboardingCompleted } from '../storage';

type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

interface Props {
  navigation: OnboardingScreenNavigationProp;
}

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, typography, spacing } = useTheme();
  const { t } = useLocalization();

  const handleGetStarted = () => {
    setOnboardingCompleted(true).catch(() => {});
    navigation.replace('MainTabs', { screen: 'Home' });
  };

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      {/* Brand & Hero */}
      <View style={styles.heroSection}>
        <View style={[styles.logoBadge, { backgroundColor: colors.primaryMuted, borderColor: colors.primaryLight }]}>
          <BrainIcon size={52} color={colors.primaryLight} strokeWidth={2.2} />
        </View>

        <View style={styles.badgeRow}>
          <StatBadge label="COGNITIVE ELEVATION" variant="primary" icon={<SparklesIcon size={12} color={colors.primaryLight} />} />
        </View>

        <Text style={[typography.h1, styles.title, { color: colors.textPrimary }]}>
          {t.onboarding.heroTitle}
        </Text>

        <Text style={[typography.bodyLarge, styles.subtitle, { color: colors.textSecondary }]}>
          {t.onboarding.heroSubtitle}
        </Text>
      </View>

      {/* Feature Pillars */}
      <View style={styles.featuresSection}>
        <Card variant="elevated" style={styles.featureCard}>
          <View style={styles.featureRow}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(124, 92, 252, 0.15)' }]}>
              <ZapIcon size={24} color={colors.primaryLight} />
            </View>
            <View style={styles.featureText}>
              <Text style={[typography.h3, { color: colors.textPrimary }]}>
                {t.onboarding.feature1Title}
              </Text>
              <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 4 }]}>
                {t.onboarding.feature1Desc}
              </Text>
            </View>
          </View>
        </Card>

        <Card variant="elevated" style={styles.featureCard}>
          <View style={styles.featureRow}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(255, 83, 118, 0.15)' }]}>
              <ClockIcon size={24} color="#FF5376" />
            </View>
            <View style={styles.featureText}>
              <Text style={[typography.h3, { color: colors.textPrimary }]}>
                {t.onboarding.feature2Title}
              </Text>
              <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 4 }]}>
                {t.onboarding.feature2Desc}
              </Text>
            </View>
          </View>
        </Card>

        <Card variant="elevated" style={styles.featureCard}>
          <View style={styles.featureRow}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <ShieldCheckIcon size={24} color="#10B981" />
            </View>
            <View style={styles.featureText}>
              <Text style={[typography.h3, { color: colors.textPrimary }]}>
                {t.onboarding.feature3Title}
              </Text>
              <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 4 }]}>
                {t.onboarding.feature3Desc}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* CTA Bottom Section */}
      <View style={[styles.ctaSection, { paddingTop: spacing.xl }]}>
        <Button
          title={t.onboarding.ctaButton}
          onPress={handleGetStarted}
          variant="primary"
          size="lg"
          icon={<SparklesIcon size={18} color="#FFFFFF" />}
          iconPosition="right"
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  heroSection: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badgeRow: {
    marginBottom: 12,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  featuresSection: {
    marginVertical: 12,
    gap: 14,
  },
  featureCard: {
    padding: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  ctaSection: {
    marginTop: 'auto',
  },
});
