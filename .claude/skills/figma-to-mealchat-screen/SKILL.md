---
name: figma-to-mealchat-screen
description: Convert a screen from the MealChat Figma redesign into React Native code that fits this project's existing conventions. Use whenever implementing, updating, or reviewing a screen against the "Application UI" Figma file — whether picking up a new screen from the division-of-labor table, or checking whether an already-built screen matches the design.
---

# Figma → MealChat 화면 구현 스킬

이 스킬은 Figma의 "mealchat" 리디자인 파일을 실제 `src/` 코드로 옮길 때 여러 사람이 같은 방식으로 작업하도록 돕는다. 화면 하나를 맡았다면 이 문서를 처음부터 끝까지 따라가면 된다.

## 1. Figma 파일 좌표

- **파일 키**: `xBf3b09D6Bj1dTiCixt25e`
- **"Application UI" 페이지** — 실제 앱 화면. 아래 섹션으로 나뉘어 있음:
  - `1_로그인`, `1_회원가입`, `1.5_취향게임` — **온보딩/회원가입 플로우. 이번 리디자인 범위 밖(기존 `AuthScreen.tsx` 유지). 착수하지 말 것.**
  - `2_홈`, `2_프로필`, `2_채팅방`, `2_일정_조율` — 가입 이후 메인 앱 화면. 작업 대상은 전부 여기.
- **"Design System" 페이지** — 재사용 컴포넌트 정의:
  - `색상표` 섹션 — 색상 팔레트 참고용 (실제 값은 아래 §3 표 사용, 이미 `theme.ts`에 반영됨)
  - `컴포넌트 → 버튼` 섹션 — `CompleteButton`/`CompleteAndNextButton`/`AccentButton`/`AccentAndNextButton`/`DangerButton`
  - `컴포넌트 → 하단 네비게이션` 섹션 — `BottomNav1~4` (활성 탭만 다른 변형)
  - `컴포넌트 → 헤더` 섹션 — `AppHeader`
  - 그 외 `BackButton`, `AddButton` 등 화면별로 필요시 추가된 컴포넌트도 있을 수 있음 — 없으면 §4의 기존 RN 컴포넌트로 대체하거나 새로 만들 것

## 2. 화면 조회 절차

Figma MCP 도구가 연결되어 있다면:

1. `get_metadata`로 node id 없이 호출 → 페이지 목록 확인 → 대상 섹션의 node id로 다시 호출 → 화면(프레임) 이름과 id 목록 확보
2. 대상 화면의 node id로 `get_design_context` 호출 → 실제 레이아웃, 텍스트, 색상(hex), 버튼 컴포넌트 사용 여부까지 코드 형태로 확인 가능
3. 필요하면 `get_screenshot`으로 시각 확인

화면 이름은 `프로필/프로필 홈`, `채팅방/방 상세정보`처럼 `카테고리/화면명` 형태다.

## 3. 색상 매핑표 (`src/lib/theme.ts` 기준, 이미 반영됨)

| Figma 값 | `THEME` 토큰 |
|---|---|
| `#FF9900` (주 버튼, 활성 탭) | `THEME.primary` |
| `#F66F3E` → `#F6C53E` 그라디언트 | `THEME.accentGradientStart` → `THEME.accentGradientEnd` |
| `#E6E6E6` (화면 배경) | `THEME.background` |
| `#F3F3F3` (카드/서피스) | `THEME.surface` |
| `#000000` (본문 텍스트) | `THEME.text` |
| `#9C9C9C` (보조 텍스트) | `THEME.textMuted` |
| `#B4B2A8` (3차 텍스트) | `THEME.textTertiary` |
| `#E6E6E6` (테두리/구분선) | `THEME.border` / `THEME.cardBorder` |
| `#F53942` (위험/삭제) | `THEME.danger` |
| `#F7EFE6` (아이콘 틴트 배경) | `THEME.badgeBg` |
| `#737373` (홈 본문 보조 텍스트) | `THEME.textSecondary` |
| `#FF8C3B` (홈 배지 / 링크 강조) | `THEME.accentSoft` |
| `#FFD9B8` (PayNudge 카드 테두리) | `THEME.accentSoftBorder` |

