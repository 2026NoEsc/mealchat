import React, { useMemo, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet
} from 'react-native';
import { ChevronLeft, Lock, Smile, Send, CalendarDays, Utensils, Wallet, Users, MoreVertical } from 'lucide-react-native';
import { THEME } from '../lib/theme';
import { EMOTICONS_MAP, EMOTICON_NAMES, parseEmoticonKey } from '../constants/emoticons';
import { useAuth, useNavigation, useRoom, useRoomTimer } from '../contexts';
import type { Message } from '../lib/types';

/**
 * 방 안의 **메시지 화면** — Figma `채팅/채팅방`(node 315:4324).
 *
 * App.tsx 안에 인라인으로 있던 300여 줄을 옮기면서 리스킨했다.
 * 구성: roomHeader / 확정 배너 / 대화 목록 / 하단 패널 버튼 4개 / 입력 바.
 *
 * 하단 버튼 4개는 각 패널 항목(일정·메뉴·정산·멤버)에서 바텀시트로 다듬을
 * 예정이라, 지금은 기존 진입 경로(roomOverlay / roomSubTab / 방 상세정보)에
 * 그대로 연결해 두었다.
 */
interface RoomChatViewProps {
  onSendMessage: () => void;
  onSendEmoticon: (key: string) => void;
  onViewProfile: (profileId: string) => void;
  onExitRoom: () => void;
  /** 하루짜리 방일 때만 일정 조율 버튼을 노출한다 */
  isOneDayRoom: boolean;
  onTouchStart: (e: any) => void;
  onTouchEnd: (e: any) => void;
}

/** 날짜가 바뀌는 지점마다 구분선을 넣기 위해 "이 메시지가 그날의 첫 메시지인가" 를 미리 계산한다 */
export const withDateDividers = (messages: Message[]): { message: Message; dayLabel: string | null }[] => {
  let lastDayKey = '';
  return messages.map(message => {
    const at = new Date(message.created_at);
    if (Number.isNaN(at.getTime())) return { message, dayLabel: null };

    const dayKey = `${at.getFullYear()}-${at.getMonth()}-${at.getDate()}`;
    if (dayKey === lastDayKey) return { message, dayLabel: null };

    lastDayKey = dayKey;
    return {
      message,
      dayLabel: at.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      }),
    };
  });
};

const formatMessageTime = (isoDate: string): string => {
  const at = new Date(isoDate);
  if (Number.isNaN(at.getTime())) return '';
  return at.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
};

