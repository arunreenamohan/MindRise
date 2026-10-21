import React, { ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle, StyleProp, AccessibilityRole } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'highlighted' | 'outlined';
  activeOpacity?: number;
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  variant = 'default',
  activeOpacity = 0.75,
  accessible,
  accessibilityLabel,
  accessibilityRole,
}) => {
  const { colors, radius, spacing } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'highlighted':
        return colors.backgroundHigher;
      case 'elevated':
        return colors.backgroundElevated;
      case 'outlined':
        return 'transparent';
      case 'default':
      default:
        return colors.card;
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'highlighted':
        return colors.primaryLight;
      case 'outlined':
        return colors.borderLight;
      case 'elevated':
      case 'default':
      default:
        return colors.border;
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderColor: getBorderColor(),
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={activeOpacity}
        accessible={accessible}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole ?? 'button'}
        style={[cardStyle, styles.touchable, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      style={[cardStyle, style]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  touchable: {},
});
