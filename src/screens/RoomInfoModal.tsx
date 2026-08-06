import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { THEME, PALETTE_COLORS } from '../lib/theme';
import { resolveRoomOwnerProfileId, getMeetingDateDisplay } from '../lib/roomUtils';
import { useAuth, useRoom, useNavigation, useRoomEditing } from '../contexts';

/**
 * 방 상세 정보 모달 — 제목·장소 편집, 초대코드 공유, 참여자 목록/강퇴.
 *
 * App.tsx 에서 그대로 옮겨왔습니다. 상태는 Context 에서 직접 읽고,
 * 부수효과가 있는 핸들러만 props 로 받습니다.
 *
 * ⚠️ 아직 AppContent 가 11개 Context 를 모두 구독하므로, 부모가 리렌더되면
 *    이 컴포넌트도 함께 리렌더됩니다. 분리의 성능 이득은 AppContent 가
 *    얇아진 뒤에 나옵니다. 현 단계 목적은 6,000줄 파일의 분할입니다.
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
}

const RoomInfoModal: React.FC<RoomInfoModalProps> = ({
  onUpdateRoomTitle,
  onUpdateRoomLocation,
  onSearchLocation,
  onSelectLocation,
  onChangeRoomColor,
  onKickParticipant,
  onShareRoom,
  onViewProfile
}) => {
  const { globalProfile } = useAuth();
  const { currentRoom, participants, participantsLoading } = useRoom();
  const { showRoomInfoModal, setShowRoomInfoModal } = useNavigation();
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

  // 원본 코드가 쓰던 이름을 그대로 유지해, 아래 JSX 를 한 줄도 고치지 않았습니다.
  const handleUpdateRoomTitle = onUpdateRoomTitle;
  const handleUpdateRoomLocation = onUpdateRoomLocation;
  const handleSearchLocation = onSearchLocation;
  const handleSelectLocation = onSelectLocation;
  const handleChangeRoomColor = onChangeRoomColor;
  const handleKickParticipant = onKickParticipant;
  const handleShareRoom = onShareRoom;
  const handleViewProfile = onViewProfile;

  return (
    <Modal
      visible={showRoomInfoModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowRoomInfoModal(false)}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.modalContent, { width: '90%', maxWidth: 360, position: 'relative' }]}>
          {currentRoom && (
            <View>
              {!isEditingRoomTitle && (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 }}>
                  <TouchableOpacity
                    style={{ padding: 4 }}
                    onPress={() => setShowRoomInfoModal(false)}
                  >
                    <X size={20} color={THEME.textMuted} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: THEME.border }}>
                {isEditingRoomTitle ? (
                  <View style={{ gap: 8 }}>
                    <TextInput
                      style={{
                        backgroundColor: THEME.input,
                        borderWidth: 1,
                        borderColor: THEME.border,
                        borderRadius: 8,
                        color: THEME.text,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 14,
                      }}
                      value={editingRoomTitle}
                      onChangeText={setEditingRoomTitle}
                      placeholder="방 이름 입력"
                      placeholderTextColor={THEME.textMuted}
                      maxLength={20}
                    />
                    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'flex-end' }}>
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#F4F3EA',
                          borderWidth: 1,
                          borderColor: THEME.border,
                          borderRadius: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                        }}
                        onPress={() => {
                          setIsEditingRoomTitle(false);
                          setEditingRoomTitle(currentRoom.title);
                        }}
                      >
                        <Text style={{ fontSize: 11, color: THEME.text, fontWeight: 'bold' }}>취소</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          backgroundColor: THEME.primary,
                          borderRadius: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                        }}
                        onPress={handleUpdateRoomTitle}
                      >
                        <Text style={{ fontSize: 11, color: 'white', fontWeight: 'bold' }}>저장</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: THEME.text, flex: 1 }}>
                      {currentRoom.title}
                    </Text>
                    <TouchableOpacity
                      style={{
                        backgroundColor: THEME.avatarBg,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: THEME.border
                      }}
                      onPress={() => setIsEditingRoomTitle(true)}
                    >
                      <Text style={{ fontSize: 10, color: THEME.text, fontWeight: 'bold' }}>이름 변경</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <Text style={{ fontSize: 12, color: THEME.textMuted, marginTop: 4 }}>
                  약속 방 상세 정보
                </Text>
              </View>

              {/* 방 상세 정보 표시 영역 */}
              <View style={{ gap: 12, marginBottom: 16 }}>
                {/* 코드 */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.textMuted }}>초대 코드</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: THEME.primary }}>{currentRoom.code}</Text>
                    <TouchableOpacity 
                      style={{ backgroundColor: THEME.avatarBg, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 }}
                      onPress={handleShareRoom}
                    >
                      <Text style={{ fontSize: 10, color: THEME.text, fontWeight: 'bold' }}>공유</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 일시 */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.textMuted }}>약속 일시</Text>
                  <Text style={{ fontSize: 12, color: THEME.text }}>{getMeetingDateDisplay(currentRoom)}</Text>
                </View>

                {/* 약속 장소 */}
                <View style={{ borderTopWidth: 1, borderTopColor: THEME.border, paddingTop: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 6 }}>약속 장소</Text>
                  {isEditingRoomLocation ? (
                    <View style={{ gap: 8 }}>
                      <TextInput
                        style={{
                          backgroundColor: THEME.input,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          borderRadius: 8,
                          color: THEME.text,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 13,
                        }}
                        value={editingRoomLocationName}
                        onChangeText={setEditingRoomLocationName}
                        placeholder="장소 이름 입력"
                        placeholderTextColor={THEME.textMuted}
                      />
                      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'space-between', alignItems: 'center' }}>
                        <TouchableOpacity
                          style={{
                            backgroundColor: THEME.avatarBg,
                            borderWidth: 1,
                            borderColor: THEME.border,
                            borderRadius: 6,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                          }}
                          onPress={() => handleSearchLocation(editingRoomLocationName)}
                        >
                          <Text style={{ fontSize: 10, color: THEME.primary, fontWeight: 'bold' }}>🔍 장소 검색</Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            style={{
                              backgroundColor: '#F4F3EA',
                              borderWidth: 1,
                              borderColor: THEME.border,
                              borderRadius: 6,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                            }}
                            onPress={() => {
                              setIsEditingRoomLocation(false);
                              setEditingRoomLocationName(currentRoom.location_name || '');
                              setEditingRoomLatitude(currentRoom.latitude || 37.5665);
                              setEditingRoomLongitude(currentRoom.longitude || 126.9780);
                              setShowLocationResults(false);
                            }}
                          >
                            <Text style={{ fontSize: 11, color: THEME.text, fontWeight: 'bold' }}>취소</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              backgroundColor: THEME.primary,
                              borderRadius: 6,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                            }}
                            onPress={handleUpdateRoomLocation}
                          >
                            <Text style={{ fontSize: 11, color: 'white', fontWeight: 'bold' }}>저장</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* 검색 결과: 버튼 행의 바깥에 배치하여 온전한 가로 너비를 차지하게 함 */}
                      {showLocationResults && locationSearchResults.length > 0 && (
                        <ScrollView style={{ maxHeight: 150, marginTop: 4, borderWidth: 1, borderColor: THEME.border, borderRadius: 6, backgroundColor: THEME.surface }}>
                          {locationSearchResults.map((result, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={{
                                padding: 10,
                                borderBottomWidth: idx < locationSearchResults.length - 1 ? 1 : 0,
                                borderBottomColor: THEME.border
                              }}
                              onPress={() => handleSelectLocation(result)}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.text }}>
                                {result.place_name}
                              </Text>
                              <Text style={{ fontSize: 10, color: THEME.textMuted, marginTop: 2 }}>
                                {result.address_name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: THEME.text, flex: 1 }}>
                        {currentRoom.location_name ? `${currentRoom.location_name} (위도: ${currentRoom.latitude?.toFixed(2)}, 경도: ${currentRoom.longitude?.toFixed(2)})` : '설정된 장소 없음'}
                      </Text>
                      <TouchableOpacity
                        style={{
                          backgroundColor: THEME.avatarBg,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: THEME.border
                        }}
                        onPress={() => setIsEditingRoomLocation(true)}
                      >
                        <Text style={{ fontSize: 10, color: THEME.text, fontWeight: 'bold' }}>장소 설정</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* 약속 테마 색상 변경 */}
              <View style={{ borderTopWidth: 1, borderTopColor: THEME.border, paddingTop: 12, marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 8 }}>
                  약속 테마 색상 변경
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {PALETTE_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: c,
                        borderWidth: (currentRoom.color || '#23A455') === c ? 2 : 0,
                        borderColor: THEME.text,
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                      onPress={() => handleChangeRoomColor(c)}
                    >
                      {(currentRoom.color || '#23A455') === c && (
                        <Check size={12} color="white" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 구성 멤버 목록 */}
              <View style={{ borderTopWidth: 1, borderTopColor: THEME.border, paddingTop: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 8 }}>
                  구성 멤버 ({participants.length}명)
                </Text>

                {participantsLoading ? (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <ActivityIndicator size="small" color={THEME.primary} />
                    <Text style={{ color: THEME.textMuted, fontSize: 11, marginTop: 8 }}>멤버 정보를 불러오는 중...</Text>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 200 }} contentContainerStyle={{ gap: 8 }}>
                    {participants.length > 0 ? (
                      participants.map((member) => (
                        <View
                          key={member.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 8,
                            backgroundColor: '#F4F3EA',
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: THEME.border,
                            gap: 8
                          }}
                        >
                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              flex: 1
                            }}
                            onPress={() => {
                              setShowRoomInfoModal(false);
                              if (member.profile_id) {
                                handleViewProfile(member.profile_id);
                              } else {
                                Alert.alert('알림', '프로필 정보가 없는 사용자입니다.');
                              }
                            }}
                          >
                            <View
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: member.avatar_color || THEME.primary,
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 10
                              }}
                            >
                              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>
                                {(member.name || '알')[0]}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: 'bold', color: THEME.text }}>
                                {member.name}
                                {member.profile_id === roomOwnerProfileId && (
                                  <Text style={{ fontSize: 10, color: THEME.primary, fontWeight: 'bold' }}> (방장)</Text>
                                )}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 11, color: THEME.textMuted }}>프로필 ➜</Text>
                          </TouchableOpacity>

                          {/* Kick button: only visible to host, and cannot kick themselves */}
                          {roomOwnerProfileId === globalProfile?.id && member.profile_id !== roomOwnerProfileId && (
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#FEE2E2',
                                borderColor: '#EF4444',
                                borderWidth: 1,
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6
                              }}
                              onPress={() => handleKickParticipant(member.id, member.name)}
                            >
                              <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: 'bold' }}>추방</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ))
                    ) : (
                      <Text style={{ color: THEME.textMuted, fontSize: 11, textAlign: 'center', paddingVertical: 8 }}>
                        멤버가 없습니다.
                      </Text>
                    )}
                  </ScrollView>
                )}
              </View>

            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// App.tsx 의 동명 스타일에서 이 모달이 쓰는 2개만 가져왔습니다.
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 420
  }
});

export default RoomInfoModal;
