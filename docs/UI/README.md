# 밀챗(MealChat) UI 계획서 — 인덱스

시연 영상 `docs/REQUIREMENTS/ui_video.mp4` (4분 49초 / 288초 / 1280x720 / 24fps)를
프레임 단위로 판독하고, 현행 소스 `src/` 와 1:1 대조하여 작성한 화면별 계획서 모음입니다.

## ⚠️ 먼저 읽어주세요

시연 영상은 **초기 커밋 `4640f95` 시점**의 앱입니다. 그 직후 UI 리디자인 커밋 12개가 들어가
현재 `HEAD`는 영상과 다른 화면을 렌더합니다. 특히 **방 목록 카드 / 정산 카드 / 프로필 카드**가 교체되었습니다.

→ **[14. 영상 시점 vs 현행 코드 차이](14-영상-현행코드-차이.md)** 를 먼저 보세요.

실제로 실기기에서 돌려 영상과 나란히 비교한 결과는 **[18. 영상 vs 실물 대조](18-영상-실물-대조.md)** 에 있습니다.
**UI 복원도는 사실상 100%**이며, 차이는 ⓐ 의도된 리디자인 ⓑ 데이터 부재 ⓒ 플랫폼 차이 셋뿐입니다.
2인 방을 구성해 **정산 상계·채팅 메시지까지 대조**했고, AI 적합도와 N빵 분배는 **계산 결과가 산식대로** 나오는 것도 확인했습니다.

## 판독 방법

- ffmpeg 장면 전환 감지(threshold 0.03) + 8초 균등 그리드를 합집합 후 최소 간격 2.5초로 정리 → 키프레임 60장
- 빈 구간 14장 추가 추출 → 총 74장 판독
- 영상은 **좌/우 2대 화면 동시 녹화**(좌: 방장 Dlwials / 우: 메이트 장)로, 실시간 동기화 동작을 보여주는 구성

## 화면 맵 (IA)

```
앱 루트 (App.tsx)
├── 하단 탭바 (2탭)
│   ├── [일정 조율] activeTab='schedule'  → 01
│   └── [채팅]     activeTab='addons'    → 02
│
├── 헤더 액션
│   ├── + 방만들기 → 03 (새 밀챗 방 만들기 모달)
│   ├── 🔔 알림
│   └── ⚙️ 설정 → 09 (설정/프로필) → 10 (취향 게임) / 11 (지도)
│
├── 방 진입 (currentRoom)
│   └── 채팅방 → 04
│       ├── 헤더 탭 → 05 (방 상세정보 모달)
│       ├── [일정 조율] roomOverlay='schedule' → 06
│       │   └── [AI 맞춤 추천] → 07 (AI 추천 일정 후보 TOP 3)
│       └── [N빵 정산]  roomOverlay='dutch'    → 08
│
└── 전역 오버레이 → 12 (알림/토스트/Alert)
```

## 문서 목록

