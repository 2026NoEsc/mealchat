import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Bell } from 'lucide-react-native';
import { MealChatLogo } from './MealChatLogo';
import { THEME } from '../lib/theme';

interface AppHeaderProps {
  onBellPress?: () => void;
  hasUnreadNotifications?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onBellPress, hasUnreadNotifications }) => {
  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <MealChatLogo size={28} />
        <Text style={styles.wordmark}>MEALCHAT</Text>
      </View>
      <TouchableOpacity
        testID="app-header-bell"
        style={styles.bellButton}
        activeOpacity={0.7}
        onPress={onBellPress}
      >
        <Bell size={20} color={THEME.text} />
        {hasUnreadNotifications && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: 16,
    backgroundColor: THEME.surface,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordmark: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  bellButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.unreadBadge,
  },
});
