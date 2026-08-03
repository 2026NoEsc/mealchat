import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { THEME, RADIUS } from '../../lib/theme';

interface ProgressBarProps {
  progress: number; // 0 to 1
  color?: 'green' | 'orange' | 'blue';
  height?: number;
  style?: ViewStyle;
}

const COLOR_MAP = {
  green: THEME.primary,
  orange: THEME.accent,
  blue: THEME.secondary,
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = 'green',
  height = 8,
  style,
}) => {
  const clampedProgress = Math.min(1, Math.max(0, progress));

  return (
    <View style={[styles.track, { height }, style]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clampedProgress * 100}%`,
            backgroundColor: COLOR_MAP[color],
            height,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: THEME.surfaceSecondary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: RADIUS.full,
  },
});
