-- ============================================================
-- FIX 01: dutch_pay RLS 무한 재귀 해결
--
-- 증상 (실기기 로그에서 확인):
--   'Error checking pending bills for notifications:'
--   { code: '42P17',
--     message: 'infinite recursion detected in policy for relation "dutch_pay_bills"' }
--
-- 원인:
--   dutch_pay_bills 정책이 dutch_pay_members를 서브쿼리로 조회하고,
--   dutch_pay_members 정책이 다시 dutch_pay_bills를 조회 → 상호 재귀.
--   RLS는 서브쿼리 대상 테이블의 정책도 평가하므로 무한 루프가 됩니다.
--
-- 해결:
--   participants에서 쓴 것과 동일하게 security definer 함수로 RLS를 우회해
--   재귀 고리를 끊습니다.
--
-- 적용: Supabase SQL Editor에 붙여넣고 Run (재실행 안전)
-- ============================================================

-- 이 청구 건의 정산 대상자인가? (dutch_pay_members의 RLS를 우회)
create or replace function public.is_bill_participant(target_bill uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dutch_pay_members m
    where m.bill_id = target_bill
      and m.profile_id = auth.uid()
  );
$$;

-- 이 청구 건의 생성자인가? (dutch_pay_bills의 RLS를 우회)
create or replace function public.is_bill_creator(target_bill uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dutch_pay_bills b
    where b.id = target_bill
      and b.creator_id = auth.uid()
  );
$$;

-- ---------- dutch_pay_bills 정책 재작성 ----------
drop policy if exists dutch_pay_bills_select on public.dutch_pay_bills;
create policy dutch_pay_bills_select on public.dutch_pay_bills
  for select to authenticated
  using (
    creator_id = auth.uid()
    or public.is_bill_participant(id)      -- 서브쿼리 → 함수로 교체
  );

-- ---------- dutch_pay_members 정책 재작성 ----------
drop policy if exists dutch_pay_members_select on public.dutch_pay_members;
create policy dutch_pay_members_select on public.dutch_pay_members
  for select to authenticated
  using (
    profile_id = auth.uid()
    or public.is_bill_creator(bill_id)     -- 서브쿼리 → 함수로 교체
  );

drop policy if exists dutch_pay_members_write on public.dutch_pay_members;
create policy dutch_pay_members_write on public.dutch_pay_members
  for all to authenticated
  using (
    profile_id = auth.uid()
    or public.is_bill_creator(bill_id)
  )
  with check (true);

notify pgrst, 'reload schema';