| # | 문서 | 화면 | 주요 구현 파일 |
|---|---|---|---|
| 01 | [일정 조율 탭 (홈)](01-일정조율-탭.md) | 개인 캘린더·메이트 선택·AI 날짜/장소 추천 | `ScheduleGrid.tsx` (isGlobal) |
| 02 | [채팅 탭 (방 목록)](02-채팅-탭-방목록.md) | 방 목록·초대코드 입장·N빵 대장 진입 | `App.tsx`, `RoomCard.tsx` |
| 03 | [방 생성 및 입장](03-방-생성-및-입장.md) | 새 밀챗 방 만들기 모달 | `ScheduleGrid.tsx:4516` |
| 04 | [채팅방](04-채팅방.md) | 메시지·이모티콘·공지·만료 카운트다운 | `App.tsx` |
| 05 | [방 상세정보 모달](05-방-상세정보-모달.md) | 초대코드·장소·테마색·멤버 관리 | `App.tsx` |
| 06 | [일정 조율 패널](06-일정조율-패널.md) | 시간표 드래그·AI 추천 시간·확정 | `ScheduleGrid.tsx`, `CalendarModal.tsx` |
| 07 | [AI 추천 일정 후보 TOP 3](07-AI-추천-일정-TOP3.md) | 적합도 점수·날씨·이동·장소 추천 | `App.tsx:4960`, `aiRecommender.ts` |
| 08 | [N빵 정산](08-N빵정산.md) | 정산 요청·집계 현황·AI 영수증 | `DutchPay.tsx` |
| 09 | [설정 및 프로필](09-설정-및-프로필.md) | 프로필 편집·계정 완성하기 3단계 | `ProfileSetup.tsx` |
| 10 | [취향 매칭 게임](10-취향-매칭-게임.md) | 음식 스와이프·입맛 문답·주종·결과 | `ProfileSetup.tsx`, `foodData.ts` |
| 11 | [지도 위치 지정](11-지도-위치-지정.md) | 중앙 핀 방식 좌표 선택 | `ProfileSetup.tsx:2371` |
| 12 | [알림 및 피드백](12-알림-및-피드백.md) | 인앱 푸시 배너·Alert·에러 토스트 | `notificationUtils.ts` |
| 13 | [미노출 화면](13-미노출-화면.md) | 메뉴 룰렛·배민 설문 (영상에 없음) | `MenuRecommendation.tsx`, `BaeminSurvey.tsx` |
| 14 | [영상 vs 현행 코드 차이](14-영상-현행코드-차이.md) | 리디자인 12커밋으로 바뀐 화면 | — |
| 15 | [수정 내역](15-수정-내역.md) | 적용한 버그 수정·타입 정리·문서 정정 | — |
| 16 | [원본 기획서 대조](16-원본기획서-대조.md) | **`Meety.md`(PRD) vs 현행 구현** — 의도와 어긋난 지점 | — |
| 17 | [저장소 히스토리 구조](17-저장소-히스토리-구조.md) | 공통 조상 없는 두 계보 (6월 Meety / 7월 밀챗) | — |
| 18 | [**영상 vs 실물 대조**](18-영상-실물-대조.md) | 영상(iOS)과 실기기(Android) 나란히 비교 — **3회 대조, 12개 중 11개 화면, 이미지 10장** | — |
| 20 | [화면별 작업 분배표 (Figma 리디자인)](20-화면별-작업-분배표.md) | Figma 리디자인을 분업하기 위한 화면별 담당자/상태표. 작업 방법은 `.claude/skills/figma-to-mealchat-screen/SKILL.md` | — |

> 01~15는 **시연 영상에서 역산한 추정**입니다. 16번에서 원본 기획서와 대조해 어긋난 지점을 정리했으니 함께 보세요.

## ⚠️ 빌드 시 주의 — 네이티브 모듈을 추가하면 `android/` 재생성 필수

`react-native-safe-area-context`, `expo-system-ui` 등 **네이티브 모듈을 추가·변경하면**
Gradle이 이전 캐시를 재사용해 codegen을 건너뛰고 다음처럼 실패합니다.

```
fatal error: 'react/renderer/components/safeareacontext/EventEmitters.h' file not found
```

`gradlew clean`으로는 해결되지 않았습니다. 아래 순서를 따르세요.

```bash
cd android && ./gradlew.bat --stop     # 데몬이 android/를 점유하므로 먼저 종료
cd .. && rm -rf android
npx expo prebuild --platform android --no-install
npx expo run:android                   # --device 플래그는 시리얼이 아닌 '기기 이름'을 받음
```

JS만 바꿨다면 Metro의 Fast Refresh로 즉시 반영되므로 재빌드가 필요 없습니다.

## DB 스키마

원본이 유실되어 `types.ts`와 실제 쿼리 호출부에서 역산해 재구성했습니다 → **[`supabase/schema.sql`](../../supabase/schema.sql)**
(테이블 10개 · RLS 정책 27개 · 인덱스 9개 · Realtime 발행 4개)

