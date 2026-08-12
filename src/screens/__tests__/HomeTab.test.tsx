import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HomeTab, buildUpcomingSchedules } from '../HomeTab';
import type { Room } from '../../lib/types';

/**
 * ⚠️ RTL 14 의 `render`/`fireEvent` 는 Promise 를 돌려줍니다 — `await` 하지 않으면
 * `findByText is not a function` 로 전부 실패합니다. 모든 it 이 async 인 이유입니다.
 */

const makeRoom = (over: Partial<Room>): Room => ({
  id: 'r1',
  code: 'ABC123',
  title: '오늘 점심팟',
  meeting_date: '2026-08-13T12:00:00.000Z',
  expires_at: '2026-08-14T12:00:00.000Z',
  owner_id: 'u1',
  created_at: '2026-08-01T00:00:00.000Z',
  ...over,
});

describe('buildUpcomingSchedules', () => {
  const now = new Date(2026, 7, 13, 9, 0, 0); // 2026-08-13 09:00 로컬

  it('오늘 약속은 "오늘" 배지를 단다', () => {
    const [item] = buildUpcomingSchedules([makeRoom({ meeting_date: '2026-08-13T12:00:00' })], now);
    expect(item.badgeLabel).toBe('오늘');
    expect(item.isToday).toBe(true);
  });

  it('미래 약속은 D-n 배지를 단다', () => {
    const [item] = buildUpcomingSchedules([makeRoom({ meeting_date: '2026-08-21T18:00:00' })], now);
    expect(item.badgeLabel).toBe('D-8');
  });

  it('지난 약속은 제외하고 날짜순 3개까지만 남긴다', () => {
    const items = buildUpcomingSchedules(
      [
        makeRoom({ id: 'past', meeting_date: '2026-08-01T12:00:00' }),
        makeRoom({ id: 'd4', meeting_date: '2026-08-17T12:00:00' }),
        makeRoom({ id: 'd1', meeting_date: '2026-08-14T12:00:00' }),
        makeRoom({ id: 'd8', meeting_date: '2026-08-21T12:00:00' }),
        makeRoom({ id: 'd20', meeting_date: '2026-09-02T12:00:00' }),
      ],
      now
    );
    expect(items.map(i => i.id)).toEqual(['d1', 'd4', 'd8']);
  });

  it('장소가 없으면 "장소 미정" 으로 채운다', () => {
    const [withPlace] = buildUpcomingSchedules(
      [makeRoom({ meeting_date: '2026-08-13T12:00:00', location_name: '버거킹 하단점' })],
      now
    );
    const [withoutPlace] = buildUpcomingSchedules([makeRoom({ meeting_date: '2026-08-13T12:00:00' })], now);
    expect(withPlace.metaLabel).toContain('버거킹 하단점');
    expect(withoutPlace.metaLabel).toContain('장소 미정');
  });
});

describe('HomeTab', () => {
  const baseProps = {
    userName: '모아',
    rooms: [] as Room[],
    unsettledCount: 0,
    onCreateSchedule: jest.fn(),
    onSelectSchedule: jest.fn(),
    onViewSettlements: jest.fn(),
  };

  it('인사말과 일정잡기 CTA 를 그린다', async () => {
    const { findByText } = await render(<HomeTab {...baseProps} />);
    expect(await findByText('안녕하세요, 모아님!')).toBeTruthy();
    expect(await findByText('다가올 일정')).toBeTruthy();
    expect(await findByText('일정잡기')).toBeTruthy();
  });

  it('일정이 없으면 빈 상태 문구를 보여준다', async () => {
    const { findByText } = await render(<HomeTab {...baseProps} />);
    expect(await findByText('아직 잡힌 일정이 없어요')).toBeTruthy();
  });

  it('일정잡기를 누르면 onCreateSchedule 이 불린다', async () => {
    const onCreateSchedule = jest.fn();
    const { findByText } = await render(<HomeTab {...baseProps} onCreateSchedule={onCreateSchedule} />);
    await fireEvent.press(await findByText('일정잡기'));
    expect(onCreateSchedule).toHaveBeenCalled();
  });

  it('미완료 정산이 있을 때만 PayNudge 를 그린다', async () => {
    const hidden = await render(<HomeTab {...baseProps} />);
    expect(hidden.queryByText(/미완료 정산/)).toBeNull();

    const { findByText } = await render(<HomeTab {...baseProps} unsettledCount={2} />);
    expect(await findByText('미완료 정산 2건')).toBeTruthy();
  });

  it('PayNudge 를 누르면 onViewSettlements 가 불린다', async () => {
    const onViewSettlements = jest.fn();
    const { findByText } = await render(
      <HomeTab {...baseProps} unsettledCount={1} onViewSettlements={onViewSettlements} />
    );
    await fireEvent.press(await findByText('미완료 정산 1건'));
    expect(onViewSettlements).toHaveBeenCalled();
  });

  it('배너가 없으면 프로모션 영역을 그리지 않는다', async () => {
    const withoutPromo = await render(<HomeTab {...baseProps} />);
    expect(withoutPromo.queryByText('1 / 1')).toBeNull();

    const { findByText } = await render(
      <HomeTab {...baseProps} promos={[{ id: 'p1', imageUrl: 'https://example.com/p1.png' }]} />
    );
    expect(await findByText('1 / 1')).toBeTruthy();
  });
});
