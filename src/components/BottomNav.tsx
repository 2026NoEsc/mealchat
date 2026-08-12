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
        // Figma 는 비활성 라벨도 검정이고, 활성만 주황 + 아래 표시 바다.
        const color = isActive ? THEME.primary : THEME.text;
        return (
          <TouchableOpacity
            key={key}
            style={styles.tabButton}
            activeOpacity={0.7}
            onPress={() => onTabChange(key)}
          >
            <Icon size={20} color={color} />
            <Text style={[styles.tabLabel, { color }, isActive && styles.tabLabelActive]}>{label}</Text>
            {isActive && <View style={styles.activeBar} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 62,
    backgroundColor: THEME.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
  },
  tabLabelActive: {
    fontWeight: 'bold',
  },
  activeBar: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '58%',
    borderRadius: 3,
    backgroundColor: THEME.primary,
  },
});
