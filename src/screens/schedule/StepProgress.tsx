import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { THEME } from '../../lib/theme';

/**
 * 일정 추가 마법사의 진행 표시 — Figma `일정 조율/일정 추가/*` 상단(549:3623).
 *
 * 지나온 단계는 굵은 주황 막대, 남은 단계는 얇은 회색 막대이고
 * 오른쪽에 `STEP n` 을 적는다.
 */
interface StepProgressProps {
  /** 1-based */
  current: number;
  total?: number;
}

export const StepProgress: React.FC<StepProgressProps> = ({ current, total = 3 }) => (
  <View style={styles.container}>
    <View style={styles.bars}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[styles.bar, index < current ? styles.barDone : styles.barRemaining]}
        />
      ))}
    </View>
    <Text style={styles.label}>STEP {current}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    // flex:1 이 없으면 막대가 늘어나며 오른쪽 "STEP n" 라벨을 화면 밖으로 민다
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bar: {
    flex: 1,
    borderRadius: 999,
  },
  barDone: {
    height: 5,
    backgroundColor: THEME.primary,
  },
  barRemaining: {
    height: 3,
    // border(#E6E6E6)는 화면 배경과 같은 색이라 남은 단계가 안 보였다
    backgroundColor: THEME.dividerSoft,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textMuted,
  },
});
