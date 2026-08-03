import React from 'react';
import { StyleSheet, View, Animated, ViewStyle, Dimensions } from 'react-native';
import { THEME, RADIUS } from '../../lib/theme';

// ── Skeleton Base ──

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 14,
  borderRadius = 6,
  style,
}) => {
  return (
    <View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
        },
        style,
      ]}
    />
  );
};


// ── Skeleton Text ──

interface SkeletonTextProps {
  lines?: number;
  style?: ViewStyle;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  style,
}) => {
  return (
    <View style={[styles.textGroup, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : i % 2 === 0 ? '100%' : '85%'}
          height={12}
          style={{ marginBottom: 8 }}
        />
      ))}
    </View>
  );
};


// ── Skeleton Avatar ──

interface SkeletonAvatarProps {
  size?: number;
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 40,
}) => {
  return <Skeleton width={size} height={size} borderRadius={size / 2} />;
};


// ── Skeleton Card (Room card placeholder) ──

export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <View style={[styles.card, style]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Skeleton width={60} height={20} borderRadius={10} />
        <Skeleton width={150} height={16} borderRadius={4} style={{ marginLeft: 8 }} />
      </View>
      {/* Meta */}
      <Skeleton width={120} height={12} borderRadius={4} style={{ marginTop: 10 }} />
      {/* Actions */}
      <View style={styles.cardActions}>
        <Skeleton width={50} height={30} borderRadius={8} />
        <Skeleton width={50} height={30} borderRadius={8} />
        <Skeleton width={50} height={30} borderRadius={8} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: THEME.surfaceSecondary,
    // CSS animation handled by className in web; native needs Animated
    // For web, the .skeleton class in index.css provides shimmer
  },
  textGroup: {},
  card: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
  },
});
