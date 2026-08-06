import {
  splitEncodedName,
  getMemberAmount,
  getMemberCleanName,
  isCustomSplitBill,
  formatBillDate,
} from '../dutchPayUtils';
import type { DutchPayBill, DutchPayMember } from '../types';

function member(name: string, profileId = 'p1'): DutchPayMember {
  return { id: name, bill_id: 'b1', profile_id: profileId, name, is_completed: false } as unknown as DutchPayMember;
}

function bill(total: number, count: number, members: DutchPayMember[]): DutchPayBill {
  return {
    id: 'b1',
    total_amount: total,
    split_count: count,
    dutch_pay_members: members,
  } as unknown as DutchPayBill;
}

/**
 * dutch_pay_members.name 은 `이름:금액` 형태로 금액을 함께 담는다.
 * 전용 컬럼이 없어 생긴 구조라 파싱이 깨지면 **청구 금액이 틀린다.**
 */
describe('splitEncodedName', () => {
  it('일반적인 형태를 분리한다', () => {
    expect(splitEncodedName('철수:5000')).toEqual({ name: '철수', amount: 5000 });
  });

  it('구분자가 없으면 금액은 null', () => {
    expect(splitEncodedName('철수')).toEqual({ name: '철수', amount: null });
  });

  it('닉네임에 콜론이 있어도 오른쪽 끝에서 자른다', () => {
    // 예전에는 split(':')[1] 을 써서 '밥:100:5000' → 100원으로 읽혔다.
    // 실제 청구액이 5,000원에서 100원으로 바뀌는 버그였다.
    expect(splitEncodedName('밥:100:5000')).toEqual({ name: '밥:100', amount: 5000 });
  });

  it('뒤쪽이 숫자가 아니면 금액으로 보지 않는다', () => {
    expect(splitEncodedName('김:철수')).toEqual({ name: '김:철수', amount: null });
  });

  it('맨 앞이 구분자면 이름으로 취급한다', () => {
    expect(splitEncodedName(':5000')).toEqual({ name: ':5000', amount: null });
  });
});

describe('getMemberAmount', () => {
  it('저장된 금액을 그대로 쓴다', () => {
    const b = bill(30000, 3, [member('철수:7000')]);
    expect(getMemberAmount(b, b.dutch_pay_members![0])).toBe(7000);
  });

  it('금액이 없으면 균등 분배액으로 계산한다', () => {
    const b = bill(30000, 3, [member('철수')]);
    expect(getMemberAmount(b, b.dutch_pay_members![0])).toBe(10000);
  });

  it('split_count 가 0이어도 0으로 나누지 않는다', () => {
    const b = bill(30000, 0, [member('철수')]);
    expect(getMemberAmount(b, b.dutch_pay_members![0])).toBe(30000);
  });

  it('profileId 로도 찾을 수 있다', () => {
    const b = bill(30000, 3, [member('철수:7000', 'pX')]);
    expect(getMemberAmount(b, null, 'pX')).toBe(7000);
  });
});

describe('getMemberCleanName', () => {
  it('금액 부분을 뗀다', () => {
    expect(getMemberCleanName('철수:5000')).toBe('철수');
  });

  it('콜론이 든 닉네임을 보존한다', () => {
    expect(getMemberCleanName('밥:100:5000')).toBe('밥:100');
  });
});

describe('isCustomSplitBill', () => {
  it('균등 분배는 개별 정산이 아니다', () => {
    // ⚠️ 예전에는 name.includes(':') 로 판정해서 **항상 참**이었다.
    //    균등 분배도 이름에 금액을 함께 저장하기 때문이다.
    //    그 결과 독촉 알림이 늘 "개별 정산 금액 확인 후" 로만 나가고
    //    "인당 N원" 이라는 실제 금액이 한 번도 표시되지 않았다.
    const b = bill(30000, 3, [member('철수:10000', 'a'), member('영희:10000', 'b')]);
    expect(isCustomSplitBill(b)).toBe(false);
  });

  it('금액이 다르면 개별 정산이다', () => {
    const b = bill(30000, 3, [member('철수:5000', 'a'), member('영희:15000', 'b')]);
    expect(isCustomSplitBill(b)).toBe(true);
  });

  it('멤버가 없으면 개별 정산이 아니다', () => {
    expect(isCustomSplitBill(bill(30000, 3, []))).toBe(false);
  });
});

describe('formatBillDate', () => {
  it('정상 날짜를 한국어로 찍는다', () => {
    // 로케일 구현에 따라 구분자가 달라질 수 있으므로 연·월·일 숫자만 확인한다.
    const out = formatBillDate('2026-08-04T12:00:00Z');
    expect(out).toMatch(/2026/);
    expect(out).not.toMatch(/Invalid/);
  });

  it('빈 값이면 "날짜 미상"', () => {
    expect(formatBillDate(null)).toBe('날짜 미상');
    expect(formatBillDate(undefined)).toBe('날짜 미상');
  });

  it('형식이 깨져도 "Invalid Date" 를 화면에 내보내지 않는다', () => {
    // 이것이 이 함수가 있는 이유다. 예전에는 카드에 그 글자가 그대로 찍혔다.
    expect(formatBillDate('어제')).toBe('날짜 미상');
    expect(formatBillDate({} as unknown)).toBe('날짜 미상');
  });
});
