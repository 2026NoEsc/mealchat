// 밀챗 원격 푸시 발송 Edge Function (FCM HTTP v1 직접 호출)
//
// 왜 필요한가
//   expo-notifications 의 scheduleNotificationAsync 는 **그 기기에서만** 알림을
//   띄웁니다. 다른 사람 기기에 보내려면 서버가 푸시 서비스로 보내야 합니다.
//   기존 코드는 DutchPay 에서 클라이언트가 직접 exp.host 로 보내고 있었는데,
//   그러려면 남의 push_token 을 읽을 수 있어야 해서 profiles 를 전부 공개해야
//   했습니다(= 토큰을 긁어 임의 알림을 뿌릴 수 있음).
//
// 왜 Expo Push(exp.host) 가 아니라 FCM 직접인가
//   exp.host 를 쓰려면 FCM 서비스 계정 키를 `eas credentials` 로 Expo 서버에
//   업로드해야 합니다. 대화형 명령이라 자동화가 안 되고, 키가 한 곳 더
//   퍼집니다. 서비스 계정 키를 Supabase 시크릿에만 두고 FCM 에 직접 보내면
//   외부 의존이 하나 줄고 배포도 전부 비대화형으로 끝납니다.
//
// 호출 경로
//   Postgres 트리거 → net.http_post → 이 함수
//   (트리거는 supabase/migrations/*_push_notifications.sql 참고)
//
// 필요한 시크릿
//   PUSH_FUNCTION_SECRET   트리거와 공유하는 임의 난수
//   FCM_SERVICE_ACCOUNT    Firebase 서비스 계정 JSON 전문

import { createClient } from 'jsr:@supabase/supabase-js@2';

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

/** 앱의 setupNotificationListeners 가 해석하는 type 값과 반드시 일치해야 합니다. */
type NotificationType =
  | 'message'
  | 'unpaid_bill'
  | 'user_joined'
  | 'schedule_confirmed';

