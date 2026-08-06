-- 20260804120000_health_privacy_and_room_owner.sql 되돌리기.
--
-- ① 알레르기·지병 필터 제거 (뷰를 이전 정의로)
-- ② 방 수정 권한을 멤버 전체로 되돌림
--
-- ⚠️ ② 를 되돌리면 아무 멤버나 방 정보를 고칠 수 있는 상태로 돌아간다.

-- ① 뷰를 건강 필터 없는 이전 정의로
-- replace 는 컬럼 순서·이름을 못 바꾼다. drop 후 create 로 되돌린다.
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
  ) as personal_data
from public.profiles p;

grant select on public.profiles_public to authenticated;

drop function if exists public.health_visible(uuid);
drop function if exists public.shares_room_with(uuid);

-- ② 방 수정 권한 원복
drop policy if exists rooms_update_owner on public.rooms;
create policy rooms_update_member on public.rooms
  for update to authenticated using (public.is_room_member(id));
