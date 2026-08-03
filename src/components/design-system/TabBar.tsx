import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, ViewStyle } from 'react-native';
import { THEME, RADIUS } from '../../lib/theme';

interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

interface TabBarProps {
  tabs: TabItem[];
  activeKey: string;
  onTabPress: (key: string) => void;
  variant?: 'pill' | 'underline';
  style?: ViewStyle;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeKey,
  onTabPress,
  variant = 'pill',
  style,
}) => {
  const isPill = variant === 'pill';

  return (
    <View
      style={[
        isPill ? styles.pillContainer : styles.underlineContainer,
        style,
      ]}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              isPill ? styles.pillTab : styles.underlineTab,
              isActive && (isPill ? styles.pillTabActive : styles.underlineTabActive),
            ]}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            {tab.icon && (
              <View style={styles.tabIcon}>{tab.icon}</View>
            )}
            <Text
              style={[
                isPill ? styles.pillTabText : styles.underlineTabText,
                isActive && (isPill ? styles.pillTabTextActive : styles.underlineTabTextActive),
              ]}
            >
              {tab.label}
            </Text>
            {tab.badge !== undefined && tab.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {tab.badge > 99 ? '99+' : tab.badge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  // ── Pill variant ──
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.surfaceSecondary,
    padding: 4,
    borderRadius: RADIUS.md,
    gap: 2,
  },
  pillTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  pillTabActive: {
    backgroundColor: THEME.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  pillTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  pillTabTextActive: {
    color: THEME.text,
  },

  // ── Underline variant ──
  underlineContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  underlineTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  underlineTabActive: {
    borderBottomColor: THEME.primary,
  },
  underlineTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  underlineTabTextActive: {
    color: THEME.primary,
  },

  // ── Shared ──
  tabIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: THEME.danger,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
