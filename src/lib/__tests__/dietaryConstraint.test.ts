import { buildDietaryConstraintText } from '../aiRecommender';
import {
  ALLERGY_PRESETS,
  HEALTH_PRESETS,
  allergyLabel,
  healthLabel,
  normalizeAllergies,
  normalizeHealthIssues,
} from '../personalDataUtils';

const buildOne = (v: string) => normalizeAllergies([v])[0];
const buildOneHealth = (v: string) => normalizeHealthIssues([v])[0];
import { POPULAR_FOODS } from '../../constants/foodData';
import type { Participant } from '../types';

function p(personal_data: any): Participant {
  return { personal_data } as unknown as Participant;
}

/**
 * 프로필은 알레르기를 수집하는데 AI 추천은 `alcoholLiquor` 하나만 읽고 있었다.
 * 갑각류 알레르기가 있어도 추천 장소·메뉴에 전혀 반영되지 않았다는 뜻이다.
 * 이 함수가 비면 그 공백이 그대로 돌아온다.
 */
describe('buildDietaryConstraintText', () => {
  it('제약이 없으면 빈 문자열', () => {
    expect(buildDietaryConstraintText([p({}), p(undefined)])).toBe('');
  });

  it('참여자가 없어도 터지지 않는다', () => {
    expect(buildDietaryConstraintText([])).toBe('');
  });

  it('id 를 한글 라벨로 바꾼다', () => {
    // 프롬프트는 사람이 읽는 말로 들어가야 모델이 제대로 해석한다.
    expect(buildDietaryConstraintText([p({ allergyFoods: ['shellfish'] })]))
      .toBe('알레르기 갑각류');
  });

  it('예전 형식(한글 라벨 저장)도 받아준다', () => {
    // 실제 DB 에 `allergyFoods: ['갑각류']` 로 저장된 프로필이 있었다.
    expect(buildDietaryConstraintText([p({ allergyFoods: ['갑각류 🍤'] })]))
      .toBe('알레르기 갑각류');
  });

  it('이름이 다른 별칭 필드도 읽는다', () => {
    // allergies / health_issues 는 화면 일부가 쓰는 이름이다.
    // 한쪽만 보면 그 참여자의 제약이 조용히 빠진다.
    expect(buildDietaryConstraintText([p({ allergies: ['peanuts'] })]))
      .toBe('알레르기 땅콩');
    expect(buildDietaryConstraintText([p({ health_issues: ['vegan'] })]))
      .toBe('지병/식단 비건');
  });

  it('여러 참여자의 제약을 합집합으로 모은다', () => {
    // ⚠️ 다수결이 아니라 합집합이어야 한다.
    //    한 명이라도 못 먹으면 그 자리는 실패다.
    const text = buildDietaryConstraintText([
      p({ allergyFoods: ['shellfish'] }),
      p({ allergyFoods: ['peanuts'] }),
      p({}),
    ]);
    expect(text).toBe('알레르기 갑각류·땅콩');
  });

  it('같은 제약이 겹쳐도 한 번만 넣는다', () => {
    const text = buildDietaryConstraintText([
      p({ allergyFoods: ['shellfish'] }),
      p({ allergyFoods: ['갑각류'] }),
    ]);
    expect(text).toBe('알레르기 갑각류');
  });

  it('알레르기·지병·기피를 구분해 표기한다', () => {
    const text = buildDietaryConstraintText([
      p({ allergyFoods: ['gluten'], chronicDiseases: ['diabetes'], customDislikedFoods: ['오이'] }),
    ]);
    expect(text).toBe('알레르기 밀가루 / 지병/식단 당뇨 / 기피 오이');
  });

  it('조회표에 없는 값은 원본을 남긴다', () => {
    // 직접 입력한 항목을 버리면 그 제약이 조용히 무시된다.
    expect(buildDietaryConstraintText([p({ allergyFoods: ['메밀'] })]))
      .toBe('알레르기 메밀');
  });

  it('문자열이 아닌 값은 건너뛴다', () => {
    expect(buildDietaryConstraintText([p({ customDislikedFoods: [null, '', '  ', '가지'] })]))
      .toBe('기피 가지');
  });
});

/**
 * 음식 데이터와 프로필이 서로 다른 알레르기 어휘를 쓰면, 필터를 붙여도
 * **한 건도 안 걸린 채 조용히 통과**한다. 오류가 없어 눈으로는 안 보인다.
 * 실제로 foodData 는 wheat·crustaceans·seafood 를, 프로필은
 * gluten·shellfish·fish 를 쓰고 있었다.
 */
describe('음식 데이터의 알레르기 어휘', () => {
  const known = new Set(ALLERGY_PRESETS.map(a => a.id));

  it('POPULAR_FOODS 의 allergens 는 전부 ALLERGY_PRESETS 의 id 다', () => {
    const unknown = POPULAR_FOODS
      .flatMap(f => f.labels.allergens ?? [])
      .filter(a => !known.has(a));
    expect([...new Set(unknown)]).toEqual([]);
  });

  it('어휘가 실제로 겹친다 (빈 교집합이면 필터가 무력하다)', () => {
    const used = new Set(POPULAR_FOODS.flatMap(f => f.labels.allergens ?? []));
    expect(used.size).toBeGreaterThan(0);
  });
});

/**
 * 프로필 수정 화면은 한때 `['갑각류','견과류','메밀','밀',…]` 를 하드코딩해
 * 한글 라벨을 그대로 저장했다. 취향 게임은 id 를 저장했다. 같은 컬럼에
 * 두 어휘가 섞였고, 어느 화면에서 골랐느냐에 따라 필터가 걸리기도 안 걸리기도
 * 했다. 아래는 그 시절 저장값이 지금도 살아나는지 지킨다.
 */
describe('옛 화면이 저장한 한글 표기', () => {
  const legacyProfileEditor = ['갑각류', '견과류', '메밀', '밀', '복숭아', '우유', '조개류', '토마토', '계란'];
  const legacyDiseaseEditor = ['당뇨', '고혈압', '통풍', '역류성식도염', '만성 위염', '고지혈증'];

  it('알레르기 9종이 전부 id 로 해석된다', () => {
    const known = new Set(ALLERGY_PRESETS.map(a => a.id));
    const unresolved = legacyProfileEditor.filter(v => !known.has(buildOne(v)));
    expect(unresolved).toEqual([]);
  });

  it('지병 6종이 전부 id 로 해석된다', () => {
    const known = new Set(HEALTH_PRESETS.map(h => h.id));
    const unresolved = legacyDiseaseEditor.filter(v => !known.has(buildOneHealth(v)));
    expect(unresolved).toEqual([]);
  });

  it('id 로 저장된 값은 화면에 한글로 보인다', () => {
    // 그대로 찍으면 사용자에게 'shellfish' 가 노출된다.
    expect(allergyLabel('shellfish')).toBe('갑각류');
    expect(healthLabel('reflux')).toBe('역류성식도염');
  });

  it('모르는 값은 원본을 그대로 보여준다', () => {
    expect(allergyLabel('키위')).toBe('키위');
  });
});
