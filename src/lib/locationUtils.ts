/**
 * 출발 위치(이름 + 좌표) 정합성 규칙.
 *
 * ## 왜 이 파일이 있나
 *
 * 프로필의 `기본 출발 위치` 는 **이름과 좌표를 서로 다른 경로로** 받습니다.
 *
 * | 경로 | 이름 | 좌표 |
 * |---|---|---|
 * | 입력칸에 직접 타이핑 | ✅ | ❌ |
 * | `🔍 장소 검색` → 결과 선택 | ✅ | ✅ |
 * | `📡 현재 내 위치 (GPS)` | ❌ | ✅ |
 * | `🗺️ 지도에서 직접 지정` | ❌ | ✅ |
 *
 * 이름만 타이핑하고 검색을 누르지 않으면 좌표는 **초기값(서울시청)** 그대로
 * 남습니다. 그런데 AI 추천은 이름이 아니라 **좌표**로 중간지점과 이동 시간을
 * 계산합니다. 그래서 실제 테스트 프로필이 `Seomyeon`(부산 서면) + 서울시청
 * 좌표 상태였고, **부산 사용자가 서울 추천을 받았습니다.**
 *
 * 오류가 나지 않고 조용히 틀리기 때문에 화면만 봐서는 발견되지 않습니다.
 *
 * ## 규칙 — 틀린 좌표보다 없는 좌표가 낫다
 *
 * 좌표가 이름과 확실히 짝지어진 경우에만 저장합니다. 확신이 없으면 이름만
 * 저장하고 좌표는 `null` 로 둡니다. 계산하는 쪽(`resolveMeetingCenter`,
 * `calculateAverageTravelTime`)은 좌표 없는 참여자를 이미 평균에서 제외하므로,
 * `null` 은 "이 사람 위치는 모른다"로 정확히 해석됩니다.
 *
 * 반대로 서울시청 좌표를 그대로 두면 "이 사람은 서울시청에서 출발한다"는
 * **거짓 정보**가 되어 다른 참여자들의 약속 장소까지 끌고 갑니다.
 */

/** 지도 초기 중심으로 쓰는 값. 사용자의 위치가 아니라 그냥 화면 기본값입니다. */
export const SEOUL_CITY_HALL = { latitude: 37.5665, longitude: 126.978 };

/** 좌표 비교 허용 오차(도 단위). 약 10m. */
const COORD_EPSILON = 0.0001;

/**
 * 좌표가 계산에 쓸 수 있는 실수인지 확인합니다.
 * `null`·`undefined`·`NaN`·범위 밖 값을 걸러냅니다.
 */
export function isUsableCoordinate(
  latitude: unknown,
  longitude: unknown
): latitude is number {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  // (0, 0) 은 기니만 바다입니다. 이 앱에서는 "값이 안 들어왔다"는 뜻입니다.
  if (latitude === 0 && longitude === 0) return false;
  return true;
}

/**
 * 좌표가 지도 기본값(서울시청)인지 확인합니다.
 *
 * ⚠️ 진짜로 서울시청 근처에 사는 사람은 `장소 검색` 을 한 번 눌러야 좌표가
 *    확정됩니다. 잘못된 추천을 내보내는 것보다 한 번 더 누르게 하는 편이
 *    낫다고 판단했습니다. (라운드 Y-2 에서 "좌표 센티널" 냄새로 적어둔 것과
 *    같은 값이며, 이 함수가 그 판단을 한곳에 모읍니다.)
 */
export function isDefaultMapCenter(latitude: unknown, longitude: unknown): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  return (
    Math.abs(latitude - SEOUL_CITY_HALL.latitude) < COORD_EPSILON &&
    Math.abs(longitude - SEOUL_CITY_HALL.longitude) < COORD_EPSILON
  );
}

/**
 * 저장된 프로필을 화면에 다시 띄울 때, 그 좌표를 "확정된 것"으로 볼지 판단합니다.
 *
 * 이미 저장돼 있는 프로필 중에는 이 규칙이 생기기 전에 만들어진,
 * **이름은 부산인데 좌표는 서울시청**인 것들이 있습니다. 그런 값은 확정으로
 * 보지 않아야 다시 저장할 때 걸러집니다.
 */
export function isStoredLocationVerified(
  latitude: unknown,
  longitude: unknown
): boolean {
  if (!isUsableCoordinate(latitude, longitude)) return false;
  if (isDefaultMapCenter(latitude, longitude)) return false;
  return true;
}

export interface StartLocationDraft {
  /** 입력칸의 이름 (다듬기 전 값이어도 됩니다) */
  name: string;
  latitude: unknown;
  longitude: unknown;
  /**
   * 이 좌표가 **이름과 같은 동작으로** 정해졌는가.
   * 장소 검색 결과 선택 · GPS · 지도 선택이면 `true`,
   * 이름만 타이핑했으면 `false`.
   */
  verified: boolean;
}

export interface StartLocationForSave {
  start_location_name: string | null;
  start_latitude: number | null;
  start_longitude: number | null;
}

/**
 * 저장에 쓸 값으로 정리합니다.
 *
 * - 이름이 비었으면 좌표도 버립니다 (위치를 안 쓰겠다는 뜻).
 * - 확정되지 않았으면 **이름만 남기고 좌표는 버립니다.**
 * - 확정됐으면 셋 다 저장합니다.
 */
export function resolveStartLocationForSave(
  draft: StartLocationDraft
): StartLocationForSave {
  const name = (draft.name ?? '').trim();

  if (!name) {
    return { start_location_name: null, start_latitude: null, start_longitude: null };
  }

  const usable =
    draft.verified &&
    isUsableCoordinate(draft.latitude, draft.longitude) &&
    !isDefaultMapCenter(draft.latitude, draft.longitude);

  if (!usable) {
    return { start_location_name: name, start_latitude: null, start_longitude: null };
  }

  return {
    start_location_name: name,
    start_latitude: draft.latitude as number,
    start_longitude: draft.longitude as number
  };
}

/**
 * 저장 결과가 "이름은 있는데 좌표는 버려진" 상태인지 — 즉 사용자에게
 * 한마디 알려줘야 하는 상태인지 판단합니다.
 */
export function didDropCoordinates(saved: StartLocationForSave): boolean {
  return Boolean(saved.start_location_name) && saved.start_latitude === null;
}