## 공통 디자인 시스템

`src/lib/theme.ts` 기준. 영상의 화면은 전부 **라이트 모드**이며, 다크 팔레트는 정의만 되어 있고 영상에 등장하지 않습니다.

### 색상

| 토큰 | 값 | 용도 (영상 확인) |
|---|---|---|
| `primary` | `#23A455` | 주 액션 버튼(채팅/저장/확정), 활성 탭, 내 메시지 말풍선 |
| `primaryPressed` | `#1E8E49` | 눌림 상태 |
| `secondary` | `#00A3FF` | 캘린더 가용 시간 하이라이트, 메모 기본색 |
| `accent` | `#FF7A00` | 방 내 활성 서브탭(일정 조율/N빵 정산), 메시지 전송 버튼 |
| `warning` | `#FFD600` | 밀챗 옐로우 |
| `danger` | `#FF6B8B` | 방 나가기 버튼, 만료 카운트다운 배지 |
| `background` | `#FAFAFB` | 앱 배경 (실제 렌더는 옅은 살구빛 톤) |
| `confirmed` | `#9B59B6` | AI 추천 TOP 3 1순위 카드 테두리·확정 버튼 |
| `scheduleInProgress` | `#5B9BD5` | 조율 진행 중 |
| `menuNeeded` / `menuComplete` | `#FF8C42` / `#4ECDC4` | 메뉴 상태 |

`PALETTE_COLORS` 10색은 **약속 테마 색상 변경** 스와치에 그대로 사용됩니다 (05 문서).

### 레이아웃 규칙

- 모든 화면은 **단일 컬럼 세로 스크롤**, 좌우 여백 약 16px
- 섹션은 흰색 카드(`surface`) + 라운드 약 12~16px + 옅은 테두리(`cardBorder`)
- 섹션 제목은 **이모지 + 텍스트** 형식으로 통일 (`📅 캘린더 자동 연동`, `💸 N빵 정산`, `✨ AI 추천 …`)
- 필수 입력 라벨에 빨간 `*` 표기
- 하단 고정 탭바 2개, 활성 탭은 녹색 채움(pill)
- 모달은 중앙 카드형 + 반투명 딤(`modalOverlay`), 우상단 `×`
- 방 내 패널(일정 조율 / N빵 정산)은 **모달이 아니라 인라인 확장 오버레이**이며 헤더에 `‹ 제목` + `접기 ×`

### 타이포

- 본문 13~15px, 섹션 제목 15~16px Bold, 카드 타이틀 17~20px Bold
- 보조 설명은 `textMuted`(`#8E8E93`) 12~13px

## 핵심 데이터 모델

`src/lib/types.ts` 전체가 영상 UI와 정확히 일치합니다.

- `Room` — `code`(6자리 초대코드), `meeting_date`, `expires_at`(만료 카운트다운), `owner_id`, `is_confirmed`, `confirmed_slot`, `color`(테마색), `location_name`/`latitude`/`longitude`, `ai_recommendations`
- `Participant` / `Profile` — `personal_data`(`PersonalData`), `schedule`(`ScheduleAvailability`), `start_location_*`
- `PersonalData` — 튜토리얼 완료 플래그 3종(`hasCompletedProfilePhotoTutorial`/`LocationTutorial`/`FoodTasteTutorial`), `foodTasteScores`(meat/seafood/spicy/greasy/clean), `preferredFoods`, `profileEmoji`/`profileBgColor`, `travelTime`
- `ScheduleAvailability` — `{ "YYYY-MM-DD": ["HH:MM", ...] }` 30분 슬롯
- `AIRecommendation` — `rank`, `score`(적합도), `attendance_count`/`total_participants`, `weather_status`, `precipitation_probability`, `average_travel_time`, `ai_reason`, `recommended_place`
- `DutchPayBill` / `DutchPayMember` — 정산 요청과 인원별 완료 상태
- `Message`, `RoomNote`(`visibility: private|public|best`), `Follow`(`role: leader|mate`), `AppNotification`