const RoomChatView: React.FC<RoomChatViewProps> = ({
  onSendMessage,
  onSendEmoticon,
  onViewProfile,
  onExitRoom,
  isOneDayRoom,
  onTouchStart,
  onTouchEnd,
}) => {
  const { globalProfile } = useAuth();
  const { setShowRoomInfoModal } = useNavigation();
  const { timeLeft } = useRoomTimer();
  const {
    currentRoom, participants, roomMessages, newMessageText, showEmoticonPicker,
    setNewMessageText, setShowEmoticonPicker, setRoomOverlay, setRoomSubTab,
  } = useRoom();

  const scrollRef = useRef<ScrollView>(null);
  const rows = useMemo(() => withDateDividers(roomMessages), [roomMessages]);

  if (!currentRoom) return null;

  const themeColor = currentRoom.color || THEME.primary;
  const openRoomInfo = () => setShowRoomInfoModal(true);

  const confirmedLabel = currentRoom.is_confirmed
    ? [currentRoom.confirmed_slot, currentRoom.location_name].filter(Boolean).join('  ·  ')
    : '아직 일정이 확정되지 않았어요 — 일정을 조율해 주세요';

  return (
    <View style={styles.container} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* roomHeader — Figma 543:846 */}
      <View style={styles.roomHeader}>
        <TouchableOpacity onPress={onExitRoom} style={styles.headerBack} accessibilityLabel="방 목록으로">
          <ChevronLeft size={20} color={THEME.textSecondary} />
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: `${themeColor}24` }]}>
          <Text style={[styles.headerAvatarInitial, { color: themeColor }]}>{currentRoom.title[0]}</Text>
        </View>
        <TouchableOpacity style={styles.headerCenter} onPress={openRoomInfo}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>{currentRoom.title}</Text>
            <View style={styles.headerCountChip}>
              <Text style={styles.headerCountText}>{participants.length}</Text>
            </View>
          </View>
          <View style={styles.headerTimerRow}>
            <Lock size={9} color={THEME.danger} />
            <Text style={styles.headerTimerText}>{timeLeft} 후 방이 사라져요.</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={openRoomInfo} accessibilityLabel="방 상세정보">
          <MoreVertical size={18} color={THEME.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* 확정 배너 — Figma 315:4402 */}
      <View style={styles.confirmBanner}>
        <Text style={styles.confirmBannerText} numberOfLines={1}>{confirmedLabel}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatScrollContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {rows.length === 0 ? (
          <Text style={styles.emptyChatText}>
            대화방이 개설되었습니다. 메이트들과 인사를 나눠보세요! 👋
          </Text>
        ) : (
          rows.map(({ message, dayLabel }, index) => {
            const isMe = message.sender_id === globalProfile?.id;
            const prev = index > 0 ? rows[index - 1].message : null;
            // 날짜가 바뀐 직후에는 같은 사람이어도 이름과 아바타를 다시 보여준다
            const isSameSender = !dayLabel && prev?.sender_id === message.sender_id;
            const showAvatar = !isMe && !isSameSender;
            const time = formatMessageTime(message.created_at);
            const emoticonKey = parseEmoticonKey(message.message);

            return (
              <View key={message.id}>
                {dayLabel && (
                  <View style={styles.dateDivider}>
                    <View style={styles.dateDividerLine} />
                    <Text style={styles.dateDividerText}>{dayLabel}</Text>
                    <View style={styles.dateDividerLine} />
                  </View>
                )}

                <View style={[styles.chatRow, isMe ? styles.chatRowMe : styles.chatRowOther]}>
                  {!isMe && (
                    showAvatar ? (
                      <TouchableOpacity
                        style={styles.chatAvatar}
                        onPress={() => onViewProfile(message.sender_id)}
                      >
                        <Text style={[styles.chatAvatarText, { color: message.sender_color || THEME.primary }]}>
                          {message.sender_name[0]}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.chatAvatarSpacer} />
                    )
                  )}

                  <View style={isMe ? styles.chatColumnMe : styles.chatColumn}>
                    {showAvatar && (
                      <TouchableOpacity onPress={() => onViewProfile(message.sender_id)}>
                        <Text style={styles.chatSenderName}>{message.sender_name}</Text>
                      </TouchableOpacity>
                    )}
                    <View style={[styles.bubbleLine, isMe && styles.bubbleLineMe]}>
                      {isMe && Boolean(time) && <Text style={styles.chatTime}>{time}</Text>}
                      {emoticonKey ? (
                        <View style={styles.stickerBubble}>
                          <Image source={EMOTICONS_MAP[emoticonKey]} style={styles.stickerImage} />
                        </View>
                      ) : (
                        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                          <Text style={isMe ? styles.bubbleTextMe : styles.bubbleTextOther}>
                            {message.message}
                          </Text>
                        </View>
                      )}
                      {!isMe && Boolean(time) && <Text style={styles.chatTime}>{time}</Text>}
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* 하단 패널 버튼 — Figma 543:811 */}
      <View style={styles.panelBar}>
        {isOneDayRoom && (
          <TouchableOpacity style={styles.panelButton} onPress={() => setRoomOverlay('schedule')}>
            <CalendarDays size={18} color={THEME.textSecondary} />
            <Text style={styles.panelButtonText}>일정 조율</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.panelButton} onPress={() => setRoomSubTab('menu')}>
          <Utensils size={18} color={THEME.textSecondary} />
          <Text style={styles.panelButtonText}>메뉴 정하기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.panelButton} onPress={() => setRoomOverlay('dutch')}>
          <Wallet size={18} color={THEME.textSecondary} />
          <Text style={styles.panelButtonText}>N빵 정산</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.panelButton} onPress={openRoomInfo}>
          <Users size={18} color={THEME.textSecondary} />
          <Text style={styles.panelButtonText}>멤버</Text>
        </TouchableOpacity>
      </View>

      {/* 입력 바 — Figma 315:4392 */}
      <View style={styles.inputBar}>
        <View style={styles.inputPill}>
          <TextInput
            style={styles.textInput}
            placeholder="메시지를 입력해 주세요..."
            placeholderTextColor={THEME.textTertiary}
            value={newMessageText}
            onChangeText={text => {
              setNewMessageText(text);
              if (showEmoticonPicker) setShowEmoticonPicker(false);
            }}
            multiline
          />
          <TouchableOpacity
            accessibilityLabel="이모티콘"
            onPress={() => setShowEmoticonPicker(!showEmoticonPicker)}
          >
            <Smile size={18} color={showEmoticonPicker ? THEME.primary : THEME.textTertiary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.sendButton} onPress={onSendMessage} accessibilityLabel="보내기">
          <Send size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {showEmoticonPicker && (
        <View style={styles.emoticonPicker}>
          <Text style={styles.emoticonPickerTitle}>밀챗 캐릭터 이모티콘</Text>
          <ScrollView contentContainerStyle={styles.emoticonGrid}>
            {Object.keys(EMOTICONS_MAP).map(key => (
              <TouchableOpacity key={key} style={styles.emoticonItem} onPress={() => onSendEmoticon(key)}>
                <Image source={EMOTICONS_MAP[key]} style={styles.emoticonImage} />
                <Text style={styles.emoticonName}>{EMOTICON_NAMES[key]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 56,
    paddingHorizontal: 12,
    backgroundColor: THEME.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 3,
  },
  headerBack: {
    padding: 2,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInitial: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerCenter: {
    flex: 1,
    gap: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME.text,
  },
  headerCountChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: THEME.border,
  },
  headerCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  headerTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerTimerText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.danger,
  },
  confirmBanner: {
    marginHorizontal: 14,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: THEME.accentSoftBorder,
    backgroundColor: THEME.card,
    alignItems: 'center',
  },
  confirmBannerText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.accentSoft,
  },
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 8,
  },
  emptyChatText: {
    textAlign: 'center',
    color: THEME.textMuted,
    fontSize: 12,
    paddingVertical: 40,
  },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  dateDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.dividerSoft,
  },
  dateDividerText: {
    fontSize: 10,
    color: THEME.textMuted,
  },
  chatRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chatRowOther: {
    justifyContent: 'flex-start',
  },
  chatRowMe: {
    justifyContent: 'flex-end',
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: THEME.badgeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAvatarSpacer: {
    width: 32,
  },
  chatAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  chatColumn: {
    flexShrink: 1,
    maxWidth: '78%',
    gap: 3,
  },
  chatColumnMe: {
    flexShrink: 1,
    maxWidth: '78%',
    gap: 3,
    alignItems: 'flex-end',
  },
  chatSenderName: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  bubbleLine: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  bubbleLineMe: {
    justifyContent: 'flex-end',
  },
  bubble: {
    flexShrink: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleOther: {
    backgroundColor: THEME.card,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  bubbleMe: {
    backgroundColor: THEME.primary,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  bubbleTextOther: {
    fontSize: 13,
    color: THEME.text,
  },
  bubbleTextMe: {
    fontSize: 13,
    color: '#FFFFFF',
  },
  stickerBubble: {
    width: 88,
    height: 96,
    borderRadius: 12,
    backgroundColor: THEME.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  stickerImage: {
    width: 62,
    height: 72,
    resizeMode: 'contain',
  },
  chatTime: {
    fontSize: 9,
    color: THEME.textTertiary,
  },
  panelBar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  panelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRightWidth: 1,
    borderRightColor: THEME.border,
  },
  panelButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: THEME.surface,
  },
  inputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: THEME.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.text,
    maxHeight: 90,
    paddingVertical: 9,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoticonPicker: {
    maxHeight: 260,
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  emoticonPickerTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.textSecondary,
    paddingVertical: 8,
  },
  emoticonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emoticonItem: {
    width: 64,
    alignItems: 'center',
  },
  emoticonImage: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  emoticonName: {
    fontSize: 9,
    color: THEME.textMuted,
    marginTop: 2,
  },
});

export default RoomChatView;
