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
        testID="app-button"
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
      testID="app-button"
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ⚠️ solidFill/dangerFill 은 TouchableOpacity **자체**에 얹힙니다.
  //    여기에 flex:1 을 두면 flexBasis 가 0 이 되어 위 height:48 을 덮어쓰고,
  //    부모가 높이를 주지 않는 한 버튼이 높이 0 으로 접힙니다.
  //    (그라디언트 변형은 flex:1 이 안쪽 LinearGradient 에 붙어 멀쩡했던 탓에
  //     오래 드러나지 않았습니다. `findByText` 는 레이아웃을 보지 않습니다.)
  gradientFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidFill: {
    backgroundColor: THEME.primary,
  },
  dangerFill: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.danger,
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