## 확인된 이슈 (우선순위순)

각 문서에 상세를 남겼습니다. **✅ 표시는 수정 완료** — 상세는 [15 문서](15-수정-내역.md).

### ✅ 수정 완료 (런타임 버그)

**🔬 = 실기기로 동작까지 검증한 항목**

| 이슈 | 위치 |
|---|---|
| 🔬 **알림 기능 전체 불능** — `trigger: { type: 'seconds' }`가 SDK 54에서 무효. 7곳 모두 예외 발생 후 무음 실패 | `notificationUtils.ts` |
| 🔬 **예약 알림 전멸** — 미납 정산 체크가 30초마다 `cancelAllScheduledNotificationsAsync()` 호출. 리마인더가 예약 0.26초 뒤 삭제됨 | `App.tsx:935, 954, 1132` |
| 🔬 **일정 조율 그리드 미렌더** — `overflow:'hidden'`+`flex:1` 래퍼가 `ScrollView` 안에서 높이를 못 잡아 접힘. 시간표·저장·확정 버튼 전부 사라짐 (`4ea5a02` 회귀) | `App.tsx:3827` |
| 🔬 **일정 진행도 문구 분모/분자 역전** — 메뉴 탭과 동일 패턴 | `App.tsx:3803` |
| **구독 해제 시 TypeError** — `removeNotificationSubscription`이 SDK 54에서 제거됨 | `notificationUtils.ts:255` |
| **포그라운드 알림 표시 설정** — `shouldShowAlert` deprecated, `shouldShowBanner`/`shouldShowList` 필수 | `App.tsx:28` |
| **친구 목록 화면 크래시** — `Plus` 아이콘 미import → `ReferenceError` | `ProfileSetup.tsx:1390` |
| 🔬 **공개 범위 설정이 저장 안 됨** — `getSession()` 구조 분해 오류로 블록이 실행된 적 없음 | `ProfileSetup.tsx:933` |
| **패딩 미적용 3곳** — `pt`/`py` Tailwind 축약이 RN에서 무시됨 | `ScheduleGrid.tsx` |
| 정산 금액이 `¥`(엔화) | `DutchPay.tsx:1266` |
| 메뉴 진행도 분모/분자 역전 | `App.tsx:3422` |
| 🔬 빈 상태 안내 `[일정 조정]` ↔ 실제 탭 `일정 조율` | `App.tsx:4033` 외 |
| `userInterfaceStyle: "dark"`인데 앱은 라이트 테마. 게다가 `expo-system-ui` 미설치라 값 자체가 무효였음 (패키지도 함께 설치) | `app.json` |
| `favicon.ico` 참조하나 파일 없음 (`favicon.svg`만 존재) | `app.json` |
| **CI가 한 번도 실행된 적 없음** — 트리거가 `develop`/`feat/*`뿐 | `.github/workflows/build.yml` |
| 🔬 **의존성 릴리스 라인 불일치** — SDK 54 프로젝트에 `expo-dev-client@57`/`expo-image-manipulator@57`. **네이티브 빌드가 Kotlin 컴파일 에러로 실패** | `package.json` |
| 🔬 **정산 RLS 무한 재귀** — `dutch_pay_bills`↔`dutch_pay_members` 정책 상호 참조로 `42P17` | `supabase/fix-01-...sql` |
| 🔬 **SafeArea 미처리 — 상하단이 시스템 UI에 겹침** — `react-native` 내장 `SafeAreaView`는 **iOS 전용**이라 Android에서 무동작. 하단 탭바 터치가 3회 시도 필요했던 원인 | `App.tsx` 외 4파일 12곳 |
| **앱 시작 시 `방을 찾을 수 없습니다` Alert 반복** — effect 의존성이 객체 + `.single()`의 `PGRST116`를 에러 처리. LogBox 11건까지 누적 | `App.tsx:656` |

