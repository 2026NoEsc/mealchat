import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { THEME, RADIUS } from '../../lib/theme';

type StatusType = 'menuNeeded' | 'menuComplete' | 'schedule' | 'confirmed' | 'settlement' | 'info' | 'success' | 'warning' | 'danger';
type BadgeSize = 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
  type: StatusType;
  label: string;
  size?: BadgeSize;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const STATUS_COLORS: Record<StatusType, { bg: string; text: string }> = {
  menuNeeded: { bg: THEME.menuNeeded, text: '#FFFFFF' },
  menuComplete: { bg: THEME.menuComplete, text: '#FFFFFF' },
  schedule: { bg: THEME.scheduleInProgress, text: '#FFFFFF' },
  confirmed: { bg: THEME.confirmed, text: '#FFFFFF' },
  settlement: { bg: THEME.settlement, text: '#FFFFFF' },
  info: { bg: THEME.infoLight, text: THEME.info },
  success: { bg: THEME.successLight, text: THEME.success },
  warning: { bg: THEME.warningLight, text: THEME.warning },
  danger: { bg: THEME.dangerLight, text: THEME.danger },
};

const SIZE_CONFIG: Record<BadgeSize, { py: number; px: number; fontSize: number }> = {
  sm: { py: 2, px: 6, fontSize: 10 },
  md: { py: 3, px: 8, fontSize: 11 },
  lg: { py: 4, px: 10, fontSize: 12 },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  label,
  size = 'md',
  icon,
  style,
}) => {
  const colors = STATUS_COLORS[type];
  const sizeConf = SIZE_CONFIG[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          paddingVertical: sizeConf.py,
          paddingHorizontal: sizeConf.px,
        },
        style,
      ]}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text
        style={[
          styles.text,
          { color: colors.text, fontSize: sizeConf.fontSize },
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
    borderRadius: RADIUS.full,
    gap: 3,
    alignSelf: 'flex-start',
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.02,
    lineHeight: 14,
  },
});
