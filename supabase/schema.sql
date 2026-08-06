-- ============================================================
-- 밀챗(MealChat) Supabase 스키마
--
-- 출처: 원본 스키마가 유실되어 src/lib/types.ts 인터페이스와
--       실제 쿼리 호출부(src/App.tsx, ScheduleGrid.tsx, DutchPay.tsx,
--       ProfileSetup.tsx)를 역으로 분석해 재구성했습니다.
--
-- 적용: Supabase 대시보드 → SQL Editor에 전체 붙여넣고 Run
--
-- ⚠️ RLS 정책은 "앱이 동작하는 최소 수준"으로 작성했습니다.
--    운영 배포 전 반드시 파일 하단의 [RLS 검토 필요] 항목을 확인하세요.
--
-- ── 적용 후 검증 결과 (실제 프로젝트 대상) ──────────────────
--   ✅ 테이블 10개 생성 확인 (REST 200)
--   ✅ 앱이 사용하는 컬럼 67개 전부 존재
--        profiles 13 / rooms 18 / participants 13 / messages 7 / follows 5
--        calendar_notes 13 / dutch_pay_bills 10 / dutch_pay_members 6
--        notifications 8 / scheduled_time 4
--   ✅ 임베디드 조인 6종 해석 성공 (= 외래키 정의가 올바름)
--        participants→profiles, follows→profiles(:following_id / !following_id),
--        calendar_notes→profiles, dutch_pay_bills→dutch_pay_members,
--        profiles→dutch_pay_bills
--   ✅ RLS 동작 확인: 익명 키로 조회 시 빈 배열, 쓰기 시 42501 거부
--   ⬜ 미검증: 로그인 세션 기준 정책(insert/update 경로), Realtime 수신
--        → 실제 계정으로 앱을 돌려야 확인 가능
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles
--    auth.users와 1:1. 코드가 upsert 시 id에 auth uid를 그대로 넣음
--    (App.tsx:2087  profileData = { id: user.id, ... })
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  name                text not null,
  tag                 text not null,                    -- 3자리 숫자 (ProfileSetup.tsx:750에서 난수 발급)
  avatar_color        text not null default '#23A455',
  avatar_url          text,
  personal_data       jsonb not null default '{}'::jsonb,
  schedule            jsonb not null default '{}'::jsonb, -- { "YYYY-MM-DD": ["HH:MM", ...] }
  privacy_settings    jsonb not null default '{"birthdate":"public","gender":"public","bank_account":"private"}'::jsonb,
  push_token          text,
  start_location_name text,
  start_latitude      double precision,
  start_longitude     double precision,
  created_at          timestamptz not null default now()
);

-- 친구 추가가 (이름 + 태그)로 조회하므로 조합이 유일해야 함
-- ProfileSetup.tsx:533  .eq('name', fName).eq('tag', fTag)
create unique index if not exists profiles_name_tag_key
  on public.profiles (name, tag);

-- ------------------------------------------------------------
-- 2. rooms
-- ------------------------------------------------------------
create table if not exists public.rooms (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,              -- 6자리 대문자 초대코드
  title              text not null,
  meeting_date       date not null,
  expires_at         timestamptz not null,
  owner_id           uuid references public.profiles(id) on delete set null,
  is_confirmed       boolean not null default false,
  confirmed_slot     text,                              -- 'HH:MM'
  color              text not null default '#23A455',
  location_name      text,
  latitude           double precision,
  longitude          double precision,
  ai_recommendations jsonb,
  voting_items       jsonb not null default '[]'::jsonb,
  memo               text,
  memo_visibility    text not null default 'public'
                       check (memo_visibility in ('public','best','private')),
  memo_author_id     uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now()
);

create index if not exists rooms_expires_at_idx on public.rooms (expires_at);

-- ------------------------------------------------------------
-- 3. participants
--    방 참여자. 프로필 스냅샷을 복사해 보관하는 구조
-- ------------------------------------------------------------
create table if not exists public.participants (
  id                  uuid primary key default gen_random_uuid(),
  room_id             uuid not null references public.rooms(id) on delete cascade,
  profile_id          uuid references public.profiles(id) on delete cascade,
  name                text not null,
  avatar_color        text not null default '#23A455',
  avatar_url          text,
  personal_data       jsonb not null default '{}'::jsonb,
  schedule            jsonb not null default '{}'::jsonb,
  voted_items         jsonb not null default '[]'::jsonb,
  start_location_name text,
  start_latitude      double precision,
  start_longitude     double precision,
  created_at          timestamptz not null default now()
);

-- 중복 입장 방지 (App.tsx:474, 689, 1629에서 매번 수동 검사 중 → DB 레벨로 승격)
create unique index if not exists participants_room_profile_key
  on public.participants (room_id, profile_id);

