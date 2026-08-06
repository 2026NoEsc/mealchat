-- 20260805000000_dunning_targeted_notifications.sql 되돌리기.
--
-- 독촉 알림을 다시 방 전원에게 보내도록 되돌린다.
--
-- ⚠️ target_profile_ids 컬럼은 지우지 않는다. 지우면 이미 쌓인 알림 행의
--    "누구를 대상으로 보냈는지" 이력이 사라진다. 함수만 예전 시그니처로
--    되돌리고, 컬럼은 그냥 안 쓰는 채로 남긴다.
--
-- ⚠️ 여기서도 마찬가지로, 6-인자 버전을 먼저 지우지 않으면 5-인자로
--    되돌린 새 함수와 공존하며 같은 오버로드 충돌이 재발한다.
drop function if exists public.send_room_push(text, uuid, text, text, uuid, uuid[]);

create or replace function public.send_room_push(
  p_type              text,
  p_room_id           uuid,
  p_title             text,
  p_body              text,
  p_exclude_profile   uuid default null
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
                 'excludeProfileId', p_exclude_profile
               )
  );
end;
$$;

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
    null
  );
  return new;
end;
$$;
