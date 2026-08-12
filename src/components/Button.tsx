import React from 'react';
import { StyleSheet, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../lib/theme';

export type ButtonVariant = 'complete' | 'completeAndNext' | 'accent' | 'accentAndNext' | 'danger';

interface ButtonProps {
  variant: ButtonVariant;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const isGradientVariant = (variant: ButtonVariant) => variant === 'accent' || variant === 'accentAndNext';
const isDangerVariant = (variant: ButtonVariant) => variant === 'danger';

export const Button: React.FC<ButtonProps> = ({ variant, label, onPress, disabled, style }) => {
  const labelStyle = isDangerVariant(variant) ? styles.dangerLabel : styles.solidLabel;

  if (isGradientVariant(variant)) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        disabled={disabled}
        style={[styles.touchable, disabled && styles.disabled, style]}
      >
        <LinearGradient
          colors={[THEME.accentGradientStart, THEME.accentGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientFill}
        >
          <Text style={labelStyle}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.touchable,
        isDangerVariant(variant) ? styles.dangerFill : styles.solidFill,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={labelStyle}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidFill: {
    flex: 1,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerFill: {
    flex: 1,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  solidLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  dangerLabel: {
    color: THEME.danger,
    fontSize: 15,
    fontWeight: '600',
  },
});