create index if not exists participants_room_id_idx on public.participants (room_id);

-- ⚠️ App.tsx:274는 owner_id가 아니라 participants.created_at 최솟값으로
--    방장을 판정합니다. 방장 위임이 반영되지 않는 원인이므로
--    rooms.owner_id 기준으로 통일하는 리팩터링을 권장합니다.

-- ------------------------------------------------------------
-- 4. messages
-- ------------------------------------------------------------
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.rooms(id) on delete cascade,
  sender_id    uuid references public.profiles(id) on delete set null,
  sender_name  text not null,
  sender_color text not null default '#23A455',
  message      text not null,                          -- 이모티콘은 '[emoticon:{key}]' 형태
  created_at   timestamptz not null default now()
);

create index if not exists messages_room_created_idx
  on public.messages (room_id, created_at);

-- ------------------------------------------------------------
-- 5. follows
--    맞팔로우 구조. 앱이 양방향 2행을 생성함
-- ------------------------------------------------------------
create table if not exists public.follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  role         text not null default 'mate' check (role in ('leader','mate')),
  created_at   timestamptz not null default now(),
  constraint follows_no_self check (follower_id <> following_id)
);

create unique index if not exists follows_pair_key
  on public.follows (follower_id, following_id);

-- 주의: 코드가 임베디드 조인을 두 가지 문법으로 씁니다.
--   App.tsx:1084          .select('*, profiles:following_id(*)')
--   ProfileSetup.tsx:448  .select('*, profiles!following_id(*)')
-- 위 FK 이름이 있어야 둘 다 해석됩니다.

-- ------------------------------------------------------------
-- 6. calendar_notes
--    개인 캘린더 메모 + 기기 캘린더 연동분
-- ------------------------------------------------------------
create table if not exists public.calendar_notes (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles(id) on delete cascade,
  date              date not null,
  title             text not null default '',
  content           text not null default '',
  visibility        text not null default 'public'
                      check (visibility in ('public','best','private')),
  color             text,
  time              text,                               -- 'HH:MM'
  end_time          text,
  start_date        date,
  end_date          date,
  calendar_event_id text,                               -- expo-calendar 이벤트 id
  created_at        timestamptz not null default now()
);

create index if not exists calendar_notes_profile_date_idx
  on public.calendar_notes (profile_id, date);

-- ------------------------------------------------------------
-- 7. dutch_pay_bills / dutch_pay_members
-- ------------------------------------------------------------
create table if not exists public.dutch_pay_bills (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid references public.rooms(id) on delete set null,
  creator_id     uuid references public.profiles(id) on delete set null,
  title          text not null,
  total_amount   integer not null default 0,
  split_count    integer not null default 1,
  bank_name      text not null default '',
  account_number text not null default '',
  account_holder text not null default '',
  created_at     timestamptz not null default now()
);

-- room_id를 SET NULL로 둔 이유: "방이 폭파돼도 정산은 남는다"는 제품 컨셉
-- (App.tsx:3980 '방이 폭파된 후에도 남아있는 미완료 정산 내역을 확인하고 송금할 수 있습니다')