| 🔬 **취향 게임 수집값이 저장되지 않음** — `onSave()` payload에 5개 필드 누락. 주종·알레르기·지병·기피·선호음식이 전부 유실됐음. DB 조회로 저장 확인 | `ProfileSetup.tsx:763, 916` |
| 🔬 **스와이프백 PanResponder가 왼쪽 버튼을 삼킴** — `Capture` 단계에서 `pageX < 90`을 가로채 자식 버튼이 터치를 못 받음. 수정 후 x=100에서 정상 동작 확인 | `usePanResponderSwipeBack.ts` |

### ⚠️ 코드 수정했으나 실기기 미검증

| 이슈 | 수정 | 미검증 사유 |
|---|---|---|
| **`PendingJoinCode` Alert 반복** | effect 의존성 축소 + `useRef` 가드 + 읽는 즉시 제거 + `.maybeSingle()` | 검증 시점에 저장된 코드가 없어 로직이 실행되지 않음. [15](15-수정-내역.md) J-4 |

### 🔬 실기기에서 새로 발견 (미해결)

| 이슈 | 영향 | 문서 |
|---|---|---|
| **일정 조율 패널이 화면 하단 25%만 차지** | 그리드는 복구했으나 좁은 창으로 봐야 함. 오버레이가 `ScrollView`의 자식이라는 구조 문제 (영상에서는 화면 절반 이상) | [15](15-수정-내역.md) I-5 |
| **정산 알림 발송 미검증** | 수취인 기기에서는 미납 대상이 아니라 확인 불가. **채무자 쪽 기기**가 필요 | [15](15-수정-내역.md) K-5 |
| **데모 친구 seed가 RLS에 막힘** (`42501`) | 친구 0명 → **일정 조율 탭에서 방 개설 불가**("먼저 함께 조율할 친구를 선택해 주세요"). 채팅 탭 경로는 가능해 **두 경로의 검증 규칙이 다름** | [15](15-수정-내역.md) I-5 |
| **카카오 목업 폴백이 로그를 속임** | 키가 없어도 `Successfully loaded 3 venues from Kakao API` 출력. 목업이 `라스트오더 22:30, 연중무휴` 같은 그럴듯한 가짜 상세까지 생성 | [15](15-수정-내역.md) I-5 |
| **푸시 토큰 발급 실패** — `Default FirebaseApp is not initialized` | FCM 자격증명 미설정. 로컬 알림에는 영향 없음 | [12](12-알림-및-피드백.md) |

### 기능이 실제로 잘못 동작 (미해결)

