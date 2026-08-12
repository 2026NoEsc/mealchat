import type { AIRecommendation } from '../../lib/types';

/**
 * 일정 추가 마법사가 단계별로 채워 가는 값.
 *
 * Figma 는 `STEP 1 디테일 → STEP 2 시간 → STEP 3 AI 추천 → 확정` 으로 화면을
 * 나눠 두었다. 각 화면은 이 초안의 일부만 건드리고, 방을 실제로 만드는 것은
 * 마지막에 한 번뿐이다.
 */
export interface ScheduleDraft {
  /** STEP 1 */
  title: string;
  mateIds: string[];
  locationName: string;
  latitude?: number;
  longitude?: number;
  /** STEP 2 — 후보 날짜(YYYY-MM-DD) 와 그 날의 시간대 */
  date: string;
  slots: string[];
  /** STEP 3 — 고른 추천 */
  picked?: AIRecommendation;
}

export const emptyDraft = (date: string): ScheduleDraft => ({
  title: '',
  mateIds: [],
  locationName: '',
  date,
  slots: [],
});
