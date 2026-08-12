import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RoomMemberSheet from '../RoomMemberSheet';

/** ⚠️ RTL 14 의 `render`/`fireEvent` 는 Promise 를 돌려줍니다 — `await` 필수. */

const mockUseAuth = jest.fn();
const mockUseRoom = jest.fn();

jest.mock('../../contexts', () => ({
  useAuth: () => mockUseAuth(),
  useRoom: () => mockUseRoom(),
}));

const participant = (id: string, name: string, profileId: string) => ({
  id,
  room_id: 'r1',
  profile_id: profileId,
  name,
  avatar_color: '#FF9900',
  personal_data: {},
  schedule: {},
  created_at: '2026-08-01T00:00:00',
});

const handlers = { onClose: jest.fn(), onInvite: jest.fn(), onViewProfile: jest.fn() };

const setup = async () => {
  mockUseAuth.mockReturnValue({ globalProfile: { id: 'host' } });
  mockUseRoom.mockReturnValue({
    currentRoom: { id: 'r1', code: 'VF4HLD', owner_id: 'host' },
    participants: [participant('p1', '모아', 'host'), participant('p2', '두두', 'mate')],
  });
  return render(<RoomMemberSheet {...handlers} />);
};

describe('RoomMemberSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('제목 / 멤버 수 + 초대코드 / 역할을 보여준다', async () => {
    const { findByText } = await setup();
    expect(await findByText('참여 멤버')).toBeTruthy();
    expect(await findByText('멤버 2명 · 초대코드 VF4HLD')).toBeTruthy();
    expect(await findByText('방장')).toBeTruthy();
    expect(await findByText('메이트')).toBeTruthy();
  });

  it('내 행에는 (나) 를 붙인다', async () => {
    const { findByText } = await setup();
    expect(await findByText('모아(나)')).toBeTruthy();
    expect(await findByText('두두')).toBeTruthy();
  });

  it('멤버를 누르면 프로필을 연다', async () => {
    const { findByText } = await setup();
    await fireEvent.press(await findByText('두두'));
    expect(handlers.onViewProfile).toHaveBeenCalledWith('mate');
  });

  it('초대 버튼과 닫기가 연결돼 있다', async () => {
    const { findByText, findByLabelText } = await setup();
    await fireEvent.press(await findByText('+ 메이트 초대'));
    expect(handlers.onInvite).toHaveBeenCalled();

    await fireEvent.press(await findByLabelText('참여 멤버 닫기'));
    expect(handlers.onClose).toHaveBeenCalled();
  });
});
