import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MessageSquare, Utensils, Calendar } from 'lucide-react-native';
import { THEME } from '../lib/theme';
import type { Room } from '../lib/types';

interface RoomCardProps {
  room: Room;
  unreadCount: number;
  onPress: () => void;
  onChatPress: () => void;
  onMenuPress: () => void;
  onSchedulePress: () => void;
}

const getStatusColor = (room: Room): string => {
  if (room.is_confirmed) {
    return THEME.confirmed;
  }

  // 메뉴가 미선정이면 주황색
  // TODO: 메뉴 선정 여부 판단 로직 추가 필요
  return THEME.menuNeeded;
};

const getStatusBadgeLabel = (room: Room): string => {
  if (room.is_confirmed) {
    return '확정됨';
  }
  return '진행중';
};

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  unreadCount,
  onPress,
  onChatPress,
  onMenuPress,
  onSchedulePress,
}) => {
  const statusColor = useMemo(() => getStatusColor(room), [room]);
  const statusLabel = useMemo(() => getStatusBadgeLabel(room), [room]);

  const displayDate = room.meeting_date
    ? new Date(room.meeting_date).toLocaleDateString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
      })
    : '날짜 미정';

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: statusColor }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* 헤더: 상태 배지 + 약속명 + 미읽 배지 */}
      <View style={styles.headerRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusBadgeText}>{statusLabel}</Text>
        </View>
        <Text style={styles.roomTitle} numberOfLines={1}>
          {room.title}
        </Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* 메타정보: 날짜 + 참여자 수 */}
      <Text style={styles.metaInfo}>
        {displayDate} • {/* 참여자 수는 나중에 추가 */}
      </Text>

      {/* 주요 액션: 채팅, 메뉴, 일정 */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={onChatPress}>
          <MessageSquare size={18} color={THEME.text} />
          <Text style={styles.actionLabel}>채팅</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onMenuPress}>
          <Utensils size={18} color={THEME.text} />
          <Text style={styles.actionLabel}>메뉴</Text>
          {/* 메뉴 미선정 배지 추가 가능 */}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onSchedulePress}>
          <Calendar size={18} color={THEME.text} />
          <Text style={styles.actionLabel}>일정</Text>
          {/* 일정 상태 배지 추가 가능 */}
        </TouchableOpacity>
      </View>

      {/* 참여자 프로필 (추후 추가) */}
      {/* <View style={styles.participantsRow}>
        {participants.map(p => <ProfileIcon key={p.id} color={p.avatar_color} />)}
      </View> */}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  roomTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
  },
  unreadBadge: {
    backgroundColor: THEME.unreadBadge,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  metaInfo: {
    fontSize: 14,
    color: THEME.textMuted,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionLabel: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 4,
  },
});
