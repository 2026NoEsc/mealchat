-- 2026-08-04 제품 결정 두 건을 반영한다.
--
--  ① 알레르기·지병을 **같은 방 참여자에게만** 공개한다.
--  ② 방 정보 수정을 **방장만** 할 수 있게 한다.
--
-- 적용:  supabase db push   (또는 SQL Editor 에 붙여넣기)
-- 되돌리기: rollback-health-privacy-and-room-owner.sql
--
-- ⚠️ 두 변경 모두 앱 코드 변경 없이 동작한다. 다만 ② 는 방장이 아닌 사람이
--    방 정보를 고치려 하면 **0행 갱신**이 되므로, 앱이 204 를 성공으로 읽지
--    않는지 확인해야 한다(라운드 T-4 의 교훈).

-- ══════════════════════════════════════════════════════════════════════════
-- ① 알레르기·지병 공개 범위
-- ══════════════════════════════════════════════════════════════════════════
--
-- 왜 "같은 방 참여자에게만" 인가
--   이 앱의 목적은 같이 밥 먹을 사람에게 알레르기를 알리는 것이다. 완전히
--   숨기면 '안심 지킴이'가 죽는다. 반대로 지금처럼 전면 공개하면, 메이트
--   검색으로 **모르는 사람의 건강 정보까지** 읽힌다.
--   "같이 밥 먹기로 한 사이에서만 보인다" 가 그 사이의 절충이다.
--
-- ⚠️ AI 추천은 영향을 받지 않는다.
--   추천은 `participants.personal_data` 사본을 읽는다(라운드 S 에서 그렇게
--   바꿨다). 이 뷰는 메이트 검색·프로필 보기 경로에만 쓰인다.

-- 보는 사람과 대상이 같은 방에 함께 있는가.
create or replace function public.shares_room_with(target_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.participants me
    join public.participants them on them.room_id = me.room_id
    where me.profile_id = auth.uid()
      and them.profile_id = target_profile
  );
$$;

grant execute on function public.shares_room_with(uuid) to authenticated;

-- 건강 정보를 볼 수 있는가.
--   본인 → 항상 보임
--   같은 방 → 보임
--   그 외 → 가려짐
--
-- privacy_settings 의 다른 필드들과 달리 'public'/'private' 토글을 쓰지 않는다.
-- 화면에 토글이 없기 때문이다(PrivacySettings 타입에 선언만 있고 UI 가 없다).
-- 토글을 만들기로 하면 여기에 pd_visible 과 같은 분기를 더하면 된다.
create or replace function public.health_visible(target_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_profile = auth.uid()
      or public.shares_room_with(target_profile);
$$;

grant execute on function public.health_visible(uuid) to authenticated;

-- 뷰를 다시 만든다. 기존 3개 필터(birthdate·gender·bank_account)는 그대로 두고
-- 건강 관련 4개 키를 더 뺀다.
--
-- 키가 4개인 이유: 저장 경로가 두 벌이다.
--   allergyFoods / chronicDiseases  ← 프로필 편집·취향 게임이 쓰는 이름
--   allergies    / health_issues    ← 화면 일부가 읽는 옛 이름 (README 이슈 #3)
-- 한쪽만 지우면 다른 쪽으로 그대로 새어 나간다.
--
-- ⚠️ `create or replace view` 가 아니라 **drop 후 create** 다.
--    replace 는 컬럼의 **순서와 이름을 바꿀 수 없다.** 실제로 이 마이그레이션을
--    처음 올릴 때 이렇게 막혔다:
--
--      ERROR 42P16: cannot change name of view column "schedule"
--                   to "start_location_name"
--
--    배포된 뷰의 컬럼 순서가 이 파일과 달랐던 것이다. drop 하면 순서가 어떻든
--    새로 만들어진다. CASCADE 는 쓰지 않는다 — 이 뷰에 기대는 다른 객체가
--    있다면 **조용히 지워지는 것보다 오류로 멈추는 편이 낫다.**
--
-- ⚠️ 컬럼은 **운영에 배포된 9개 그대로** 둔다. 이 파일을 처음 쓸 때는 예전
--    마이그레이션 파일을 보고 `start_location_name` 을 포함한 10개로 적었는데,
--    실제 배포본에는 그 컬럼이 없었다(information_schema 로 확인).
--
--    빼기로 한 이유: `profiles_public` 을 읽는 곳은 전부 `select('*')` 이고,
--    그중 `start_location_name` 을 쓰는 경로가 없다(친구 위치는
--    `follows.profiles` 와 `participants` 사본에서 온다). 무엇보다
--    **공개 범위를 좁히는 마이그레이션에서 공개 뷰에 개인 필드를 새로 얹는 것은
--    방향이 반대다.**
drop view if exists public.profiles_public;

create view public.profiles_public
with (security_invoker = off) as
select
  p.id,
  p.name,
  p.tag,
  p.avatar_color,
  p.avatar_url,
  p.schedule,
  p.created_at,
  p.privacy_settings,
  (
    p.personal_data
    - (case when public.pd_visible(p.id, p.privacy_settings, 'birthdate')
            then '' else 'birthdate' end)
    - (case when public.pd_visible(p.id, p.privacy_settings, 'gender')
            then '' else 'gender' end)
    - (case when public.pd_visible(p.id, p.privacy_settings, 'bank_account')
            then '' else 'bank_account' end)
    - (case when public.health_visible(p.id) then '' else 'allergyFoods' end)
    - (case when public.health_visible(p.id) then '' else 'chronicDiseases' end)
    - (case when public.health_visible(p.id) then '' else 'allergies' end)
    - (case when public.health_visible(p.id) then '' else 'health_issues' end)
  ) as personal_data
from public.profiles p;

grant select on public.profiles_public to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- ② 방 정보 수정은 방장만
-- ══════════════════════════════════════════════════════════════════════════
--
-- 예전: using (public.is_room_member(id))
--   → 아무 멤버나 방 제목·장소·확정 일정·만료 시각을 바꿀 수 있었다.
--     남이 내 약속 시간을 바꿔도 막을 방법이 없었다.
--
-- 지금: 방장(owner_id)만.
--   방장이 자리를 비우면 아무도 못 고친다. 방장 위임 기능이 이미 있으므로
--   (App.tsx 의 handleTransferOwnership) 그쪽으로 해결한다.
drop policy if exists rooms_update_member on public.rooms;
drop policy if exists rooms_update_owner on public.rooms;
create policy rooms_update_owner on public.rooms
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ⚠️ owner_id 가 비어 있는 옛 방은 아무도 못 고치게 된다.
--    라운드 Q 에서 채우도록 고쳤으나, 그 이전에 만들어진 행이 있으면
--    아래로 메워야 한다. 방장은 그 방의 첫 참여자로 본다.
update public.rooms r
set owner_id = (
  select p.profile_id
  from public.participants p
  where p.room_id = r.id
  order by p.created_at asc
  limit 1
)
where r.owner_id is null;
