import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import RoomMenuTab from '../RoomMenuTab';

/**
 * 이 프로젝트의 **첫 화면 테스트**입니다.
 *
 * 왜 이 화면부터인가
 *   이번 세션에서 나온 결함은 죄다 화면 쪽이었는데(라운드 AE·AF·AJ),
 *   테스트 96건은 전부 `src/lib` 순수 함수였습니다. `tsc`·`eslint` 는
 *   "버튼을 눌러도 아무 일이 없다" 를 구조적으로 통과시킵니다.
 *
 *   메뉴 탭은 라운드 AF 에서 **막다른 길**이었던 곳입니다 — 첫 메뉴를 올릴
 *   수단이 화면에 없었습니다. 그 상태가 다시 돌아오지 않게 못을 박습니다.
 *
 * 컨텍스트를 모킹하는 이유
 *   `useRoom`/`useAI` 를 그대로 쓰면 Provider → supabaseClient →
 *   AsyncStorage(네이티브 모듈)까지 끌려옵니다. 화면 동작을 보는 데 필요 없는
 *   것들이라 훅 단위로 끊습니다.
 *
 * ⚠️ **`render` 는 비동기입니다.** RTL 14 의 `render()` 는 Promise 를 돌려줍니다.
 *   `await` 하지 않으면 단언이 렌더보다 먼저 돌아
 *   `render function has not been called` 로 전부 실패합니다.
 *   그래서 아래 `setup` 은 async 이고, 모든 it 이 async 입니다.
 *   `fireEvent` 도 같습니다 — `await` 하지 않으면 `changeText` 로 버튼이
 *   활성화되기 **전에** `press` 가 돌아 아무 일도 일어나지 않습니다.
 */

const mockUseRoom = jest.fn();
const mockUseAI = jest.fn();

jest.mock('../../contexts', () => ({
  useRoom: () => mockUseRoom(),
  useAI: () => mockUseAI(),
}));

type TestParticipant = {
  id: string;
  name: string;
  avatar_color: string;
  voted_items?: string[];
};

function participant(id: string, name: string, voted?: string[]): TestParticipant {
  return { id, name, avatar_color: '#000000', voted_items: voted };
}

