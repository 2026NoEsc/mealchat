import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ScheduleGrid } from '../components/ScheduleGrid';
import { Button } from '../components/Button';
import { RoomPanelSheet } from '../components/RoomPanelSheet';
import { THEME } from '../lib/theme';
import { resolveRoomOwnerProfileId } from '../lib/roomUtils';
import { useAuth, useRoom } from '../contexts';
import type { ScheduleAvailability } from '../lib/types';

/**
 * 방 안에서 열리는 **일정 조율 패널** — Figma `채팅/일정 패널`(node 553:408).
 *
 * 공통 껍데기는 `RoomPanelSheet` 가 맡고, 본문은 ScheduleGrid 가 담당합니다.
 *
 * ⚠️ `expanded` 로 화면 전체 높이를 씁니다. Figma 는 화면의 60% 정도만 쓰는
 *    낮은 시트지만, ScheduleGrid 는 최소 600dp 를 요구하고 높이가 모자라면
 *    0으로 접혀 시간표가 통째로 사라진 전례가 있습니다(커밋 4ea5a02 회귀).
 *    날짜 칩 + 시간 후보 목록이라는 Figma 의 압축된 형태로 바꾸는 것은
 *    ScheduleGrid(담당자 B) 를 손대야 하는 일이라 범위 밖입니다.
 *
 * 표시 여부(roomOverlay === 'schedule') 판단은 부모가 합니다.
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

  const scheduleSelectedCount = participants.filter(
    p => p.schedule && Object.keys(p.schedule).length > 0
  ).length;
  const totalParticipants = participants.length;
  const progressPercent = totalParticipants > 0 ? (scheduleSelectedCount / totalParticipants) * 100 : 0;

  return (
    <RoomPanelSheet
      title="일정 조율"
      subtitle="가능한 날짜와 시간을 선택해 주세요"
      onClose={() => setRoomOverlay(null)}
      scrollable={false}
      expanded
      footer={<Button variant="accent" label="✨ AI 맞춤 추천" onPress={handleRunAIRecommendations} />}
    >
      <View style={styles.body}>
        <View style={styles.progressBlock}>
          <Text style={styles.progressText}>
            {totalParticipants}명 중 {scheduleSelectedCount}명 선택 완료
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* ScheduleGrid Container
            ⚠️ overflow:'hidden' + flex:1 을 넣지 마세요.
            ScheduleGrid 의 최상위는 ScrollView(styles.container 에 flex:1)라
            부모가 높이를 확정해 주지 않으면 0으로 접힙니다. 그래서 명시적
            minHeight 가 필요합니다. (리디자인 커밋 4ea5a02 에서 유입된 회귀)
            ProfileSetup.tsx 도 동일하게 minHeight 로 감싸서 씁니다. */}
        <View style={styles.gridFrame}>
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

        {currentRoom.is_confirmed && (
          <View style={styles.confirmedCard}>
            <Text style={styles.confirmedLabel}>확정 시간</Text>
            <Text style={styles.confirmedValue}>{currentRoom.confirmed_slot}</Text>
            <TouchableOpacity style={styles.settlementLink} onPress={() => setRoomOverlay('dutch')}>
              <Text style={styles.settlementLinkText}>정산 상세 보기 →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </RoomPanelSheet>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressBlock: {
    paddingBottom: 12,
  },
  progressText: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    backgroundColor: THEME.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME.accentSoft,
  },
  gridFrame: {
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 12,
    marginBottom: 12,
    minHeight: 600,
  },
  confirmedCard: {
    backgroundColor: THEME.surfaceHighlight,
    borderWidth: 1,
    borderColor: THEME.accentSoftBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  confirmedLabel: {
    fontSize: 11,
    color: THEME.textSecondary,
  },
  confirmedValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME.text,
    marginTop: 2,
  },
  settlementLink: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  settlementLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.accentSoft,
  },
});

export default RoomScheduleSheet;
