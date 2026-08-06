-- RLS 쓰기 정책 강화
--
-- 감사 결과 아래 네 정책이 `with check (true)` 였습니다. INSERT 는 USING 절을
-- 보지 않고 WITH CHECK 만 평가하므로, 사실상 **아무 제약이 없는 상태**였습니다.
--
--   participants_insert_self   아무 방에나 아무 profile_id 로 참여자 행 생성 가능
--   follows_insert             남이 나를 팔로우한 것처럼 위조 가능 (실증됨)
--   rooms_insert               owner_id 를 남의 것으로 지정 가능
--   dutch_pay_members_write    남에게 정산 의무 행을 붙일 수 있음
--
-- follows 위조는 계정 B 로 실제 성공을 확인했습니다 (확인 후 삭제).
--
--   POST /rest/v1/follows {follower_id: <Tester>, following_id: <Mate>}
--   → 201 Created
--
-- ⚠️ 선행 조건: 앱이 방 생성 시 owner_id 를 채워야 합니다.
--    예전에는 한 번도 채우지 않아 owner_id 가 늘 null 이었습니다.
--    같은 배포에 포함된 App.tsx 수정이 이를 처리합니다.

-- ── 1. participants ───────────────────────────────────────────────────────
-- 원래 주석: "초대 기능이 남을 대신 등록하므로 profile_id = auth.uid() 로 못 좁힘"
-- 맞는 지적이지만, 그렇다고 무제한으로 열 이유는 없습니다.
-- 허용 조건을 세 가지로 명시합니다.
--
--   ① 내가 나를 등록          (초대코드로 입장)
--   ② 이미 그 방의 멤버        (내가 속한 방에 친구 초대)
--   ③ 내가 그 방의 방장        (방 생성 직후 — 아직 참여자가 없어 ②가 false)
--
-- ③이 필요한 이유: 방 생성은 rooms INSERT 직후 participants 를 한 번에 넣는데,
-- is_room_member 는 stable 함수라 같은 문장에서 삽입된 행을 보지 못합니다.
drop policy if exists participants_insert_self on public.participants;
create policy participants_insert_self on public.participants
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    or public.is_room_member(room_id)
    or exists (
      select 1 from public.rooms r
      where r.id = room_id and r.owner_id = auth.uid()
    )
  );

-- ── 2. follows ────────────────────────────────────────────────────────────
-- 앱은 항상 follower_id = 본인으로 넣습니다. 좁혀도 기능 영향이 없습니다.
drop policy if exists follows_insert on public.follows;
create policy follows_insert on public.follows
  for insert to authenticated
  with check (follower_id = auth.uid());

-- ── 3. rooms ──────────────────────────────────────────────────────────────
-- 방을 만드는 것 자체는 누구나 할 수 있어야 하지만, 방장은 본인이어야 합니다.
-- owner_id 가 null 인 것도 허용합니다 — 이 마이그레이션 이전 버전의 앱이
-- 아직 돌고 있을 수 있고, 그 경우 방 생성이 통째로 막히면 안 됩니다.
drop policy if exists rooms_insert on public.rooms;
create policy rooms_insert on public.rooms
  for insert to authenticated
  with check (owner_id = auth.uid() or owner_id is null);

-- ── 4. dutch_pay_members ──────────────────────────────────────────────────
-- for all 정책의 with check (true) 는 INSERT 를 무방비로 만듭니다.
-- using 절과 같은 조건을 check 에도 겁니다.
drop policy if exists dutch_pay_members_write on public.dutch_pay_members;
create policy dutch_pay_members_write on public.dutch_pay_members
  for all to authenticated
  using (
    profile_id = auth.uid()
    or public.is_bill_creator(bill_id)
  )
  with check (
    profile_id = auth.uid()
    or public.is_bill_creator(bill_id)
  );

-- ── 참고: 아직 열려 있는 것 ───────────────────────────────────────────────
-- profiles_select / rooms_select / participants_select 는 여전히 using (true) 입니다.
-- 이건 읽기 노출 문제이며, 앱의 조회 코드(11곳)를 함께 바꿔야 해서
-- 이 마이그레이션에 넣지 않았습니다. 상세는 docs/UI/15-수정-내역.md 라운드 Q 참고.
