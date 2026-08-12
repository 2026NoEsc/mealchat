import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, StyleSheet, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import { RoomCard } from '../components/RoomCard';
import { THEME } from '../lib/theme';
import { useLoading, useNavigation, useNotification, useRoom, useRoomCreation } from '../contexts';

/**
 * 채팅방 탭의 **방 목록** 화면 (방에 들어가 있지 않을 때).
 *
 * Figma `채팅방/홈`(node 549:3507) 기준 — 하나의 서피스 카드 안에
 * 제목 + 방 만들기(+) / 초대코드 입장 / 방 목록이 들어간다.
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
  const { setActiveTab, setShowGlobalDutchPay, setShowCreateModal } = useNavigation();
  const { appNotifications } = useNotification();
  const { roomList, roomSummaries, roomsLoading, setCurrentRoom, setRoomSubTab } = useRoom();
  const { joinRoomCode, setJoinRoomCode } = useRoomCreation();

  const requireProfile = (action: () => void) => {
    if (isProfileIncomplete) {
      Alert.alert('알림', '프로필 설정을 먼저 완료해 주세요!');
      return;
    }
    action();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />
      }
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>MEALCHATING</Text>
          <TouchableOpacity
            style={styles.addButton}
            accessibilityLabel="새 약속 만들기"
            onPress={() => requireProfile(() => setShowCreateModal(true))}
          >
            <Plus size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={[THEME.accentGradientStart, THEME.accentGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.divider}
        />

        <View style={styles.inviteBox}>
          <TextInput
            style={styles.inviteInput}
            placeholder="초대 코드 6자리 입력"
            placeholderTextColor={THEME.textTertiary}
            value={joinRoomCode}
            onChangeText={setJoinRoomCode}
            autoCapitalize="characters"
            maxLength={6}
          />
          <TouchableOpacity style={styles.enterButton} onPress={onJoinRoomByCode}>
            <Text style={styles.enterButtonText}>입장</Text>
          </TouchableOpacity>
        </View>

        {roomsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.primary} />
            <Text style={styles.loadingText}>방 목록을 불러오는 중...</Text>
          </View>
        ) : roomList.length > 0 ? (
          <View style={styles.roomList}>
            {roomList.map(room => {
              const summary = roomSummaries[room.id];
              return (
                <RoomCard
                  key={room.id}
                  room={room}
                  unreadCount={appNotifications.filter(notif => notif.room_id === room.id).length}
                  members={summary?.members}
                  lastMessage={summary?.lastMessage}
                  lastActivityAt={summary?.lastActivityAt}
                  onPress={() => {
                    setCurrentRoom(room);
                    setRoomSubTab('schedule');
                    setActiveTab('chat');
                  }}
                />
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>참여 중인 밀챗 방이 없습니다.</Text>
            <Text style={styles.emptySubText}>위 + 버튼으로 방을 만들거나 초대코드로 참여해 보세요.</Text>
          </View>
        )}

        <Text style={styles.footerNote}>밥약 방은 정산 후 자동으로 사라져요</Text>
      </View>

      {/*
        N빵 정산 대장은 Figma `채팅방/홈` 에 없지만, 방이 사라진 뒤의 정산을
        여는 유일한 상시 진입점이라 남겨 두고 카드 톤만 맞췄다.
        (홈 탭의 PayNudge 는 미완료 건이 있을 때만 나타난다)
      */}
      <TouchableOpacity
        style={styles.ledgerCard}
        onPress={() => requireProfile(() => setShowGlobalDutchPay(true))}
      >
        <View style={styles.ledgerTextGroup}>
          <Text style={styles.ledgerTitle}>나의 N빵 정산 대장</Text>
          <Text style={styles.ledgerSubtitle}>방이 사라져도 정산 내역은 남아 있어요</Text>
        </View>
        <Text style={styles.ledgerArrow}>보기 →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  screenContent: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    shadowColor: '#A9A9A9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: THEME.accentSoft,
    letterSpacing: 0.5,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 2,
    borderRadius: 3,
    marginTop: 10,
  },
  inviteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    height: 38,
    paddingLeft: 12,
    paddingRight: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    backgroundColor: THEME.card,
  },
  inviteInput: {
    flex: 1,
    color: THEME.text,
    fontSize: 12,
    paddingVertical: 0,
  },
  enterButton: {
    height: 28,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  roomList: {
    marginTop: 14,
    gap: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: THEME.textMuted,
    fontSize: 12,
    marginTop: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: THEME.textMuted,
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptySubText: {
    color: THEME.textMuted,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  footerNote: {
    marginTop: 14,
    fontSize: 10,
    color: THEME.textMuted,
    textAlign: 'center',
  },
  ledgerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.accentSoftBorder,
    backgroundColor: THEME.card,
  },
  ledgerTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  ledgerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.text,
  },
  ledgerSubtitle: {
    fontSize: 10,
    color: THEME.textSecondary,
    marginTop: 3,
  },
  ledgerArrow: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.accentSoft,
  },
});

export default RoomListView;