| # | 이슈 | 위치 | 문서 |
|---|---|---|---|
| 0 | 🔴 🔬 **Android에서 지도 기능 전체 크래시** — `react-native-maps`가 Google Maps API 키를 요구하는데 `app.json`에 설정 없음. `MapView` 생성 시 `IllegalStateException: API key not found`. **영상은 iOS(Apple Maps)라 드러나지 않던 문제.** 출발지 지정·방 장소 선택 3곳 모두 사용 불가 | `app.json` | [11](11-지도-위치-지정.md) |
| 1 | 🔬 **출발지 미설정 참여자를 서울시청으로 취급** → 중간 지점이 엉뚱하게 나옴 (부산 시연인데 강남역). 프로필 폼에 `위도: 37.5665 경도: 126.9780`이 그대로 노출됨 | `ScheduleGrid.tsx:801` | [01](01-일정조율-탭.md) |
| 2 | 🔬 **약속 장소 좌표 누락** — AI 추천 장소로 확정 시 `(위도: undefined, 경도: undefined)`. 카카오 응답의 `x`/`y`를 매핑하지 않음. **영상·실기기 양쪽에서 동일 재현** | `aiRecommender.ts:30` | [05](05-방-상세정보-모달.md) · [18](18-영상-실물-대조.md) L |
| 3 | 🔴 🔬 **안심 지킴이 필터가 동작하지 않음** — 저장 값이 한글 라벨(`"갑각류"`)인데 `MENU_POOL`은 영문 코드(`shellfish`)로 매칭. `ALLERGY_PRESETS` 등 3개 상수가 **정의만 되고 미사용**이며 화면은 인라인 한글 배열을 씀. (저장 누락 자체는 수정 완료) | `ProfileSetup.tsx:1216, 1246, 1276` | [10](10-취향-매칭-게임.md) |
| 4 | **알림 탭 핸들러 4종 누락** — `unpaid_bill`, `appointment_reminder`, `user_joined`, `room_created`는 눌러도 아무 동작 없음 | `notificationUtils.ts:255` | [12](12-알림-및-피드백.md) |
| 5 | **방장 판정이 `owner_id`가 아닌 `created_at` 최솟값** → 방장 위임이 반영되지 않을 수 있음 | `App.tsx:274` | [03](03-방-생성-및-입장.md) |
| 6 | **실패를 무음 처리하는 패턴** — `try/catch`가 `console.error`만 찍고 사용자에겐 안내 없음. (알림 실패 자체는 수정했으나 이 패턴은 남아 있음) | `notificationUtils.ts` 전반 | [12](12-알림-및-피드백.md) |
| 7 | **알레르기 코드 체계가 두 벌** — `foodData.ts`는 `wheat`/`crustaceans`/`seafood`, `ProfileSetup`·`MenuRecommendation`은 `gluten`/`shellfish`/`fish`. `foodData.ts`의 `allergens`는 소비처가 없는 고아 데이터 | `foodData.ts` vs `ProfileSetup.tsx` | [10](10-취향-매칭-게임.md) |
| 8 | **`preferredFoods` 저장·소비 모두 없음** — ①단계에서 ♥ 한 음식이 payload에 없고, 읽는 곳도 없음 | — | [10](10-취향-매칭-게임.md) |
| 9 | **Context 13개가 전부 미사용** — Provider 12개를 중첩해 감쌌지만 `useNavigation()` 등 훅 호출이 0건. 상태는 `App.tsx`의 로컬 `useState` 56개에 그대로 있고 일부는 Context와 **중복 선언** | `contexts/*` | — |
| 10 | **`scheduled_time` 테이블을 DELETE만 함** — INSERT/SELECT 없는 레거시 | `App.tsx:2418` | [supabase/schema.sql](../../supabase/schema.sql) |

> 이전 판의 "초대 딥링크가 프로덕션에서 무효" 항목은 **오류였습니다.** 기본값이 `mealchat://`이고 개발 서버에서만 `exp://`로 바뀝니다 → [05 문서](05-방-상세정보-모달.md)

### 표기 오류 (미해결분)

| # | 이슈 | 위치 | 문서 |
|---|---|---|---|
| 11 | AI 추천 시간만 영문 로케일 (`Sat, Jul 25`) | `ScheduleGrid.tsx` | [06](06-일정조율-패널.md) |
| 12 | 성공 Alert 제목 혼재 — `완료` / `성공` / `{도메인} 완료` | 전역 | [12](12-알림-및-피드백.md) |
| 13 | 확정 알림 날짜 포맷 혼재 — `2026-07-25 16:30` vs `7월 25일 (토) 17:00` | 전역 | [12](12-알림-및-피드백.md) |
| 14 | 앱 이름 3종 혼재 — 밀챗 / `Bob-yak 초대:` (공유 시트) / `@meety_` (스토리지 키) | `App.tsx:2059`, `ScheduleGrid.tsx:1088` | [05](05-방-상세정보-모달.md) |
| 15 | Supabase 인증 실패 메시지가 영문 원문 그대로 | `AuthScreen.tsx:58` | [09](09-설정-및-프로필.md) |
| 16 | `1인당 ₩12,500`이 하드코딩된 더미 값 (TODO 주석만 추가함) | `App.tsx:3894` | [15](15-수정-내역.md) |

