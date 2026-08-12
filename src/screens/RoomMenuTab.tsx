import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { THEME } from '../lib/theme';
import { useAI, useRoom } from '../contexts';
import { BaeminSurvey, VotingItem } from '../components/BaeminSurvey';
import { MenuRecommendation } from '../components/MenuRecommendation';

/**
 * 방 안 **메뉴 선정 탭** (roomSubTab === 'menu').
 *
 * 참여자들이 고른 메뉴를 모아 보여주고, 내 표를 갱신합니다.
 * App.tsx 에서 JSX 를 그대로 옮겨왔습니다.
 *
 * 집계 함수 3개(getMenuProgress / getAllSelectedMenus / getMenuVoteCount)는
 * participants 만 있으면 계산되는 순수 함수라 여기로 함께 옮겼습니다.
 * App.tsx 에서는 이 탭에서만 쓰이고 있었습니다.
 */
interface RoomMenuTabProps {
  onUpdateMyVote: (votedIds: string[]) => void;
  /** 방 공용 투표 목록(`rooms.voting_items`) 갱신 */
  onUpdatePoll: (items: VotingItem[]) => void;
}

const RoomMenuTab: React.FC<RoomMenuTabProps> = ({
  onUpdateMyVote,
  onUpdatePoll
}) => {
  const [draftMenu, setDraftMenu] = useState('');
  /**
   * 룰렛은 접어 둡니다.
   * 메뉴 탭 하나에 투표·직접 제안·AI 후보·룰렛이 전부 펼쳐져 있으면
   * 무엇부터 해야 하는지 알 수 없습니다. 필요한 사람만 펴서 씁니다.
   */
  const [showRoulette, setShowRoulette] = useState(false);
  const { aiRecommendations } = useAI();
  const { participants, currentParticipant, currentRoom } = useRoom();

  /**
   * 방 공용 투표 목록. `rooms.voting_items` 에 저장됩니다.
   * 예전 데이터에는 형태가 다른 값이 있을 수 있어 방어적으로 읽습니다.
   */
  const votingItems: VotingItem[] = Array.isArray(currentRoom?.voting_items)
    ? (currentRoom!.voting_items as VotingItem[]).filter(
        item => item && typeof item.id === 'string' && typeof item.name === 'string'
      )
    : [];

  /** 몇 명이 메뉴를 골랐는지 */
  const getMenuProgress = () => {
    const selectedCount = participants.filter(p => p.voted_items && p.voted_items.length > 0).length;
    const totalCount = participants.length;
    return { selectedCount, totalCount };
  };

  /** 참여자들이 고른 메뉴의 합집합 */
  const getAllSelectedMenus = () => {
    const menuSet = new Set<string>();
    participants.forEach(p => {
      if (p.voted_items) {
        p.voted_items.forEach(item => menuSet.add(item));
      }
    });
    return Array.from(menuSet);
  };

  /** 특정 메뉴를 고른 사람 수 */
  const getMenuVoteCount = (menuName: string) => {
    return participants.filter(p => p.voted_items && p.voted_items.includes(menuName)).length;
  };

  // 원본이 쓰던 이름을 유지해, 아래 JSX 를 한 줄도 고치지 않았습니다.
  const handleUpdateMyVote = onUpdateMyVote;

  /**
   * AI 추천 장소의 대표 메뉴를 후보로 꺼냅니다.
   * Gemini 가 값을 준 경우에만 채워집니다(카카오 로컬은 메뉴를 주지 않습니다).
   * 그래서 비어 있는 것이 정상 동작이고, 그때는 섹션 자체를 감춥니다.
   */
  const aiMenuCandidates = Array.from(new Set(
    aiRecommendations
      .flatMap(r => (r.recommended_place?.menu ?? '').split(','))
      .map(m => m.trim())
      .filter(Boolean)
  ));

  /** 내가 고른 메뉴에 하나 더한다. 이미 있으면 아무 것도 하지 않는다. */
  const addMenu = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!currentParticipant) {
      Alert.alert('알림', '방 참여 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    const mine = currentParticipant.voted_items || [];
    if (mine.includes(trimmed)) {
      Alert.alert('알림', '이미 고른 메뉴입니다.');
      return;
    }
    handleUpdateMyVote([...mine, trimmed]);
    setDraftMenu('');
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        {/* 현황 표시 */}
        {(() => {
          const { selectedCount, totalCount } = getMenuProgress();
          const progressPercentage = totalCount > 0 ? (selectedCount / totalCount) * 100 : 0;

          return (
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: THEME.textSecondary }}>
                {totalCount}명 중 {selectedCount}명 선정 완료
              </Text>
              {/* 진행도 바 */}
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
                    width: `${progressPercentage}%`,
                    backgroundColor: THEME.menuComplete,
                  }}
                />
              </View>
            </View>
          );
        })()}

        {/* 메뉴 투표 (라운드 AL 에서 연결)
            431줄이 정의만 된 채 어디서도 렌더되지 않고 있었습니다.
            메뉴 탭의 "직접 제안할 수단이 없다"(AF-1)는 빈자리에 정확히 맞습니다.
            표는 **메뉴 이름**으로 저장하므로 아래 직접 제안과 같은 컬럼을 씁니다. */}
        <View style={{ marginBottom: 16 }}>
          <BaeminSurvey
            participants={participants}
            currentParticipantId={currentParticipant?.id || ''}
            votingItems={votingItems}
            votedItems={currentParticipant?.voted_items || []}
            onUpdatePoll={onUpdatePoll}
            onUpdateMyVote={handleUpdateMyVote}
          />
        </View>

        {/* AI 추천 메뉴 섹션
            ⚠️ 예전에는 이 카드가 `aiRecommendations.length > 0` 일 때만 뜨고,
               버튼은 **일정 추천**을 다시 돌렸습니다. 라벨은 '메뉴'인데 동작은
               '일정'이었고, 조건도 순환이었습니다(추천이 있어야 추천 버튼이
               보임). 이제 추천 장소의 대표 메뉴를 실제 후보로 보여줍니다. */}
        {aiMenuCandidates.length > 0 && (
          <View
            style={{
              backgroundColor: THEME.menuNeeded + '10',
              borderLeftWidth: 4,
              borderLeftColor: THEME.menuNeeded,
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: THEME.text }}>
              🤖 AI 추천 메뉴
            </Text>
            <Text style={{ fontSize: 12, color: THEME.textMuted, marginTop: 4 }}>
              AI가 추천한 장소의 대표 메뉴입니다. 눌러서 후보에 넣을 수 있어요.
            </Text>
            {aiMenuCandidates.map(candidate => (
              <TouchableOpacity
                key={candidate}
                style={{
                  marginTop: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: THEME.surface,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 6,
                }}
                onPress={() => addMenu(candidate)}
              >
                <Text style={{ color: THEME.text, fontWeight: '600', fontSize: 13 }}>
                  + {candidate}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 선택된 메뉴 카드 */}
        {(() => {
          const menus = getAllSelectedMenus();
          return menus.length > 0 ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: THEME.text, marginBottom: 8 }}>
                선택된 메뉴
              </Text>
              {menus.map(menuName => {
                const voteCount = getMenuVoteCount(menuName);
                const isCurrentUserSelected = currentParticipant?.voted_items?.includes(menuName);

                return (
                  <TouchableOpacity
                    key={menuName}
                    style={{
                      backgroundColor: isCurrentUserSelected ? THEME.surfaceHighlight : THEME.card,
                      borderWidth: 1,
                      borderColor: isCurrentUserSelected ? THEME.accentSoft : THEME.cardBorder,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      height: 46,
                      marginBottom: 6,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      if (currentParticipant) {
                        const newVotes = currentParticipant.voted_items || [];
                        if (newVotes.includes(menuName)) {
                          newVotes.splice(newVotes.indexOf(menuName), 1);
                        } else {
                          newVotes.push(menuName);
                        }
                        handleUpdateMyVote(newVotes);
                      }
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: isCurrentUserSelected ? THEME.accentSoft : THEME.text,
                        flex: 1,
                      }}
                    >
                      {menuName}
                    </Text>
                    <Text style={{ fontSize: 11, color: THEME.textSecondary }}>{voteCount}표</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <Text style={{ fontSize: 14, color: THEME.textMuted, textAlign: 'center' }}>
                아직 선택된 메뉴가 없습니다.
              </Text>
              <Text style={{ fontSize: 12, color: THEME.textMuted, marginTop: 4, textAlign: 'center' }}>
                메뉴 추천을 받거나 메뉴를 직접 제안해 보세요.
              </Text>
            </View>
          );
        })()}

        {/* 메뉴 직접 제안
            빈 화면 안내문은 "메뉴 추천을 받거나 메뉴를 직접 제안해 보세요" 라고
            적혀 있었지만, **직접 제안할 수단이 화면에 없었습니다.** 표는 이미
            있는 메뉴 이름에만 던질 수 있어서, 새 방은 아무도 첫 메뉴를 올릴 수
            없는 막다른 길이었습니다. */}
        <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: THEME.border }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: THEME.text, marginBottom: 8 }}>
            ＋ 메뉴 직접 추가
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: THEME.cardBorder,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 13,
                color: THEME.text,
                backgroundColor: THEME.surface,
              }}
              value={draftMenu}
              onChangeText={setDraftMenu}
              placeholder="예) 김치찌개"
              placeholderTextColor={THEME.textMuted}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={() => addMenu(draftMenu)}
            />
            <TouchableOpacity
              style={{
                paddingHorizontal: 18,
                justifyContent: 'center',
                backgroundColor: draftMenu.trim() ? THEME.primary : THEME.border,
                borderRadius: 10,
              }}
              disabled={!draftMenu.trim()}
              onPress={() => addMenu(draftMenu)}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>추가</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 참여자별 선택 */}
        <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: THEME.border }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: THEME.text, marginBottom: 12 }}>
            참여자별 선택
          </Text>
          {participants.map(p => (
            <View
              key={p.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: THEME.border,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: p.avatar_color,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 }}>
                  {p.name[0]}
                </Text>
              </View>
              <Text style={{ flex: 1, color: THEME.text, fontWeight: '500' }}>
                {p.name}
              </Text>
              <Text style={{ color: p.voted_items?.length ? THEME.menuComplete : THEME.textMuted, fontWeight: '600', fontSize: 12 }}>
                {p.voted_items?.length ? p.voted_items.join(', ') : '선정 대기 중'}
              </Text>
            </View>
          ))}
        </View>

        {/* 메뉴 룰렛 (라운드 AL 에서 연결)
            투표로 정하기 애매할 때 쓰는 재미 요소입니다. 알레르기·지병에 걸리는
            메뉴를 후보에서 빼는 '안심 지킴이'가 들어 있습니다.
            기본은 접어 둡니다 — 펼쳐두면 이 탭에서 무엇부터 해야 할지
            알 수 없어집니다. */}
        <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: THEME.border }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 10,
            }}
            onPress={() => setShowRoulette(v => !v)}
          >
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: THEME.text }}>
              🎯 메뉴 룰렛으로 정하기
            </Text>
            <Text style={{ fontSize: 12, color: THEME.textMuted }}>
              {showRoulette ? '접기 ▲' : '펼치기 ▼'}
            </Text>
          </TouchableOpacity>

          {showRoulette && <MenuRecommendation participants={participants} />}
        </View>
      </ScrollView>
    </View>
  );
};

export default RoomMenuTab;
