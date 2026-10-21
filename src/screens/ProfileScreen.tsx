import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { StatBadge } from '../components/StatBadge';
import {
  UserIcon,
  GlobeIcon,
  MoonIcon,
  BellIcon,
  ShieldCheckIcon,
} from '../components/SvgIcons';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';

export const ProfileScreen: React.FC = () => {
  const { colors, typography, isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLocalization();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      <Header
        title={t.profile.screenTitle}
        subtitle="Manage personal settings and offline data"
      />

      {/* Guest Profile Card */}
      <Card variant="highlighted" style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primaryMuted, borderColor: colors.primaryLight }]}>
            <UserIcon size={32} color={colors.primaryLight} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[typography.h2, { color: colors.textPrimary }]}>
              {t.profile.guestName}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
              {t.profile.guestSubtitle}
            </Text>
            <View style={styles.badgeRow}>
              <StatBadge
                label={t.profile.localFirstBadge}
                variant="success"
                size="sm"
                icon={<ShieldCheckIcon size={12} color="#10B981" />}
              />
            </View>
          </View>
        </View>
      </Card>

      {/* Language Section (English & Malayalam) */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t.profile.languageSectionTitle}
        </Text>
      </View>

      <Card variant="elevated" style={styles.settingsCard}>
        <View style={styles.languageOptions}>
          <TouchableOpacity
            onPress={() => setLanguage('en')}
            activeOpacity={0.75}
            style={[
              styles.langPill,
              {
                backgroundColor: language === 'en' ? colors.primary : colors.backgroundHigher,
                borderColor: language === 'en' ? colors.primaryLight : colors.border,
              },
            ]}
          >
            <GlobeIcon size={18} color={language === 'en' ? '#FFFFFF' : colors.textSecondary} />
            <Text
              style={[
                typography.label,
                { color: language === 'en' ? '#FFFFFF' : colors.textPrimary, marginLeft: 8 },
              ]}
            >
              {t.profile.languageEnglish}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setLanguage('ml')}
            activeOpacity={0.75}
            style={[
              styles.langPill,
              {
                backgroundColor: language === 'ml' ? colors.primary : colors.backgroundHigher,
                borderColor: language === 'ml' ? colors.primaryLight : colors.border,
              },
            ]}
          >
            <GlobeIcon size={18} color={language === 'ml' ? '#FFFFFF' : colors.textSecondary} />
            <Text
              style={[
                typography.label,
                { color: language === 'ml' ? '#FFFFFF' : colors.textPrimary, marginLeft: 8 },
              ]}
            >
              {t.profile.languageMalayalam}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Appearance Section */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t.profile.appearanceSectionTitle}
        </Text>
      </View>

      <Card variant="elevated" style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabelGroup}>
            <MoonIcon size={20} color={colors.primaryLight} />
            <View style={styles.settingTextGroup}>
              <Text style={[typography.bodyLarge, { color: colors.textPrimary }]}>
                {t.profile.darkModeLabel}
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                Deep navy / indigo palette with violet accents
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.backgroundHigher, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      {/* Notifications Section */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t.profile.notificationsSectionTitle}
        </Text>
      </View>

      <Card variant="elevated" style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabelGroup}>
            <BellIcon size={20} color={colors.warning} />
            <View style={styles.settingTextGroup}>
              <Text style={[typography.bodyLarge, { color: colors.textPrimary }]}>
                {t.profile.dailyReminderLabel}
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                {t.profile.dailyReminderDesc}
              </Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: colors.backgroundHigher, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      {/* Privacy Information */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {t.profile.privacySectionTitle}
        </Text>
      </View>

      <Card variant="outlined" style={styles.privacyCard}>
        <View style={styles.privacyRow}>
          <ShieldCheckIcon size={24} color="#10B981" />
          <View style={styles.privacyTextGroup}>
            <Text style={[typography.label, { color: colors.textPrimary }]}>
              Client-Side Local Storage
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4, lineHeight: 18 }]}>
              {t.profile.privacyDescription}
            </Text>
          </View>
        </View>
      </Card>

      {/* Version Tag */}
      <View style={styles.versionContainer}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {t.profile.appVersion}
        </Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  profileCard: {
    padding: 18,
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  badgeRow: {
    marginTop: 8,
  },
  sectionHeader: {
    marginTop: 18,
    marginBottom: 10,
  },
  settingsCard: {
    padding: 14,
  },
  languageOptions: {
    gap: 10,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  settingTextGroup: {
    marginLeft: 12,
    flex: 1,
  },
  privacyCard: {
    padding: 16,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  privacyTextGroup: {
    marginLeft: 12,
    flex: 1,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 28,
  },
});
