import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ArrowLeftIcon } from './SvgIcons';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightElement,
  style,
}) => {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.headerContainer, { paddingBottom: spacing.md }, style]}>
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            activeOpacity={0.7}
            style={[styles.backButton, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}
          >
            <ArrowLeftIcon size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.titleColumn}>
          <Text style={[typography.h1, { color: colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {rightElement ? <View style={styles.rightContainer}>{rightElement}</View> : null}
      </View>

      {subtitle ? (
        <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 4 }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  titleColumn: {
    flex: 1,
  },
  rightContainer: {
    marginLeft: 12,
  },
});
