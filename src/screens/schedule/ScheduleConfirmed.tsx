import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import { THEME } from '../../lib/theme';
import type { Profile } from '../../lib/types';

/**
 * 일정 추가 결과 화면 — Figma `일정 조율/일정 추가/확정`(node 160:827).
 *
 * 방이 만들어진 뒤 무엇이 정해졌는지 한 장으로 보여준다.
 */
interface ScheduleConfirmedProps {
  title: string;
  slotLabel: string;
  locationName?: string;
  averageTravelMinutes?: number;
  mates: Profile[];
  /** 기기 캘린더에도 저장됐는지 — 안 됐으면 문구를 감춘다 */
  savedToDeviceCalendar?: boolean;
}

const MateAvatar: React.FC<{ profile: Profile }> = ({ profile }) => (
  <View style={styles.mateAvatar}>
    {profile.avatar_url ? (
      <Image source={{ uri: profile.avatar_url }} style={styles.mateAvatarImage} />
    ) : (
      <Text style={[styles.mateAvatarInitial, { color: profile.avatar_color || THEME.primary }]}>
        {profile.name[0]}
      </Text>
    )}
  </View>
);

const ScheduleConfirmed: React.FC<ScheduleConfirmedProps> = ({
  title,
  slotLabel,
  locationName,
  averageTravelMinutes,
  mates,
  savedToDeviceCalendar,
}) => (
  <>
    <View style={styles.hero}>
      <View style={styles.heroAvatar}>
        <Text style={styles.heroEmoji}>🎉</Text>
      </View>
      <Text style={styles.heroTitle}>일정이 확정됐어요!</Text>
      <Text style={styles.heroSub}>참여자 모두에게 알림을 보냈어요</Text>
    </View>

    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>확정</Text>
        </View>
      </View>

      <Text style={styles.row}>🗓  {slotLabel}</Text>
      {Boolean(locationName) && <Text style={styles.row}>📍  {locationName}</Text>}
      {averageTravelMinutes != null && averageTravelMinutes > 0 && (
        <Text style={styles.row}>🚶  평균 이동 {Math.round(averageTravelMinutes)}분</Text>
      )}

      <View style={styles.divider} />

      <View style={styles.mateRow}>
        {mates.slice(0, 4).map(mate => (
          <MateAvatar key={mate.id} profile={mate} />
        ))}
        <Text style={styles.mateCount}>{mates.length}명 참석</Text>
      </View>
    </View>

    {savedToDeviceCalendar && (
      <Text style={styles.note}>스마트폰 캘린더에도 자동 저장했어요</Text>
    )}
  </>
);

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 20,
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: THEME.badgeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 34,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: THEME.text,
    marginTop: 4,
  },
  heroSub: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: THEME.badgeBg,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.accentSoft,
  },
  row: {
    fontSize: 12,
    color: THEME.text,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 4,
  },
  mateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mateAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: THEME.badgeBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mateAvatarImage: {
    width: '100%',
    height: '100%',
  },
  mateAvatarInitial: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  mateCount: {
    marginLeft: 6,
    fontSize: 11,
    color: THEME.textSecondary,
  },
  note: {
    fontSize: 11,
    color: THEME.textMuted,
    textAlign: 'center',
    paddingTop: 14,
  },
});

export default ScheduleConfirmed;
