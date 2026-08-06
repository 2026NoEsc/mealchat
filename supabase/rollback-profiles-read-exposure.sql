-- 20260803140000_profiles_read_exposure.sql 되돌리기
--
-- 언제 쓰나
--   마이그레이션 적용 후 메이트 검색·프로필 모달·참여자 목록이 비어 보이는데
--   원인을 바로 못 찾을 때. 앱 배포와 DB 변경의 시점이 어긋나면 생길 수 있다.
--
-- ⚠️ 되돌리면 계좌번호·생년월일·출발지 좌표가 다시 전원에게 열린다.
--    임시 조치로만 쓰고, 원인을 고친 뒤 다시 적용할 것.

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists participants_select_member on public.participants;
create policy participants_select on public.participants
  for select to authenticated using (true);

-- 뷰와 함수는 남겨둬도 무해하다 (앱이 안 쓰면 그만).
-- 완전히 지우려면:
--   drop view if exists public.profiles_public;
--   drop function if exists public.pd_visible(uuid, jsonb, text);
