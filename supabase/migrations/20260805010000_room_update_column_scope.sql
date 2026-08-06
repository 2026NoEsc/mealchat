-- 2026-08-05 라운드 AR — AL-5 의 부작용 수정 + 방장 위임을 실제로 동작하게 함.
--
-- 문제 (docs/UI/15 라운드 AR)
--   AL-5(20260804120000)가 `rooms` UPDATE 를 통째로 `owner_id = auth.uid()`
--   로 좁혔다. 의도는 "방 제목·장소·색상·확정 일정을 방장만 바꾸게" 였는데,
--   같은 테이블에 **협업 필드**(voting_items = 메뉴 투표 목록, memo 계열 =
--   약속 메모, ai_recommendations = AI 추천 캐시)도 같이 있다. 이것들은
--   원래 참여자 누구나 바꿀 수 있어야 하는데, 행 단위 RLS 라 컬럼을
--   구분하지 못해 전부 방장 전용이 돼 버렸다. 방장이 아닌 참여자가 메뉴를
--   제안하거나 메모를 고치면 **조용히 0행 갱신**된다(에러도 안 뜬다).
--
--   더 심각한 것 — "방장 위임" 기능(App.tsx handleTransferRoomOwnership)은
--   애초에 `rooms.owner_id` 를 바꾸지 않고 `participants.created_at` 을
--   조작해 "가장 먼저 참여한 사람 = 방장" 이라는 **옛 판정 로직**을
--   속이고 있었다. AL-5 이전에는 RLS 가 누구나 통과시켜서 문제가 안
--   보였는데, 지금은 RLS 가 진짜 owner_id 만 보므로 위임 후 새 "방장"은
--   화면에만 방장으로 보이고 실제 쓰기는 막힌다. 게다가 원래 방장은
--   위임 마지막 단계에서 방을 나가 버려서, 진짜 owner_id 를 쥔 사람이
--   참여자 목록에서도 사라진다 — 그 방은 사실상 아무도 못 고치게 된다.
--
-- 접근
--   1) RLS 는 다시 "방 멤버 전원"이 시도할 수 있게 좁힌다(행 단위로는 이게
--      한계다 — Postgres RLS 는 컬럼을 구분 못 한다).
--   2) 실제로 뭘 바꿀 수 있는지는 BEFORE UPDATE 트리거에서 컬럼 단위로
--      막는다: 방장이 아니면 "협업 필드"만 바꿀 수 있다. 방장이 아닌데
--      제목·장소·색상·확정 일정·소유권 등을 바꾸려 하면 트리거가
--      **에러를 던진다**(조용히 0행이 되지 않는다 — AL-5 파일이 원래
--      바랐던 "204를 성공으로 읽지 않는다"를 트리거가 대신 보장한다).
--   3) App.tsx 의 handleTransferRoomOwnership 은 이 마이그레이션과 같은
--      배포에서 rooms.owner_id 를 실제로 옮기도록 고친다(별도 커밋 없음,
--      코드는 워킹 트리에만 있다 — docs/UI 15 라운드 AR 참고).

-- ── 1. 행 단위: 방 멤버 전원이 시도할 수 있게 ────────────────────────────
drop policy if exists rooms_update_owner on public.rooms;
drop policy if exists rooms_update_member on public.rooms;
create policy rooms_update_member on public.rooms
  for update to authenticated
  using (public.is_room_member(id));

-- ── 2. 컬럼 단위: 방장이 아니면 협업 필드만 ──────────────────────────────
-- 협업 필드(누구나 가능): voting_items, memo, memo_visibility,
--   memo_author_id, ai_recommendations
-- 방장 전용: code, title, meeting_date, expires_at, owner_id, is_confirmed,
--   confirmed_slot, color, location_name, latitude, longitude
create or replace function public.enforce_room_update_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- old.owner_id 로 판정한다(new 가 아니다) — 소유권을 넘기는 행위 자체는
  -- "지금 방장인 사람"이 하는 것이지, "새 방장이 될 사람"이 하는 게 아니다.
  if old.owner_id = auth.uid() then
    return new;
  end if;

  if new.code           is distinct from old.code
     or new.title          is distinct from old.title
     or new.meeting_date   is distinct from old.meeting_date
     or new.expires_at     is distinct from old.expires_at
     or new.owner_id       is distinct from old.owner_id
     or new.is_confirmed   is distinct from old.is_confirmed
     or new.confirmed_slot is distinct from old.confirmed_slot
     or new.color          is distinct from old.color
     or new.location_name  is distinct from old.location_name
     or new.latitude       is distinct from old.latitude
     or new.longitude      is distinct from old.longitude
  then
    raise exception '방장만 이 정보를 수정할 수 있습니다.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_room_update_scope on public.rooms;
create trigger trg_enforce_room_update_scope
  before update on public.rooms
  for each row execute function public.enforce_room_update_scope();
