import React from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Check } from 'lucide-react-native';
import { THEME } from '../../lib/theme';
import type { Follow, Profile } from '../../lib/types';
import type { ScheduleDraft } from './types';

/**
 * 일정 추가 STEP 1 — Figma `일정 조율/일정 추가/디테일 선택`(node 309:1065).
 *
 * 약속 이름 / 함께할 메이트 / 약속 장소를 고른다.
 * 장소 검색은 부모가 넘겨준 핸들러를 쓴다 — 카카오 로컬 호출은 App 쪽에 있다.
 */
interface StepDetailProps {
  draft: ScheduleDraft;
  onChange: (patch: Partial<ScheduleDraft>) => void;
  follows: Follow[];
  onSearchPlace?: (query: string) => void;
  /** 검색 결과. 없으면 검색 영역은 입력만 보여준다 */
  placeResults?: { place_name: string; address_name: string; x?: string; y?: string }[];
  /** 메이트들의 중간 지점 안내 문구. 계산이 안 되면 비운다 */
  midpointHint?: string | null;
}

const MateAvatar: React.FC<{ profile: Profile; selected: boolean }> = ({ profile, selected }) => (
  <View style={[styles.mateAvatar, selected && styles.mateAvatarSelected]}>
    {profile.avatar_url ? (
      <Image source={{ uri: profile.avatar_url }} style={styles.mateAvatarImage} />
    ) : (
      <Text style={[styles.mateAvatarInitial, { color: profile.avatar_color || THEME.primary }]}>
        {profile.name[0]}
      </Text>
    )}
  </View>
);

const StepDetail: React.FC<StepDetailProps> = ({
  draft,
  onChange,
  follows,
  onSearchPlace,
  placeResults = [],
  midpointHint,
}) => {
  const [placeQuery, setPlaceQuery] = React.useState('');

  const mates = follows.map(f => f.profiles).filter(Boolean) as Profile[];

  const toggleMate = (id: string) => {
    const next = draft.mateIds.includes(id)
      ? draft.mateIds.filter(m => m !== id)
      : [...draft.mateIds, id];
    onChange({ mateIds: next });
  };

  return (
    <>
      <Text style={styles.title}>어떻게 만날까요?</Text>
      <Text style={styles.subtitle}>구체적인 약속 일정을 정해주세요</Text>

      <TextInput
        style={styles.nameInput}
        value={draft.title}
        onChangeText={text => onChange({ title: text })}
        placeholder="약속 이름 ( 예: 점심 번개팟 )"
        placeholderTextColor={THEME.textTertiary}
        maxLength={20}
      />

      {/* 메이트 선택 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>함께할 메이트</Text>
        {mates.length === 0 ? (
          <Text style={styles.empty}>팔로우한 메이트가 없어요. 프로필 탭에서 먼저 추가해 주세요.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mateRow}>
            {mates.map(mate => {
              const selected = draft.mateIds.includes(mate.id);
              return (
                <TouchableOpacity key={mate.id} style={styles.mate} onPress={() => toggleMate(mate.id)}>
                  <MateAvatar profile={mate} selected={selected} />
                  <Text style={[styles.mateName, selected && styles.mateNameSelected]} numberOfLines={1}>
                    {mate.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* 약속 장소 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>약속 장소</Text>

        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={placeQuery}
            onChangeText={setPlaceQuery}
            placeholder="식당 이름 또는 주소 검색"
            placeholderTextColor={THEME.textTertiary}
            returnKeyType="search"
            onSubmitEditing={() => onSearchPlace?.(placeQuery)}
          />
        </View>

        {placeResults.length > 0 && (
          <View style={styles.results}>
            {placeResults.slice(0, 4).map((place, index) => (
              <TouchableOpacity
                key={`${place.place_name}-${index}`}
                style={[styles.resultRow, index > 0 && styles.resultRowDivided]}
                onPress={() =>
                  onChange({
                    locationName: place.place_name,
                    latitude: place.y ? Number(place.y) : undefined,
                    longitude: place.x ? Number(place.x) : undefined,
                  })
                }
              >
                <Text style={styles.resultName}>{place.place_name}</Text>
                <Text style={styles.resultAddress}>{place.address_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {Boolean(draft.locationName) && (
          <View style={styles.picked}>
            <View style={styles.pickedThumb}>
              <Text style={styles.pickedThumbText}>🍜</Text>
            </View>
            <View style={styles.pickedText}>
              <Text style={styles.pickedName} numberOfLines={1}>{draft.locationName}</Text>
              {draft.latitude != null && draft.longitude != null && (
                <Text style={styles.pickedSub} numberOfLines={1}>
                  위도 {draft.latitude.toFixed(2)} · 경도 {draft.longitude.toFixed(2)}
                </Text>
              )}
            </View>
            <Check size={16} color={THEME.primary} />
          </View>
        )}

        {Boolean(midpointHint) && (
          <View style={styles.midpoint}>
            <Text style={styles.midpointText}>🧭  {midpointHint}</Text>
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  nameInput: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: THEME.card,
    color: THEME.text,
    fontSize: 13,
    marginBottom: 10,
    shadowColor: '#A9A9A9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 1,
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    gap: 8,
    shadowColor: '#A9A9A9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.text,
  },
  empty: {
    fontSize: 11,
    color: THEME.textMuted,
    paddingVertical: 8,
  },
  mateRow: {
    gap: 12,
    paddingVertical: 2,
  },
  mate: {
    width: 52,
    alignItems: 'center',
    gap: 4,
  },
  mateAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.badgeBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mateAvatarSelected: {
    borderColor: THEME.primary,
  },
  mateAvatarImage: {
    width: '100%',
    height: '100%',
  },
  mateAvatarInitial: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  mateName: {
    fontSize: 10,
    color: THEME.textMuted,
    maxWidth: 52,
  },
  mateNameSelected: {
    color: THEME.primary,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: THEME.surface,
  },
  searchIcon: {
    fontSize: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: THEME.text,
    paddingVertical: 0,
  },
  results: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  resultRow: {
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  resultRowDivided: {
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  resultName: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.text,
  },
  resultAddress: {
    fontSize: 10,
    color: THEME.textMuted,
    marginTop: 2,
  },
  picked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  pickedThumb: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: THEME.badgeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickedThumbText: {
    fontSize: 16,
  },
  pickedText: {
    flex: 1,
  },
  pickedName: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.text,
  },
  pickedSub: {
    fontSize: 10,
    color: THEME.textMuted,
    marginTop: 2,
  },
  midpoint: {
    paddingTop: 4,
  },
  midpointText: {
    fontSize: 11,
    color: THEME.textSecondary,
  },
});

export default StepDetail;
