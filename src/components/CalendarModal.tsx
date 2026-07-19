import React, { useState, useEffect, useRef } from 'react';
import { THEME } from '../lib/theme';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  TouchableWithoutFeedback,
  GestureResponderEvent,
  Vibration,
  ScrollView,
} from 'react-native';

interface CalendarModalProps {
  visible: boolean;
  dateString: string;
  initialSlots: boolean[];
  onClose: () => void;
  onSave: (slots: boolean[]) => void;
  lockedSlots?: boolean[];
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  dateString,
  initialSlots,
  onClose,
  onSave,
  hideSubtitle = false,
  lockedSlots = [],
}) => {
  const [tempSlots, setTempSlots] = useState<boolean[]>(Array(24).fill(false));

  // 드래그 상태 관리
  const isDraggingRef = useRef(false);
  const lastIndexRef = useRef<number | null>(null);
  const dragValueRef = useRef<boolean | null>(null);
  const gridItemsRef = useRef<{ [key: number]: View }>({});

  useEffect(() => {
    if (visible) {
      setTempSlots(
        initialSlots && initialSlots.length === 24
          ? [...initialSlots]
          : Array(24).fill(false)
      );
      lastIndexRef.current = null;
      dragValueRef.current = null;
      isDraggingRef.current = false;
    }
  }, [visible, initialSlots]);

  const handleSelectAll = () => {
    setTempSlots(Array(24).fill(false));
    Vibration.vibrate(60);
  };

  const handleClearAll = () => {
    setTempSlots(Array(24).fill(true));
    Vibration.vibrate([0, 40, 40, 40]);
  };

  const handleSave = () => {
    onSave(tempSlots);
  };

  // 슬롯 토글 함수
  const updateSlot = (index: number, value: boolean) => {
    setTempSlots(prev => {
      const updated = [...prev];
      if (updated[index] !== value) {
        updated[index] = value;
        Vibration.vibrate(5);
      }
      return updated;
    });
  };

  // 각 슬롯의 터치 시작
  const handleSlotTouchStart = (index: number) => {
    if (lockedSlots[index]) return; // 잠긴 슬롯은 수정 불가
    isDraggingRef.current = true;
    dragValueRef.current = !tempSlots[index];
    lastIndexRef.current = index;
    updateSlot(index, dragValueRef.current!);
    Vibration.vibrate(20);
  };

  // 슬롯 위에서 터치 이동
  const handleSlotTouchMove = (index: number) => {
    if (isDraggingRef.current && dragValueRef.current !== null) {
      if (index !== lastIndexRef.current) {
        lastIndexRef.current = index;
        updateSlot(index, dragValueRef.current);
      }
    }
  };

  // 터치 종료
  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    dragValueRef.current = null;
    lastIndexRef.current = null;
  };

  // 날짜 포맷 변환 (예: 2026-06-21 -> 2026년 6월 21일)
  const formatFriendlyDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    const dateObj = new Date(Number(year), month - 1, day);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = days[dateObj.getDay()];

    return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.bottomSheet}>
              {/* 노치 핸들 */}
              <View style={styles.handle} />

              {/* 헤더 */}
              <View style={styles.header}>
                <Text style={styles.title}>시간별 일정 설정</Text>
              </View>

              {/* 퀵 액션 버튼 */}
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.outlineButton]}
                  onPress={handleSelectAll}
                  activeOpacity={0.7}
                >
                  <Text style={styles.outlineButtonText}>하루 종일 바쁨</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.outlineButton]}
                  onPress={handleClearAll}
                  activeOpacity={0.7}
                >
                  <Text style={styles.outlineButtonText}>전체 시간 비움</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.guideText}>
                👆 슬롯을 터치하고 드래그(Drag)하여 연속으로 칠할 수 있습니다.
              </Text>

              {/* 제스처 감지 영역을 감싸는 컨테이너 */}
              <View
                style={styles.gestureContainer}
                onMouseLeave={() => handleTouchEnd()}
              >
                {Array(24)
                  .fill(null)
                  .map((_, index) => {
                    const isSelected = tempSlots[index];
                    const isLocked = lockedSlots[index];
                    const hourLabel = `${String(index).padStart(2, '0')}:00`;
                    return (
                      <View
                        key={index}
                        ref={(ref) => {
                          if (ref) gridItemsRef.current[index] = ref;
                        }}
                        style={[
                          styles.gridItem,
                          isSelected && styles.gridItemActive,
                          isLocked && styles.gridItemLocked,
                        ]}
                        onTouchStart={() => handleSlotTouchStart(index)}
                        onTouchMove={() => handleSlotTouchMove(index)}
                        onTouchEnd={handleTouchEnd}
                        onMouseEnter={() => handleSlotTouchMove(index)}
                      >
                        <Text
                          style={[
                            styles.gridItemText,
                            isSelected && styles.gridItemTextActive,
                            isLocked && styles.gridItemLockedText,
                          ]}
                        >
                          {hourLabel}
                          {isLocked && <Text style={styles.lockIcon}> 🔒</Text>}
                        </Text>
                      </View>
                    );
                  })}
              </View>

              {/* 푸터 조작 버튼 */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  activeOpacity={0.7}
                >
                  <Text style={styles.saveButtonText}>일정 저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 34,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 44,
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    marginBottom: 18,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: 'transparent',
  },
  outlineButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  guideText: {
    fontSize: 12,
    color: '#00A3FF',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  gestureContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 20,
    height: 290, // 드래그 계산 정합성을 위해 명시적 높이 설정
  },
  gridItem: {
    width: '23%',
    height: 42,
    backgroundColor: '#334155',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  gridItemActive: {
    backgroundColor: '#00A3FF',
    borderColor: '#00A3FF',
  },
  gridItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
  },
  gridItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  gridItemLocked: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    opacity: 0.7,
  },
  gridItemLockedText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  lockIcon: {
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  saveButton: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
