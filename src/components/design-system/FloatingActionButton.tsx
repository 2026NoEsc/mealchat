import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, ViewStyle } from 'react-native';
import { THEME, RADIUS } from '../../lib/theme';
import { Plus } from 'lucide-react-native';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: React.ReactNode;
  label?: string;
  style?: ViewStyle;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon,
  label,
  style,
}) => {
  const isExtended = !!label;

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        isExtended && styles.fabExtended,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {icon || <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />}
      {label && <Text style={styles.fabLabel}>{label}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 88,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.accent,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#FF7A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 80,
  },
  fabExtended: {
    width: 'auto',
    paddingHorizontal: 20,
    gap: 8,
  },
  fabLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
