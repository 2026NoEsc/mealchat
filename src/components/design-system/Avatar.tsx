import React from 'react';
import { StyleSheet, View, Text, ViewStyle, Image } from 'react-native';
import { THEME, RADIUS } from '../../lib/theme';

// ── Avatar ──

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  emoji?: string;
  name?: string;
  bgColor?: string;
  imageUrl?: string;
  size?: AvatarSize;
  showOnline?: boolean;
  isOnline?: boolean;
  style?: ViewStyle;
  /** Crown badge for room owner */
  showCrown?: boolean;
}

const SIZE_MAP: Record<AvatarSize, { container: number; fontSize: number; dotSize: number }> = {
  sm: { container: 32, fontSize: 13, dotSize: 8 },
  md: { container: 40, fontSize: 16, dotSize: 10 },
  lg: { container: 56, fontSize: 24, dotSize: 12 },
  xl: { container: 72, fontSize: 32, dotSize: 14 },
};

export const Avatar: React.FC<AvatarProps> = ({
  emoji,
  name,
  bgColor = THEME.avatarBg,
  imageUrl,
  size = 'md',
  showOnline = false,
  isOnline = false,
  style,
  showCrown = false,
}) => {
  const s = SIZE_MAP[size];
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const display = emoji || initial;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: s.container,
          height: s.container,
          borderRadius: s.container / 2,
          backgroundColor: bgColor,
        },
        style,
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{
            width: s.container - 4,
            height: s.container - 4,
            borderRadius: (s.container - 4) / 2,
          }}
        />
      ) : (
        <Text style={[styles.avatarText, { fontSize: s.fontSize }]}>
          {display}
        </Text>
      )}

      {showOnline && (
        <View
          style={[
            styles.statusDot,
            {
              width: s.dotSize,
              height: s.dotSize,
              borderRadius: s.dotSize / 2,
              backgroundColor: isOnline ? THEME.success : THEME.textMuted,
            },
          ]}
        />
      )}

      {showCrown && (
        <View style={styles.crownBadge}>
          <Text style={styles.crownEmoji}>👑</Text>
        </View>
      )}
    </View>
  );
};


// ── AvatarGroup ──

interface AvatarGroupProps {
  avatars: Array<{
    emoji?: string;
    name?: string;
    bgColor?: string;
    imageUrl?: string;
  }>;
  max?: number;
  size?: AvatarSize;
  style?: ViewStyle;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  max = 4,
  size = 'sm',
  style,
}) => {
  const s = SIZE_MAP[size];
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - max;

  return (
    <View style={[styles.avatarGroup, style]}>
      {visible.map((av, i) => (
        <View
          key={i}
          style={[
            styles.avatarGroupItem,
            { marginLeft: i === 0 ? 0 : -(s.container * 0.25) },
            { zIndex: visible.length - i },
          ]}
        >
          <Avatar
            emoji={av.emoji}
            name={av.name}
            bgColor={av.bgColor || THEME.avatarBg}
            imageUrl={av.imageUrl}
            size={size}
          />
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={[
            styles.avatar,
            styles.overflowAvatar,
            {
              width: s.container,
              height: s.container,
              borderRadius: s.container / 2,
              marginLeft: -(s.container * 0.25),
            },
          ]}
        >
          <Text style={[styles.overflowText, { fontSize: s.fontSize * 0.65 }]}>
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.surface,
    position: 'relative',
  },
  avatarText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: THEME.surface,
  },
  crownBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: THEME.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  crownEmoji: {
    fontSize: 10,
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGroupItem: {
    // zIndex handled inline
  },
  overflowAvatar: {
    backgroundColor: THEME.surfaceSecondary,
    borderWidth: 2,
    borderColor: THEME.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overflowText: {
    fontWeight: '700',
    color: THEME.textSecondary,
  },
});
