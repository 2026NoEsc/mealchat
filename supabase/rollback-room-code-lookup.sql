-- 20260803160000_room_code_lookup.sql 되돌리기
--
-- 언제 쓰나
--   적용 후 방 목록이 비거나 초대코드 입장이 실패하는데 원인을 바로 못 찾을 때.
--   앱 배포와 DB 변경 시점이 어긋나면 생길 수 있다.
--   (앱이 아직 get_room_by_code 를 안 부르는 구버전이면 입장이 막힌다.)
--
-- ⚠️ 되돌리면 모든 방의 초대코드가 다시 전원에게 노출된다.
--    임시 조치로만 쓰고, 원인을 고친 뒤 다시 적용할 것.

drop policy if exists rooms_select_member on public.rooms;
create policy rooms_select on public.rooms
  for select to authenticated using (true);

-- 함수는 남겨둬도 무해하다. 완전히 지우려면:
--   drop function if exists public.get_room_by_code(text);
