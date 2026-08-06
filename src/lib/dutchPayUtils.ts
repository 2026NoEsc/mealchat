import type { DutchPayBill, DutchPayMember } from './types';

// dutch_pay_members.name 에는 `이름:금액` 형태로 금액이 함께 저장된다.
// 전용 컬럼이 없어서 생긴 구조이고, 아래 두 함수가 그것을 되읽는다.
//
// ⚠️ 닉네임에 ':' 가 들어갈 수 있다 (ProfileSetup 은 6자 제한만 걸고 문자는
//    막지 않는다). 그래서 **오른쪽 끝에서 잘라야 한다.**
//    예전에는 split(':')[1] 을 썼는데, 닉네임이 '밥:100' 이면
//    저장값이 '밥:100:5000' 이 되어 5,000원 대신 100원으로 읽혔다.
const AMOUNT_SEP = ':';

/**
 * 정산 카드에 찍는 날짜.
 *
 * `new Date(값).toLocaleDateString()` 을 그대로 쓰면 값이 비었거나 형식이 깨졌을 때
 * 화면에 **"Invalid Date"** 라는 글자가 그대로 보입니다.
 */
export const formatBillDate = (value: unknown): string => {
  if (typeof value !== 'string' && typeof value !== 'number') return '날짜 미상';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '날짜 미상';
  return d.toLocaleDateString('ko-KR');
};

export const splitEncodedName = (rawName: string): { name: string; amount: number | null } => {
  const idx = rawName.lastIndexOf(AMOUNT_SEP);
  if (idx <= 0) return { name: rawName, amount: null };
  const tail = rawName.slice(idx + 1);
  // 뒤쪽이 숫자로만 되어 있을 때만 금액으로 본다.
  if (!/^\d+$/.test(tail)) return { name: rawName, amount: null };
  return { name: rawName.slice(0, idx), amount: parseInt(tail, 10) };
};

export const getMemberAmount = (bill: DutchPayBill, member: DutchPayMember | undefined | null, profileId?: string) => {
  let targetMember = member;
  if (!targetMember && profileId && bill.dutch_pay_members) {
    targetMember = bill.dutch_pay_members.find(m => m.profile_id === profileId) || null;
  }

  if (targetMember) {
    const { amount } = splitEncodedName(targetMember.name);
    if (amount !== null) return amount;
  }

  return Math.round(bill.total_amount / (bill.split_count || 1));
};

export const getMemberCleanName = (rawName: string) => splitEncodedName(rawName).name;

/**
 * 개별 금액 정산인지 판정한다.
 *
 * ⚠️ 예전에는 `name.includes(':')` 로 판정했는데, **균등 분배도 이름에 금액을
 *    함께 저장**하므로 항상 참이었다. 그 결과 독촉 알림이 늘
 *    "개별 정산 금액 확인 후 송금 부탁드립니다" 로 나가고
 *    **"인당 N원" 이라는 실제 금액이 한 번도 표시되지 않았다.**
 *
 * 저장된 금액이 균등 분배액과 하나라도 다르면 개별 정산으로 본다.
 */
export const isCustomSplitBill = (bill: DutchPayBill): boolean => {
  const members = bill.dutch_pay_members;
  if (!members || members.length === 0) return false;
  const even = Math.round(bill.total_amount / (bill.split_count || 1));
  return members.some(m => {
    const { amount } = splitEncodedName(m.name);
    return amount !== null && amount !== even;
  });
};
