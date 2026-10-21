import React, { ReactNode } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}) => {
  const { colors, radius, typography } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) {
      return colors.backgroundSecondary;
    }
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.backgroundHigher;
      case 'danger':
        return colors.error;
      case 'ghost':
        return 'transparent';
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) {
      return colors.textMuted;
    }
    switch (variant) {
      case 'primary':
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
        return colors.textPrimary;
      case 'ghost':
        return colors.primaryLight;
      default:
        return '#FFFFFF';
    }
  };

  const getBorderColor = () => {
    if (variant === 'secondary') {
      return colors.border;
    }
    if (variant === 'ghost') {
      return 'transparent';
    }
    return 'transparent';
  };

  const getPaddingVertical = () => {
    switch (size) {
      case 'sm':
        return 10;
      case 'lg':
        return 16;
      case 'md':
      default:
        return 13;
    }
  };

  const getPaddingHorizontal = () => {
    switch (size) {
      case 'sm':
        return 14;
      case 'lg':
        return 24;
      case 'md':
      default:
        return 18;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderRadius: radius.lg,
          paddingVertical: getPaddingVertical(),
          paddingHorizontal: getPaddingHorizontal(),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text
            style={[
              typography.button,
              { color: getTextColor() },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
