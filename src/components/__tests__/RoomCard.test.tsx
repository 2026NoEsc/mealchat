import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  RoomCard,
  getRoomStatus,
  getExpiryUrgency,
  getRoomMetaLabel,
  getActivityLabel,
} from '../RoomCard';
import type { Room } from '../../lib/types';

/**
 * ⚠️ RTL 14 의 `render`/`fireEvent` 는 Promise 를 돌려줍니다 — `await` 하지 않으면
 * `findByText is not a function` 로 전부 실패합니다.
 */

const now = new Date(2026, 7, 13, 9, 0, 0); // 2026-08-13 09:00 로컬

const makeRoom = (over: Partial<Room> = {}): Room => ({
  id: 'r1',
  code: 'ABC123',
  title: '오늘 점심팟',
  meeting_date: '2026-08-21T18:00:00',
  // 기본값은 넉넉히 남겨 두어 만료 임박 분기를 건드리지 않는다
  expires_at: '2026-09-30T00:00:00',
  owner_id: 'u1',
  created_at: '2026-08-01T00:00:00',
  ...over,
});

describe('getRoomStatus', () => {
  it('확정된 방은 confirmed', () => {
    expect(getRoomStatus(makeRoom({ is_confirmed: true }))).toBe('confirmed');
  });

  it('날짜가 아직 없으면 recruiting', () => {
    expect(getRoomStatus(makeRoom({ meeting_date: '' }))).toBe('recruiting');
  });

  it('날짜는 있고 확정 전이면 inProgress', () => {
    expect(getRoomStatus(makeRoom())).toBe('inProgress');
  });
});

describe('getExpiryUrgency', () => {
  it('24시간 이상 남았으면 표시하지 않는다', () => {
    expect(getExpiryUrgency(makeRoom({ expires_at: '2026-08-16T09:00:00' }), now)).toBeNull();
  });

  it('24시간 미만이면 남은 시간을 알려준다', () => {
    expect(getExpiryUrgency(makeRoom({ expires_at: '2026-08-13T21:00:00' }), now)).toBe('12시간 남음');
  });

  it('1시간 미만이면 분 단위로 알려준다', () => {
    expect(getExpiryUrgency(makeRoom({ expires_at: '2026-08-13T09:30:00' }), now)).toBe('30분 남음');
  });

  it('이미 만료됐으면 표시하지 않는다', () => {
    expect(getExpiryUrgency(makeRoom({ expires_at: '2026-08-12T09:00:00' }), now)).toBeNull();
  });
});

describe('getRoomMetaLabel', () => {
  it('만료 임박이 무엇보다 먼저다', () => {
    const meta = getRoomMetaLabel(
      makeRoom({ is_confirmed: true, expires_at: '2026-08-13T21:00:00' }),
      now
    );
    expect(meta).toEqual({ text: '12시간 남음', urgent: true });
  });

  it('확정된 방은 약속 날짜를 보여준다', () => {
    expect(getRoomMetaLabel(makeRoom({ is_confirmed: true }), now)).toEqual({
      text: '8월 21일',
      urgent: false,
    });
  });

  it('확정 전이면 장소를, 장소도 없으면 "장소 미정"', () => {
    expect(getRoomMetaLabel(makeRoom({ location_name: '버거킹 하단점' }), now).text).toBe('버거킹 하단점');
    expect(getRoomMetaLabel(makeRoom(), now).text).toBe('장소 미정');
  });
});

describe('getActivityLabel', () => {
  it('어제와 그 이전을 구분한다', () => {
    expect(getActivityLabel('2026-08-12T22:00:00', now)).toBe('어제');
    expect(getActivityLabel('2026-08-11T22:00:00', now)).toBe('2일 전');
  });

  it('값이 없으면 빈 문자열', () => {
    expect(getActivityLabel(undefined, now)).toBe('');
  });
});

describe('RoomCard', () => {
  it('제목 / 상태 칩 / 마지막 메시지를 그린다', async () => {
    const { findByText } = await render(
      <RoomCard room={makeRoom()} unreadCount={0} lastMessage="아 언제 나옴" onPress={() => {}} />
    );
    expect(await findByText('오늘 점심팟')).toBeTruthy();
    expect(await findByText('진행중')).toBeTruthy();
    expect(await findByText('아 언제 나옴')).toBeTruthy();
  });

  it('미읽음이 있을 때만 배지를 그린다', async () => {
    const withoutBadge = await render(<RoomCard room={makeRoom()} unreadCount={0} onPress={() => {}} />);
    expect(withoutBadge.queryByText('3')).toBeNull();

    const { findByText } = await render(<RoomCard room={makeRoom()} unreadCount={3} onPress={() => {}} />);
    expect(await findByText('3')).toBeTruthy();
  });

  it('멤버가 3명을 넘으면 +N 으로 접는다', async () => {
    const members = ['모아', '또리', '두두', '웰링'].map((name, i) => ({
      id: `m${i}`,
      name,
      avatarColor: '#FF9900',
    }));
    const { findByText } = await render(
      <RoomCard room={makeRoom()} unreadCount={0} members={members} onPress={() => {}} />
    );
    expect(await findByText('+1 · 장소 미정')).toBeTruthy();
  });

  it('이모티콘 메시지는 원문 대신 이름으로 보여준다', async () => {
    // 에뮬레이터에서 카드에 '[emoticon:welling_thumbs]' 가 그대로 새어 나왔다
    const { findByText, queryByText } = await render(
      <RoomCard
        room={makeRoom()}
        unreadCount={0}
        lastMessage="[emoticon:welling_thumbs]"
        onPress={() => {}}
      />
    );
    expect(await findByText('최고웰링 이모티콘')).toBeTruthy();
    expect(queryByText('[emoticon:welling_thumbs]')).toBeNull();
  });

  it('카드를 누르면 onPress 가 불린다', async () => {
    const onPress = jest.fn();
    const { findByText } = await render(<RoomCard room={makeRoom()} unreadCount={0} onPress={onPress} />);
    await fireEvent.press(await findByText('오늘 점심팟'));
    expect(onPress).toHaveBeenCalled();
  });
});
