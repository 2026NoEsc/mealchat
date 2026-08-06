import { normalizeAllergies, normalizeHealthIssues } from '../personalDataUtils';

/**
 * 이 정규화가 왜 있는지는 실제 사고에서 나왔습니다.
 *
 * ProfileSetup 이 예전에는 화면 라벨('갑각류')로 저장했는데 메뉴 데이터는
 * id('shellfish')로 비교합니다. 그래서 옛 데이터를 가진 사용자는
 * '안심 지킴이'가 알레르기를 하나도 걸러내지 못했습니다.
 * 오류 없이 그냥 안 걸리는 형태라 발견이 늦었습니다.
 */
describe('normalizeAllergies', () => {
  it('빈 입력은 빈 배열', () => {
    expect(normalizeAllergies(undefined)).toEqual([]);
    expect(normalizeAllergies([])).toEqual([]);
  });

  it('id 는 그대로 통과', () => {
    expect(normalizeAllergies(['shellfish', 'gluten'])).toEqual(['shellfish', 'gluten']);
  });

  it('이모지가 붙은 한글 라벨을 id 로 바꾼다', () => {
    expect(normalizeAllergies(['갑각류 🍤'])).toEqual(['shellfish']);
  });

  it('이모지 없는 한글 라벨도 id 로 바꾼다 (실제 DB에 이 형태로 저장돼 있었다)', () => {
    expect(normalizeAllergies(['갑각류'])).toEqual(['shellfish']);
  });

  it('id 와 라벨이 섞여 있어도 하나로 합친다', () => {
    // 같은 항목이 두 형식으로 들어와도 중복으로 세면 안 된다.
    expect(normalizeAllergies(['shellfish', '갑각류'])).toEqual(['shellfish']);
  });

  it('앞뒤 공백을 무시한다', () => {
    expect(normalizeAllergies(['  갑각류  '])).toEqual(['shellfish']);
  });

  it('조회표에 없는 값은 버리지 않고 남긴다', () => {
    // 사용자가 직접 입력한 항목을 버리면 그 알레르기가 조용히 무시된다.
    // (예시로 쓰던 '메밀'은 표준 목록에 편입되어 더 이상 미지의 값이 아니다.)
    expect(normalizeAllergies(['키위'])).toEqual(['키위']);
  });

  it('문자열이 아닌 값은 건너뛴다', () => {
    expect(normalizeAllergies([null as any, 123 as any, '갑각류'])).toEqual(['shellfish']);
  });

  it('프리셋 6종을 모두 매핑한다', () => {
    expect(
      normalizeAllergies(['땅콩', '갑각류', '생선', '복숭아', '유제품', '밀가루'])
    ).toEqual(['peanuts', 'shellfish', 'fish', 'peach', 'dairy', 'gluten']);
  });
});

describe('normalizeHealthIssues', () => {
  it('한글 라벨을 id 로 바꾼다', () => {
    expect(normalizeHealthIssues(['당뇨 🩸'])).toEqual(['diabetes']);
  });

  it('프리셋 4종을 모두 매핑한다', () => {
    expect(normalizeHealthIssues(['당뇨', '고혈압', '위장장애', '비건']))
      .toEqual(['diabetes', 'hypertension', 'stomach', 'vegan']);
  });

  it('알레르기 조회표와 섞이지 않는다', () => {
    // 두 조회표가 합쳐져 있으면 '갑각류'가 지병으로도 매칭돼버린다.
    expect(normalizeHealthIssues(['갑각류'])).toEqual(['갑각류']);
  });
});
