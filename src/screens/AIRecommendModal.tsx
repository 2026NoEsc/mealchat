import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { THEME } from '../lib/theme';
import { useAI, useRoom } from '../contexts';

/**
 * AI 추천 일정 TOP3 모달.
 *
 * App.tsx 에서 JSX 를 그대로 옮겨왔습니다. 상태는 useAI() 에서 직접 읽고,
 * 확정 핸들러만 props 로 받습니다 (다른 화면에서도 쓰입니다).
 *
 * ⚠️ 화면에 보이는 영업시간·메뉴·가격·AI 요약은 Gemini 키가 없으면
 *    getFallbackPlaceRecommendation() 이 만들어낸 값입니다. 실제 상점 정보가
 *    아닙니다. 장소 이름·주소·좌표만 카카오에서 온 실제 값입니다.
 */
interface AIRecommendModalProps {
  onConfirmSchedule: (
    slot: string,
    placeName?: string,
    placeCoords?: { latitude?: number; longitude?: number }
  ) => void;
}

const AIRecommendModal: React.FC<AIRecommendModalProps> = ({ onConfirmSchedule }) => {
  const { showAIRecommendModal, aiRecommendations, setShowAIRecommendModal } = useAI();
  // 확정 후 방의 일정 시트를 열기 위해 사용합니다.
  const { setRoomOverlay } = useRoom();

  // 원본이 쓰던 이름을 유지해, 아래 JSX 를 한 줄도 고치지 않았습니다.
  const handleConfirmSchedule = onConfirmSchedule;

  return (
    <Modal
      visible={showAIRecommendModal}
      animationType="slide"
      onRequestClose={() => setShowAIRecommendModal(false)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.background }}>
        <View style={styles.globalDutchPayHeader}>
          <Text style={styles.globalDutchPayHeaderTitle}>✨ AI 추천 일정 후보 TOP 3</Text>
          <TouchableOpacity
            style={styles.globalDutchPayCloseBtn}
            onPress={() => setShowAIRecommendModal(false)}
          >
            <X size={20} color={THEME.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {aiRecommendations.length > 0 ? (
            aiRecommendations.map((rec) => {
              const isRank1 = rec.rank === 1;
              const isRank2 = rec.rank === 2;
              const borderTheme = isRank1 ? '#8b5cf6' : isRank2 ? '#3b82f6' : '#64748b';

              return (
                <View
                  key={rec.rank}
                  style={{
                    backgroundColor: THEME.surface,
                    borderRadius: 12,
                    borderWidth: isRank1 ? 2 : 1,
                    borderColor: borderTheme,
                    padding: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{
                      backgroundColor: borderTheme,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6
                    }}>
                      <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>
                        {rec.rank}순위 추천
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: THEME.primary }}>
                      적합도: {rec.score}점
                    </Text>
                  </View>

                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: THEME.text, marginBottom: 4 }}>
                    {rec.date} ({rec.time})
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    <Text style={{ fontSize: 13, color: THEME.text, fontWeight: '600' }}>
                      {rec.ai_reason}
                    </Text>
                    <View style={{
                      backgroundColor: '#F1F5F9',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 9999,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 2,
                      borderWidth: 1,
                      borderColor: '#E2E8F0'
                    }}>
                      <Text style={{ fontSize: 9, color: '#64748b', fontWeight: 'bold' }}>AI 요약</Text>
                      <Text style={{ fontSize: 9, color: '#64748b' }}>ⓘ</Text>
                    </View>
                  </View>

                  <View style={{ gap: 6, marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 12, color: THEME.textMuted }}>👥 참석 현황:</Text>
                      <Text style={{ fontSize: 12, color: THEME.text, fontWeight: 'bold' }}>
                        {rec.attendance_count}명 / {rec.total_participants}명 참석 가능
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 12, color: THEME.textMuted }}>🌤️ 날씨 예보:</Text>
                      <Text style={{ fontSize: 12, color: THEME.text }}>
                        {rec.weather_status} (강수확률 {rec.precipitation_probability}%)
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 12, color: THEME.textMuted }}>🚗 이동 시간:</Text>
                      <Text style={{ fontSize: 12, color: THEME.text }}>
                        평균 약 {rec.average_travel_time}분 소요
                      </Text>
                    </View>
                  </View>

                  {rec.recommended_place && (
                    <View style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTopWidth: 1,
                      borderTopColor: THEME.border,
                      marginBottom: 16,
                      gap: 3
                    }}>
                      {/* Name */}
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: THEME.text }}>
                        {rec.recommended_place.type === '술집' ? '🍺 ' : '☕ '}{rec.recommended_place.name}
                      </Text>
                      
                      {/* 분류와 영업시간.
                          영업시간은 출처가 있을 때만 붙입니다. 카카오 로컬은
                          영업시간을 주지 않으므로, 없는 값을 지어내 붙이지 않고
                          분류만 표시합니다. */}
                      <Text style={{ fontSize: 12, color: THEME.textMuted }}>
                        {rec.recommended_place.type}
                        {rec.recommended_place.business_hours
                          ? ` · 영업시간: ${rec.recommended_place.business_hours}`
                          : ''}
                      </Text>

                      {/* Menu and Price */}
                      {rec.recommended_place.menu && (
                        <Text style={{ fontSize: 12, color: THEME.text, marginTop: 2 }}>
                          🍴 <Text style={{ fontWeight: '600' }}>대표 메뉴:</Text> {rec.recommended_place.menu}
                        </Text>
                      )}
                      {rec.recommended_place.price && (
                        <Text style={{ fontSize: 12, color: THEME.text, marginTop: 2 }}>
                          💵 <Text style={{ fontWeight: '600' }}>평균 가격대:</Text> {rec.recommended_place.price}
                        </Text>
                      )}
                      
                      {/* Slogan & AI Summary badge */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        <Text style={{ fontSize: 13, color: THEME.text, fontWeight: '600' }}>
                          {rec.recommended_place.reason}
                        </Text>
                        <View style={{
                          backgroundColor: THEME.badgeBg,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 9999,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 2,
                          borderWidth: 1,
                          borderColor: THEME.primary
                        }}>
                          <Text style={{ fontSize: 9, color: THEME.primary, fontWeight: 'bold' }}>AI 요약</Text>
                          <Text style={{ fontSize: 9, color: THEME.primary }}>ⓘ</Text>
                        </View>
                      </View>

                      {rec.recommended_place.description && (
                        <Text style={{ fontSize: 11.5, color: THEME.textMuted, fontStyle: 'italic', marginTop: 2 }}>
                          {`“${rec.recommended_place.description}”`}
                        </Text>
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    style={{
                      backgroundColor: borderTheme,
                      borderRadius: 8,
                      paddingVertical: 12,
                      alignItems: 'center'
                    }}
                    onPress={async () => {
                      const formattedSlot = `${rec.date} ${rec.time}`;
                      await handleConfirmSchedule(
                        formattedSlot,
                        rec.recommended_place?.name,
                        rec.recommended_place
                          ? { latitude: rec.recommended_place.latitude, longitude: rec.recommended_place.longitude }
                          : undefined
                      );
                      setShowAIRecommendModal(false);
                      setRoomOverlay(null);
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>
                      이 시간으로 약속 확정하기
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <Text style={{ textAlign: 'center', color: THEME.textMuted, marginTop: 40 }}>
              추천 일정을 불러올 수 없습니다. 장소 설정과 참가자 시간표를 확인해 주세요.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// App.tsx 에서 이 모달이 쓰는 스타일만 가져왔습니다.
const styles = StyleSheet.create({
  globalDutchPayHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.surface,
  },
  globalDutchPayHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text,
  },
  globalDutchPayCloseBtn: {
    padding: 6,
  },
});

export default AIRecommendModal;
