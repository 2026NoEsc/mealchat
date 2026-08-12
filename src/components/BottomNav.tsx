import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Home, Calendar, MessageSquare, User } from 'lucide-react-native';
import { THEME } from '../lib/theme';

export type BottomNavTabKey = 'home' | 'schedule' | 'chat' | 'profile';

interface BottomNavProps {
  activeTab: BottomNavTabKey;
  onTabChange: (tab: BottomNavTabKey) => void;
}

const TABS: { key: BottomNavTabKey; label: string; Icon: typeof Home }[] = [
  { key: 'home', label: '홈', Icon: Home },
  { key: 'schedule', label: '일정 조율', Icon: Calendar },
  { key: 'chat', label: '채팅방', Icon: MessageSquare },
  { key: 'profile', label: '프로필', Icon: User },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <View style={styles.container}>
      {TABS.map(({ key, label, Icon }) => {
        const isActive = key === activeTab;
        const color = isActive ? THEME.primary : THEME.textMuted;
        return (
          <TouchableOpacity
            key={key}
            style={styles.tabButton}
            activeOpacity={0.7}
            onPress={() => onTabChange(key)}
          >
            <Icon size={20} color={color} />
            <Text style={[styles.tabLabel, { color }, isActive && styles.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 11,
  },
  tabLabelActive: {
    fontWeight: 'bold',
  },
});
