import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet
} from 'react-native';
import { Check, X } from 'lucide-react-native';
import { THEME } from '../lib/theme';
import { useAuth, useLoading, useNavigation, useRoomCreation } from '../contexts';

/**
 * 새 약속 만들기 모달 (3단계: 이름 → 날짜 → 메이트 선택).
 *
 * App.tsx 에서 JSX 를 그대로 옮겨왔습니다. 상태는 Context 에서 직접 읽고,
 * 실제 생성 처리만 props 로 받습니다.
 */
interface CreateRoomModalProps {
  onCreateRoom: () => void;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ onCreateRoom }) => {
  const { globalProfile, myFollows } = useAuth();
  const { loading } = useLoading();
  const { showCreateModal, setShowCreateModal } = useNavigation();
  const {
    currentCreateStep, newRoomTitle, newRoomDate, createRoomSelectedFriends,
    setCurrentCreateStep, setNewRoomTitle, setNewRoomDate, setCreateRoomSelectedFriends
  } = useRoomCreation();

  // 원본이 쓰던 이름을 유지해, 아래 JSX 를 한 줄도 고치지 않았습니다.
  const handleCreateRoom = onCreateRoom;

  return (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        setShowCreateModal(false);
        setCurrentCreateStep(1);
        setNewRoomTitle('');
        setNewRoomDate('');
        setCreateRoomSelectedFriends([]);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { marginBottom: 120, width: '90%', maxWidth: 400, borderRadius: 16 }]}>
          {/* Modal Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: THEME.border,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: THEME.text }}>
              새 약속 만들기
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowCreateModal(false);
                setCurrentCreateStep(1);
                setNewRoomTitle('');
                setNewRoomDate('');
                setCreateRoomSelectedFriends([]);
              }}
            >
              <X size={24} color={THEME.text} />
            </TouchableOpacity>
          </View>

          {/* Step Progress Indicator */}
          <View style={{ flexDirection: 'row', marginBottom: 16, marginTop: 16, gap: 2 }}>
            {[1, 2, 3].map(step => (
              <View
                key={step}
                style={{
                  flex: 1,
                  height: 6,
                  backgroundColor: step <= currentCreateStep ? THEME.menuNeeded : THEME.border,
                  borderRadius: 3,
                }}
              />
            ))}
          </View>
          <Text style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 16 }}>
            Step {currentCreateStep} / 3
          </Text>

          {/* Step 1: Appointment Name */}
          {currentCreateStep === 1 && (
            <View>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: THEME.text, marginBottom: 8 }}>
                약속 이름
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  color: THEME.text,
                  marginBottom: 16,
                }}
                placeholder="예) 회사 팀 점심"
                placeholderTextColor={THEME.textMuted}
                value={newRoomTitle}
                onChangeText={setNewRoomTitle}
              />
            </View>
          )}

          {/* Step 2: Date Selection */}
          {currentCreateStep === 2 && (
            <View>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: THEME.text, marginBottom: 8 }}>
                약속 날짜
              </Text>
              {/* 여기 있던 '날짜를 선택해주세요' 버튼은 onPress 가 주석뿐인
                  **빈 함수**였습니다. 입력칸처럼 생겨서 누르면 아무 일도
                  일어나지 않았고, 바로 아래 입력칸과 기능이 겹쳤습니다.
                  날짜 피커를 붙이기 전까지는 입력칸 하나만 둡니다. */}
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  color: THEME.text,
                  marginBottom: 16,
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={THEME.textMuted}
                value={newRoomDate}
                onChangeText={setNewRoomDate}
              />
            </View>
          )}

          {/* Step 3: Invite Friends */}
          {currentCreateStep === 3 && (
            <View>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: THEME.text, marginBottom: 8 }}>
                친구 초대하기 (선택)
              </Text>
              {myFollows.length === 0 ? (
                <Text style={{ fontSize: 12, color: THEME.textMuted, marginVertical: 4 }}>
                  등록된 친구가 없습니다.
                </Text>
              ) : (
                <ScrollView
                  style={{
                    maxHeight: 300,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    backgroundColor: THEME.background,
                  }}
                  nestedScrollEnabled={true}
                >
                  {myFollows.map(f => {
                    const profile = f.profiles;
                    if (!profile) return null;
                    const isSelected = createRoomSelectedFriends.includes(f.following_id);
                    return (
                      <TouchableOpacity
                        key={f.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 8,
                          borderBottomWidth: 1,
                          borderBottomColor: THEME.border,
                        }}
                        onPress={() => {
                          if (isSelected) {
                            setCreateRoomSelectedFriends(prev =>
                              prev.filter(id => id !== f.following_id)
                            );
                          } else {
                            setCreateRoomSelectedFriends(prev => [...prev, f.following_id]);
                          }
                        }}
                      >
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderWidth: 2,
                            borderColor: isSelected ? THEME.menuNeeded : THEME.border,
                            borderRadius: 4,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 12,
                          }}
                        >
                          {isSelected && <Check size={16} color={THEME.menuNeeded} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.text }}>
                            {profile.name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                backgroundColor: THEME.border,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={() => {
                if (currentCreateStep === 1) {
                  setShowCreateModal(false);
                  setCurrentCreateStep(1);
                  setNewRoomTitle('');
                  setNewRoomDate('');
                  setCreateRoomSelectedFriends([]);
                } else {
                  setCurrentCreateStep(currentCreateStep - 1);
                }
              }}
            >
              <Text style={{ color: THEME.text, fontWeight: 'bold' }}>
                {currentCreateStep === 1 ? '취소' : '이전'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                backgroundColor: THEME.menuNeeded,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={() => {
                if (currentCreateStep === 3) {
                  handleCreateRoom();
                } else {
                  setCurrentCreateStep(currentCreateStep + 1);
                }
              }}
              disabled={loading || (currentCreateStep === 1 && !newRoomTitle.trim())}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
                {currentCreateStep === 3 ? '만들기' : '다음'}
              </Text>
            </TouchableOpacity>
          </View>
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
  }
});

export default CreateRoomModal;
