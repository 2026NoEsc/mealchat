-- 초대코드 노출 차단
--
-- 문제
--   rooms_select 가 `using (true)` 라 로그인한 누구나 **모든 방의 초대코드**를
--   읽을 수 있었다. 코드는 6자리이고, 코드를 알면 그 방에 들어갈 수 있다.
--   즉 초대라는 개념이 사실상 없는 상태였다.
--
-- 왜 단순히 좁힐 수 없나
--   초대코드로 입장하려면 **멤버가 되기 전에** 방을 조회해야 한다.
--   rooms_select 를 멤버 전용으로 바꾸면 입장 자체가 불가능해진다.
--
-- 접근
--   코드 조회만 security definer 함수로 빼서 RLS 를 우회시키고,
--   테이블 직접 조회는 멤버·방장으로 좁힌다.
--   함수는 "코드를 정확히 아는 사람"에게만 그 방 하나를 돌려준다.
--   목록을 훑거나 다른 방을 얻을 수는 없다.

-- ── 1. 코드로 방 하나만 조회 ──────────────────────────────────────────────
create or replace function public.get_room_by_code(p_code text)
returns setof public.rooms
language sql
stable
security definer
set search_path = public
as $$
  select r.*
    from public.rooms r
   where r.code = upper(trim(p_code))
     -- 만료된 방은 돌려주지 않는다. 앱도 따로 검사하지만,
     -- 만료 방의 존재 여부까지 알려줄 이유가 없다.
     and r.expires_at > now()
   limit 1;
$$;

revoke all on function public.get_room_by_code(text) from public;
grant execute on function public.get_room_by_code(text) to authenticated;

-- ── 2. rooms 직접 조회는 멤버·방장만 ──────────────────────────────────────
-- owner_id 절이 필요한 이유: 방 생성 직후 creator 는 아직 participants 에 없다.
-- PostgREST 의 `Prefer: return=representation` 은 INSERT 후 SELECT 정책을
-- 적용하므로, 이 절이 없으면 방을 만들고도 결과를 못 받는다.
drop policy if exists rooms_select on public.rooms;
drop policy if exists rooms_select_member on public.rooms;
create policy rooms_select_member on public.rooms
  for select to authenticated
  using (
    public.is_room_member(id)
    or owner_id = auth.uid()
  );

-- ⚠️ 구버전 데이터 주의
--    owner_id 는 라운드 Q 이전에 만들어진 방에서 null 이다. 그 방들은
--    참여자만 볼 수 있다. 방장이 방을 나가 participants 에서 빠지면
--    본인도 못 보게 되지만, 그건 원래 나간 것이므로 문제가 아니다.
