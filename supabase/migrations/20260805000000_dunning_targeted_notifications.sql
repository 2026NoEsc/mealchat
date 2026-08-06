-- 2026-08-05 결정 ⑥ 반영: 독촉 알림을 미입금자에게만 보낸다.
--
-- 문제 (docs/UI/15 AJ-11, docs/UI/19 결정 ⑥)
--   `notifications` 은 방 단위로만 나갔다. "미입금자에게 독촉 알림 전송"을
--   눌러도 이미 낸 사람까지 포함해 방 전원에게 갔다 — 라운드 AL 의 결정
--   7건 중 유일하게 남아 있던 항목이다.
--
-- 접근
--   `notifications` 에 대상 지정용 컬럼을 하나 추가한다. null 이면 예전처럼
--   방 전원(하위 호환 — 정산 요청 생성 알림은 계속 전원에게 간다), 값이
--   있으면 그 프로필들에게만 간다.
--
-- ⚠️ 적용된 마이그레이션 파일(20260803000000_push_notifications.sql)은
--    고치지 않는다. `send_room_push`/`on_notification_push` 은 같은 이름으로
--    `create or replace` 해서 새 동작으로 덮어쓴다.
--
-- ⚠️⚠️ `create or replace function` 은 **인자 개수가 다르면 기존 함수를
--    안 지우고 오버로드를 새로 추가한다.** 5-인자 옛 버전을 그대로 두면
--    on_message_push · on_participant_push · on_room_confirmed_push
--    (전부 5개 인자로 호출)이 "함수가 유일하지 않습니다"로 깨진다.
--    옛 시그니처를 명시적으로 지운 뒤에 6-인자 버전을 만든다.
drop function if exists public.send_room_push(text, uuid, text, text, uuid);

alter table public.notifications
  add column if not exists target_profile_ids uuid[];

comment on column public.notifications.target_profile_ids is
  'null이면 방 전원에게 발송(기존 동작). 값이 있으면 그 프로필들에게만 푸시·배너를 보낸다(독촉 알림 등).';

-- send_room_push 에 대상 지정 파라미터를 추가한다.
create or replace function public.send_room_push(
  p_type                text,
  p_room_id             uuid,
  p_title               text,
  p_body                text,
  p_exclude_profile     uuid default null,
  p_target_profile_ids  uuid[] default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'push_function_secret' limit 1;

  if v_url is null or v_secret is null then
    raise warning '[send_room_push] Vault 에 project_url / push_function_secret 이 없습니다. 푸시를 건너뜁니다.';
    return;
  end if;

  perform net.http_post(
    url     := v_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
                 'Content-Type',   'application/json',
                 'x-push-secret',  v_secret
               ),
    body    := jsonb_build_object(
                 'type',             p_type,
                 'roomId',           p_room_id,
                 'title',            p_title,
                 'body',             p_body,
                 'excludeProfileId', p_exclude_profile,
                 'targetProfileIds', p_target_profile_ids
               )
  );
end;
$$;

-- N빵 정산 알림: notifications.target_profile_ids 가 있으면 그대로 전달한다.
-- (정산 요청 생성 알림은 이 컬럼을 안 채우므로 null → 예전처럼 전원에게 간다.
--  독촉 알림만 DutchPay.tsx 가 미입금자 목록을 채워 넣는다.)
create or replace function public.on_notification_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.send_room_push(
    'unpaid_bill',
    new.room_id,
    new.title,
    left(new.message, 100),
    null,
    new.target_profile_ids
  );
  return new;
end;
$$;
