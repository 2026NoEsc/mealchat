import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Search, ShieldAlert, Check, Plus, Trash2 } from 'lucide-react-native';
import { THEME } from '../lib/theme';
import {
  normalizeAllergies,
  normalizeHealthIssues,
  allergyLabel,
  healthLabel
} from '../lib/personalDataUtils';
import type { Participant } from '../lib/types';

/**
 * 메뉴 투표 (라운드 AL 에서 화면에 연결).
 *
 * ## 이 파일의 내력
 *
 * 431줄이 **정의만 되어 있고 어디서도 렌더되지 않았습니다.** 라운드 U-3 에서
 * 린트가 "미사용 import" 로 자동 검출했고, 라운드 AF-1 에서는 정반대 방향에서
 * 같은 구멍이 드러났습니다 — 메뉴 탭에 "메뉴를 직접 제안해 보세요" 라고 적어
 * 놓고 정작 제안할 수단이 없었던 것입니다. 이미 만들어진 이 화면이 그 빈자리에
 * 정확히 맞아서, 메뉴 탭 안으로 옮겼습니다.
 *
 * ## 연결하면서 고친 것 셋
 *
 * 1. **표를 id 가 아니라 이름으로 저장합니다.**
 *    이 화면은 `voted_items` 에 `b1` 같은 **id** 를 넣었고, 메뉴 탭의 직접
 *    제안은 `김치찌개` 같은 **이름**을 넣습니다. 같은 컬럼에 두 어휘가 섞이면
 *    집계가 조용히 틀립니다 — 라운드 AE-1(알레르기 어휘 3분열)과 같은 부류이고,
 *    이 코드베이스에서 이미 두 번 물린 함정입니다. 이름으로 통일했습니다.
 *
 * 2. **알레르기·지병 라벨을 하드코딩된 삼항 사슬에서 공용 함수로 바꿨습니다.**
 *    예전 코드는 `a === 'peanuts' ? '땅콩' : ... : '밀가루'` 형태라
 *    **매칭되지 않는 값이 전부 '밀가루'** 가 됐습니다. 표준 목록이 11종으로
 *    늘어난 지금은 견과류·조개류·계란·메밀·토마토가 모두 '밀가루'로 표시됩니다.
 *    지병도 마찬가지로 미매칭이 전부 '비건' 이었습니다.
 *
 * 3. **저장 이름 두 벌을 모두 읽습니다.**
 *    `allergyFoods`/`chronicDiseases` 가 정식이지만 화면 일부는
 *    `allergies`/`health_issues` 로 씁니다(README 이슈 #3).
 *    한쪽만 보면 그 사람의 알레르기가 조용히 빠집니다.
 *
 * ## 임베드 전용입니다
 * 바깥을 `ScrollView` 가 아니라 `View` 로 둡니다. 메뉴 탭의 세로 ScrollView
 * 안에 들어가는데, 같은 방향 ScrollView 를 겹치면 스크롤이 서로를 먹습니다.
 */

export interface VotingItem {
  id: string;
  name: string;
  category: string;
  allergies: string[];
  healthIssues: string[];
}

interface BaeminSurveyProps {
  participants: Participant[];
  currentParticipantId: string;
  votingItems: VotingItem[];
  /** 내가 고른 **메뉴 이름** 목록 (id 가 아닙니다) */
  votedItems: string[];
  onUpdatePoll: (items: VotingItem[]) => void;
  onUpdateMyVote: (votedNames: string[]) => void;
}