create table if not exists public.dutch_pay_members (
  id           uuid primary key default gen_random_uuid(),
  bill_id      uuid not null references public.dutch_pay_bills(id) on delete cascade,
  profile_id   uuid references public.profiles(id) on delete cascade,
  name         text not null,      -- ⚠️ '{이름}:{금액}' 형태로 저장됨 (DutchPay.tsx:464)
  is_completed boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists dutch_pay_members_bill_idx
  on public.dutch_pay_members (bill_id);

-- ⚠️ name 컬럼에 이름과 금액을 콜론으로 붙여 저장하는 구조입니다.
--    개별 금액 컬럼(amount integer)을 추가하고 파싱을 걷어내는 것을 권장합니다.
--    지금 고치면 DutchPay.tsx의 getMemberAmount/getMemberCleanName도 함께 수정해야 합니다.

-- ------------------------------------------------------------
-- 8. notifications
--    정산 알림 전용 (헤더 🔔 = '정산 알림 목록')
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references public.rooms(id) on delete cascade,
  title          text not null,
  message        text not null,
  bank_name      text not null default '',
  account_number text not null default '',
  amount         integer not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists notifications_room_created_idx
  on public.notifications (room_id, created_at desc);

-- ------------------------------------------------------------
-- 9. scheduled_time  (레거시)
--    App.tsx:2418에서 DELETE만 하고 INSERT/SELECT는 어디에도 없습니다.
--    테이블이 없으면 확정 시마다 console.warn이 발생하므로 최소 형태로 생성합니다.
--    호출부를 제거하면 이 테이블도 함께 삭제하세요.
-- ------------------------------------------------------------
create table if not exists public.scheduled_time (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms(id) on delete cascade,
  slot_type  text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Realtime 발행 설정
--   App.tsx의 구독 3개:
--     1156  notifications  INSERT
--     1244  participants   *       filter room_id=eq.{id}
--     1266  rooms          UPDATE  filter id=eq.{id}
--     1313  messages       INSERT  filter room_id=eq.{id}
-- ============================================================
-- publication이 없으면 만들고, 이미 등록된 테이블은 건너뜁니다.
-- (재실행해도 에러가 나지 않도록 방어 처리)
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array array['notifications','participants','rooms','messages'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.rooms             enable row level security;
alter table public.participants      enable row level security;
alter table public.messages          enable row level security;
alter table public.follows           enable row level security;
alter table public.calendar_notes    enable row level security;
alter table public.dutch_pay_bills   enable row level security;
alter table public.dutch_pay_members enable row level security;
alter table public.notifications     enable row level security;
alter table public.scheduled_time    enable row level security;

-- 내가 참여 중인 방인지 판별하는 헬퍼.
-- participants 정책 안에서 participants를 다시 조회하면 무한 재귀가 나므로
-- security definer로 RLS를 우회합니다.
create or replace function public.is_room_member(target_room uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.participants p
    where p.room_id = target_room
      and p.profile_id = auth.uid()
  );
$$;

-- ---------- profiles ----------
-- 친구 검색(이름+태그)과 방 참여자 프로필 표시를 위해 조회는 전체 허용
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------- rooms ----------
-- 초대코드로 입장하려면 참여 전에 방을 조회할 수 있어야 하므로 select는 전체 허용
-- (코드를 모르면 찾을 수 없다는 전제. 아래 [RLS 검토 필요] 참조)
drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms
  for select to authenticated using (true);

drop policy if exists rooms_insert on public.rooms;
create policy rooms_insert on public.rooms
  for insert to authenticated with check (true);

drop policy if exists rooms_update_member on public.rooms;
create policy rooms_update_member on public.rooms
  for update to authenticated using (public.is_room_member(id));

drop policy if exists rooms_delete_owner on public.rooms;
create policy rooms_delete_owner on public.rooms
  for delete to authenticated using (owner_id = auth.uid() or public.is_room_member(id));

-- ---------- participants ----------
drop policy if exists participants_select on public.participants;
create policy participants_select on public.participants
  for select to authenticated using (true);

drop policy if exists participants_insert_self on public.participants;
create policy participants_insert_self on public.participants
  for insert to authenticated with check (true);
  -- 초대 기능이 남을 대신 등록하므로 profile_id = auth.uid() 로 못 좁힘

drop policy if exists participants_update_self on public.participants;
create policy participants_update_self on public.participants
  for update to authenticated using (profile_id = auth.uid());

-- 본인 퇴장 + 방장 추방 둘 다 허용
drop policy if exists participants_delete on public.participants;
create policy participants_delete on public.participants
  for delete to authenticated
  using (
    profile_id = auth.uid()
    or exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid())
  );

-- ---------- messages ----------
drop policy if exists messages_select_member on public.messages;
create policy messages_select_member on public.messages
  for select to authenticated using (public.is_room_member(room_id));

drop policy if exists messages_insert_member on public.messages;
create policy messages_insert_member on public.messages
  for insert to authenticated with check (public.is_room_member(room_id));

-- ---------- follows ----------
drop policy if exists follows_select on public.follows;
create policy follows_select on public.follows
  for select to authenticated
  using (follower_id = auth.uid() or following_id = auth.uid());

-- 맞팔로우를 위해 상대 방향 행도 생성해야 하므로 with check를 좁히지 않음
drop policy if exists follows_insert on public.follows;
create policy follows_insert on public.follows
  for insert to authenticated with check (true);

drop policy if exists follows_update_own on public.follows;
create policy follows_update_own on public.follows
  for update to authenticated using (follower_id = auth.uid());

drop policy if exists follows_delete_own on public.follows;
create policy follows_delete_own on public.follows
  for delete to authenticated
  using (follower_id = auth.uid() or following_id = auth.uid());

-- ---------- calendar_notes ----------
-- visibility(public/best/private)는 앱이 클라이언트에서 필터링합니다.
-- DB에서도 막으려면 아래 [RLS 검토 필요] 참조.
drop policy if exists calendar_notes_select on public.calendar_notes;
create policy calendar_notes_select on public.calendar_notes
  for select to authenticated
  using (
    profile_id = auth.uid()
    or visibility = 'public'
    or (visibility = 'best' and exists (
          select 1 from public.follows f
          where f.follower_id = calendar_notes.profile_id
            and f.following_id = auth.uid()
            and f.role = 'leader'))
  );

drop policy if exists calendar_notes_write_own on public.calendar_notes;
create policy calendar_notes_write_own on public.calendar_notes
  for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ---------- dutch_pay_bills / members ----------
-- ⚠️ bills ↔ members를 서로 서브쿼리로 참조하면 42P17(infinite recursion)이 납니다.
--    RLS는 서브쿼리 대상 테이블의 정책도 평가하기 때문입니다.
--    participants와 동일하게 security definer 함수로 재귀를 끊습니다.
create or replace function public.is_bill_participant(target_bill uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.dutch_pay_members m
    where m.bill_id = target_bill and m.profile_id = auth.uid()
  );
$$;

create or replace function public.is_bill_creator(target_bill uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.dutch_pay_bills b
    where b.id = target_bill and b.creator_id = auth.uid()
  );
$$;

-- 방이 사라진 뒤에도 당사자는 조회할 수 있어야 함
drop policy if exists dutch_pay_bills_select on public.dutch_pay_bills;
create policy dutch_pay_bills_select on public.dutch_pay_bills
  for select to authenticated
  using (
    creator_id = auth.uid()
    or public.is_bill_participant(id)
  );

drop policy if exists dutch_pay_bills_insert on public.dutch_pay_bills;
create policy dutch_pay_bills_insert on public.dutch_pay_bills
  for insert to authenticated with check (creator_id = auth.uid());

drop policy if exists dutch_pay_bills_modify_creator on public.dutch_pay_bills;
create policy dutch_pay_bills_modify_creator on public.dutch_pay_bills
  for delete to authenticated using (creator_id = auth.uid());

drop policy if exists dutch_pay_members_select on public.dutch_pay_members;
create policy dutch_pay_members_select on public.dutch_pay_members
  for select to authenticated
  using (
    profile_id = auth.uid()
    or public.is_bill_creator(bill_id)
  );

-- 입금 확인(is_completed) 처리는 결제자가 하므로 update를 결제자에게 허용
drop policy if exists dutch_pay_members_write on public.dutch_pay_members;
create policy dutch_pay_members_write on public.dutch_pay_members
  for all to authenticated
  using (
    profile_id = auth.uid()
    or public.is_bill_creator(bill_id)
  )
  with check (true);

-- ---------- notifications ----------
drop policy if exists notifications_select_member on public.notifications;
create policy notifications_select_member on public.notifications
  for select to authenticated using (public.is_room_member(room_id));

drop policy if exists notifications_insert_member on public.notifications;
create policy notifications_insert_member on public.notifications
  for insert to authenticated with check (public.is_room_member(room_id));

-- ---------- scheduled_time (레거시) ----------
drop policy if exists scheduled_time_all_member on public.scheduled_time;
create policy scheduled_time_all_member on public.scheduled_time
  for all to authenticated
  using (public.is_room_member(room_id)) with check (public.is_room_member(room_id));

-- ============================================================
-- [RLS 검토 필요] 운영 배포 전 반드시 결정할 것
--
-- 1. profiles_select 가 전체 공개입니다.
--    친구 검색(이름+태그)과 참여자 표시 때문인데, 결과적으로 로그인한
--    누구나 전체 사용자의 personal_data(생년월일·계좌·취향)를 읽습니다.
--    → privacy_settings를 DB에서 강제하거나, 검색 전용 RPC(이름+태그 완전일치)로
--      좁히고 profiles 직접 조회를 막는 방향을 권장합니다.
--
-- 2. rooms_select 가 전체 공개입니다.
--    초대코드 입장 흐름(참여 전 조회) 때문입니다. 코드가 6자리라
--    이론상 전수 조회가 가능합니다.
--    → 코드로 방을 찾는 security definer RPC를 만들고
--      rooms_select는 is_room_member(id)로 좁히는 것이 안전합니다.
--
-- 3. participants_insert 가 전체 허용입니다.
--    친구 초대 기능이 타인 행을 생성하기 때문입니다.
--    → 초대를 서버 함수로 옮기면 profile_id = auth.uid()로 좁힐 수 있습니다.
--
-- 4. follows_insert 가 전체 허용입니다. (맞팔로우 2행 생성)
--    → 팔로우 처리를 RPC로 옮기면 좁힐 수 있습니다.
--
-- 5. 앱이 익명 로그인을 쓰지 않고 이메일 가입만 지원하므로(AuthScreen.tsx)
--    모든 정책 대상을 authenticated로 뒀습니다. anon에는 아무 권한이 없습니다.
-- ============================================================

-- PostgREST 스키마 캐시 갱신 (이게 없으면 생성 직후 PGRST205가 뜰 수 있음)
notify pgrst, 'reload schema';
