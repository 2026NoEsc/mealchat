import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, StyleSheet, Alert
} from 'react-native';
import { RoomCard } from '../components/RoomCard';
import { THEME } from '../lib/theme';
import { useLoading, useNavigation, useNotification, useRoom, useRoomCreation } from '../contexts';

/**
 * 채팅방 탭의 **방 목록** 화면 (방에 들어가 있지 않을 때).
 *
 * 초대코드 입장 / N빵 정산 대장 진입 / 방 카드 목록으로 구성됩니다.
 * App.tsx 에서 JSX 를 그대로 옮겨왔습니다.
 */
interface RoomListViewProps {
  onRefresh: () => void;
  onJoinRoomByCode: () => void;
  /** 프로필이 덜 채워졌으면 기능 진입을 막습니다 */
  isProfileIncomplete: boolean;
}

const RoomListView: React.FC<RoomListViewProps> = ({
  onRefresh,
  onJoinRoomByCode,
  isProfileIncomplete
}) => {
  const { refreshing } = useLoading();
  const { setActiveTab, setShowGlobalDutchPay } = useNavigation();
  const { appNotifications } = useNotification();
  const { roomList, roomsLoading, setCurrentRoom, setRoomSubTab, setRoomOverlay } = useRoom();
  const { joinRoomCode, setJoinRoomCode } = useRoomCreation();

  // 원본이 쓰던 이름을 유지해, 아래 JSX 를 한 줄도 고치지 않았습니다.
  const handleJoinRoomByCode = onJoinRoomByCode;

  return (
    <ScrollView 
      style={styles.tabBody} 
      contentContainerStyle={{ paddingBottom: 30 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />
      }
    >
      <Text style={styles.sectionHeading}>현재 개설된 밀챗 방</Text>

      {/* Join Room Code Input */}
      <View style={styles.joinCard}>
        <View style={styles.joinRow}>
          <TextInput
            style={styles.joinInput}
            placeholder="초대 코드 6자리 입력"
            placeholderTextColor="#64748b"
            value={joinRoomCode}
            onChangeText={setJoinRoomCode}
            autoCapitalize="characters"
            maxLength={6}
          />
          <TouchableOpacity style={styles.joinBtn} onPress={handleJoinRoomByCode}>
            <Text style={styles.joinBtnText}>입장</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* My Dutch Pay Ledger Button */}
      <TouchableOpacity
        style={styles.globalDutchPayBtnCard}
        onPress={() => {
          if (isProfileIncomplete) {
            Alert.alert('알림', '프로필 설정을 먼저 완료해 주세요!');
            return;
          }
          setShowGlobalDutchPay(true);
        }}
      >
        <View style={styles.globalDutchPayBtnCardContent}>
          <Text style={styles.globalDutchPayBtnCardTitle}>💸 나의 N빵 정산 대장</Text>
          <Text style={styles.globalDutchPayBtnCardSubtitle}>
            방이 폭파된 후에도 남아있는 미완료 정산 내역을 확인하고 송금할 수 있습니다.
          </Text>
        </View>
        <Text style={styles.globalDutchPayBtnCardArrow}>보기 ➜</Text>
      </TouchableOpacity>

      {/* Room Card List */}
      {roomsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>방 목록을 불러오는 중...</Text>
        </View>
      ) : roomList.length > 0 ? (
        <View style={{ gap: 12 }}>
          {roomList.map(room => {
            // Calculate unread count for this room
            const roomUnreadCount = appNotifications.filter(notif => notif.room_id === room.id).length;

            return (
              <RoomCard
                key={room.id}
                room={room}
                unreadCount={roomUnreadCount}
                onPress={() => {
                  setCurrentRoom(room);
                  setRoomSubTab('schedule');
                }}
                onChatPress={() => {
                  setCurrentRoom(room);
                  setRoomSubTab('schedule');
                  setActiveTab('addons');
                }}
                onMenuPress={() => {
                  setCurrentRoom(room);
                  setRoomSubTab('menu');
                  setActiveTab('addons');
                }}
                onSchedulePress={() => {
                  setCurrentRoom(room);
                  setRoomOverlay('schedule');
                  setActiveTab('addons');
                }}
              />
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>참여 중인 밀챗 방이 없습니다.</Text>
          <Text style={styles.emptySubText}>[일정 조율] 탭에서 방을 개설하거나 초대코드로 참여해 보세요.</Text>
        </View>
      )}
    </ScrollView>
  );
};

// App.tsx 에서 이 화면이 쓰는 스타일만 가져왔습니다.
const styles = StyleSheet.create({
  tabBody: {
    flex: 1,
    padding: 16
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 12
  },
  joinCard: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  joinRow: {
    flexDirection: 'row',
    gap: 8
  },
  joinInput: {
    flex: 1,
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    color: THEME.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13
  },
  joinBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  joinBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  globalDutchPayBtnCard: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  globalDutchPayBtnCardContent: {
    flex: 1,
    marginRight: 12,
  },
  globalDutchPayBtnCardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.text,
  },
  globalDutchPayBtnCardSubtitle: {
    fontSize: 10,
    color: THEME.textMuted,
    marginTop: 4,
  },
  globalDutchPayBtnCardArrow: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  loadingText: {
    color: THEME.textMuted,
    fontSize: 12,
    marginTop: 12
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    color: THEME.textMuted,
    fontSize: 13,
    fontWeight: 'bold'
  },
  emptySubText: {
    color: THEME.textMuted,
    fontSize: 11,
    marginTop: 4
  },
});

export default RoomListView;