async function setup(
  options: {
    participants?: TestParticipant[];
    currentParticipant?: TestParticipant | null;
    aiRecommendations?: any[];
    votingItems?: any[];
  } = {}
) {
  const participants = options.participants ?? [participant('p1', 'Tester')];
  const currentParticipant =
    options.currentParticipant === undefined ? participants[0] : options.currentParticipant;

  mockUseRoom.mockReturnValue({
    participants,
    currentParticipant,
    currentRoom: { id: 'r1', voting_items: options.votingItems ?? [] },
  });
  mockUseAI.mockReturnValue({ aiRecommendations: options.aiRecommendations ?? [] });

  const onUpdateMyVote = jest.fn();
  const onUpdatePoll = jest.fn();
  const view = await render(
    <RoomMenuTab onUpdateMyVote={onUpdateMyVote} onUpdatePoll={onUpdatePoll} />
  );
  return { onUpdateMyVote, onUpdatePoll, view };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('메뉴 직접 제안 — 라운드 AF 의 막다른 길', () => {
  it('메뉴가 하나도 없어도 직접 제안할 수단이 화면에 있다', async () => {
    const { view } = await setup();

    // 이것이 없던 것이 AF-1 이다. 빈 화면 안내문은 "직접 제안해 보세요" 라고
    // 적혀 있었는데 정작 입력칸이 없었다.
    expect(view.getByText('아직 선택된 메뉴가 없습니다.')).toBeTruthy();
    expect(view.getByPlaceholderText('예) 김치찌개')).toBeTruthy();
    expect(view.getByText('추가')).toBeTruthy();
  });

  it('입력하고 추가하면 내 표에 담긴다', async () => {
    const { onUpdateMyVote, view } = await setup();

    await fireEvent.changeText(view.getByPlaceholderText('예) 김치찌개'), '김치찌개');
    await fireEvent.press(view.getByText('추가'));

    expect(onUpdateMyVote).toHaveBeenCalledWith(['김치찌개']);
  });

  it('이미 고른 메뉴는 다시 담기지 않고 알린다', async () => {
    const me = participant('p1', 'Tester', ['김치찌개']);
    const { onUpdateMyVote, view } = await setup({ participants: [me], currentParticipant: me });

    await fireEvent.changeText(view.getByPlaceholderText('예) 김치찌개'), '김치찌개');
    await fireEvent.press(view.getByText('추가'));

    expect(onUpdateMyVote).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('알림', '이미 고른 메뉴입니다.');
  });

  it('앞뒤 공백은 다듬는다 (공백만 다른 중복이 생기지 않게)', async () => {
    const { onUpdateMyVote, view } = await setup();

    await fireEvent.changeText(view.getByPlaceholderText('예) 김치찌개'), '  김치찌개  ');
    await fireEvent.press(view.getByText('추가'));

    expect(onUpdateMyVote).toHaveBeenCalledWith(['김치찌개']);
  });

  it('빈 입력으로는 아무 일도 일어나지 않는다', async () => {
    const { onUpdateMyVote, view } = await setup();

    await fireEvent.changeText(view.getByPlaceholderText('예) 김치찌개'), '   ');
    await fireEvent.press(view.getByText('추가'));

    expect(onUpdateMyVote).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('방 참여 정보가 아직 없으면 조용히 삼키지 않고 알린다', async () => {
    const { onUpdateMyVote, view } = await setup({ currentParticipant: null });

    await fireEvent.changeText(view.getByPlaceholderText('예) 김치찌개'), '김치찌개');
    await fireEvent.press(view.getByText('추가'));

    expect(onUpdateMyVote).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      '알림',
      '방 참여 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.'
    );
  });

  it('이미 고른 메뉴가 있으면 그 뒤에 덧붙인다 (덮어쓰지 않는다)', async () => {
    const me = participant('p1', 'Tester', ['김치찌개']);
    const { onUpdateMyVote, view } = await setup({ participants: [me], currentParticipant: me });

    await fireEvent.changeText(view.getByPlaceholderText('예) 김치찌개'), '된장찌개');
    await fireEvent.press(view.getByText('추가'));

    expect(onUpdateMyVote).toHaveBeenCalledWith(['김치찌개', '된장찌개']);
  });
});

describe('AI 추천 메뉴 카드 — 라운드 AF 의 순환 조건', () => {
  it('추천 장소에 대표 메뉴가 없으면 카드 자체를 감춘다', async () => {
    // 카카오 로컬은 메뉴를 주지 않는다. 비어 있는 것이 정상 동작이고,
    // 그때 "AI 추천 메뉴" 라는 빈 카드를 띄우면 사용자는 고장으로 읽는다.
    const { view } = await setup({ aiRecommendations: [{ recommended_place: { menu: '' } }] });

    expect(view.queryByText('🤖 AI 추천 메뉴')).toBeNull();
  });

  it('대표 메뉴가 있으면 후보로 뜨고, 누르면 내 표에 담긴다', async () => {
    const { onUpdateMyVote, view } = await setup({
      aiRecommendations: [{ recommended_place: { menu: '삼겹살, 냉면' } }],
    });

    expect(view.getByText('🤖 AI 추천 메뉴')).toBeTruthy();
    await fireEvent.press(view.getByText('+ 삼겹살'));

    expect(onUpdateMyVote).toHaveBeenCalledWith(['삼겹살']);
  });

  it('여러 추천에 같은 메뉴가 있어도 후보는 한 번만 뜬다', async () => {
    const { view } = await setup({
      aiRecommendations: [
        { recommended_place: { menu: '삼겹살, 냉면' } },
        { recommended_place: { menu: '냉면' } },
      ],
    });

    expect(view.getAllByText('+ 냉면')).toHaveLength(1);
  });
});

describe('집계 표시', () => {
  it('몇 명이 골랐는지 센다', async () => {
    const { view } = await setup({
      participants: [participant('p1', 'Tester', ['김치찌개']), participant('p2', 'Mate')],
      currentParticipant: participant('p1', 'Tester', ['김치찌개']),
    });

    expect(view.getByText('2명 중 1명 선정 완료')).toBeTruthy();
  });

  it('참여자별 선택에 안 고른 사람은 대기 중으로 보인다', async () => {
    const { view } = await setup({
      participants: [participant('p1', 'Tester', ['김치찌개']), participant('p2', 'Mate')],
      currentParticipant: participant('p1', 'Tester', ['김치찌개']),
    });

    expect(view.getByText('선정 대기 중')).toBeTruthy();
    // 메뉴 카드와 참여자 줄 양쪽에 나온다.
    expect(view.getAllByText('김치찌개').length).toBeGreaterThan(0);
  });

  it('같은 메뉴를 고른 사람 수를 센다', async () => {
    const { view } = await setup({
      participants: [
        participant('p1', 'Tester', ['김치찌개']),
        participant('p2', 'Mate', ['김치찌개']),
      ],
      currentParticipant: participant('p1', 'Tester', ['김치찌개']),
    });

    expect(view.getByText('2명')).toBeTruthy();
  });
});

describe('메뉴 투표 연동 — 라운드 AL', () => {
  const pollItem = {
    id: 'b2',
    name: '허니콤보 치킨 🍗',
    category: '치킨',
    allergies: ['gluten'],
    healthIssues: ['hypertension'],
  };

  it('투표 목록이 비면 등록을 안내한다', async () => {
    const { view } = await setup();
    expect(view.getByText('🛵 메뉴 투표')).toBeTruthy();
    expect(view.getByText('투표할 메뉴가 없습니다. 아래에서 검색해 등록해 보세요.')).toBeTruthy();
  });

  it('표를 id 가 아니라 **메뉴 이름**으로 저장한다', async () => {
    // 이것이 이 케이스의 전부다. 예전 BaeminSurvey 는 voted_items 에 'b2' 같은
    // id 를 넣었고, 직접 제안은 이름을 넣었다. 같은 컬럼에 두 어휘가 섞이면
    // 집계가 조용히 틀린다 (라운드 AE-1 과 같은 부류).
    const { onUpdateMyVote, view } = await setup({ votingItems: [pollItem] });

    await fireEvent.press(view.getByText(pollItem.name));

    expect(onUpdateMyVote).toHaveBeenCalledWith([pollItem.name]);
    expect(onUpdateMyVote).not.toHaveBeenCalledWith(['b2']);
  });

  it('투표한 메뉴는 선택된 메뉴 목록과 같은 값으로 집계된다', async () => {
    const me = participant('p1', 'Tester', [pollItem.name]);
    const { view } = await setup({
      participants: [me],
      currentParticipant: me,
      votingItems: [pollItem],
    });

    // 투표 카드의 득표수와 아래 '선택된 메뉴' 카드가 같은 값을 본다.
    expect(view.getByText('득표: 1명 (100%)')).toBeTruthy();
    expect(view.getByText('1명')).toBeTruthy();
  });

  it('알레르기가 겹치면 경고를 붙인다 (안심 지킴이)', async () => {
    const me = {
      ...participant('p1', 'Tester'),
      personal_data: { allergyFoods: ['gluten'] },
    };
    const { view } = await setup({
      participants: [me as any],
      currentParticipant: me as any,
      votingItems: [pollItem],
    });

    expect(view.getByText(/밀가루 알레르기/)).toBeTruthy();
  });

  it('알 수 없는 알레르기 id 를 밀가루로 뭉뚱그리지 않는다', async () => {
    // 예전 코드는 삼항 사슬의 마지막이 '밀가루' 여서, 표준 목록이 11종으로
    // 늘어난 뒤 견과류·조개류·계란·메밀·토마토가 전부 '밀가루'로 표시됐다.
    const nutItem = { ...pollItem, id: 'x1', name: '견과 샐러드', allergies: ['nuts'] };
    const me = {
      ...participant('p1', 'Tester'),
      personal_data: { allergyFoods: ['nuts'] },
    };
    const { view } = await setup({
      participants: [me as any],
      currentParticipant: me as any,
      votingItems: [nutItem],
    });

    expect(view.getByText(/견과류 알레르기/)).toBeTruthy();
    expect(view.queryByText(/밀가루/)).toBeNull();
  });

  it('룰렛은 접혀 있고 눌러야 펼쳐진다', async () => {
    const { view } = await setup();

    expect(view.queryByText(/오늘의 추천 메뉴/)).toBeNull();
    await fireEvent.press(view.getByText('🎯 메뉴 룰렛으로 정하기'));
    expect(view.getByText('접기 ▲')).toBeTruthy();
  });
});

describe('메뉴 룰렛의 안심 지킴이 — MenuRecommendation 은 AL-2 의 수정을 안 받았었다', () => {
  // BaeminSurvey(투표 카드)는 라운드 AL-2 에서 allergyLabel/healthLabel 과
  // allergyFoods ?? allergies 폴백으로 고쳐졌지만, 같은 라운드에 연결된
  // MenuRecommendation(룰렛)은 옛 하드코딩 삼항 사슬과 단일 키 읽기가 그대로
  // 남아 있었다. 같은 화면 안에서 두 컴포넌트가 같은 데이터를 다르게 읽던 것이다.

  async function expandRoulette(view: Awaited<ReturnType<typeof setup>>['view']) {
    await fireEvent.press(view.getByText('🎯 메뉴 룰렛으로 정하기'));
  }

  it('표준 목록에 늘어난 알레르기를 밀가루로 뭉뚱그리지 않는다', async () => {
    const me = {
      ...participant('p1', 'Tester'),
      personal_data: { allergyFoods: ['nuts'] },
    };
    const { view } = await setup({ participants: [me as any], currentParticipant: me as any });

    await expandRoulette(view);

    expect(view.getByText(/견과류 알레르기/)).toBeTruthy();
    expect(view.queryByText(/밀가루/)).toBeNull();
  });

  it('지병도 표준 목록 전체를 라벨로 보여준다 (당뇨·저혈압 두 가지로 뭉뚱그리지 않는다)', async () => {
    const me = {
      ...participant('p1', 'Tester'),
      personal_data: { chronicDiseases: ['gastritis'] },
    };
    const { view } = await setup({ participants: [me as any], currentParticipant: me as any });

    await expandRoulette(view);

    expect(view.getByText(/만성 위염 대상/)).toBeTruthy();
    expect(view.queryByText(/비건식/)).toBeNull();
  });

  it('옛 프로필의 레거시 키(allergies)도 읽는다 — allergyFoods 만 보면 조용히 빠진다', async () => {
    const me = {
      ...participant('p1', 'Tester'),
      personal_data: { allergies: ['gluten'] },
    };
    const { view } = await setup({ participants: [me as any], currentParticipant: me as any });

    await expandRoulette(view);

    expect(view.getByText(/밀가루 알레르기/)).toBeTruthy();
  });

  it('가격·모임목적 필터로 후보가 1개 이하로 좁아져도 폴백이 안전 필터를 건너뛰지 않는다', async () => {
    // 가격 '1만원 이하' + 목적 '술이 우선'을 동시에 만족하는 메뉴는
    // MENU_POOL 에 부대찌개 하나뿐이라, 폴백 경로를 반드시 탄다.
    // 예전 폴백은 하드코딩된 6개(피자·치킨·초밥·돈까스 등)를 그대로 썼는데,
    // 그중 다수가 이 참가자의 알레르기(글루텐·유제품·생선·갑각류·땅콩)와 겹쳤다.
    const me = {
      ...participant('p1', 'Tester'),
      personal_data: { allergyFoods: ['gluten', 'dairy', 'fish', 'shellfish', 'peanuts'] },
    };
    const { view } = await setup({ participants: [me as any], currentParticipant: me as any });

    await expandRoulette(view);
    await fireEvent.press(view.getByText('1만원 이하 💰'));
    await fireEvent.press(view.getByText('술이 우선! 🍺'));

    expect(view.queryByText('피자 🍕')).toBeNull();
    expect(view.queryByText('치킨 🍗')).toBeNull();
    expect(view.queryByText('초밥 🍣')).toBeNull();
    expect(view.queryByText('돈까스 🍛')).toBeNull();
  });
});
