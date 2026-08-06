import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { THEME } from '../lib/theme';

// 1. 단일 선택 (예: 면 vs 밥)
interface SingleSelectProps<T> {
  label: string;
  options: { label: string; value: T }[];
  selectedValue: T | null;
  onSelect: (value: T) => void;
}

export function SingleSelect<T extends string>({
  label,
  options,
  selectedValue,
  onSelect,
}: SingleSelectProps<T>) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.segmentedContainer}>
        {options.map((opt) => {
          const isActive = selectedValue === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.segmentItem,
                isActive && styles.segmentItemActive,
              ]}
              onPress={() => onSelect(opt.value)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  isActive && styles.segmentTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// 2. 다중 선택 칩 (예: 한/중/일/양식, 주류)
interface MultiSelectProps<T> {
  label: string;
  options: { label: string; value: T }[];
  selectedValues: T[];
  onToggle: (value: T) => void;
}

export function MultiSelectChips<T extends string>({
  label,
  options,
  selectedValues,
  onToggle,
}: MultiSelectProps<T>) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipContainer}>
        {options.map((opt) => {
          const isActive = selectedValues.includes(opt.value);
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.chipItem,
                isActive && styles.chipItemActive,
              ]}
              onPress={() => onToggle(opt.value)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.chipText,
                  isActive && styles.chipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 22,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B', // Dark charcoal text
    marginBottom: 10,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF', // White background
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1', // Light border
  },
  segmentItem: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentItemActive: {
    backgroundColor: THEME.primary, // Point green
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B', // Slate-500
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chipItemActive: {
    backgroundColor: THEME.badgeBg, // Green badge background
    borderColor: THEME.primary, // Green border
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  chipTextActive: {
    color: THEME.primary,
    fontWeight: '600',
  },
});
