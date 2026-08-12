import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { THEME } from '../../lib/theme';
import type { AIRecommendation } from '../../lib/types';

/**
 * 일정 추가 STEP 3 — Figma `일정 조율/일정 추가/AI 추천 TOP3`(node 159:491).
 *
 * 후보 시간대를 점수 순으로 3개까지 보여주고 하나를 고르게 한다.
 * 추천 계산은 `lib/aiRecommender` 가 하고, 이 화면은 결과만 그린다.
 */
interface StepAiPicksProps {
  recommendations: AIRecommendation[];
  loading?: boolean;
  participantCount: number;
  pickedRank?: number;
  onPick: (recommendation: AIRecommendation) => void;
}

const RANK_LABEL = ['1순위', '2순위', '3순위'];

const StepAiPicks: React.FC<StepAiPicksProps> = ({
  recommendations,
  loading,
  participantCount,
  pickedRank,
  onPick,
}) => (
  <>
    <View style={styles.headerRow}>
      <Text style={styles.title}>AI 맞춤 추천</Text>
      <Text style={styles.headerMeta}>{participantCount}명 기준</Text>
    </View>
    <Text style={styles.subtitle}>가장 많이 모일 수 있는 시간부터 보여드려요</Text>

    {loading ? (
      <View style={styles.loading}>
        <ActivityIndicator color={THEME.primary} />
        <Text style={styles.loadingText}>후보를 계산하는 중...</Text>
      </View>
    ) : recommendations.length === 0 ? (
      <Text style={styles.empty}>
        아직 추천할 시간이 없어요. 이전 단계에서 가능한 시간을 조금 더 표시해 주세요.
      </Text>
    ) : (
      recommendations.slice(0, 3).map((rec, index) => {
        const selected = pickedRank === rec.rank;
        const attendanceRatio = rec.total_participants > 0
          ? Math.round((rec.attendance_count / rec.total_participants) * 100)
          : 0;
        return (
          <TouchableOpacity
            key={`${rec.date}-${rec.time}`}
            style={[styles.card, selected && styles.cardSelected]}
            activeOpacity={0.8}
            onPress={() => onPick(rec)}
          >
            <View style={styles.cardTop}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>{RANK_LABEL[index] ?? `${index + 1}순위`}</Text>
              </View>
              <Text style={styles.slot} numberOfLines={1}>
                {rec.date} {rec.time}
              </Text>
              <Text style={styles.score}>{Math.round(rec.score)}%</Text>
            </View>

            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, rec.score))}%` }]} />
            </View>

            <Text style={styles.meta}>
              {rec.attendance_count} / {rec.total_participants}명 참석
              {rec.weather_status ? ` • ${rec.weather_status}` : ''}
              {attendanceRatio === 100 ? ' • 전원 가능' : ''}
            </Text>
            {rec.average_travel_time > 0 && (
              <Text style={styles.meta}>평균 이동 {Math.round(rec.average_travel_time)}분</Text>
            )}
            {Boolean(rec.recommended_place?.name) && (
              <View style={styles.placeChip}>
                <Text style={styles.placeChipText}>{rec.recommended_place?.name}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })
    )}
  </>
);

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
  },
  headerMeta: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  empty: {
    fontSize: 12,
    color: THEME.textMuted,
    textAlign: 'center',
    paddingVertical: 40,
    lineHeight: 18,
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    gap: 6,
  },
  cardSelected: {
    borderColor: THEME.accentSoft,
    backgroundColor: THEME.surfaceHighlight,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: THEME.badgeBg,
  },
  rankBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.accentSoft,
  },
  slot: {
    flex: 1,
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.text,
  },
  score: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  barTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: THEME.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: THEME.primary,
  },
  meta: {
    fontSize: 11,
    color: THEME.textSecondary,
  },
  placeChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: THEME.surface,
  },
  placeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.text,
  },
});

export default StepAiPicks;
