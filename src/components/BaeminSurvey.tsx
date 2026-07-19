import React, { useState } from 'react';
import { THEME } from '../lib/theme';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { Search, ShieldAlert, Check, Plus, Trash2 } from 'lucide-react-native';
import type { Participant } from '../lib/types';

interface VotingItem {
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
  votedItems: string[];
  onUpdatePoll: (items: VotingItem[]) => void;
  onUpdateMyVote: (votedIds: string[]) => void;
}

// Master Baemin Mock Food DB
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
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearched(false);
      return;
    }

    const query = searchQuery.trim().toLowerCase();
    const filtered = BAEMIN_FOOD_DB.filter(
      item => item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)
    );
    setSearchResults(filtered);
    setSearched(true);
  };

  const handleAddItemToPoll = (item: VotingItem) => {
    if (votingItems.some(i => i.id === item.id)) {
      Alert.alert('알림', '이미 투표 목록에 추가된 메뉴입니다.');
      return;
    }
    const updated = [...votingItems, item];
    onUpdatePoll(updated);
  };

  const handleRemoveItemFromPoll = (itemId: string) => {
    const updated = votingItems.filter(i => i.id !== itemId);
    onUpdatePoll(updated);

    // Also clean up user votes
    if (votedItems.includes(itemId)) {
      const updatedVotes = votedItems.filter(id => id !== itemId);
      onUpdateMyVote(updatedVotes);
    }
  };

  const handleToggleVote = (itemId: string) => {
    if (!currentParticipantId) {
      Alert.alert('알림', '프로필 탭에서 먼저 닉네임을 등록하고 정산 계좌를 설정해 주세요!');
      return;
    }

    let updatedVotes = [...votedItems];
    if (updatedVotes.includes(itemId)) {
      updatedVotes = updatedVotes.filter(id => id !== itemId);
    } else {
      updatedVotes.push(itemId);
    }
    onUpdateMyVote(updatedVotes);
  };

  // Get total vote count for an item
  const getItemVoteCount = (itemId: string) => {
    return participants.filter(p => p.voted_items?.includes(itemId)).length;
  };

  // Check health conflicts for each item
  const checkConflicts = (item: VotingItem) => {
    const conflicts: { participantName: string; reason: string; type: 'allergy' | 'health' }[] = [];

    participants.forEach(p => {
      const data = p.personal_data;
      if (!data) return;

      // 1. Allergies
      if (data.allergies && item.allergies) {
        item.allergies.forEach(a => {
          if (data.allergies.includes(a)) {
            const label = a === 'peanuts' ? '땅콩' : a === 'shellfish' ? '갑각류' : a === 'fish' ? '생선' : a === 'peach' ? '복숭아' : a === 'dairy' ? '유제품' : '밀가루';
            conflicts.push({
              participantName: p.name,
              reason: `${label} 알레르기`,
              type: 'allergy'
            });
          }
        });
      }

      // 2. Health Issues
      if (data.health_issues && item.healthIssues) {
        item.healthIssues.forEach(h => {
          if (data.health_issues.includes(h)) {
            const label = h === 'diabetes' ? '당뇨' : h === 'hypertension' ? '고혈압' : h === 'stomach' ? '위장장애' : '비건';
            conflicts.push({
              participantName: p.name,
              reason: `${label} 우려`,
              type: 'health'
            });
          }
        });
      }
    });

    return conflicts;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      
      {/* SECTION 1: Shared Poll */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🛵 실시간 배민 메뉴 투표</Text>
        <Text style={styles.cardSubtitle}>우리 방 멤버들의 실시간 선호도 매칭 결과입니다.</Text>

        {votingItems.length > 0 ? (
          <View style={{ gap: 12, marginTop: 10 }}>
            {votingItems.map(item => {
              const voteCount = getItemVoteCount(item.id);
              const totalVotes = participants.length || 1;
              const ratio = voteCount / totalVotes;
              const isVotedByMe = votedItems.includes(item.id);
              const conflicts = checkConflicts(item);
              const hasConflict = conflicts.length > 0;

              return (
                <View key={item.id} style={styles.pollItemBox}>
                  {/* Info Header */}
                  <View style={styles.pollHeader}>
                    <TouchableOpacity
                      style={styles.pollCheckBtn}
                      onPress={() => handleToggleVote(item.id)}
                    >
                      <View style={[styles.checkbox, isVotedByMe && styles.checkboxActive]}>
                        {isVotedByMe && <Check size={10} color="white" />}
                      </View>
                      <Text style={styles.pollItemName}>{item.name}</Text>
                      <Text style={styles.pollCategory}>[{item.category}]</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleRemoveItemFromPoll(item.id)}>
                      <Trash2 size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  {/* Percentage Bar */}
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${ratio * 100}%` }]} />
                  </View>

                  {/* Vote Count Info */}
                  <View style={styles.pollMeta}>
                    <Text style={styles.voteText}>득표: {voteCount}명 ({Math.round(ratio * 100)}%)</Text>
                  </View>

                  {/* Health Exclusions Alert */}
                  {hasConflict && (
                    <View style={styles.conflictBox}>
                      <ShieldAlert size={12} color="#fca5a5" />
                      <Text style={styles.conflictText}>
                        주의! {conflicts.map(c => `${c.participantName}님(${c.reason})`).join(', ')}에게 적합하지 않을 수 있습니다.
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.noItemsText}>
            투표할 메뉴가 없습니다. 아래에서 배달의민족 메뉴를 검색하여 등록해 보세요!
          </Text>
        )}
      </View>

      {/* SECTION 2: Baemin Food Search */}
      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardTitle}>🔍 배달의민족 메뉴 검색 시뮬레이션</Text>
        
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="치킨, 피자, 초밥, 한식 등 검색"
            placeholderTextColor="#64748b"
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
                      <View>
                        <Text style={styles.resultItemName}>{item.name}</Text>
                        <Text style={styles.resultCategory}>카테고리: {item.category}</Text>
                      </View>
                      
                      <TouchableOpacity
                        style={[styles.addBtn, alreadyAdded && { backgroundColor: '#475569' }]}
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
              <Text style={styles.noResultText}>배민 DB에 해당하는 검색 결과가 존재하지 않습니다.</Text>
            )}
          </View>
        )}
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white'
  },
  cardSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2
  },
  pollItemBox: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
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
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxActive: {
    backgroundColor: '#2AC1BC',
    borderColor: '#1f9894'
  },
  pollItemName: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 4
  },
  pollCategory: {
    color: '#64748b',
    fontSize: 10
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2AC1BC',
    borderRadius: 3
  },
  pollMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  voteText: {
    fontSize: 9,
    color: '#94a3b8'
  },
  conflictBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: 4,
    padding: 6,
    marginTop: 8,
    gap: 4
  },
  conflictText: {
    color: '#fca5a5',
    fontSize: 9,
    flex: 1,
    lineHeight: 12
  },
  noItemsText: {
    color: '#475569',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12
  },
  searchBtn: {
    backgroundColor: '#2AC1BC',
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 4
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  resultItemName: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  resultCategory: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2
  },
  addBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  addBtnText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },
  noResultText: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 12
  }
});