**새 색상이 필요하면 컴포넌트에 하드코딩하지 말고 `theme.ts`에 토큰을 추가**하고 이 표에도 한 줄 추가할 것.

## 4. 컴포넌트 매핑표

| Figma 컴포넌트 | RN 구현 |
|---|---|
| `CompleteButton` | `<Button variant="complete" label="저장하기" onPress={...} />` (`src/components/Button.tsx`) |
| `CompleteAndNextButton` | `<Button variant="completeAndNext" label="다음 →" onPress={...} />` |
| `AccentButton` | `<Button variant="accent" label="..." onPress={...} />` |
| `AccentAndNextButton` | `<Button variant="accentAndNext" label="... →" onPress={...} />` |
| `DangerButton` | `<Button variant="danger" label="방 나가기" onPress={...} />` |
| `BottomNav1~4` | `<BottomNav activeTab={...} onTabChange={...} />` (`src/components/BottomNav.tsx`, 탭 4개: `home`/`schedule`/`chat`/`profile`) |
| `AppHeader` | `<AppHeader onBellPress={...} hasUnreadNotifications={...} />` (`src/components/AppHeader.tsx`, 내부에서 기존 `MealChatLogo.tsx` 재사용) |

버튼 텍스트의 화살표(`→`)는 컴포넌트가 자동으로 붙이지 않는다 — Figma 원본처럼 `label` 문자열에 직접 포함시킬 것.

## 5. 기존 화면 재사용 가이드 — **새 파일을 만들기 전에 반드시 확인**

Figma 화면 대부분은 이미 기능이 구현된 기존 코드가 있다. 처음부터 새로 만들지 말고 아래 대응 파일을 먼저 열어서 얼마나 재사용 가능한지 판단할 것.

| Figma 화면/개념 | 기존 RN 파일 | 비고 |
|---|---|---|
| `2_홈` 섹션 전체 | **없음 — 신규 설계 필요** | 현재 앱엔 별도 "홈" 탭이 없음. `분배표`의 별도 항목으로 다룸 |
| `일정 조율` 허브 | `src/screens/ScheduleTab.tsx` → `src/components/ScheduleGrid.tsx`(6227줄) | 로직은 그대로 두고 카드/컬러/버튼만 리스킨. 컴포넌트가 매우 크므로 전체를 한 번에 리팩터링하지 말고 섹션 단위로 접근 |
| `일정 조율/일정 추가/AI 추천 TOP3` | `ScheduleGrid.tsx` 내 AI 추천 로직 + `src/lib/aiRecommender.ts` | 별도 화면이 아니라 `ScheduleGrid` 내부 상태로 존재. Figma처럼 독립된 단계별 화면으로 분리할지, 기존처럼 인라인으로 둘지 판단 필요 |
| `프로필/프로필 홈`, `프로필/프로필 수정` | `src/components/ProfileSetup.tsx`(4179줄) | 내부에 `'main'\|'edit'\|'food_taste'` 뷰 상태 있음. 현재는 모달로만 열리는데, 4탭 전환 시 "프로필" 탭에서 모달 없이 바로 렌더해야 함 (§6 참고) |
| `프로필/지도 위치 지정` | `src/screens/LocationPickerModal.tsx`, `ProfileSetup.tsx`의 지도 선택 부분 (`SafeMapView` 사용) | |
| `취향게임/*` (스와이프) | `ProfileSetup.tsx` 내 스와이프 퀴즈 (`PanResponder`/`Animated`) | 이미 구현되어 있음. Figma 카드 UI/컬러만 맞추면 됨 |
| `채팅방/홈` (방 목록) | `src/screens/RoomListView.tsx` + `src/components/RoomCard.tsx` | |
| `채팅방/방 상세정보` | `src/screens/RoomInfoModal.tsx` | |
| `채팅/채팅방` (메시지 화면) | `App.tsx:3294-3624` 인라인 | 아직 별도 파일로 분리 안 됨. 리스킨하면서 분리해도 좋음 |
| `채팅/일정 패널` 오버레이 | `src/screens/RoomScheduleSheet.tsx`, `roomOverlay==='schedule'` | Figma는 오버레이(바텀시트+Dim)로 정리했으므로 구조 자체는 이미 유사함 |
| `채팅/정산 패널` 오버레이 | `src/components/DutchPay.tsx`(2240줄) | **구조 차이 있음**: Figma는 방 하나에 정산 1건(총액/1인당/참여자별 완료·미납)인데 현재 코드는 방 하나에 여러 청구서를 만들 수 있는 리스트+원장 구조. 무조건 축소하지 말고, 리스킨 시작 전에 이 구조 차이를 어떻게 다룰지 먼저 결정할 것 |
| `채팅/메뉴 패널` | `src/screens/RoomMenuTab.tsx` (+`BaeminSurvey.tsx`) | |
| `채팅/멤버 패널` | `RoomInfoModal.tsx`의 멤버 목록 부분 | |
| `채팅/채팅방/이모티콘` 패널 | `App.tsx` 채팅 입력창의 이모티콘 그리드 토글 | |
| `홈/알림` | `App.tsx`의 알림 드로어(`showNotifications`) | Figma는 전용 화면, 현재는 드로어. 4탭 전환과 별개로 판단 |
| `Onboarding/*`, `회원가입/*`, `1.5_취향게임`의 온보딩 진입부 | `src/components/AuthScreen.tsx` | **범위 제외 — 건드리지 않음** |

