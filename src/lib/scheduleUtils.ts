/**
 * 참여자가 그 날짜를 한 번도 편집하지 않았으면(schedForDate가 undefined)
 * 하루 종일 가능한 것으로 간주한다. 실제로 편집기를 열어 빈 배열([])을
 * 저장한 경우(= "이 날은 하루 종일 바쁨"을 명시적으로 선택)만 불가능으로
 * 본다.
 *
 * 이 구분이 없으면 기기 캘린더 일정이 하나도 없는(가장 한가한) 날이
 * 오히려 "전원 바쁨"으로 집계된다 — ScheduleGrid.tsx의 캘린더 동기화
 * 로직은 일정이 있는 날에 한해서만 "하루 종일 가능 - 그 일정 시간"으로
 * schedule[date]를 채워 넣기 때문에, 일정이 아예 없는 날은 이 채움 자체를
 * 못 받고 undefined로 영원히 남는다.
 */
export function isSlotFree(schedForDate: string[] | undefined, time: string): boolean {
  if (schedForDate === undefined) return true;
  return schedForDate.includes(time);
}
