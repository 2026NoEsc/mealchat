import type { Room, Participant } from './types';

/**
 * App.tsx 와 화면 컴포넌트가 함께 쓰는 방 관련 순수 함수 모음.
 * App.tsx 를 화면 단위로 쪼개면서, 양쪽에서 필요한 계산을 여기로 모았습니다.
 */

/**
 * 방장 판별.
 *
 * `roomOwnerId`(= `rooms.owner_id`)를 주면 그대로 믿고 돌려줍니다. 이 함수가
 * 원래 owner 컬럼을 안 믿었던 이유는 "rooms.owner_id 가 null 인 옛 방이
 * 있었다"였는데, 라운드 AL-5 마이그레이션이 그 null 값을 전부 첫 참여자로
 * 메웠습니다 — 지금은 owner_id 를 안 믿을 이유가 없고, 오히려 **믿어야
 * 합니다.** 라운드 AL-5 부터 `rooms` 의 UPDATE 권한 자체가 `owner_id`
 * 하나만 보는 RLS 로 바뀌어서, 화면이 다른 기준(참여 순서)으로 "방장"을
 * 표시하면 화면과 실제 쓰기 권한이 어긋나기 시작합니다(라운드 AR 에서
 * 실제로 이 어긋남 때문에 방장 위임이 조용히 무력화된 걸 찾았습니다).
 *
 * `roomOwnerId` 가 없을 때만(옛 데이터 등 방어적 상황) **가장 먼저 참여한
 * 사람**으로 대체 판정합니다. created_at 이 없는 행은 뒤로 밀어 방장으로
 * 뽑히지 않게 합니다.
 */
export function resolveRoomOwnerProfileId(
  participants: Participant[],
  roomOwnerId?: string | null
): string | null {
  if (roomOwnerId) return roomOwnerId;

  if (participants.length === 0) return null;
  const sorted = [...participants].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : Infinity;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : Infinity;
    return aTime - bTime;
  });
  return sorted[0]?.profile_id || null;
}

/**
 * 방의 약속 기간 표시 문구.
 *
 * expires_at 과 meeting_date 의 간격에서 2일(조율 기간)을 빼 실제 일정 길이를
 * 구합니다. 여러 날짜에 걸친 약속이면 시작~종료 범위를, 하루짜리면
 * meeting_date 를 그대로 돌려줍니다.
 *
 * App.tsx 에 있던 구현을 그대로 옮겼습니다.
 */
export function getMeetingDateDisplay(room: Room): string {
  if (!room.meeting_date || !room.expires_at) return '';
  try {
    const diffTime = new Date(room.expires_at).getTime() - new Date(room.meeting_date).getTime();
    const diffDays = Math.round(diffTime / (24 * 60 * 60 * 1000));
    const duration = diffDays - 2;
    if (duration > 1) {
      const end = new Date(
        new Date(room.meeting_date).getTime() + (duration - 1) * 24 * 60 * 60 * 1000
      );
      const endStr = end.toISOString().split('T')[0];
      return `${room.meeting_date} ~ ${endStr} (${duration}일간)`;
    }
  } catch (e) {
    console.error(e);
  }
  return room.meeting_date;
}
