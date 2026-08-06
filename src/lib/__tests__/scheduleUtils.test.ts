import { isSlotFree } from '../scheduleUtils';

describe('isSlotFree', () => {
  it('한 번도 편집하지 않은 날짜(undefined)는 가능한 것으로 본다', () => {
    expect(isSlotFree(undefined, '14:00')).toBe(true);
  });

  it('명시적으로 빈 배열을 저장한 날짜는 하루 종일 불가능으로 본다', () => {
    expect(isSlotFree([], '14:00')).toBe(false);
  });

  it('배열에 그 시간이 있으면 가능하다', () => {
    expect(isSlotFree(['13:30', '14:00', '14:30'], '14:00')).toBe(true);
  });

  it('배열에 그 시간이 없으면 불가능하다', () => {
    expect(isSlotFree(['09:00', '09:30'], '14:00')).toBe(false);
  });
});
