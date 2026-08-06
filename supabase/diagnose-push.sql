-- 푸시 트리거 진단 — 네 가지 확인을 한 결과표로 합쳤습니다.
-- Supabase SQL Editor 는 여러 문장을 실행하면 마지막 결과만 보여주므로,
-- union all 로 묶어 한 번에 나오게 했습니다.
--
-- 읽는 법
--   1_vault      : 'project_url' 과 'push_function_secret' 두 줄이 다 나와야 함
--   2_trigger    : trg_message_push 등 4줄이 나와야 함
--   3_response   : status_code 가 200 이면 성공, 401 이면 비밀 불일치,
--                  아무 줄도 없으면 트리거가 호출 자체를 안 한 것
--   4_queue      : 처리 대기 중인 요청 수. 계속 쌓이면 pg_net 워커 문제

select '1_vault' as 구분,
       name      as 값1,
       created_at::text as 값2
  from vault.decrypted_secrets

union all
select '2_trigger',
       tgname,
       tgrelid::regclass::text
  from pg_trigger
 where tgname like 'trg_%push%'

union all
select '3_response',
       coalesce(status_code::text, '(응답없음)'),
       left(coalesce(content, error_msg, ''), 120)
  from net._http_response
 order by 1, 2;

-- 큐는 타입이 달라 따로 봅니다. 위 결과를 먼저 확인하세요.
-- select count(*) as 대기중 from net.http_request_queue;
