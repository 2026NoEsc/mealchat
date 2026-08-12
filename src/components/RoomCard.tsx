import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { THEME } from '../lib/theme';
import type { Room, RoomMemberSummary } from '../lib/types';

interface RoomCardProps {
  room: Room;
  unreadCount: number;
  members?: RoomMemberSummary[];
  /** 마지막 대화 미리보기. 없으면 그 줄을 비워 둔다 */
  lastMessage?: string;
  /** 마지막 활동 시각(ISO). 카드 오른쪽 위 타임스탬프 */
  lastActivityAt?: string;
  onPress: () => void;
}

export type RoomStatus = 'confirmed' | 'inProgress' | 'recruiting';

/** Figma `채팅방/홈` 의 Chip 3종 — 확정 / 진행중 / 모집중 */
export const getRoomStatus = (room: Room): RoomStatus => {
  if (room.is_confirmed) return 'confirmed';
  if (!room.meeting_date) return 'recruiting';
  return 'inProgress';
};

const STATUS_LABEL: Record<RoomStatus, string> = {
  confirmed: '확정',
  inProgress: '진행중',
  recruiting: '모집중',
};

/** 만료까지 24시간 이하로 남았을 때만 남은 시간을, 아니면 null */
export const getExpiryUrgency = (room: Room, now: Date = new Date()): string | null => {
  if (!room.expires_at) return null;
  const msLeft = new Date(room.expires_at).getTime() - now.getTime();
  if (Number.isNaN(msLeft) || msLeft <= 0) return null;
  const hoursLeft = Math.floor(msLeft / (60 * 60 * 1000));
  if (hoursLeft >= 24) return null;
  if (hoursLeft >= 1) return `${hoursLeft}시간 남음`;
  return `${Math.max(1, Math.floor(msLeft / (60 * 1000)))}분 남음`;
};

/**
 * 아바타 스택 오른쪽에 붙는 한 줄.
 * 만료 임박이면 그것부터, 확정된 방이면 날짜, 아니면 장소를 보여준다.
 */
export const getRoomMetaLabel = (room: Room, now: Date = new Date()): { text: string; urgent: boolean } => {
  const urgency = getExpiryUrgency(room, now);
  if (urgency) return { text: urgency, urgent: true };

  if (room.is_confirmed && room.meeting_date) {
    const at = new Date(room.meeting_date);
    if (!Number.isNaN(at.getTime())) {
      return { text: at.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }), urgent: false };
    }
  }
  return { text: room.location_name || '장소 미정', urgent: false };
};

/** 오늘이면 시각, 어제면 "어제", 그 전이면 "N일 전" */
export const getActivityLabel = (isoDate?: string, now: Date = new Date()): string => {
  if (!isoDate) return '';
  const at = new Date(isoDate);
  if (Number.isNaN(at.getTime())) return '';

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThatDay = new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();
  const daysAgo = Math.round((startOfToday - startOfThatDay) / (24 * 60 * 60 * 1000));

  if (daysAgo <= 0) return at.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  if (daysAgo === 1) return '어제';
  return `${daysAgo}일 전`;
};

const MAX_STACKED_AVATARS = 3;

const MemberAvatar: React.FC<{ member: RoomMemberSummary; stacked: boolean }> = ({ member, stacked }) => (
  <View style={[styles.stackAvatar, stacked && styles.stackAvatarOverlapped]}>
    {member.avatarUrl ? (
      <Image source={{ uri: member.avatarUrl }} style={styles.stackAvatarImage} />
    ) : (
      <View style={[styles.stackAvatarImage, { backgroundColor: member.avatarColor }]}>
        <Text style={styles.stackAvatarInitial}>{member.name.slice(0, 1)}</Text>
      </View>
    )}
  </View>
);

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  unreadCount,
  members = [],
  lastMessage,
  lastActivityAt,
  onPress,
}) => {
  const status = useMemo(() => getRoomStatus(room), [room]);
  const meta = useMemo(() => getRoomMetaLabel(room), [room]);
  const themeColor = room.color || THEME.primary;
  const hasUnread = unreadCount > 0;

  const shownMembers = members.slice(0, MAX_STACKED_AVATARS);
  const extraMembers = members.length - shownMembers.length;
  const metaText = extraMembers > 0 ? `+${extraMembers} · ${meta.text}` : meta.text;

  return (
    <TouchableOpacity
      style={[styles.container, hasUnread ? styles.containerUnread : styles.containerRead]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.themeBar, { backgroundColor: themeColor }]} />

      <View style={[styles.avatar, { backgroundColor: `${themeColor}24` }]}>
        {members[0]?.avatarUrl ? (
          <Image source={{ uri: members[0].avatarUrl }} style={styles.avatarImage} />
        ) : (
          <Text style={[styles.avatarInitial, { color: themeColor }]}>{room.title.slice(0, 1)}</Text>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {room.title}
          </Text>
          <View style={[styles.chip, styles[`chip_${status}`]]}>
            <Text style={[styles.chipText, styles[`chipText_${status}`]]}>{STATUS_LABEL[status]}</Text>
          </View>
        </View>

        {Boolean(lastMessage) && (
          <Text style={styles.preview} numberOfLines={1}>
            {lastMessage}
          </Text>
        )}

        <View style={styles.footerRow}>
          {shownMembers.map((member, index) => (
            <MemberAvatar key={member.id} member={member} stacked={index > 0} />
          ))}
          <Text
            style={[styles.meta, meta.urgent && styles.metaUrgent, shownMembers.length > 0 && styles.metaSpaced]}
            numberOfLines={1}
          >
            {metaText}
          </Text>
        </View>
      </View>

      <View style={styles.trailing}>
        <Text style={styles.activity}>{getActivityLabel(lastActivityAt)}</Text>
        {hasUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  containerUnread: {
    backgroundColor: THEME.surfaceHighlight,
    borderColor: THEME.accentSoftBorder,
    shadowOpacity: 0.12,
  },
  containerRead: {
    backgroundColor: THEME.card,
    borderColor: THEME.cardBorder,
    shadowOpacity: 0.07,
  },
  themeBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 999,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME.text,
  },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chip_confirmed: {
    backgroundColor: THEME.border,
  },
  chip_inProgress: {
    backgroundColor: THEME.accentSoft,
  },
  chip_recruiting: {
    backgroundColor: THEME.infoSoftBg,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  chipText_confirmed: {
    color: THEME.textSecondary,
  },
  chipText_inProgress: {
    color: '#FFFFFF',
  },
  chipText_recruiting: {
    color: THEME.infoSoft,
  },
  preview: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.card,
    backgroundColor: THEME.card,
    overflow: 'hidden',
  },
  stackAvatarOverlapped: {
    marginLeft: -6,
  },
  stackAvatarImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackAvatarInitial: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  meta: {
    flexShrink: 1,
    fontSize: 10,
    color: THEME.textMuted,
  },
  metaSpaced: {
    marginLeft: 6,
  },
  metaUrgent: {
    color: THEME.accentSoft,
    fontWeight: '600',
  },
  trailing: {
    alignItems: 'flex-end',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    gap: 6,
  },
  activity: {
    fontSize: 10,
    color: THEME.textMuted,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: THEME.unreadBadge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
