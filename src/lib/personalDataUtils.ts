/**
 * 알레르기·지병 값의 형식 차이를 흡수합니다.
 *
 * 왜 필요한가
 *   ProfileSetup 은 지금 id('shellfish')로 저장하지만, 예전에는 화면에 보이는
 *   한글 라벨('갑각류')로 저장했습니다. 메뉴 데이터(MENU_POOL)는 id 로 비교하므로
 *   **옛 형식으로 저장된 프로필은 필터가 하나도 걸리지 않습니다.**
 *   증상이 조용해서(오류 없이 그냥 안 걸림) 발견이 늦었습니다.
 *
 *   실제 DB 확인 결과: `allergyFoods: ['갑각류']` — 한글 라벨이 저장돼 있었습니다.
 *
 *   데이터를 일괄 변환하는 대신 **읽는 쪽에서 정규화**합니다.
 *   이미 배포된 앱이 옛 형식으로 쓸 수 있고, 마이그레이션은 되돌리기 어렵습니다.
 */

/**
 * 알레르기 표준 목록. **화면에서 고르는 항목은 전부 여기서 나옵니다.**
 *
 * 왜 한 곳으로 모았나
 *   예전에는 어휘가 세 벌이었습니다.
 *     · 취향 게임         → id ('shellfish')
 *     · 프로필 수정 화면  → 한글 라벨 하드코딩 ('갑각류', '견과류', '메밀'…)
 *     · 음식 데이터       → 또 다른 id ('crustaceans', 'wheat')
 *   셋 다 같은 `allergyFoods` 컬럼에 썼기 때문에, 어느 화면에서 골랐느냐에
 *   따라 저장값이 달라졌고 필터는 대부분 걸리지 않았습니다.
 *   목록이 갈라지면 또 어긋나므로 화면이 이 상수를 직접 렌더합니다.
 */
export const ALLERGY_PRESETS = [
  { id: 'peanuts', label: '땅콩 🥜' },
  { id: 'nuts', label: '견과류 🌰' },
  { id: 'shellfish', label: '갑각류 🍤' },
  { id: 'mollusks', label: '조개류 🦪' },
  { id: 'fish', label: '생선 🐟' },
  { id: 'egg', label: '계란 🥚' },
  { id: 'dairy', label: '유제품 🥛' },
  { id: 'gluten', label: '밀가루 🍞' },
  { id: 'buckwheat', label: '메밀 🌾' },
  { id: 'peach', label: '복숭아 🍑' },
  { id: 'tomato', label: '토마토 🍅' }
];

/** 지병·식단 표준 목록. 위와 같은 이유로 한 곳에 모았습니다. */
export const HEALTH_PRESETS = [
  { id: 'diabetes', label: '당뇨 🩸' },
  { id: 'hypertension', label: '고혈압 🩺' },
  { id: 'cholesterol', label: '고지혈증 🧈' },
  { id: 'gout', label: '통풍 🦶' },
  { id: 'stomach', label: '위장장애 🤢' },
  { id: 'gastritis', label: '만성 위염 🔥' },
  { id: 'reflux', label: '역류성식도염 🌡️' },
  { id: 'vegan', label: '비건 🥬' }
];

/**
 * 예전 화면이 저장했던 표기 중 라벨과 글자가 다른 것들입니다.
 * 이미 배포된 앱이 옛 표기로 쓸 수 있어 읽는 쪽에서 계속 받아줍니다.
 */
const LEGACY_ALIASES: Record<string, string> = {
  '우유': 'dairy',
  '밀': 'gluten',
  '위염': 'gastritis',
  '식도염': 'reflux'
};

/** '갑각류 🍤' / '갑각류' → 'shellfish' 형태의 조회표를 만듭니다. */
function buildLookup(presets: { id: string; label: string }[]): Map<string, string> {
  const map = new Map<string, string>();
  presets.forEach(({ id, label }) => {
    map.set(id, id);
    map.set(label, id);
    // 이모지를 뗀 순수 한글도 받아줍니다. 저장 시점에 따라 이모지가
    // 붙은 것과 안 붙은 것이 섞여 있습니다.
    const plain = label.replace(/[^가-힣a-zA-Z]/g, '').trim();
    if (plain) map.set(plain, id);
  });
  // 라벨과 글자가 다른 옛 표기('우유' → dairy 등)도 받아줍니다.
  Object.entries(LEGACY_ALIASES).forEach(([alias, id]) => {
    if (presets.some(p => p.id === id)) map.set(alias, id);
  });
  return map;
}

/**
 * id → 이모지를 뗀 한글 라벨. 화면에 보여줄 때 씁니다.
 *
 * 단어 단위로 걸러 이모지만 뗍니다. 라벨 전체에서 한글/영문이 아닌 문자를
 * 통째로 지우면 '만성 위염 🔥' 처럼 **라벨 안에 공백이 있는 경우** 그 공백까지
 * 같이 지워져 '만성위염' 이 됩니다.
 */
function buildLabels(presets: { id: string; label: string }[]): Map<string, string> {
  return new Map(
    presets.map(({ id, label }) => [
      id,
      label
        .split(' ')
        .filter((part) => /[가-힣a-zA-Z]/.test(part))
        .join(' ')
    ])
  );
}

const ALLERGY_LABELS = buildLabels(ALLERGY_PRESETS);
const HEALTH_LABELS = buildLabels(HEALTH_PRESETS);

/**
 * 저장값을 사람이 읽는 말로 바꿉니다.
 *
 * 화면이 저장값을 그대로 찍으면, id 로 저장된 프로필은 사용자에게
 * **'shellfish' 같은 영문 id 가 그대로 노출됩니다.** 표시 경로는 전부
 * 이 함수를 거쳐야 합니다.
 */
export const allergyLabel = (value: string): string =>
  ALLERGY_LABELS.get(normalizeAllergies([value])[0] ?? value) ?? value;

export const healthLabel = (value: string): string =>
  HEALTH_LABELS.get(normalizeHealthIssues([value])[0] ?? value) ?? value;

const ALLERGY_LOOKUP = buildLookup(ALLERGY_PRESETS);
const HEALTH_LOOKUP = buildLookup(HEALTH_PRESETS);

function normalize(values: string[] | undefined, lookup: Map<string, string>): string[] {
  if (!values) return [];
  const out: string[] = [];
  values.forEach((v) => {
    if (typeof v !== 'string') return;
    const trimmed = v.trim();
    const plain = trimmed.replace(/[^가-힣a-zA-Z]/g, '').trim();
    const id = lookup.get(trimmed) ?? lookup.get(plain);
    // 조회표에 없으면(사용자가 직접 입력한 값 등) 원본을 그대로 둡니다.
    // 버리면 그 항목이 조용히 무시되므로, 남겨서 최소한 문자열 비교라도 되게 합니다.
    const resolved = id ?? trimmed;
    if (resolved && !out.includes(resolved)) out.push(resolved);
  });
  return out;
}

/** 알레르기 값을 id 형식으로 정규화합니다. */
export const normalizeAllergies = (values: string[] | undefined): string[] =>
  normalize(values, ALLERGY_LOOKUP);

/** 지병 값을 id 형식으로 정규화합니다. */
export const normalizeHealthIssues = (values: string[] | undefined): string[] =>
  normalize(values, HEALTH_LOOKUP);
