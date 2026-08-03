import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View, ViewStyle, ActivityIndicator } from 'react-native';
import { THEME, RADIUS } from '../../lib/theme';

type ButtonVariant = 'primary' | 'orange' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string }> = {
  primary: { bg: THEME.primary, text: '#FFFFFF' },
  orange: { bg: THEME.accent, text: '#FFFFFF' },
  secondary: { bg: THEME.surfaceSecondary, text: THEME.text },
  ghost: { bg: 'transparent', text: THEME.textSecondary },
  danger: { bg: THEME.danger, text: '#FFFFFF' },
};

const SIZE_STYLES: Record<ButtonSize, { py: number; px: number; fontSize: number; radius: number }> = {
  sm: { py: 6, px: 12, fontSize: 12, radius: RADIUS.sm },
  md: { py: 12, px: 20, fontSize: 14, radius: RADIUS.md },
  lg: { py: 16, px: 28, fontSize: 16, radius: RADIUS.lg },
};

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  disabled = false,
  loading = false,
  block = false,
  style,
}) => {
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          borderRadius: s.radius,
        },
        variant === 'secondary' && styles.secondaryBorder,
        block && styles.block,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={[styles.text, { color: v.text, fontSize: s.fontSize }]}>
            {title}
          </Text>
          {iconRight && <View style={styles.iconWrap}>{iconRight}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  text: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  iconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBorder: {
    borderWidth: 1,
    borderColor: THEME.border,
    shadowOpacity: 0.03,
    elevation: 1,
  },
  block: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});
