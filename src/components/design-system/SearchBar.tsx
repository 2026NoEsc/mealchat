import React from 'react';
import { StyleSheet, View, TextInput, ViewStyle } from 'react-native';
import { Search } from 'lucide-react-native';
import { THEME, RADIUS } from '../../lib/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = '검색...',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Search size={16} color={THEME.textMuted} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={THEME.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.surfaceSecondary,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: THEME.text,
    padding: 0,
  },
});