## 6. 알려진 구조적 차이 — 착수 전 반드시 인지

- **4탭 전환**: `src/contexts/NavigationContext.tsx`의 `activeTab: 'schedule' | 'addons'`을 `'home' | 'schedule' | 'chat' | 'profile'`로 확장하고 `App.tsx:3640-3662`의 인라인 탭바를 `<BottomNav>`로 교체하는 작업이 필요함. **아직 아무도 안 함** — 분배표에서 "네비게이션 통합" 항목을 먼저 처리한 뒤에 개별 화면들이 실제로 탭에 연결될 수 있음. 그 전까지는 화면 컴포넌트만 독립적으로 만들어 두고 스토리북처럼 임시로 렌더해서 확인해도 됨.
- **프로필이 탭이 됨**: 현재 프로필은 `showSettingsModal` 모달로만 열림 (`App.tsx:3673-3709`). 4탭 구조에서는 "프로필" 탭 자체가 `ProfileSetup`의 `'main'` 뷰를 모달 없이 렌더해야 함.
- **DutchPay 구조 불일치**: §5 표 참고.
- **다크 모드**: `theme.ts`의 `dark` 팔레트는 어디서도 참조되지 않는 죽은 코드. 신경 쓰지 않아도 됨.
- **온보딩/회원가입 플로우 전체 제외**.

## 7. 작업 절차 체크리스트

1. `docs/UI/20-화면별-작업-분배표.md`에서 담당 화면 확인, 상태를 `진행중`으로 변경
2. §2 절차로 Figma에서 해당 화면의 레이아웃/텍스트/색상 확인
3. §5 표에서 재사용 가능한 기존 파일 확인 — **처음부터 새로 만들지 말 것**
4. §3, §4 표에 따라 `theme.ts` 토큰과 `Button`/`BottomNav`/`AppHeader`를 사용
5. 스타일링은 기존 컨벤션을 따름: 컴포넌트별 `StyleSheet.create`, `THEME.*` 참조 (하드코딩 hex 금지), `RoomCard.tsx`/`AuthScreen.tsx`를 스타일 참고용으로 볼 것
6. 컴포넌트라면 `src/components/__tests__/`에 렌더 스모크 테스트 작성 (`Button.test.tsx` 참고 — `@testing-library/react-native`의 `render`/`fireEvent`는 **반드시 `await`** 할 것, 안 그러면 `findByText is not a function` 에러)
7. `npx tsc --noEmit`, `npx eslint <파일들>`, `npx jest <테스트파일>` 통과 확인
8. `npx expo start`로 실기기/에뮬레이터에서 육안 확인 (가능하면)
9. `docs/UI/20-화면별-작업-분배표.md` 상태를 `완료`로 갱신
10. 작은 단위로 커밋 (화면 하나 = 커밋 하나 정도)