// 배민 메뉴 검색 시뮬레이션용 목록.
// ⚠️ 실제 배달의민족 API 가 아닙니다. 화면에도 '시뮬레이션'이라고 밝힙니다.
const BAEMIN_FOOD_DB: VotingItem[] = [
  { id: 'b1', name: '엽기떡볶이 🌶️', category: '분식', allergies: ['gluten', 'dairy'], healthIssues: ['stomach'] },
  { id: 'b2', name: '허니콤보 치킨 🍗', category: '치킨', allergies: ['gluten'], healthIssues: ['hypertension'] },
  { id: 'b3', name: '직화 삼겹살 구이 🥓', category: '한식/고기', allergies: [], healthIssues: ['hypertension'] },
  { id: 'b4', name: '마라탕 & 꿔바로우 🍢', category: '아시안', allergies: ['peanuts', 'shellfish', 'gluten'], healthIssues: ['stomach'] },
  { id: 'b5', name: '모듬 초밥 12pc 🍣', category: '일식', allergies: ['fish', 'shellfish'], healthIssues: [] },
  { id: 'b6', name: '황금올리브 치킨 🍗', category: '치킨', allergies: ['gluten'], healthIssues: ['hypertension'] },
  { id: 'b7', name: '반올림 포테이토 피자 🍕', category: '피자', allergies: ['gluten', 'dairy'], healthIssues: ['diabetes'] },
  { id: 'b8', name: '짜장 탕수육 세트 🍜', category: '중식', allergies: ['gluten'], healthIssues: ['diabetes'] },
  { id: 'b9', name: '우삼겹 부대찌개 🍲', category: '한식', allergies: [], healthIssues: ['hypertension'] },
  { id: 'b10', name: '아보카도 샐러드 🥗', category: '프레시', allergies: [], healthIssues: ['vegan'] }
];

