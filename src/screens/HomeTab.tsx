import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Paperclip, Plus, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Button } from '../components/Button';
import { THEME } from '../lib/theme';
import type { Room } from '../lib/types';

/** 홈 상단 프로모션 배너 한 장 (Figma `홈/메인`의 쿠폰 캐러셀) */
export interface HomePromo {
  id: string;
  imageUrl: string;
  onPress?: () => void;
}

/** "다가올 일정" 카드에 한 줄로 그려지는 약속 */
export interface UpcomingSchedule {
  id: string;
  title: string;
  /** "2026년 8월 13일 · 버거킹 하단점" */
  metaLabel: string;
  /** "오늘" 또는 "D-8" */
  badgeLabel: string;
  isToday: boolean;
}

interface HomeTabProps {
  /** 인사말에 쓰이는 사용자 이름 */
  userName: string;
  /** 다가올 일정 계산 대상 — 확정 여부와 무관하게 방 목록 전체를 넘기면 된다 */
  rooms: Room[];
  /** 아직 정산이 끝나지 않은 건수. 0이면 PayNudge 를 그리지 않는다 */
  unsettledCount: number;
  onCreateSchedule: () => void;
  onSelectSchedule: (roomId: string) => void;
  onViewSettlements: () => void;
  /**
   * 프로모션 배너 목록. 비어 있으면 배너 영역 자체를 그리지 않는다.
   * 아직 배너를 내려주는 데이터 소스가 없어 App 에서는 넘기지 않는다.
   */
  promos?: HomePromo[];
}

/** 최대 3개까지, 오늘 이후의 약속을 날짜순으로 추린다 */
export const buildUpcomingSchedules = (rooms: Room[], now: Date = new Date()): UpcomingSchedule[] => {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  return rooms
    .filter(room => Boolean(room.meeting_date))
    .map(room => ({ room, at: new Date(room.meeting_date) }))
    .filter(({ at }) => !Number.isNaN(at.getTime()))
    .map(({ room, at }) => ({
      room,
      at,
      daysLeft: Math.round(
        (new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime() - startOfToday) / MS_PER_DAY
      ),
    }))
    .filter(({ daysLeft }) => daysLeft >= 0)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 3)
    .map(({ room, at, daysLeft }) => {
      const dateLabel = at.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
      return {
        id: room.id,
        title: room.title,
        metaLabel: room.location_name ? `${dateLabel} · ${room.location_name}` : `${dateLabel} · 장소 미정`,
        badgeLabel: daysLeft === 0 ? '오늘' : `D-${daysLeft}`,
        isToday: daysLeft === 0,
      };
    });
};

export const HomeTab: React.FC<HomeTabProps> = ({
  userName,
  rooms,
  unsettledCount,
  onCreateSchedule,
  onSelectSchedule,
  onViewSettlements,
  promos = [],
}) => {
  const [promoIndex, setPromoIndex] = useState(0);
  const upcoming = useMemo(() => buildUpcomingSchedules(rooms), [rooms]);
  const currentPromo = promos[promoIndex];

  const movePromo = (step: number) => {
    setPromoIndex(prev => (prev + step + promos.length) % promos.length);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>안녕하세요, {userName}님!</Text>
        <Text style={styles.greetingSub}>
          현재 밥약 {upcoming.length}건, 정산 {unsettledCount}건이 기다리고 있어요~
        </Text>

        {currentPromo && (
          <View style={styles.promo}>
            <TouchableOpacity activeOpacity={0.9} onPress={currentPromo.onPress}>
              <Image source={{ uri: currentPromo.imageUrl }} style={styles.promoImage} resizeMode="cover" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.promoArrow, styles.promoArrowLeft]} onPress={() => movePromo(-1)}>
              <ChevronLeft size={16} color={THEME.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.promoArrow, styles.promoArrowRight]} onPress={() => movePromo(1)}>
              <ChevronRight size={16} color={THEME.text} />
            </TouchableOpacity>
            <View style={styles.promoPager}>
              <Text style={styles.promoPagerText}>
                {promoIndex + 1} / {promos.length}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Paperclip size={16} color={THEME.text} />
            <Text style={styles.cardTitle}>다가올 일정</Text>
            <TouchableOpacity style={styles.addButton} onPress={onCreateSchedule}>
              <Plus size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {upcoming.length === 0 ? (
            <Text style={styles.emptyText}>아직 잡힌 일정이 없어요</Text>
          ) : (
            upcoming.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.scheduleRow, index > 0 && styles.scheduleRowDivided]}
                activeOpacity={0.7}
                onPress={() => onSelectSchedule(item.id)}
              >
                <View style={styles.scheduleTitleRow}>
                  <View style={styles.bullet} />
                  <Text style={styles.scheduleTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={[styles.badge, item.isToday ? styles.badgeToday : styles.badgeUpcoming]}>
                    <Text style={[styles.badgeText, item.isToday ? styles.badgeTextToday : styles.badgeTextUpcoming]}>
                      {item.badgeLabel}
                    </Text>
                  </View>
                </View>
                <Text style={styles.scheduleMeta} numberOfLines={1}>
                  {item.metaLabel}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {unsettledCount > 0 && (
          <TouchableOpacity style={styles.payNudge} activeOpacity={0.8} onPress={onViewSettlements}>
            <View style={{ flex: 1 }}>
              <Text style={styles.payNudgeTitle}>미완료 정산 {unsettledCount}건</Text>
              <Text style={styles.payNudgeSub}>방이 사라져도 정산 내역은 남아 있어요</Text>
            </View>
            <Text style={styles.payNudgeLink}>보기 →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.ctaWrap}>
        <Button variant="complete" label="일정잡기" onPress={onCreateSchedule} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
  },
  greetingSub: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginTop: 4,
  },
  promo: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: THEME.surface,
  },
  promoImage: {
    width: '100%',
    height: 190,
  },
  promoArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoArrowLeft: {
    left: 8,
  },
  promoArrowRight: {
    right: 8,
  },
  promoPager: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  promoPagerText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.text,
  },
  card: {
    marginTop: 16,
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: THEME.text,
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: THEME.textMuted,
    paddingVertical: 12,
    textAlign: 'center',
  },
  scheduleRow: {
    paddingVertical: 10,
  },
  scheduleRowDivided: {
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  scheduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.text,
  },
  scheduleTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeToday: {
    backgroundColor: THEME.accentSoft,
  },
  badgeUpcoming: {
    backgroundColor: THEME.border,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  badgeTextToday: {
    color: '#FFFFFF',
  },
  badgeTextUpcoming: {
    color: THEME.textSecondary,
  },
  scheduleMeta: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginTop: 4,
    marginLeft: 12,
  },
  payNudge: {
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
  payNudgeTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.text,
  },
  payNudgeSub: {
    fontSize: 10,
    color: THEME.textSecondary,
    marginTop: 3,
  },
  payNudgeLink: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.accentSoft,
    marginLeft: 12,
  },
  ctaWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
});
