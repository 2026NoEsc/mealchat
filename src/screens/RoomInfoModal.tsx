import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check, Lock } from 'lucide-react-native';
import { Button } from '../components/Button';
import { THEME, PALETTE_COLORS } from '../lib/theme';
import { resolveRoomOwnerProfileId, getMeetingDateDisplay, formatRoomExpiry } from '../lib/roomUtils';
import { useAuth, useRoom, useNavigation, useRoomEditing, useRoomTimer } from '../contexts';
import type { Participant } from '../lib/types';

/**
 * 방 상세 정보 — 초대코드 공유, 약속 이름/장소/색상 편집, 멤버 목록, 방 나가기.
 *
 * Figma `채팅방/방 상세정보`(node 159:604) 기준으로 전체 화면 시트가 되었고,
 * 내용은 서피스 카드들의 나열로 정리했다.
 *
 * Figma 에 없지만 남겨 둔 것: 약속 이름 변경 / 약속 일시 / 테마 색상 / 멤버 추방.
 * 전부 이미 동작하는 기능이라 지우지 않고 같은 카드 언어로 옮겨 담았다.
 */
interface RoomInfoModalProps {
  onUpdateRoomTitle: () => void;
  onUpdateRoomLocation: () => void;
  onSearchLocation: (query: string) => void;
  /** 좌표 2개 또는 카카오 장소 객체를 받습니다 (App.tsx 의 오버로드 그대로) */
  onSelectLocation: (arg1: number | any, arg2?: number) => void;
  onChangeRoomColor: (color: string) => void;
  onKickParticipant: (participantId: string, name: string) => void;
  onShareRoom: () => void;
  onViewProfile: (profileId: string) => void;
  onLeaveRoom: () => void;
}

const MemberAvatar: React.FC<{ member: Participant }> = ({ member }) => (
  <View style={styles.memberAvatar}>
    {member.avatar_url ? (
      <Image source={{ uri: member.avatar_url }} style={styles.memberAvatarImage} />
    ) : (
      <Text style={[styles.memberAvatarInitial, { color: member.avatar_color || THEME.primary }]}>
        {(member.name || '알')[0]}
      </Text>
    )}
  </View>
);

