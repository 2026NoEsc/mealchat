import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ScheduleGrid } from '../components/ScheduleGrid';
import { useAuth, useRoom } from '../contexts';
import type { Profile, ScheduleAvailability } from '../lib/types';

/**
 * 일정 조율 탭 (하단 첫 번째 탭).
 *
 * 상태(globalProfile / myFollows / roomList)는 Context 에서 직접 읽고,
 * 부수효과가 있는 핸들러만 props 로 받습니다. 이 핸들러들은 AppContent 의
 * 다른 화면에서도 쓰이므로 여기로 옮길 수 없습니다.
 *
 * ⚠️ 지금은 AppContent 가 여전히 11개 Context 를 모두 구독하고 있어,
 *    부모가 리렌더되면 이 컴포넌트도 함께 리렌더됩니다. 분리의 성능 이득은
 *    AppContent 가 얇아진 뒤에 나옵니다. 현재 단계의 목적은 6,000줄짜리
 *    파일을 화면 단위로 나누는 것입니다.
 */
interface ScheduleTabProps {
  onSaveSchedule: (schedule: ScheduleAvailability) => void;
  onCoordinationConfirm: (
    title: string,
    startDate: string,
    selectedFriends: Profile[],
    locationName?: string,
    latitude?: number,
    longitude?: number
  ) => void;
  onUpdateRoom: () => void;
  onViewProfile: (profileId: string) => void;
  onRefreshFollows: () => void;
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({
  onSaveSchedule,
  onCoordinationConfirm,
  onUpdateRoom,
  onViewProfile,
  onRefreshFollows
}) => {
  const { globalProfile, myFollows } = useAuth();
  const { roomList } = useRoom();

  return (
    <View style={styles.tabBody}>
      <ScheduleGrid
        meetingDate={new Date().toISOString().split('T')[0]}
        participants={[]}
        currentParticipantId={globalProfile?.id || ''}
        onSaveSchedule={onSaveSchedule}
        isCoordination={true}
        myProfile={globalProfile}
        follows={myFollows}
        onCoordinationConfirm={onCoordinationConfirm}
        activeRooms={roomList}
        onUpdateRoom={onUpdateRoom}
        onViewProfile={onViewProfile}
        onRefreshFollows={onRefreshFollows}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabBody: {
    flex: 1
  }
});

export default ScheduleTab;
