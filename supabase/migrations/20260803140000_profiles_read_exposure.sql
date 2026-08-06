-- 개인정보 읽기 노출 차단
--
-- 문제 (라운드 Q 감사에서 실증)
--   profiles_select 가 `using (true)` 라 로그인한 누구나 모든 프로필을 읽었다.
--   계정 B 로 조회한 실제 응답:
--
--     "privacy_settings": { "bank_account": "private" }
--     "personal_data":    { "bank_account": "카카오뱅크 1234567890",
--                           "birthdate": "20000101", ... }
--     "start_latitude": 37.5665, "start_longitude": 126.978
--
--   **사용자가 private 로 지정한 계좌번호가 그대로 읽힌다.**
--   privacy_settings 는 앱 화면(isFieldVisible)에서만 필터링하고 DB 는 막지 않았다.
--   출발지 좌표는 사람의 집·회사 위치다.
--
-- 접근
--   profiles 를 본인 행으로 좁히고, 남에게 보여줄 것만 담은 뷰를 따로 둔다.
--   컬럼 단위 REVOKE 는 앱이 쓰는 select('*') 를 통째로 깨뜨려 쓸 수 없다.
--
-- ⚠️ 앱의 조회 코드를 함께 바꿔야 한다. 절반만 적용하면 메이트 검색·프로필 모달·
--    참여자 목록이 조용히 빈 화면이 된다. 같은 배포에 포함된 App.tsx /
--    ProfileSetup.tsx / ScheduleGrid.tsx 수정이 이를 처리한다.

-- ── 1. 공개 여부 판정 ─────────────────────────────────────────────────────
-- 앱의 isFieldVisible 과 같은 규칙을 DB 에서도 적용한다.
-- 화면에서만 걸러서는 안 된다 — 앱을 거치지 않으면 그대로 보인다.
create or replace function public.pd_visible(
  target_profile uuid,
  settings jsonb,
  field text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when settings is null then true                    -- 설정 없으면 공개 (앱 기본값과 동일)
    when target_profile = auth.uid() then true         -- 내 프로필은 전부 보임
    when settings ->> field = 'public' then true
    when settings ->> field = 'private' then false
    when settings ->> field = 'best' then exists (
      -- 보는 사람이 이 프로필을 'leader'(친한 친구)로 팔로우한 경우만
      select 1 from public.follows f
      where f.follower_id = auth.uid()
        and f.following_id = target_profile
        and f.role = 'leader'
    )
    else true                                          -- 미지정 값은 공개 취급
  end;
$$;

-- ── 2. 공개 프로필 뷰 ─────────────────────────────────────────────────────
-- security_invoker = off (기본값)로 두어 뷰가 소유자 권한으로 읽는다.
-- 그래야 아래에서 profiles 를 본인 행으로 좁혀도 메이트 검색이 동작한다.
-- 행은 열되 **컬럼을 뷰 정의에서 제한**하는 방식이다.
create or replace view public.profiles_public
with (security_invoker = off) as
select
  p.id,
  p.name,
  p.tag,
  p.avatar_color,
  p.avatar_url,
  -- 바쁜 시간대는 이 앱의 목적 자체(일정 조율)라 공개한다.
  p.schedule,
  p.created_at,
  p.privacy_settings,
  -- personal_data 에서 민감 항목을 privacy_settings 에 따라 제거한다.
  -- jsonb 의 `-` 연산자는 키를 지운다. 빈 문자열 키는 존재하지 않으므로
  -- '' 를 빼면 아무 일도 일어나지 않는다(= 공개 유지).
  (
    p.personal_data
    - (case when public.pd_visible(p.id, p.privacy_settings, 'birthdate')
            then '' else 'birthdate' end)
    - (case when public.pd_visible(p.id, p.privacy_settings, 'gender')
            then '' else 'gender' end)
    - (case when public.pd_visible(p.id, p.privacy_settings, 'bank_account')
            then '' else 'bank_account' end)
  ) as personal_data
from public.profiles p;

-- start_latitude / start_longitude 는 뷰에 넣지 않는다.
-- 중간지점·이동시간 계산은 participants 의 복사본을 쓰므로
-- 남의 profiles 좌표를 읽을 이유가 없다.

grant select on public.profiles_public to authenticated;

-- ── 3. profiles 원본을 본인 행으로 ────────────────────────────────────────
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- ── 4. participants 도 방 멤버에게만 ──────────────────────────────────────
-- participants 에는 personal_data / schedule / start_* 사본이 들어 있다.
-- using (true) 면 profiles 를 막아도 같은 정보가 이쪽으로 샌다.
drop policy if exists participants_select on public.participants;
drop policy if exists participants_select_member on public.participants;
create policy participants_select_member on public.participants
  for select to authenticated
  using (
    profile_id = auth.uid()          -- 내 참여자 행 (fetchRooms 가 이걸로 방 목록을 찾는다)
    or public.is_room_member(room_id)
  );

-- ── 남은 것 ───────────────────────────────────────────────────────────────
-- rooms_select 는 여전히 using (true) 다. 초대코드로 입장하려면 멤버가 되기 전에
-- 방을 조회해야 해서 단순히 좁힐 수 없다. 제대로 막으려면
-- join_room_by_code(code) 를 security definer RPC 로 만들고 앱의 입장 흐름을
-- 그쪽으로 옮겨야 한다. 별도 작업으로 남긴다.