interface PushRequest {
  type: NotificationType;
  roomId: string;
  title: string;
  body: string;
  /** 이 프로필에게는 보내지 않습니다 (보통 행위자 본인) */
  excludeProfileId?: string | null;
  /**
   * 지정하면 방 전원이 아니라 **이 프로필들에게만** 보냅니다(독촉 알림 등).
   * null/미지정이면 예전처럼 방 전원(excludeProfileId 제외)에게 갑니다.
   */
  targetProfileIds?: string[] | null;
}

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// ── OAuth 액세스 토큰 ─────────────────────────────────────────────────────
// 유효기간이 1시간이라 모듈 스코프에 캐시합니다. 같은 인스턴스가 살아 있는 동안
// 재사용되어, 알림 한 건마다 토큰을 새로 받는 낭비를 막습니다.
let cachedToken: { value: string; expiresAt: number } | null = null;

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** PEM(-----BEGIN PRIVATE KEY-----) 을 WebCrypto 가 받는 CryptoKey 로 변환 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const raw = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'pkcs8',
    raw.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  // 만료 60초 전부터는 새로 받습니다. 경계에서 만료된 토큰을 쓰지 않기 위해서입니다.
  if (cachedToken && cachedToken.expiresAt - 60 > now) {
    return cachedToken.value;
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: FCM_SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: now,
    exp: now + 3600,
  };

  const enc = new TextEncoder();
  const unsigned =
    base64UrlEncode(enc.encode(JSON.stringify(header))) +
    '.' +
    base64UrlEncode(enc.encode(JSON.stringify(claim)));

  const key = await importPrivateKey(sa.private_key);
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    enc.encode(unsigned),
  );
  const jwt = unsigned + '.' + base64UrlEncode(new Uint8Array(sig));

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    throw new Error(`토큰 발급 실패 (HTTP ${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: now + (data.expires_in ?? 3600) };
  return cachedToken.value;
}

// ── 본문 ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });

  const expectedSecret = Deno.env.get('PUSH_FUNCTION_SECRET');
  if (!expectedSecret) {
    console.error('[send-push] PUSH_FUNCTION_SECRET 미설정');
    return json(500, { error: 'server misconfigured' });
  }
  if (req.headers.get('x-push-secret') !== expectedSecret) {
    return json(401, { error: 'unauthorized' });
  }

  let sa: ServiceAccount;
  try {
    sa = JSON.parse(Deno.env.get('FCM_SERVICE_ACCOUNT') ?? '');
    if (!sa.project_id || !sa.private_key || !sa.client_email) throw new Error('필드 누락');
  } catch (err) {
    console.error('[send-push] FCM_SERVICE_ACCOUNT 파싱 실패:', err);
    return json(500, { error: 'fcm credentials missing' });
  }

  let payload: PushRequest;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'invalid json' });
  }

  const { type, roomId, title, body, excludeProfileId, targetProfileIds } = payload;
  if (!type || !roomId || !title || !body) {
    return json(400, { error: 'type, roomId, title, body 는 필수입니다' });
  }

  // service_role 로 접속해야 RLS 를 우회하고 다른 사람의 토큰을 읽습니다.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let profileIds: string[];

  if (targetProfileIds && targetProfileIds.length > 0) {
    // 미입금자 독촉처럼 특정 프로필만 지정된 경우. 방 참여자 조회를 건너뛴다 —
    // 대상이 이미 정해져 있으므로 방 전원을 훑을 이유가 없다.
    profileIds = targetProfileIds.filter((id) => !!id && id !== excludeProfileId);
  } else {
    // 1) 방 참여자 수집 (기존 동작: 방 전원)
    const { data: participants, error: partErr } = await supabase
      .from('participants')
      .select('profile_id')
      .eq('room_id', roomId);

    if (partErr) {
      console.error('[send-push] 참여자 조회 실패:', partErr);
      return json(500, { error: 'participant lookup failed' });
    }

    profileIds = (participants ?? [])
      .map((p) => p.profile_id as string | null)
      .filter((id): id is string => !!id && id !== excludeProfileId);
  }

  if (profileIds.length === 0) return json(200, { sent: 0, reason: 'no recipients' });

  // 2) 토큰 조회. push_tokens 는 본인만 읽도록 RLS 가 걸려 있고 여기서는 우회합니다.
  const { data: rows, error: tokenErr } = await supabase
    .from('push_tokens')
    .select('profile_id, token')
    .in('profile_id', profileIds);

  if (tokenErr) {
    console.error('[send-push] 토큰 조회 실패:', tokenErr);
    return json(500, { error: 'token lookup failed' });
  }

  const targets = (rows ?? []).filter((r) => !!r.token) as
    { profile_id: string; token: string }[];

  if (targets.length === 0) {
    // 조용히 성공 처리하면 "왜 알림이 안 오지"를 추적할 수 없습니다.
    console.warn(
      `[send-push] type=${type} room=${roomId} 수신자 ${profileIds.length}명 중 ` +
        `토큰 보유자 0명. google-services.json 설정과 알림 권한을 확인하세요.`,
    );
    return json(200, { sent: 0, reason: 'no push tokens' });
  }

  // 3) FCM v1 발송.
  //    v1 REST 에는 다중 토큰 전송이 없어 토큰마다 한 번씩 보냅니다.
  //    data 값은 반드시 문자열이어야 합니다(숫자·불리언을 넣으면 400).
  let accessToken: string;
  try {
    accessToken = await getAccessToken(sa);
  } catch (err) {
    console.error('[send-push] 액세스 토큰 발급 실패:', err);
    return json(502, { error: 'oauth failed' });
  }

  const endpoint =
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  const results = await Promise.all(
    targets.map(async (t) => {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: t.token,
              notification: { title, body },
              // 앱의 탭 핸들러가 읽는 값. 로컬 알림과 같은 모양이라
              // setupNotificationListeners 가 구분 없이 처리합니다.
              data: { roomId, type },
              android: { priority: 'high', notification: { sound: 'default' } },
            },
          }),
        });

        if (res.ok) return { profileId: t.profile_id, ok: true, dead: false };

        const errBody = await res.json().catch(() => ({}));
        const status = errBody?.error?.details?.find(
          (d: { errorCode?: string }) => d.errorCode,
        )?.errorCode ?? errBody?.error?.status;

        // UNREGISTERED: 앱 삭제·토큰 만료. INVALID_ARGUMENT: 토큰 형식 오류.
        // 둘 다 다시 시도해도 소용없으므로 토큰을 지웁니다.
        const dead = status === 'UNREGISTERED' || status === 'INVALID_ARGUMENT';
        console.warn(
          `[send-push] FCM 실패 (HTTP ${res.status}, ${status}) profile=${t.profile_id}`,
        );
        return { profileId: t.profile_id, ok: false, dead };
      } catch (err) {
        console.error('[send-push] FCM 호출 예외:', err);
        return { profileId: t.profile_id, ok: false, dead: false };
      }
    }),
  );

  // 4) 죽은 토큰 정리. 그대로 두면 매번 실패하는 토큰에 계속 발송을 시도합니다.
  const dead = results.filter((r) => r.dead).map((r) => r.profileId);
  if (dead.length > 0) {
    const { error: delErr } = await supabase
      .from('push_tokens')
      .delete()
      .in('profile_id', dead);
    if (delErr) console.error('[send-push] 죽은 토큰 정리 실패:', delErr);
    else console.log(`[send-push] 등록 해제된 토큰 ${dead.length}건 삭제`);
  }

  const sent = results.filter((r) => r.ok).length;
  return json(200, { sent, failed: results.length - sent });
});
