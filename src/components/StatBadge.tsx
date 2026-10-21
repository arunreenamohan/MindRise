import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface StatBadgeProps {
  label: string;
  icon?: ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'neutral' | 'accent' | 'locked';
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const StatBadge: React.FC<StatBadgeProps> = ({
  label,
  icon,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
}) => {
  const { colors, radius, typography } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: 'rgba(16, 185, 129, 0.16)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.16)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' };
      case 'neutral':
        return { bg: colors.backgroundSecondary, text: colors.textSecondary, border: colors.border };
      case 'accent':
        return { bg: 'rgba(255, 83, 118, 0.16)', text: '#FF5376', border: 'rgba(255, 83, 118, 0.3)' };
      case 'locked':
        return { bg: 'rgba(100, 116, 139, 0.18)', text: colors.textMuted, border: colors.border };
      case 'primary':
      default:
        return { bg: colors.primaryMuted, text: colors.primaryLight, border: 'rgba(124, 92, 252, 0.3)' };
    }
  };

  const scheme = getColors();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: scheme.bg,
          borderColor: scheme.border,
          borderRadius: radius.round,
          paddingVertical: isSm ? 2 : 4,
          paddingHorizontal: isSm ? 8 : 10,
        },
        style,
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text
        style={[
          isSm ? typography.caption : typography.bodySmall,
          { color: scheme.text, fontWeight: '600' },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  iconContainer: {
    marginRight: 4,
  },
});
