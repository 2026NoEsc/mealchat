import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RoomInfoModal from '../RoomInfoModal';

/**
 * `useRoom`/`useAuth` 등을 그대로 쓰면 Provider → supabaseClient →
 * AsyncStorage(네이티브 모듈)까지 끌려옵니다. 훅 단위로 끊습니다.
 *
 * ⚠️ RTL 14 의 `render`/`fireEvent` 는 Promise 를 돌려줍니다 — `await` 필수.
 */

const mockUseAuth = jest.fn();
const mockUseRoom = jest.fn();
const mockUseNavigation = jest.fn();
const mockUseRoomEditing = jest.fn();
const mockUseRoomTimer = jest.fn();

jest.mock('../../contexts', () => ({
  useAuth: () => mockUseAuth(),
  useRoom: () => mockUseRoom(),
  useNavigation: () => mockUseNavigation(),
  useRoomEditing: () => mockUseRoomEditing(),
  useRoomTimer: () => mockUseRoomTimer(),
}));

const makeParticipant = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  room_id: 'r1',
  profile_id: 'host',
  name: '모아',
  avatar_color: '#FF9900',
  personal_data: {},
  schedule: {},
  created_at: '2026-08-01T00:00:00',
  ...over,
});

const noopHandlers = {
  onUpdateRoomTitle: jest.fn(),
  onUpdateRoomLocation: jest.fn(),
  onSearchLocation: jest.fn(),
  onSelectLocation: jest.fn(),
  onChangeRoomColor: jest.fn(),
  onKickParticipant: jest.fn(),
  onShareRoom: jest.fn(),
  onViewProfile: jest.fn(),
  onLeaveRoom: jest.fn(),
};

const setup = async (over: { viewerId?: string; participants?: any[] } = {}) => {
  mockUseAuth.mockReturnValue({ globalProfile: { id: over.viewerId ?? 'host' } });
  mockUseRoom.mockReturnValue({
    currentRoom: {
      id: 'r1',
      code: 'VF4HLD',
      title: '오늘 점심팟',
      meeting_date: '2026-08-15T18:30:00',
      expires_at: '2026-08-16T00:00:00',
      owner_id: 'host',
      created_at: '2026-08-01T00:00:00',
      location_name: '조선칼국수 하단점',
      latitude: 35.1,
      longitude: 128.97,
    },
    participants: over.participants ?? [
      makeParticipant(),
      makeParticipant({ id: 'p2', profile_id: 'mate', name: '두두' }),
    ],
    participantsLoading: false,
  });
  mockUseNavigation.mockReturnValue({ showRoomInfoModal: true, setShowRoomInfoModal: jest.fn() });
  mockUseRoomTimer.mockReturnValue({ timeLeft: '11:47:22' });
  mockUseRoomEditing.mockReturnValue({
    isEditingRoomTitle: false,
    editingRoomTitle: '오늘 점심팟',
    isEditingRoomLocation: false,
    editingRoomLocationName: '조선칼국수 하단점',
    locationSearchResults: [],
    showLocationResults: false,
    setIsEditingRoomTitle: jest.fn(),
    setEditingRoomTitle: jest.fn(),
    setIsEditingRoomLocation: jest.fn(),
    setEditingRoomLocationName: jest.fn(),
    setEditingRoomLatitude: jest.fn(),
    setEditingRoomLongitude: jest.fn(),
    setShowLocationResults: jest.fn(),
  });

  return render(<RoomInfoModal {...noopHandlers} />);
};

describe('RoomInfoModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('초대 코드 / 장소 / 멤버 수 / 남은 시간을 보여준다', async () => {
    const { findByText } = await setup();
    expect(await findByText('방 상세정보')).toBeTruthy();
    expect(await findByText('VF4HLD')).toBeTruthy();
    expect(await findByText('조선칼국수 하단점')).toBeTruthy();
    expect(await findByText('멤버 2명')).toBeTruthy();
    expect(await findByText('11:47:22 후 방이 사라져요.')).toBeTruthy();
  });

  it('방장과 메이트를 구분해 표시한다', async () => {
    const { findByText } = await setup();
    expect(await findByText('방장')).toBeTruthy();
    expect(await findByText('메이트')).toBeTruthy();
  });

  it('방장에게만 추방 버튼이 보인다', async () => {
    const asHost = await setup({ viewerId: 'host' });
    expect(await asHost.findByText('추방')).toBeTruthy();

    const asMate = await setup({ viewerId: 'mate' });
    expect(asMate.queryByText('추방')).toBeNull();
  });

  it('방 나가기를 누르면 onLeaveRoom 이 불린다', async () => {
    const { findByText } = await setup();
    await fireEvent.press(await findByText('방 나가기'));
    expect(noopHandlers.onLeaveRoom).toHaveBeenCalled();
  });

  it('공유를 누르면 onShareRoom 이 불린다', async () => {
    const { findByText } = await setup();
    await fireEvent.press(await findByText('공유'));
    expect(noopHandlers.onShareRoom).toHaveBeenCalled();
  });
});
