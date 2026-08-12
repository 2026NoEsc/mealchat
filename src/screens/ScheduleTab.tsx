import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { ScheduleGrid } from '../components/ScheduleGrid';
import ScheduleWizard from './schedule/ScheduleWizard';
import { THEME } from '../lib/theme';
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

  // Figma 는 일정 추가를 STEP 1~3 + 확정의 별도 화면으로 나눠 두었다.
  // 허브에서 "＋ 일정 추가" 를 누르면 그 마법사가 탭 전체를 덮는다.
  const [showWizard, setShowWizard] = useState(false);

  if (showWizard) {
    return (
      <View style={styles.tabBody}>
        <ScheduleWizard
          onClose={() => setShowWizard(false)}
          onSaveSchedule={onSaveSchedule}
          onCoordinationConfirm={onCoordinationConfirm}
          onUpdateRoom={onUpdateRoom}
        />
      </View>
    );
  }

  return (
    <View style={styles.tabBody}>
      {/* 허브 상단 — Figma `일정 조율`(309:1077) 의 제목 + 일정 추가 */}
      <View style={styles.hubHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hubTitle}>실시간 캘린더 조율</Text>
          <Text style={styles.hubSubtitle}>구체적인 약속 일정을 정해주세요</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowWizard(true)}>
          <Plus size={14} color="#FFFFFF" />
          <Text style={styles.addButtonText}>일정 추가</Text>
        </TouchableOpacity>
      </View>

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
  },
  hubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  hubTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
  },
  hubSubtitle: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 3,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: THEME.primary,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  }
});

export default ScheduleTab;
