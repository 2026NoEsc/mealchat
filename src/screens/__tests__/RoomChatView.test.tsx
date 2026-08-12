import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RoomChatView, { withDateDividers } from '../RoomChatView';
import type { Message } from '../../lib/types';

/**
 * 컨텍스트를 그대로 쓰면 Provider → supabaseClient → AsyncStorage 까지 끌려옵니다.
 * 훅 단위로 끊습니다.
 *
 * ⚠️ RTL 14 의 `render`/`fireEvent` 는 Promise 를 돌려줍니다 — `await` 필수.
 */

const mockUseAuth = jest.fn();
const mockUseNavigation = jest.fn();
const mockUseRoom = jest.fn();
const mockUseRoomTimer = jest.fn();

jest.mock('../../contexts', () => ({
  useAuth: () => mockUseAuth(),
  useNavigation: () => mockUseNavigation(),
  useRoom: () => mockUseRoom(),
  useRoomTimer: () => mockUseRoomTimer(),
}));

const makeMessage = (over: Partial<Message> = {}): Message => ({
  id: 'm1',
  room_id: 'r1',
  sender_id: 'mate',
  sender_name: '또리',
  sender_color: '#04CDA3',
  message: '다들 수요일 점심 괜찮아요?',
  created_at: '2026-08-12T11:02:00',
  ...over,
});

describe('withDateDividers', () => {
  it('날짜가 바뀌는 첫 메시지에만 라벨을 붙인다', () => {
    const rows = withDateDividers([
      makeMessage({ id: 'a', created_at: '2026-08-12T11:02:00' }),
      makeMessage({ id: 'b', created_at: '2026-08-12T15:00:00' }),
      makeMessage({ id: 'c', created_at: '2026-08-13T09:00:00' }),
    ]);
    expect(rows.map(r => r.dayLabel !== null)).toEqual([true, false, true]);
  });

  it('빈 목록은 빈 결과', () => {
    expect(withDateDividers([])).toEqual([]);
  });
});

const handlers = {
  onSendMessage: jest.fn(),
  onSendEmoticon: jest.fn(),
  onViewProfile: jest.fn(),
  onExitRoom: jest.fn(),
  onTouchStart: jest.fn(),
  onTouchEnd: jest.fn(),
};

const setRoomOverlay = jest.fn();
const setRoomSubTab = jest.fn();
const setShowRoomInfoModal = jest.fn();

const setup = async (over: { messages?: Message[]; isOneDayRoom?: boolean; confirmed?: boolean } = {}) => {
  mockUseAuth.mockReturnValue({ globalProfile: { id: 'me' } });
  mockUseNavigation.mockReturnValue({ setShowRoomInfoModal });
  mockUseRoomTimer.mockReturnValue({ timeLeft: '11:47:22' });
  mockUseRoom.mockReturnValue({
    currentRoom: {
      id: 'r1',
      title: '오늘 점심팟',
      color: '#FF9900',
      is_confirmed: over.confirmed ?? true,
      confirmed_slot: '8월 15일 (금) 18:30',
      location_name: '조선칼국수 하단점',
    },
    participants: [{ id: 'p1' }, { id: 'p2' }],
    roomMessages: over.messages ?? [makeMessage()],
    newMessageText: '',
    showEmoticonPicker: false,
    setNewMessageText: jest.fn(),
    setShowEmoticonPicker: jest.fn(),
    setRoomOverlay,
    setRoomSubTab,
  });

  return render(<RoomChatView {...handlers} isOneDayRoom={over.isOneDayRoom ?? true} />);
};

describe('RoomChatView', () => {
  beforeEach(() => jest.clearAllMocks());

  it('헤더 / 확정 배너 / 메시지를 그린다', async () => {
    const { findByText } = await setup();
    expect(await findByText('오늘 점심팟')).toBeTruthy();
    expect(await findByText('11:47:22 후 방이 사라져요.')).toBeTruthy();
    expect(await findByText('8월 15일 (금) 18:30  ·  조선칼국수 하단점')).toBeTruthy();
    expect(await findByText('다들 수요일 점심 괜찮아요?')).toBeTruthy();
  });

  it('확정 전에는 조율을 유도하는 문구를 보여준다', async () => {
    const { findByText } = await setup({ confirmed: false });
    expect(await findByText('아직 일정이 확정되지 않았어요 — 일정을 조율해 주세요')).toBeTruthy();
  });

  it('메시지가 없으면 빈 상태 문구를 보여준다', async () => {
    const { findByText } = await setup({ messages: [] });
    expect(await findByText(/인사를 나눠보세요/)).toBeTruthy();
  });

  it('하단 패널 버튼 4개가 각자의 진입점을 연다', async () => {
    const { findByText } = await setup();

    await fireEvent.press(await findByText('일정 조율'));
    expect(setRoomOverlay).toHaveBeenCalledWith('schedule');

    await fireEvent.press(await findByText('메뉴 정하기'));
    expect(setRoomSubTab).toHaveBeenCalledWith('menu');

    await fireEvent.press(await findByText('N빵 정산'));
    expect(setRoomOverlay).toHaveBeenCalledWith('dutch');

    await fireEvent.press(await findByText('멤버'));
    expect(setShowRoomInfoModal).toHaveBeenCalledWith(true);
  });

  it('하루짜리 방이 아니면 일정 조율 버튼을 숨긴다', async () => {
    const { queryByText } = await setup({ isOneDayRoom: false });
    expect(queryByText('일정 조율')).toBeNull();
    expect(queryByText('N빵 정산')).toBeTruthy();
  });

  it('제목을 누르면 방 상세정보가 열린다', async () => {
    const { findByText } = await setup();
    await fireEvent.press(await findByText('오늘 점심팟'));
    expect(setShowRoomInfoModal).toHaveBeenCalledWith(true);
  });
});
