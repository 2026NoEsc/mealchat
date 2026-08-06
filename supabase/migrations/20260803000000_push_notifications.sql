-- 밀챗 원격 푸시 트리거
--
-- DB 변화가 생기면 send-push Edge Function 을 호출해 방 참여자에게 푸시를 보냅니다.
-- 지금까지는 모든 알림이 로컬(scheduleNotificationAsync)이어서 "내가 보낸 메시지
-- 알림을 내가 받는" 상태였습니다. 상대 기기에는 아무것도 가지 않았습니다.
--
-- 적용 순서
--   1) Vault 에 비밀 두 개 등록 (아래 A 단계)
--   2) 이 파일 실행
--   3) Edge Function 에 PUSH_FUNCTION_SECRET 설정 후 배포
--
-- 주의: 트리거는 net.http_post 로 **비동기** 호출합니다. 푸시 발송이 느리거나
--       실패해도 INSERT/UPDATE 트랜잭션은 막히지 않습니다. 대신 실패는
--       Edge Function 로그에만 남습니다.

-- ── A. 사전 준비 ──────────────────────────────────────────────────────────
-- pg_net: 트리거에서 HTTP 를 호출하기 위한 확장
create extension if not exists pg_net with schema extensions;

-- Vault 에 아래 두 값을 미리 넣어야 합니다. (SQL Editor 에서 1회)
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<임의의 긴 난수>',                  'push_function_secret');
-- push_function_secret 은 Edge Function 의 PUSH_FUNCTION_SECRET 과 같아야 합니다.

-- ── B. 공통 발송 헬퍼 ─────────────────────────────────────────────────────
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

  -- 비밀이 없으면 조용히 넘어갑니다. 알림 하나 때문에 방 생성이나 메시지 전송이
  -- 실패하면 안 됩니다.
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

-- ── C. 이벤트별 트리거 ────────────────────────────────────────────────────

-- C-1. 채팅 메시지 → 보낸 사람을 뺀 방 참여자
create or replace function public.on_message_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_title text;
  v_body       text;
begin
  select title into v_room_title from public.rooms where id = new.room_id;

  -- 이모티콘은 '[emoticon:{key}]' 원시 코드로 저장됩니다. 그대로 띄우면
  -- 알림에 '[emoticon:welling_eat]' 이 노출되므로 사람이 읽을 문구로 바꿉니다.
  if new.message like '[emoticon:%' then
    v_body := new.sender_name || '님이 이모티콘을 보냈습니다';
  else
    v_body := left(new.message, 100);
  end if;

  perform public.send_room_push(
    'message',
    new.room_id,
    coalesce(v_room_title, '밀챗') || ' — ' || new.sender_name,
    v_body,
    new.sender_id
  );
  return new;
end;
$$;

drop trigger if exists trg_message_push on public.messages;
create trigger trg_message_push
  after insert on public.messages
  for each row execute function public.on_message_push();

-- C-2. N빵 정산 알림 → 방 참여자 전원
--      notifications 행에는 보낸 사람이 없어 제외 대상을 지정할 수 없습니다.
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

drop trigger if exists trg_notification_push on public.notifications;
create trigger trg_notification_push
  after insert on public.notifications
  for each row execute function public.on_notification_push();

-- C-3. 새 참여자 입장 → 기존 참여자
--      새로 들어온 본인은 제외합니다. 본인은 입장 화면에서 이미 알고 있습니다.
create or replace function public.on_participant_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_title text;
begin
  select title into v_room_title from public.rooms where id = new.room_id;

  perform public.send_room_push(
    'user_joined',
    new.room_id,
    coalesce(v_room_title, '밀챗'),
    new.name || '님이 밀챗방에 입장했습니다 👋',
    new.profile_id
  );
  return new;
end;
$$;

drop trigger if exists trg_participant_push on public.participants;
create trigger trg_participant_push
  after insert on public.participants
  for each row execute function public.on_participant_push();

-- C-4. 약속 확정 → 방 참여자 전원
--      is_confirmed 가 false→true 로 바뀔 때만. 확정된 방을 수정할 때마다
--      다시 알림이 가면 안 됩니다.
create or replace function public.on_room_confirmed_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_where text;
begin
  if new.is_confirmed is not true or old.is_confirmed is true then
    return new;
  end if;

  v_where := coalesce(nullif(new.location_name, ''), '장소 미정');

  perform public.send_room_push(
    'schedule_confirmed',
    new.id,
    '[' || new.title || '] 약속이 확정되었습니다 📅',
    to_char(new.meeting_date, 'MM월 DD일') ||
      coalesce(' ' || new.confirmed_slot, '') || ' · ' || v_where,
    null
  );
  return new;
end;
$$;

drop trigger if exists trg_room_confirmed_push on public.rooms;
create trigger trg_room_confirmed_push
  after update of is_confirmed on public.rooms
  for each row execute function public.on_room_confirmed_push();

-- ── D. push_token 을 profiles 에서 분리 ───────────────────────────────────
--
-- 문제
--   profiles_select 정책이 `using (true)` 라서 로그인한 사람은 누구나 모든
--   profiles 행을 읽습니다. 여기에 push_token 이 들어 있었습니다.
--   Expo 푸시는 토큰만 있으면 누구나 보낼 수 있으므로, 토큰을 전부 긁어
--   임의 알림을 뿌릴 수 있는 상태였습니다.
--
-- 왜 컬럼 권한으로 막지 않았나
--   `revoke select (push_token)` 을 걸면 앱이 쓰는 .select('*') 가 통째로
--   권한 오류로 실패합니다. profiles 를 직접 조회하는 곳이 많아 위험합니다.
--
-- 정책을 좁히지 않는 이유
--   `using (id = auth.uid())` 로 바꾸면 메이트 검색·참여자 표시가 전부 깨집니다.
--   프로필 자체는 서로 보여야 하는 데이터입니다.
--
-- → 토큰만 별도 테이블로 옮기고, 그 테이블에만 본인 전용 RLS 를 겁니다.
--   Edge Function 은 service_role 이라 RLS 를 우회해 전원의 토큰을 읽습니다.

create table if not exists public.push_tokens (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  token      text not null,
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

-- 본인 행만 읽고 쓸 수 있습니다. 남의 토큰은 조회 자체가 안 됩니다.
drop policy if exists push_tokens_select_own on public.push_tokens;
create policy push_tokens_select_own on public.push_tokens
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists push_tokens_upsert_own on public.push_tokens;
create policy push_tokens_upsert_own on public.push_tokens
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists push_tokens_update_own on public.push_tokens;
create policy push_tokens_update_own on public.push_tokens
  for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists push_tokens_delete_own on public.push_tokens;
create policy push_tokens_delete_own on public.push_tokens
  for delete to authenticated using (profile_id = auth.uid());

-- 기존 토큰 이관. 지금은 FCM 미설정으로 전부 null 이지만,
-- 설정 후 재실행해도 안전하도록 멱등하게 작성합니다.
insert into public.push_tokens (profile_id, token)
select id, push_token
  from public.profiles
 where push_token is not null and push_token <> ''
on conflict (profile_id) do update set token = excluded.token, updated_at = now();

-- 옮긴 뒤 원본 컬럼 제거. 남겨두면 다시 쓰게 되고, 그러면 같은 노출이 반복됩니다.
alter table public.profiles drop column if exists push_token;