> **이모티콘 원시 코드 노출** 항목은 삭제했습니다. 리디자인으로 `RoomCard`에서
> 최근 메시지 미리보기 자체가 제거되어 현행 코드에는 해당 없습니다 → [14 문서](14-영상-현행코드-차이.md)

### 타입/구조

| # | 이슈 | 상태 | 문서 |
|---|---|---|---|
| 17 | `PersonalData` 필드 8개 미선언 | ✅ 선언 추가 (writer 연결은 미해결) | [15](15-수정-내역.md) |
| 18 | `TIME_SLOTS` 상수가 **3곳에 서로 다른 값**으로 중복 정의 | 미해결 | [06](06-일정조율-패널.md) |
| 19 | 허브역 12개 배열이 **2곳에 복붙** | 미해결 | [07](07-AI-추천-일정-TOP3.md) |
| 20 | `AppNotification`이 정산 전용인데 범용 이름 + 정산 필드가 필수 | 미해결 | [12](12-알림-및-피드백.md) |
| 21 | `TastePicker.tsx` 165줄 전체 미사용 | 미해결 | [10](10-취향-매칭-게임.md) |
| 22 | `BaeminSurvey.tsx` 455줄 — import만 되고 렌더 안 됨 | 미해결 | [13](13-미노출-화면.md) |
| 23 | `RoomNote` 인터페이스 미사용 (실제는 `calendar_notes`) | 미해결 | [01](01-일정조율-탭.md) |
| 24 | `MenuRecommendation.tsx`만 다크 테마 하드코딩 | [13](13-미노출-화면.md) |
| 25 | 태그(`#433`) 자동 발급에 중복 검사 없음 | [10](10-취향-매칭-게임.md) |
| 26 | 방 제목·장소·색상 변경에 권한 체크 없음 (전원 가능) | [05](05-방-상세정보-모달.md) |

### 시뮬레이션인데 실제처럼 보이는 것

| # | 항목 | 실제 | 문서 |
|---|---|---|---|
| 24 | 날씨 예보 | 날짜 숫자합을 시드로 한 **가짜 예보** (3단계 고정) | [07](07-AI-추천-일정-TOP3.md) |
| 25 | 배민 쿠폰 배너 | `{/* Mock AD Banner */}` — `View`라 탭조차 안 됨 | [01](01-일정조율-탭.md) |
| 26 | 배민 메뉴 검색 | 로컬 배열 10종 필터. API 연동 아님 | [13](13-미노출-화면.md) |
| 27 | 서버 푸시 | `getExpoPushTokenAsync()` 미호출. 전부 **로컬 알림** | [12](12-알림-및-피드백.md) |
| 28 | 장소 상세(영업시간·메뉴·가격) | 카카오는 `'정보 없음'` 고정. 실제 값은 **Gemini 생성** | [07](07-AI-추천-일정-TOP3.md) |
| 29 | AI 영수증 OCR | 시뮬레이션 폴백 경로 존재 (`📷 [시뮬레이션] 영수증 텍스트 OCR 판독 중...`) | [08](08-N빵정산.md) |

### 문구와 동작 불일치

| # | 이슈 | 문서 |
|---|---|---|
| 30 | `정산 내역은 폭파되지 않고 영구 보존` — 전원 완료 시 **자동 삭제**됨 | [08](08-N빵정산.md) |
| 31 | 공유 문구의 `메뉴 설문에 참여하세요!` — 해당 화면은 `RoomCard`의 `🍽 메뉴` 버튼으로만 도달 가능 | [05](05-방-상세정보-모달.md) |

> **`스마트폰 캘린더에도 자동 저장되었습니다`** 항목은 삭제했습니다. 초판에 "쓰기 호출 미발견"이라고
> 적었으나 오류입니다. `App.tsx:2523`, `ScheduleGrid.tsx:556` 등에서 `expo-calendar`의
> `createEventAsync` / `updateEventAsync` / `deleteEventAsync`를 실제로 호출합니다. 문구는 정확합니다.
