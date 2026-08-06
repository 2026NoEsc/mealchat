import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DutchPay } from '../DutchPay';

/**
 * 라운드 AJ-1 의 회귀 방지.
 *
 * `실시간 정산 상계 현황` 의 계좌 표시 조건이 **`받을 사람이 나일 때`** 였습니다.
 * 즉 돈을 받을 사람에게 자기 계좌를 다시 보여주고, **정작 송금해야 하는 사람에게는
 * 계좌번호를 감췄습니다.** 돈을 보낼 수단이 화면에 없었던 셈입니다.
 *
 * 이 부류는 `tsc`·`eslint` 가 구조적으로 통과시킵니다 — 조건문 하나가
 * 문법적으로 완전히 정상이기 때문입니다. 실기기에서도 "내가 받는 쪽" 화면만
 * 보면 멀쩡해 보입니다. **두 방향을 모두 세우는 것은 테스트뿐입니다.**
 *
 * ⚠️ RTL 14 의 `render`/`fireEvent` 는 비동기입니다. `await` 를 빼면
 *    조회가 전부 실패합니다.
 */

let mockBills: any[] = [];
let mockInsertedRows: { table: string; rows: any[] }[] = [];

// fetchBills 는 `.from().select().order()` 로 만든 쿼리에 조건에 따라 `.eq()` 를
// 더 붙인 뒤 await 합니다. 그래서 모킹 객체는 **체인 가능하면서 동시에
// thenable** 이어야 합니다. 어느 단계에서 await 하든 같은 결과를 냅니다.
//
// `insert()` 는 독촉 알림(결정 ⑥) 테스트를 위해 추가했습니다 — 어느 테이블에
// 뭐가 들어갔는지 `mockInsertedRows` 에 기록만 하고 항상 성공을 돌려줍니다.
jest.mock('../../lib/supabaseClient', () => {
  const makeQuery = (table: string): any => {
    const q: any = {
      select: () => q,
      order: () => q,
      eq: () => q,
      insert: (rows: any[]) => {
        mockInsertedRows.push({ table, rows });
        return Promise.resolve({ data: rows, error: null });
      },
      then: (resolve: any) => resolve({ data: mockBills, error: null }),
    };
    return q;
  };
  return { supabase: { from: (table: string) => makeQuery(table) } };
});

/** Tester 가 30,000원을 냈고 Mate 가 15,000원을 갚아야 하는 상태 */
function billWhereTesterPaid() {
  return {
    id: 'b1',
    title: 'TestBill',
    total_amount: 30000,
    split_count: 2,
    bank_name: '카카오뱅크',
    account_number: '1234567890',
    account_holder: 'Tester',
    creator_id: 'tester-id',
    room_id: 'room-1',
    created_at: '2026-08-02T00:00:00Z',
    dutch_pay_members: [
      { id: 'm1', bill_id: 'b1', profile_id: 'mate-id', name: 'Mate:15000', is_completed: false },
    ],
  };
}

/** Tester 가 만든 3명짜리 정산 — Mate 는 미입금, 세 번째 사람은 이미 입금 */
function billWithOnePaidOneUnpaid() {
  const bill = billWhereTesterPaid();
  return {
    ...bill,
    total_amount: 45000,
    split_count: 3,
    dutch_pay_members: [
      { id: 'm1', bill_id: 'b1', profile_id: 'mate-id', name: 'Mate:15000', is_completed: false },
      { id: 'm2', bill_id: 'b1', profile_id: 'third-id', name: 'Third:15000', is_completed: true },
    ],
  };
}

const participants = [
  { id: 'p1', profile_id: 'tester-id', name: 'Tester', avatar_color: '#000' },
  { id: 'p2', profile_id: 'mate-id', name: 'Mate', avatar_color: '#111' },
];

function profile(id: string, name: string) {
  return { id, name, personal_data: { bank_account: '카카오뱅크 1234567890' } };
}

async function renderAs(who: 'tester' | 'mate', bill: any = billWhereTesterPaid()) {
  mockBills = [bill];
  const globalProfile =
    who === 'tester' ? profile('tester-id', 'Tester') : profile('mate-id', 'Mate');

  return render(
    <DutchPay
      roomId="room-1"
      roomTitle="NotifTest"
      participants={participants as any}
      globalProfile={globalProfile as any}
      currentParticipant={participants[who === 'tester' ? 0 : 1] as any}
    />
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockInsertedRows = [];
});

describe('상계 현황의 계좌 표시 방향 (AJ-1)', () => {
  it('보내는 사람에게는 받을 사람의 계좌가 보인다', async () => {
    // Mate 가 Tester 에게 15,000원을 보내야 한다. Mate 는 Tester 의 계좌가 필요하다.
    const view = await renderAs('mate');

    expect(await view.findByText('1234567890')).toBeTruthy();
  });

  it('받는 사람에게는 자기 계좌를 다시 보여주지 않는다', async () => {
    // 예전 조건(`받을 사람이 나일 때`)이면 여기서 계좌가 떴다.
    const view = await renderAs('tester');

    // 상계 카드가 그려진 뒤에 확인해야 의미가 있다.
    expect(await view.findByText(/실시간 정산 상계 현황/)).toBeTruthy();
    expect(view.queryByText('1234567890')).toBeNull();
  });
});

describe('독촉 알림은 미입금자에게만 간다 (결정 ⑥, docs/UI/19)', () => {
  // 예전에는 notifications 에 대상을 지정할 컬럼이 없어 방 전원(이미 낸
  // 사람 포함)에게 갔다. target_profile_ids 에 미입금자만 담기는지 확인한다.
  // 버튼은 정산 생성자(creator_id)에게만 보이므로 Tester 로 렌더한다.
  //
  // "전원 입금 완료" 상태는 별도로 테스트하지 않는다 — `visibleBills` 필터
  // (DutchPay.tsx:96)가 그런 정산을 애초에 목록에서 빼므로, 카드 자체가
  // 안 그려져 이 경로로는 도달할 수 없다. `handleSendNotification` 안의
  // 빈 대상 가드는 그 필터가 뚫렸을 때를 위한 방어선이다.

  it('미입금자의 profile_id만 target_profile_ids 에 담아 보낸다', async () => {
    const view = await renderAs('tester', billWithOnePaidOneUnpaid());

    await fireEvent.press(view.getByText('TestBill')); // 카드를 펼친다
    await fireEvent.press(view.getByText('미입금자에게 독촉 알림 전송'));

    const notif = mockInsertedRows.find(r => r.table === 'notifications');
    expect(notif).toBeTruthy();
    expect(notif!.rows[0].target_profile_ids).toEqual(['mate-id']);
    expect(notif!.rows[0].target_profile_ids).not.toContain('third-id');
  });
});
