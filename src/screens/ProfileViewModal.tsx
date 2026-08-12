import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet
} from 'react-native';
import { Check, Plus, X } from 'lucide-react-native';
import { THEME } from '../lib/theme';
import { useAuth, useProfile } from '../contexts';
import type { Profile, PrivacySettings } from '../lib/types';

/**
 * 프로필 상세 보기 모달 — 메이트의 취향·생일·바쁜 시간대를 봅니다.
 *
 * App.tsx 에서 JSX 를 그대로 옮겨왔습니다. 상태는 Context 에서 직접 읽고,
 * 부수효과가 있는 함수만 props 로 받습니다.
 *
 * 공개 범위(privacy_settings)에 따라 항목이 가려지므로, 판정 함수
 * isFieldVisible 은 App.tsx 의 것을 그대로 받아 씁니다. 여기서 다시 구현하면
 * 두 곳의 판정이 어긋날 수 있습니다.
 */
interface ProfileViewModalProps {
  onAddFriend: (friendId: string) => void;
  isFieldVisible: (fieldName: keyof PrivacySettings, profile: Profile) => boolean;
}

const ProfileViewModal: React.FC<ProfileViewModalProps> = ({
  onAddFriend,
  isFieldVisible
}) => {
  const { globalProfile, myFollows } = useAuth();
  const { selectedProfile, showProfileModal, setShowProfileModal } = useProfile();

  // 원본이 쓰던 이름을 유지해, 아래 JSX 를 한 줄도 고치지 않았습니다.
  const handleAddFriend = onAddFriend;

  return (
    <Modal
      visible={showProfileModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowProfileModal(false)}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.modalContent, { width: '90%', maxWidth: 350, position: 'relative' }]}>
          {selectedProfile && (
            <View>
              {/* 우측 상단 X 닫기 버튼 */}
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  zIndex: 10,
                  padding: 8
                }}
                onPress={() => setShowProfileModal(false)}
              >
                <X size={20} color={THEME.textMuted} />
              </TouchableOpacity>

              <View style={{ alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: THEME.border }}>
                <View style={[styles.modalProfileAvatar, { backgroundColor: selectedProfile.avatar_color }]}>
                  <Text style={styles.modalProfileAvatarText}>{selectedProfile.name[0]}</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: THEME.text, marginTop: 8 }}>
                  {selectedProfile.name}
                </Text>
                {isFieldVisible('bio', selectedProfile) && selectedProfile.personal_data?.bio && (
                  <Text style={{ fontSize: 12, color: THEME.textMuted, marginTop: 4, textAlign: 'center' }}>
                    {selectedProfile.personal_data.bio}
                  </Text>
                )}

                {globalProfile && selectedProfile.id !== globalProfile.id && (
                  (() => {
                    const isFriend = myFollows.some(f => f.following_id === selectedProfile.id);
                    if (isFriend) {
                      return (
                        <View
                          style={{
                            marginTop: 12,
                            backgroundColor: '#f1f5f9',
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 20,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: THEME.border
                          }}
                        >
                          <Check size={14} color="#64748b" style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748b' }}>친구 목록에 있음</Text>
                        </View>
                      );
                    } else {
                      return (
                        <TouchableOpacity
                          style={{
                            marginTop: 12,
                            backgroundColor: THEME.primary,
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 20,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onPress={() => handleAddFriend(selectedProfile.id)}
                        >
                          <Plus size={14} color="white" style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: 'white' }}>친구 추가하기</Text>
                        </TouchableOpacity>
                      );
                    }
                  })()
                )}
              </View>

              <ScrollView style={{ maxHeight: 300 }}>
                {isFieldVisible('allergies', selectedProfile) && (selectedProfile.personal_data?.allergyFoods?.length ?? 0) > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 4 }}>알레르기</Text>
                    <Text style={{ fontSize: 12, color: THEME.text }}>{selectedProfile.personal_data.allergyFoods?.join(', ')}</Text>
                  </View>
                )}
                {isFieldVisible('likes', selectedProfile) && (selectedProfile.personal_data?.preferredFoods?.length ?? 0) > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 4 }}>좋아하는 음식</Text>
                    <Text style={{ fontSize: 12, color: THEME.text }}>{selectedProfile.personal_data.preferredFoods?.join(', ')}</Text>
                  </View>
                )}
                {isFieldVisible('dislikes', selectedProfile) && (selectedProfile.personal_data?.customDislikedFoods?.length ?? 0) > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 4 }}>싫어하는 음식</Text>
                    <Text style={{ fontSize: 12, color: THEME.text }}>{selectedProfile.personal_data.customDislikedFoods?.join(', ')}</Text>
                  </View>
                )}
                {isFieldVisible('health_issues', selectedProfile) && (selectedProfile.personal_data?.chronicDiseases?.length ?? 0) > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 4 }}>건강 주의사항</Text>
                    <Text style={{ fontSize: 12, color: THEME.text }}>{selectedProfile.personal_data.chronicDiseases?.join(', ')}</Text>
                  </View>
                )}
                {isFieldVisible('birthdate', selectedProfile) && selectedProfile.personal_data?.birthdate && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 4 }}>생년월일</Text>
                    <Text style={{ fontSize: 12, color: THEME.text }}>{selectedProfile.personal_data.birthdate}</Text>
                  </View>
                )}
                {isFieldVisible('gender', selectedProfile) && selectedProfile.personal_data?.gender && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 4 }}>성별</Text>
                    <Text style={{ fontSize: 12, color: THEME.text }}>{selectedProfile.personal_data.gender}</Text>
                  </View>
                )}
                {/* 5-Day Busy Schedule Mini Grid */}
                {selectedProfile.schedule && (
                  <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: THEME.border }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: THEME.text, marginBottom: 4 }}>
                      📅 5일간 바쁜 시간대 요약
                    </Text>
                    <Text style={{ fontSize: 10, color: THEME.textMuted, marginBottom: 8 }}>
                      보라색 슬롯은 친구가 바쁜 시간대(약속 불가)입니다.
                    </Text>
                    
                    {/* Mini Grid */}
                    <View style={{ flexDirection: 'row', backgroundColor: THEME.surfaceDarker, borderRadius: 8, padding: 8 }}>
                      {/* Time Axis */}
                      <View style={{ marginRight: 6, gap: 2 }}>
                        <View style={{ height: 20, justifyContent: 'center' }}><Text style={{ fontSize: 8, color: 'transparent' }}>시간</Text></View>
                        {['11:30', '12:00', '12:30', '13:00', '13:30', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'].map(t => (
                          <View key={t} style={{ height: 12, justifyContent: 'center' }}>
                            <Text style={{ fontSize: 8, color: THEME.textMuted, fontWeight: '600' }}>{t}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Columns */}
                      <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                        {(() => {
                          const base = new Date();
                          const dates = [];
                          for (let i = 0; i < 5; i++) {
                            const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
                            dates.push(d.toISOString().split('T')[0]);
                          }

                          const getDayName = (dateStr: string) => {
                            const days = ['일', '월', '화', '수', '목', '금', '토'];
                            const d = new Date(dateStr);
                            return days[d.getDay()];
                          };

                          return dates.map(date => {
                            const busySlots = selectedProfile.schedule?.[date] || [];
                            const [, m, d] = date.split('-');
                            return (
                              <View key={date} style={{ flex: 1, alignItems: 'center' }}>
                                <View style={{ height: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
                                  <Text style={{ fontSize: 8, fontWeight: 'bold', color: THEME.text }}>{getDayName(date)}</Text>
                                  <Text style={{ fontSize: 7, color: THEME.textMuted }}>{parseInt(m, 10)}/{parseInt(d, 10)}</Text>
                                </View>

                                {['11:30', '12:00', '12:30', '13:00', '13:30', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'].map(time => {
                                  const isBusy = !busySlots.includes(time);
                                  return (
                                    <View
                                      key={`${date}-${time}`}
                                      style={{
                                        width: '100%',
                                        height: 12,
                                        backgroundColor: isBusy ? '#8b5cf6' : '#FFFFFF',
                                        borderWidth: 0.5,
                                        borderColor: 'rgba(0,0,0,0.05)',
                                        borderRadius: 2,
                                        marginVertical: 1
                                      }}
                                    />
                                  );
                                })}
                              </View>
                            );
                          });
                        })()}
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// App.tsx 에서 이 모달이 쓰는 스타일만 가져왔습니다.
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
  },
  modalProfileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalProfileAvatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold'
  }
});

export default ProfileViewModal;
