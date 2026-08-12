import { resolveRoomOwnerProfileId, getMeetingDateDisplay, formatRoomExpiry } from '../roomUtils';
import type { Participant, Room } from '../types';

/** 테스트에 필요한 필드만 채운 참여자 */
function participant(profileId: string | null, createdAt?: string): Participant {
  return {
    id: `p-${profileId ?? 'null'}-${createdAt ?? 'none'}`,
    room_id: 'room-1',
    profile_id: profileId,
    name: 'tester',
    avatar_color: '#000',
    personal_data: {},
    schedule: {},
    voted_items: [],
    created_at: createdAt,
  } as unknown as Participant;
}

describe('resolveRoomOwnerProfileId', () => {
  it('참여자가 없으면 null', () => {
    expect(resolveRoomOwnerProfileId([])).toBeNull();
  });

  it('가장 먼저 참여한 사람을 방장으로 본다', () => {
    const list = [
      participant('late', '2026-08-03T12:00:00Z'),
      participant('first', '2026-08-01T09:00:00Z'),
      participant('mid', '2026-08-02T10:00:00Z'),
    ];
    expect(resolveRoomOwnerProfileId(list)).toBe('first');
  });

  it('created_at 이 없는 행은 뒤로 밀어 방장이 되지 않게 한다', () => {
    // created_at 이 비어 있다고 해서 "제일 오래된 것"으로 취급하면
    // 데이터가 덜 채워진 행이 방장을 가로챈다.
    const list = [participant('nodate'), participant('dated', '2026-08-05T00:00:00Z')];
    expect(resolveRoomOwnerProfileId(list)).toBe('dated');
  });

  it('전원 created_at 이 없으면 첫 행을 쓴다', () => {
    const list = [participant('a'), participant('b')];
    expect(resolveRoomOwnerProfileId(list)).toBe('a');
  });

  it('profile_id 가 null 이면 null 을 반환한다', () => {
    expect(resolveRoomOwnerProfileId([participant(null, '2026-08-01T00:00:00Z')])).toBeNull();
  });

  it('입력 배열을 변경하지 않는다', () => {
    // 내부에서 sort 를 쓰므로 원본이 뒤섞이면 화면의 참여자 순서가 바뀐다.
    const list = [
      participant('b', '2026-08-02T00:00:00Z'),
      participant('a', '2026-08-01T00:00:00Z'),
    ];
    const before = list.map((p) => p.profile_id);
    resolveRoomOwnerProfileId(list);
    expect(list.map((p) => p.profile_id)).toEqual(before);
  });

  describe('roomOwnerId 가 있으면 참여 순서보다 우선한다 (라운드 AR)', () => {
    // rooms.owner_id 는 라운드 AL-5 부터 RLS 가 실제로 보는 값이다.
    // 참여 순서 판정과 어긋나면 "화면은 방장으로 보이는데 쓰기는 막히는"
    // 상태가 된다 — 방장 위임이 바로 이 부류로 무력화돼 있었다.
    it('participants 판정과 달라도 roomOwnerId 를 그대로 믿는다', () => {
      const list = [
        participant('first', '2026-08-01T00:00:00Z'),
        participant('later', '2026-08-02T00:00:00Z'),
      ];
      // 참여 순서로는 'first' 지만, 방장 위임으로 실제 owner_id 는 'later' 다.
      expect(resolveRoomOwnerProfileId(list, 'later')).toBe('later');
    });

    it('roomOwnerId 가 null/undefined 면 예전처럼 참여 순서로 대체한다', () => {
      const list = [
        participant('later', '2026-08-02T00:00:00Z'),
        participant('first', '2026-08-01T00:00:00Z'),
      ];
      expect(resolveRoomOwnerProfileId(list, null)).toBe('first');
      expect(resolveRoomOwnerProfileId(list, undefined)).toBe('first');
      expect(resolveRoomOwnerProfileId(list)).toBe('first');
    });
  });
});

function room(meetingDate: string, expiresAt: string): Room {
  return { meeting_date: meetingDate, expires_at: expiresAt } as unknown as Room;
}

describe('getMeetingDateDisplay', () => {
  it('필수 값이 없으면 빈 문자열', () => {
    expect(getMeetingDateDisplay({} as Room)).toBe('');
    expect(getMeetingDateDisplay(room('2026-08-03', ''))).toBe('');
  });

  it('하루짜리면 날짜만 그대로 돌려준다', () => {
    // 조율 기간 2일을 빼면 duration <= 1 이라 범위 표기를 붙이지 않는다.
    expect(getMeetingDateDisplay(room('2026-08-03', '2026-08-05T00:00:00Z')))
      .toBe('2026-08-03');
  });

  it('여러 날에 걸치면 시작~종료 범위를 만든다', () => {
    // expires_at - meeting_date = 5일, 조율 2일을 빼면 3일간
    const result = getMeetingDateDisplay(room('2026-08-03', '2026-08-08T00:00:00Z'));
    expect(result).toContain('2026-08-03 ~ ');
    expect(result).toContain('(3일간)');
  });

  it('잘못된 날짜여도 예외를 던지지 않는다', () => {
    // 화면 표시용 함수가 던지면 방 목록 전체가 안 그려진다.
    expect(() => getMeetingDateDisplay(room('not-a-date', 'also-bad'))).not.toThrow();
  });
});

describe('formatRoomExpiry', () => {
  it('"남음" 을 겹쳐 쓰지 않는다', () => {
    // 전에는 "23시간 57분 54초 남음 후 방이 사라져요." 로 나왔다
    expect(formatRoomExpiry('23시간 57분 54초 남음')).toBe('23시간 57분 54초 후 방이 사라져요.');
  });

  it('종료 상태는 그대로 둔다', () => {
    expect(formatRoomExpiry('폭파됨 💥')).toBe('폭파됨 💥');
  });

  it('빈 값이면 빈 문자열', () => {
    expect(formatRoomExpiry('')).toBe('');
  });
});
