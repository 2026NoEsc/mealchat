import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { Button } from '../components/Button';
import { RoomPanelSheet } from '../components/RoomPanelSheet';
import { THEME } from '../lib/theme';
import { resolveRoomOwnerProfileId } from '../lib/roomUtils';
import { useAuth, useRoom } from '../contexts';
import type { Participant } from '../lib/types';

/**
 * 채팅방의 **멤버 패널** — Figma `채팅/멤버 패널`(node 553:768).
 *
 * 멤버 목록은 원래 방 상세정보 안에만 있었다. Figma 가 채팅에서 바로 여는
 * 패널로 분리했기에 같은 데이터를 시트로도 볼 수 있게 했다.
 *
 * Figma 의 "온라인 / 3시간 전" 접속 상태 줄은 넣지 않았다 — presence 를
 * 알려주는 데이터가 없다.
 */
interface RoomMemberSheetProps {
  onClose: () => void;
  onInvite: () => void;
  onViewProfile: (profileId: string) => void;
}

const MemberAvatar: React.FC<{ member: Participant }> = ({ member }) => (
  <View style={styles.avatar}>
    {member.avatar_url ? (
      <Image source={{ uri: member.avatar_url }} style={styles.avatarImage} />
    ) : (
      <Text style={[styles.avatarInitial, { color: member.avatar_color || THEME.primary }]}>
        {(member.name || '알')[0]}
      </Text>
    )}
  </View>
);

const RoomMemberSheet: React.FC<RoomMemberSheetProps> = ({ onClose, onInvite, onViewProfile }) => {
  const { globalProfile } = useAuth();
  const { currentRoom, participants } = useRoom();

  const roomOwnerProfileId = React.useMemo(
    () => resolveRoomOwnerProfileId(participants, currentRoom?.owner_id),
    [participants, currentRoom?.owner_id]
  );

  const subtitle = currentRoom
    ? `멤버 ${participants.length}명 · 초대코드 ${currentRoom.code}`
    : `멤버 ${participants.length}명`;

  return (
    <RoomPanelSheet
      title="참여 멤버"
      subtitle={subtitle}
      onClose={onClose}
      footer={<Button variant="complete" label="+ 메이트 초대" onPress={onInvite} />}
    >
      {participants.length === 0 ? (
        <Text style={styles.empty}>멤버가 없습니다.</Text>
      ) : (
        participants.map(member => {
          const isMe = member.profile_id === globalProfile?.id;
          const isHost = member.profile_id === roomOwnerProfileId;
          return (
            <TouchableOpacity
              key={member.id}
              style={[styles.row, isMe && styles.rowMe]}
              activeOpacity={0.7}
              onPress={() => {
                if (member.profile_id) {
                  onViewProfile(member.profile_id);
                } else {
                  Alert.alert('알림', '프로필 정보가 없는 사용자입니다.');
                }
              }}
            >
              <MemberAvatar member={member} />
              <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
                {member.name}{isMe ? '(나)' : ''}
              </Text>
              {isHost ? (
                <View style={styles.hostBadge}>
                  <Text style={styles.hostBadgeText}>방장</Text>
                </View>
              ) : (
                <Text style={styles.role}>메이트</Text>
              )}
            </TouchableOpacity>
          );
        })
      )}
    </RoomPanelSheet>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    backgroundColor: THEME.card,
  },
  rowMe: {
    borderColor: THEME.accentSoft,
    backgroundColor: THEME.surfaceHighlight,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: THEME.badgeBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  name: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: THEME.text,
  },
  nameMe: {
    color: THEME.accentSoft,
  },
  role: {
    fontSize: 11,
    color: THEME.textSecondary,
  },
  hostBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: THEME.primary,
  },
  hostBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  empty: {
    fontSize: 12,
    color: THEME.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
});

export default RoomMemberSheet;
