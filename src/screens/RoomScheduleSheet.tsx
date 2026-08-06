import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { ScheduleGrid } from '../components/ScheduleGrid';
import { THEME } from '../lib/theme';
import { resolveRoomOwnerProfileId } from '../lib/roomUtils';
import { useAuth, useRoom } from '../contexts';
import type { ScheduleAvailability } from '../lib/types';

/**
 * 방 안에서 아래로 펼쳐지는 **일정 조율 시트**.
 *
 * 상단에 AI 맞춤 추천 버튼과 진행률(N명 중 M명 선택 완료)을 보여주고,
 * 본문은 ScheduleGrid 가 담당합니다.
 *
 * App.tsx 에서 JSX 를 그대로 옮겨왔습니다. 표시 여부(roomOverlay === 'schedule')
 * 판단은 부모가 하므로 이 컴포넌트는 열려 있을 때만 렌더됩니다.
 */
interface RoomScheduleSheetProps {
  onRunAIRecommendations: () => void;
  onSaveParticipantSchedule: (schedule: ScheduleAvailability) => void;
  onConfirmSchedule: (
    slot: string,
    placeName?: string,
    placeCoords?: { latitude?: number; longitude?: number }
  ) => void;
  onRetryCoordination: (roomId: string) => void;
  onUpdateRoom: () => void;
}

const RoomScheduleSheet: React.FC<RoomScheduleSheetProps> = ({
  onRunAIRecommendations,
  onSaveParticipantSchedule,
  onConfirmSchedule,
  onRetryCoordination,
  onUpdateRoom
}) => {
  const { globalProfile } = useAuth();
  const { currentRoom, participants, currentParticipant, roomList, setRoomOverlay } = useRoom();

  // 라운드 AL-5 부터 rooms.owner_id 가 RLS 가 보는 진짜 값이다(라운드 AR).
  const roomOwnerProfileId = React.useMemo(
    () => resolveRoomOwnerProfileId(participants, currentRoom?.owner_id),
    [participants, currentRoom?.owner_id]
  );

  // 부모가 currentRoom 이 있을 때만 렌더하지만, 타입상 null 을 좁혀 둡니다.
  if (!currentRoom) return null;

  // 원본이 쓰던 이름을 유지해, 아래 JSX 를 한 줄도 고치지 않았습니다.
  const handleRunAIRecommendations = onRunAIRecommendations;
  const handleSaveParticipantSchedule = onSaveParticipantSchedule;
  const handleConfirmSchedule = onConfirmSchedule;
  const handleRetryCoordination = onRetryCoordination;
  const fetchRooms = onUpdateRoom;

  return (
    <View style={styles.noticeDropdownOverlay}>
      <View style={styles.overlayHeader}>
        <Text style={styles.overlayHeaderTitle}>🗓️ 일정 조율</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity
            style={{
              backgroundColor: THEME.primary,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4
            }}
            onPress={handleRunAIRecommendations}
          >
            <Sparkles size={12} color="white" />
            <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>AI 맞춤 추천</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setRoomOverlay(null)} style={styles.overlayCloseBtn}>
            <Text style={styles.overlayCloseText}>접기 ✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Display */}
      {(() => {
        const scheduleSelectedCount = participants.filter(p =>
          p.schedule && Object.keys(p.schedule).length > 0
        ).length;
        const totalParticipants = participants.length;
        const progressPercent = totalParticipants > 0 ? (scheduleSelectedCount / totalParticipants) * 100 : 0;

        return (
          <View style={{ paddingVertical: 12, paddingHorizontal: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: THEME.text }}>
              일정 조율
            </Text>
            <Text style={{ fontSize: 14, color: THEME.textMuted, marginTop: 4 }}>
              {totalParticipants}명 중 {scheduleSelectedCount}명 선택 완료
            </Text>
            {/* Progress Bar */}
            <View
              style={{
                height: 6,
                backgroundColor: THEME.border,
                borderRadius: 3,
                marginTop: 8,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  backgroundColor: THEME.scheduleInProgress,
                }}
              />
            </View>
          </View>
        );
      })()}

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {/* ScheduleGrid Container
            ⚠️ overflow:'hidden' + flex:1 을 넣지 마세요.
            이 블록은 position:absolute 오버레이 안에 있고 그 오버레이는
            다시 부모 ScrollView(3374행)의 자식이라 높이가 확정되지 않습니다.
            그 상태에서 두 속성을 주면 ScheduleGrid(최상위가 ScrollView)가
            0에 가깝게 접혀 시간표·저장·확정 버튼이 사라집니다.
            (리디자인 커밋 4ea5a02에서 유입된 회귀) */}
        <View
          style={{
            borderWidth: 1,
            borderColor: THEME.border,
            borderRadius: 8,
            marginBottom: 16,
            // ScheduleGrid의 최상위는 ScrollView(styles.container에 flex:1)입니다.
            // 부모가 높이를 확정해 주지 않으면 0으로 접히므로 명시적 최소 높이가 필요합니다.
            // ProfileSetup.tsx:2055도 동일하게 minHeight로 감싸서 사용합니다.
            minHeight: 600,
          }}
        >
          <ScheduleGrid
            meetingDate={currentRoom.meeting_date}
            participants={participants}
            currentParticipantId={currentParticipant?.id || ''}
            onSaveSchedule={handleSaveParticipantSchedule}
            isConfirmed={currentRoom.is_confirmed}
            confirmedSlot={currentRoom.confirmed_slot}
            onConfirmSchedule={(slot) => {
              handleConfirmSchedule(slot);
              setRoomOverlay(null);
            }}
            activeRooms={roomList}
            onUpdateRoom={fetchRooms}
            roomExpiresAt={currentRoom.expires_at}
            onRetryCoordination={handleRetryCoordination}
            roomId={currentRoom.id}
            roomOwner={roomOwnerProfileId || ''}
            currentProfileId={globalProfile?.id || ''}
          />
        </View>

        {/* Confirmed Time Display */}
        {currentRoom.is_confirmed && (
          <View
            style={{
              backgroundColor: THEME.confirmed + '10',
              borderLeftWidth: 4,
              borderLeftColor: THEME.confirmed,
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontWeight: 'bold', color: THEME.text, fontSize: 14 }}>
              ✓ 확정 시간: {currentRoom.confirmed_slot}
            </Text>
          </View>
        )}

        {/* Estimated Cost Display */}
        {currentRoom.is_confirmed && (
          <View
            style={{
              backgroundColor: THEME.surface,
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 14, color: THEME.textMuted }}>
              예상 비용
            </Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: THEME.text, marginTop: 4 }}>
              {/* TODO: 하드코딩된 더미 값입니다. 실제 정산 데이터와 연결해야 합니다. */}
              1인당 ₩12,500
            </Text>
            <TouchableOpacity
              style={{
                marginTop: 12,
                paddingVertical: 8,
                backgroundColor: THEME.menuNeeded,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={() => {
                setRoomOverlay('dutch');
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
                정산 상세 보기
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

// App.tsx 에서 이 시트가 쓰는 스타일만 가져왔습니다.
const styles = StyleSheet.create({
  noticeDropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: THEME.background,
    zIndex: 1000,
  },
  overlayHeader: {
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: THEME.surface,
  },
  overlayHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text,
  },
  overlayCloseBtn: {
    padding: 6,
  },
  overlayCloseText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.primary,
  },
});

export default RoomScheduleSheet;