export const BaeminSurvey: React.FC<BaeminSurveyProps> = ({
  participants,
  currentParticipantId,
  votingItems = [],
  votedItems = [],
  onUpdatePoll,
  onUpdateMyVote
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VotingItem[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setSearchResults([]);
      setSearched(false);
      return;
    }
    setSearchResults(
      BAEMIN_FOOD_DB.filter(
        item =>
          item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)
      )
    );
    setSearched(true);
  };

  const handleAddItemToPoll = (item: VotingItem) => {
    if (votingItems.some(i => i.id === item.id)) {
      Alert.alert('알림', '이미 투표 목록에 추가된 메뉴입니다.');
      return;
    }
    onUpdatePoll([...votingItems, item]);
  };

  const handleRemoveItemFromPoll = (item: VotingItem) => {
    onUpdatePoll(votingItems.filter(i => i.id !== item.id));

    // 목록에서 빠진 메뉴에 남아 있던 내 표도 같이 정리합니다.
    if (votedItems.includes(item.name)) {
      onUpdateMyVote(votedItems.filter(name => name !== item.name));
    }
  };

  const handleToggleVote = (item: VotingItem) => {
    if (!currentParticipantId) {
      Alert.alert('알림', '방 참여 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    onUpdateMyVote(
      votedItems.includes(item.name)
        ? votedItems.filter(name => name !== item.name)
        : [...votedItems, item.name]
    );
  };

  const getItemVoteCount = (item: VotingItem) =>
    participants.filter(p => p.voted_items?.includes(item.name)).length;

  /** 이 메뉴가 누구에게 맞지 않는지 — '안심 지킴이' */
  const checkConflicts = (item: VotingItem) => {
    const conflicts: { participantName: string; reason: string }[] = [];

    participants.forEach(p => {
      const data: any = p.personal_data;
      if (!data) return;

      // 저장 이름이 두 벌이라 둘 다 읽습니다. 한쪽만 보면 조용히 빠집니다.
      const myAllergies = normalizeAllergies(data.allergyFoods ?? data.allergies);
      item.allergies?.forEach(a => {
        if (myAllergies.includes(a)) {
          conflicts.push({ participantName: p.name, reason: `${allergyLabel(a)} 알레르기` });
        }
      });

      const myHealth = normalizeHealthIssues(data.chronicDiseases ?? data.health_issues);
      item.healthIssues?.forEach(h => {
        if (myHealth.includes(h)) {
          conflicts.push({ participantName: p.name, reason: `${healthLabel(h)} 우려` });
        }
      });
    });

    return conflicts;
  };

  return (
    <View>
      {/* 투표 현황 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🛵 메뉴 투표</Text>
        <Text style={styles.cardSubtitle}>
          방 멤버들이 함께 고릅니다. 알레르기·지병에 맞지 않는 메뉴는 경고가 붙습니다.
        </Text>

        {votingItems.length > 0 ? (
          <View style={{ gap: 12, marginTop: 12 }}>
            {votingItems.map(item => {
              const voteCount = getItemVoteCount(item);
              const totalVotes = participants.length || 1;
              const ratio = voteCount / totalVotes;
              const isVotedByMe = votedItems.includes(item.name);
              const conflicts = checkConflicts(item);

              return (
                <View key={item.id} style={styles.pollItemBox}>
                  <View style={styles.pollHeader}>
                    <TouchableOpacity
                      style={styles.pollCheckBtn}
                      onPress={() => handleToggleVote(item)}
                    >
                      <View style={[styles.checkbox, isVotedByMe && styles.checkboxActive]}>
                        {isVotedByMe && <Check size={10} color="white" />}
                      </View>
                      <Text style={styles.pollItemName}>{item.name}</Text>
                      <Text style={styles.pollCategory}>[{item.category}]</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleRemoveItemFromPoll(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={14} color={THEME.danger} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${ratio * 100}%` }]} />
                  </View>

                  <Text style={styles.voteText}>
                    득표: {voteCount}명 ({Math.round(ratio * 100)}%)
                  </Text>

                  {conflicts.length > 0 && (
                    <View style={styles.conflictBox}>
                      <ShieldAlert size={12} color={THEME.danger} />
                      {/* 한 문자열로 만듭니다. JSX 안에서 줄을 나누면 Text 의
                          자식이 여러 조각으로 쪼개져, 화면에는 같아 보여도
                          텍스트 조회(테스트·접근성)가 통째로는 못 찾습니다. */}
                      <Text style={styles.conflictText}>
                        {`주의! ${conflicts
                          .map(c => `${c.participantName}님(${c.reason})`)
                          .join(', ')}에게 맞지 않을 수 있습니다.`}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.noItemsText}>
            투표할 메뉴가 없습니다. 아래에서 검색해 등록해 보세요.
          </Text>
        )}
      </View>

      {/* 메뉴 검색 */}
      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={styles.cardTitle}>🔍 메뉴 검색</Text>
        {/* 실제 배달의민족 연동이 아니라는 것을 화면에서 밝힙니다.
            지어낸 정보를 진짜처럼 보이게 두지 않는다는 라운드 V 의 원칙과 같습니다. */}
        <Text style={styles.cardSubtitle}>
          배달의민족 연동은 아직 없습니다. 아래는 예시 메뉴 목록입니다.
        </Text>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="치킨, 피자, 초밥, 한식 등"
            placeholderTextColor={THEME.textMuted}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Search size={16} color="white" />
          </TouchableOpacity>
        </View>

        {searched && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.resultLabel}>검색 결과 ({searchResults.length}건)</Text>

            {searchResults.length > 0 ? (
              <View style={{ gap: 8, marginTop: 8 }}>
                {searchResults.map(item => {
                  const alreadyAdded = votingItems.some(i => i.id === item.id);
                  return (
                    <View key={item.id} style={styles.resultItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultItemName}>{item.name}</Text>
                        <Text style={styles.resultCategory}>{item.category}</Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.addBtn, alreadyAdded && { backgroundColor: THEME.border }]}
                        disabled={alreadyAdded}
                        onPress={() => handleAddItemToPoll(item)}
                      >
                        {alreadyAdded ? (
                          <Text style={styles.addBtnText}>추가됨</Text>
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <Plus size={12} color="white" />
                            <Text style={styles.addBtnText}>등록</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noResultText}>검색 결과가 없습니다.</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    padding: 12
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text
  },
  cardSubtitle: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 4,
    lineHeight: 16
  },
  pollItemBox: {
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    padding: 10
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  pollCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 3,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxActive: {
    backgroundColor: THEME.menuComplete,
    borderColor: THEME.menuComplete
  },
  pollItemName: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold',
    marginRight: 4
  },
  pollCategory: {
    color: THEME.textMuted,
    fontSize: 10
  },
  progressBarBg: {
    height: 6,
    backgroundColor: THEME.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.menuComplete,
    borderRadius: 3
  },
  voteText: {
    fontSize: 10,
    color: THEME.textMuted
  },
  conflictBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    padding: 6,
    marginTop: 8,
    gap: 4
  },
  conflictText: {
    color: '#B91C1C',
    fontSize: 10,
    flex: 1,
    lineHeight: 14
  },
  noItemsText: {
    color: THEME.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 20
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12
  },
  searchInput: {
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
  searchBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.textMuted,
    marginBottom: 4
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8
  },
  resultItemName: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold'
  },
  resultCategory: {
    color: THEME.textMuted,
    fontSize: 10,
    marginTop: 2
  },
  addBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  addBtnText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold'
  },
  noResultText: {
    color: THEME.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 12
  }
});

export default BaeminSurvey;
