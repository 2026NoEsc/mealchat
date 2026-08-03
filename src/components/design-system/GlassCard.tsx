import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { THEME, RADIUS, SHADOWS } from '../../lib/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  interactive?: boolean;
  noPadding?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  elevated = false,
  interactive = false,
  noPadding = false,
}) => {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        interactive && styles.interactive,
        noPadding && styles.noPadding,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: RADIUS.lg,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderColor: THEME.borderLight,
  },
  interactive: {
    // Active feedback handled in parent via Pressable
  },
  noPadding: {
    padding: 0,
  },
});