const RoomInfoModal: React.FC<RoomInfoModalProps> = ({
  onUpdateRoomTitle,
  onUpdateRoomLocation,
  onSearchLocation,
  onSelectLocation,
  onChangeRoomColor,
  onKickParticipant,
  onShareRoom,
  onViewProfile,
  onLeaveRoom
}) => {
  const { globalProfile } = useAuth();
  const { currentRoom, participants, participantsLoading } = useRoom();
  const { showRoomInfoModal, setShowRoomInfoModal } = useNavigation();
  const { timeLeft } = useRoomTimer();
  const {
    isEditingRoomTitle, editingRoomTitle,
    isEditingRoomLocation, editingRoomLocationName,
    locationSearchResults, showLocationResults,
    setIsEditingRoomTitle, setEditingRoomTitle,
    setIsEditingRoomLocation, setEditingRoomLocationName,
    setEditingRoomLatitude, setEditingRoomLongitude,
    setShowLocationResults
  } = useRoomEditing();

  // 라운드 AL-5 부터 rooms.owner_id 가 RLS 가 보는 진짜 값이다(라운드 AR).
  const roomOwnerProfileId = React.useMemo(
    () => resolveRoomOwnerProfileId(participants, currentRoom?.owner_id),
    [participants, currentRoom?.owner_id]
  );
  const isHost = roomOwnerProfileId === globalProfile?.id;

  const close = () => setShowRoomInfoModal(false);

  const coordinateLabel = currentRoom?.latitude != null && currentRoom?.longitude != null
    ? `위도 ${currentRoom.latitude.toFixed(2)} · 경도 ${currentRoom.longitude.toFixed(2)}`
    : null;

  return (
    <Modal
      visible={showRoomInfoModal}
      animationType="slide"
      onRequestClose={close}
    >
      <SafeAreaView style={styles.screen}>
        {currentRoom && (
          <>
            {/* roomHeader — Figma 543:860 */}
            <View style={styles.roomHeader}>
              <TouchableOpacity onPress={close} style={styles.headerBack} accessibilityLabel="닫기">
                <ChevronLeft size={20} color={THEME.textSecondary} />
              </TouchableOpacity>
              <View style={[styles.headerAvatar, { backgroundColor: `${currentRoom.color || THEME.primary}24` }]}>
                <Text style={[styles.headerAvatarInitial, { color: currentRoom.color || THEME.primary }]}>
                  {currentRoom.title[0]}
                </Text>
              </View>
              <View style={styles.headerCenter}>
                <View style={styles.headerTitleRow}>
                  <Text style={styles.headerTitle} numberOfLines={1}>{currentRoom.title}</Text>
                  <View style={styles.headerCountChip}>
                    <Text style={styles.headerCountText}>{participants.length}</Text>
                  </View>
                </View>
                <View style={styles.headerTimerRow}>
                  <Lock size={9} color={THEME.danger} />
                  <Text style={styles.headerTimerText}>{formatRoomExpiry(timeLeft)}</Text>
                </View>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.body}>
              <Text style={styles.pageTitle}>방 상세정보</Text>

              {/* 초대 코드 */}
              <View style={styles.card}>
                <Text style={styles.cardLabel}>초대 코드</Text>
                <View style={styles.cardRow}>
                  <Text style={styles.inviteCode}>{currentRoom.code}</Text>
                  <TouchableOpacity style={styles.softChip} onPress={onShareRoom}>
                    <Text style={styles.softChipText}>공유</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 약속 이름 (Figma 에는 없지만 기존 기능) */}
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardTitle}>약속 이름</Text>
                  {!isEditingRoomTitle && (
                    <TouchableOpacity onPress={() => setIsEditingRoomTitle(true)}>
                      <Text style={styles.linkText}>변경</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {isEditingRoomTitle ? (
                  <View style={styles.editGroup}>
                    <TextInput
                      style={styles.input}
                      value={editingRoomTitle}
                      onChangeText={setEditingRoomTitle}
                      placeholder="방 이름 입력"
                      placeholderTextColor={THEME.textTertiary}
                      maxLength={20}
                    />
                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={styles.ghostButton}
                        onPress={() => {
                          setIsEditingRoomTitle(false);
                          setEditingRoomTitle(currentRoom.title);
                        }}
                      >
                        <Text style={styles.ghostButtonText}>취소</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.primaryButton} onPress={onUpdateRoomTitle}>
                        <Text style={styles.primaryButtonText}>저장</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.cardValue}>{currentRoom.title}</Text>
                )}
              </View>

              {/* 약속 장소 */}
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardTitle}>약속 장소</Text>
                  {!isEditingRoomLocation && (
                    <TouchableOpacity onPress={() => setIsEditingRoomLocation(true)}>
                      <Text style={styles.linkText}>변경</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {isEditingRoomLocation ? (
                  <View style={styles.editGroup}>
                    <TextInput
                      style={styles.input}
                      value={editingRoomLocationName}
                      onChangeText={setEditingRoomLocationName}
                      placeholder="장소 이름 입력"
                      placeholderTextColor={THEME.textTertiary}
                    />
                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={[styles.ghostButton, styles.searchButton]}
                        onPress={() => onSearchLocation(editingRoomLocationName)}
                      >
                        <Text style={styles.searchButtonText}>🔍 장소 검색</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.ghostButton}
                        onPress={() => {
                          setIsEditingRoomLocation(false);
                          setEditingRoomLocationName(currentRoom.location_name || '');
                          setEditingRoomLatitude(currentRoom.latitude || 37.5665);
                          setEditingRoomLongitude(currentRoom.longitude || 126.9780);
                          setShowLocationResults(false);
                        }}
                      >
                        <Text style={styles.ghostButtonText}>취소</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.primaryButton} onPress={onUpdateRoomLocation}>
                        <Text style={styles.primaryButtonText}>저장</Text>
                      </TouchableOpacity>
                    </View>

                    {showLocationResults && locationSearchResults.length > 0 && (
                      <ScrollView style={styles.searchResults}>
                        {locationSearchResults.map((result, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={[styles.searchResultRow, idx > 0 && styles.searchResultDivided]}
                            onPress={() => onSelectLocation(result)}
                          >
                            <Text style={styles.searchResultName}>{result.place_name}</Text>
                            <Text style={styles.searchResultAddress}>{result.address_name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                ) : (
                  <>
                    <Text style={styles.cardValue}>{currentRoom.location_name || '설정된 장소 없음'}</Text>
                    {Boolean(currentRoom.location_name) && Boolean(coordinateLabel) && (
                      <Text style={styles.cardSub}>{coordinateLabel}</Text>
                    )}
                  </>
                )}
              </View>

              {/* 약속 일시 (Figma 에는 없지만 기존 기능) */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>약속 일시</Text>
                <Text style={styles.cardValue}>{getMeetingDateDisplay(currentRoom)}</Text>
              </View>

              {/* 테마 색상 (Figma 에는 없지만 기존 기능) */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>약속 테마 색상</Text>
                <View style={styles.paletteRow}>
                  {PALETTE_COLORS.map(color => {
                    const selected = (currentRoom.color || '#23A455') === color;
                    return (
                      <TouchableOpacity
                        key={color}
                        style={[styles.swatch, { backgroundColor: color }, selected && styles.swatchSelected]}
                        accessibilityLabel={`테마 색상 ${color}`}
                        onPress={() => onChangeRoomColor(color)}
                      >
                        {selected && <Check size={12} color="#FFFFFF" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 멤버 */}
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardTitle}>멤버 {participants.length}명</Text>
                  <TouchableOpacity onPress={onShareRoom}>
                    <Text style={styles.linkText}>＋ 초대</Text>
                  </TouchableOpacity>
                </View>

                {participantsLoading ? (
                  <View style={styles.memberLoading}>
                    <ActivityIndicator size="small" color={THEME.primary} />
                    <Text style={styles.memberLoadingText}>멤버 정보를 불러오는 중...</Text>
                  </View>
                ) : participants.length > 0 ? (
                  participants.map(member => (
                    <View key={member.id} style={styles.memberRow}>
                      <TouchableOpacity
                        style={styles.memberTapTarget}
                        onPress={() => {
                          close();
                          if (member.profile_id) {
                            onViewProfile(member.profile_id);
                          } else {
                            Alert.alert('알림', '프로필 정보가 없는 사용자입니다.');
                          }
                        }}
                      >
                        <MemberAvatar member={member} />
                        <Text style={styles.memberName} numberOfLines={1}>
                          {member.name}
                          {member.profile_id === globalProfile?.id ? '(나)' : ''}
                        </Text>
                        <Text
                          style={
                            member.profile_id === roomOwnerProfileId ? styles.memberRoleHost : styles.memberRole
                          }
                        >
                          {member.profile_id === roomOwnerProfileId ? '방장' : '메이트'}
                        </Text>
                      </TouchableOpacity>

                      {/* 추방은 방장에게만, 자기 자신에게는 보이지 않는다 */}
                      {isHost && member.profile_id !== roomOwnerProfileId && (
                        <TouchableOpacity
                          style={styles.kickButton}
                          onPress={() => onKickParticipant(member.id, member.name)}
                        >
                          <Text style={styles.kickButtonText}>추방</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.memberEmpty}>멤버가 없습니다.</Text>
                )}
              </View>

              <Button variant="danger" label="방 나가기" style={styles.leaveButton} onPress={onLeaveRoom} />
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 56,
    paddingHorizontal: 12,
    backgroundColor: THEME.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 3,
  },
  headerBack: {
    padding: 2,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInitial: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerCenter: {
    flex: 1,
    gap: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME.text,
  },
  headerCountChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: THEME.border,
  },
  headerCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  headerTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerTimerText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.danger,
  },
  body: {
    padding: 16,
    gap: 10,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 2,
  },
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLabel: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  cardValue: {
    fontSize: 13,
    color: THEME.text,
  },
  cardSub: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  inviteCode: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.primary,
    letterSpacing: 1,
  },
  softChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: THEME.badgeBg,
  },
  softChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.accentSoft,
  },
  linkText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.accentSoft,
  },
  editGroup: {
    gap: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: THEME.input,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    color: THEME.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  editActions: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  ghostButton: {
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  ghostButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.text,
  },
  searchButton: {
    marginRight: 'auto',
  },
  searchButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  primaryButton: {
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  primaryButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  searchResults: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    backgroundColor: THEME.card,
  },
  searchResultRow: {
    padding: 10,
  },
  searchResultDivided: {
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  searchResultName: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.text,
  },
  searchResultAddress: {
    fontSize: 10,
    color: THEME.textMuted,
    marginTop: 2,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 2,
    borderColor: THEME.text,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  memberTapTarget: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: THEME.badgeBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
  },
  memberAvatarInitial: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  memberName: {
    flex: 1,
    fontSize: 13,
    color: THEME.text,
  },
  memberRole: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  memberRoleHost: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.primary,
  },
  memberLoading: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  memberLoadingText: {
    color: THEME.textMuted,
    fontSize: 11,
    marginTop: 8,
  },
  memberEmpty: {
    color: THEME.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 8,
  },
  kickButton: {
    backgroundColor: THEME.card,
    borderColor: THEME.danger,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  kickButtonText: {
    fontSize: 11,
    color: THEME.danger,
    fontWeight: 'bold',
  },
  leaveButton: {
    marginTop: 6,
  },
});

export default RoomInfoModal;
