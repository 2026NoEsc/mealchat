import { supabase } from './supabaseClient';

/**
 * PostgREST 의 JWT 관련 오류 코드.
 *
 * PGRST301 : JWT invalid
 * PGRST303 : JWT expired / "JWT issued at future"
 *
 * PGRST303 의 "issued at future" 는 **기기 시계가 서버보다 앞서 있을 때** 난다.
 * 사용자가 시각을 수동으로 맞춰놨거나 자동 시간 동기화가 꺼져 있으면 발생하며,
 * 몇 초 차이로도 걸린다. 증상은 "로그인은 됐는데 프로필을 못 불러옴"이라
 * 사용자가 원인을 짐작하기 어렵다.
 */
const JWT_ERROR_CODES = new Set(['PGRST301', 'PGRST303']);

function isJwtError(error: any): boolean {
  if (!error) return false;
  if (JWT_ERROR_CODES.has(error.code)) return true;
  const msg = String(error.message ?? '');
  return msg.includes('JWT expired') || msg.includes('JWT issued at future');
}

export interface SupabaseResult<T> {
  data: T | null;
  error: any;
}

/**
 * Supabase 질의를 실행하되, JWT 문제로 실패하면 **세션을 갱신하고 한 번만
 * 다시 시도**한다.
 *
 * 왜 필요한가
 *   supabase-js 의 autoRefreshToken 은 만료 *예정* 토큰을 미리 갱신하지만,
 *   기기 시계가 어긋나 서버가 토큰을 거부하는 상황은 감지하지 못한다.
 *   클라이언트 입장에서는 아직 유효한 토큰이기 때문이다.
 *   그래서 서버가 거부한 뒤에 갱신을 걸어줘야 한다.
 *   refreshSession() 이 받아오는 토큰은 서버가 지금 발급한 것이라
 *   iat 이 정상이고, 재시도가 성공한다.
 *
 * 재시도는 한 번뿐이다. 시계가 크게 틀어져 있으면 새 토큰도 거부될 수 있고,
 * 그때는 무한 재시도 대신 호출부가 사용자에게 알리는 편이 낫다.
 *
 * @example
 *   const { data, error } = await withSessionRetry(() =>
 *     supabase.from('profiles').select('*').eq('id', userId).single()
 *   );
 */
export async function withSessionRetry<T>(
  run: () => PromiseLike<SupabaseResult<T>>
): Promise<SupabaseResult<T>> {
  const first = await run();
  if (!isJwtError(first.error)) return first;

  console.warn(
    '[withSessionRetry] JWT 거부됨. 세션을 갱신하고 한 번 더 시도합니다.',
    first.error?.code,
    first.error?.message
  );

  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    console.error('[withSessionRetry] 세션 갱신 실패:', refreshError);
    return first; // 원래 오류를 그대로 돌려준다 (갱신 실패로 바꿔치기하지 않음)
  }

  return await run();
}

/**
 * JWT 오류를 사용자가 이해할 수 있는 문구로 바꾼다.
 * 재시도까지 실패했을 때만 쓴다. 원인이 기기 시각이라는 점을 알려야
 * 사용자가 스스로 고칠 수 있다.
 */
export function describeJwtError(error: any): string | null {
  if (!isJwtError(error)) return null;
  return (
    '로그인 정보가 서버에서 거부되었습니다.\n' +
    '기기의 날짜·시각이 실제와 다르면 발생합니다.\n' +
    '설정에서 [자동 날짜 및 시간]을 켠 뒤 다시 시도해 주세요.'
  );
}
