-- 20260805010000_room_update_column_scope.sql 되돌리기.
--
-- ⚠️ 되돌리면 라운드 AL-5 가 원래 의도했던 "방장만 방 정보 수정" 으로
--    돌아가지만, AR 이 고친 부작용도 같이 돌아간다 — 방장이 아닌 참여자는
--    메뉴 제안·약속 메모 수정이 다시 조용히 막힌다. AR-2 에서 고친
--    handleTransferRoomOwnership 의 rooms.owner_id 갱신 코드도 이 롤백과
--    같이 되돌리지 않으면, "방장이 아닌데 owner_id 를 바꾸려는 시도"가
--    트리거 없이 통과해 버릴 수 있다 — 코드도 같이 되돌릴 것.

drop trigger if exists trg_enforce_room_update_scope on public.rooms;
drop function if exists public.enforce_room_update_scope();

drop policy if exists rooms_update_member on public.rooms;
create policy rooms_update_owner on public.rooms
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
