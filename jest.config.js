/**
 * 테스트 설정.
 *
 * 처음에는 `src/lib` 순수 함수만 덮었습니다. 컴포넌트까지 한 번에 넣으면
 * 설정이 커지고 실패 원인을 좁히기 어렵기 때문입니다.
 *
 * 이제 **화면 테스트까지 포함합니다.** 이유는 라운드 AK 에 적었습니다 —
 * 이번 세션에서 나온 결함(라운드 AE·AF·AJ)은 거의 전부 화면 쪽이었는데,
 * 그때 테스트 96건은 전부 순수 함수였습니다. `tsc`·`eslint` 는
 * "버튼을 눌러도 아무 일이 없다", "계좌가 엉뚱한 사람에게 보인다" 를
 * 구조적으로 통과시킵니다.
 *
 * ⚠️ 화면 테스트를 쓸 때 반드시 알아야 할 것
 *
 *   1. **`render` 와 `fireEvent` 는 비동기입니다** (RTL 14).
 *      `await` 를 빼면 단언이 렌더보다 먼저 돌아
 *      `render function has not been called` 로 전부 실패합니다.
 *
 *   2. **전역 `screen` 대신 `render()` 의 반환값을 쓰세요.**
 *      `const view = await render(<X />)` → `view.getByText(...)`
 *
 *   3. **컨텍스트는 훅 단위로 끊으세요.**
 *      `jest.mock('../../contexts', () => ({ useRoom: () => ... }))`
 *      Provider 를 그대로 쓰면 supabaseClient → AsyncStorage(네이티브 모듈)까지
 *      끌려옵니다.
 *
 *   4. **supabase 모킹 객체는 체인 가능하면서 thenable 이어야 합니다.**
 *      코드가 `.from().select().order()` 뒤에 조건부로 `.eq()` 를 더 붙이고
 *      await 하기 때문입니다. `DutchPaySettlement.test.tsx` 의 `makeQuery` 참고.
 *
 * ⚠️ 버전 고정
 *   - `jest@29` — jest@30 은 jest-expo@57 과 안 맞습니다
 *     (`clearMocksOnScope is not a function`).
 *   - `@testing-library/react-native@14` + `test-renderer@1`
 *     RTL 14 는 `react-test-renderer` 대신 `test-renderer` 를 씁니다
 *     (React 19 에서 react-test-renderer 가 빠졌기 때문입니다).
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  collectCoverageFrom: ['src/lib/**/*.ts', 'src/screens/**/*.tsx'],
};
