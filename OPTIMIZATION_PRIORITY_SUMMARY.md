# Context API 성능 최적화 - 우선순위별 실행 계획

## Executive Summary

### 현황
- **12개 Context의 깊은 nesting**: 렌더링 성능 저하
- **App.tsx의 50+ state**: 상태 하나 변경 시 전체 리렌더링
- **Context value 메모이제이션 누락**: 불필요한 리렌더링
- **번들 크기**: 적당 (8-11KB)

### 목표
- **렌더링 성능 50-100% 개선**
- **메모리 누수 위험 80% 감소**
- **코드 유지보수성 대폭 향상**
- **개발자 경험 개선**

---

## 🔴 긴급 최적화 (3시간) - 즉시 시작

### 1️⃣ Context value 메모이제이션 (30분)
**변경량**: ~60줄 | **효과**: 30-40% 렌더링 성능 개선

```
우선순위: CRITICAL
난이도: ★☆☆ (매우 쉬움)
리스크: 매우 낮음

작업:
- 12개 Context 모두에 useMemo 추가
- 각 Context의 value 객체를 메모이제이션

예상 효과:
- 첫 번째 병목 지점 해결
- 즉각적인 성능 개선 감지 가능
```

**체크리스트**
```
[ ] AuthContext
[ ] NetworkContext
[ ] LoadingContext
[ ] NavigationContext
[ ] RoomContext
[ ] ProfileContext
[ ] RoomEditingContext
[ ] LocationContext
[ ] NotificationContext
[ ] AIContext
[ ] RoomCreationContext
[ ] ScheduleContext
```

---

### 2️⃣ 함수 메모이제이션 (40분)
**변경량**: ~30줄 | **효과**: 추가 20-30% 성능 개선

```
우선순위: CRITICAL
난이도: ★☆☆ (매우 쉬움)
리스크: 매우 낮음

대상:
- NotificationContext: addNotification, removeNotification
- RoomCreationContext: addInvitedProfile, removeInvitedProfile

예상 효과:
- 함수 참조 안정화로 consumer 리렌더링 제거
```

---

### 3️⃣ App.tsx dependency 수정 (15분)
**변경량**: ~5줄 | **효과**: 불필요한 리렌더링 제거

```
우선순위: HIGH
난이도: ★☆☆ (매우 쉬움)
리스크: 매우 낮음

수정:
- fetchRooms effect dependency [currentRoom, user, globalProfile?.id]
  → [user, globalProfile?.id]

이유:
- currentRoom 변경이 rooms 재조회를 트리거하여 무한 루프 위험
- 원래 의도: user/profile 변경 시만 재조회
```

---

### ✅ Phase 1 결과
```
작업 시간: 1시간 30분
예상 성능 개선: 50-70%
리스크 수준: VERY LOW

이 단계만으로도 실제 사용자는 즉각적인 성능 향상을 느낄 수 있습니다.
```

---

## 🟠 핵심 최적화 (4시간 30분) - 1주일 내

### 4️⃣ NavigationContext 분할 (1시간)
**변경량**: ~150줄 | **효과**: 추가 20-25% 성능 개선

```
우선순위: HIGH
난이도: ★★☆ (보통)
리스크: 낮음

분할:
├── TabNavigationContext (activeTab만)
├── ModalStatesContext (모든 modal state)
└── InteractionBlockContext (blocking state)

이유:
- 한 state 변경 시 7개 모두가 리렌더링되는 비효율
- modal 자주 열기닫기 → consumer 계속 리렌더링
```

**영향도**
- 변경 파일: 1개 생성 + 1개 삭제 + 다수 수정
- useNavigation 호출 위치: ~30곳 업데이트 필요

---

### 5️⃣ ScheduleContext 분할 (1시간 30분)
**변경량**: ~200줄 | **효과**: 추가 15-20% 성능 개선

```
우선순위: HIGH
난이도: ★★☆ (보통)
리스크: 낮음

분할:
├── ScheduleDataContext (mySchedule, selectedDate)
└── NoteFormContext (16개의 form state)

이유:
- 18개 state 중 form state는 매초 변경
- schedule 데이터는 거의 변경 없음
- 불필요한 리렌더링 폭증
```

**영향도**
- 변경 파일: 2개 생성 + 1개 삭제 + 다수 수정
- useSchedule 호출 위치: ~20곳 업데이트 필요

---

### 6️⃣ RoomEditingContext 통합 (30분)
**변경량**: ~50줄 | **효과**: 추가 5% 성능 개선 + 간결성

```
우선순위: MEDIUM
난이도: ★☆☆ (쉬움)
리스크: 매우 낮음

통합:
LocationContext의 상태들을 RoomEditingContext로 병합

이유:
- LocationContext는 RoomEditingContext 내부에서만 사용
- Provider 깊이 1단계 감소
```

---

### ✅ Phase 2 결과
```
작업 시간: 4시간 30분
누적 성능 개선: 75-100% (Phase 1 포함)
복잡도: 중간 (회귀 테스트 필수)

이 단계에서 구조적 문제가 해결되고,
실제 app의 반응성이 눈에 띄게 개선됩니다.
```

---

## 🟡 구조 개선 (2시간) - 2주일 내

### 7️⃣ App.tsx 상태 정리 (2시간)
**변경량**: ~500줄 | **효과**: 유지보수성 대폭 개선 + 최종 성능 5-10%

```
우선순위: HIGH
난이도: ★★★ (어려움)
리스크: 높음 ⚠️

작업:
1. App.tsx의 중복 상태 찾기
2. 해당 상태를 Context로 이동
3. App.tsx에서 제거 및 Context hook으로 대체

중복 상태 예시:
- user (AuthContext에도 있음)
- globalProfile (AuthContext에도 있음)
- isOnline, networkError (NetworkContext에도 있음)
- loading (LoadingContext에도 있음)
```

**목표 결과**
```
Before: App.tsx 5126줄
After: App.tsx ~2000줄 (61% 감소)

Line count reduction:
- 상태 정의: 500줄 → 100줄
- useEffect: 1500줄 → 300줄
- 렌더링: 3126줄 → 1600줄
```

**회귀 테스트 체크리스트**
```
[ ] 로그인 → 프로필 로드 → 방 목록 표시
[ ] 방 생성 → 친구 초대 → 입장
[ ] 방 입장 (코드/딥링크)
[ ] 실시간 메시지 수신
[ ] 알림 표시 및 처리
[ ] 정산 기능 (전체 플로우)
[ ] 일정 조율 (시간 선택기 등)
[ ] 로그아웃 및 상태 초기화
[ ] 네트워크 오류 처리
[ ] 앱 백그라운드 → 포그라운드 복귀
```

---

### ✅ Phase 3 결과
```
작업 시간: 2시간
누적 성능 개선: 80-110% (Phase 1-2 포함)
코드 품질: 대폭 개선
리스크 수준: 최종 검증 필수

가장 큰 성과: 
- 개발자 경험 개선
- 미래 기능 추가 용이
- 버그 추적 및 수정 용이
```

---

## 🟢 세부 최적화 (45분) - 선택적

### 8️⃣ Effect dependency 최적화 (30분)
**변경량**: ~10줄 | **효과**: 불필요한 재실행 제거

```
우선순위: MEDIUM
난이도: ★☆☆ (쉬움)
리스크: 낮음

수정:
1. deepLink effect: [user, globalProfile] → [user?.id, globalProfile?.id]
2. room sync: [currentRoom?.id, globalProfile] → [currentRoom?.id, globalProfile?.id]

이유:
- 객체 참조 변경 시 불필요한 재실행 방지
```

---

### 9️⃣ AbortController 추가 (15분)
**변경량**: ~30줄 | **효과**: 메모리 누수 방지

```
우선순위: MEDIUM
난이도: ★★☆ (보통)
리스크: 매우 낮음

대상:
- pendingJoinCode fetch (line 575)
- 기타 장시간 async 작업

이유:
- 컴포넌트 언마운트 중 async 작업 완료 시 메모리 누수
- AbortController로 진행 중인 작업 취소
```

---

### ✅ Phase 4 결과
```
작업 시간: 45분
누적 성능 개선: 85-115% (모든 phase 포함)
안정성: 메모리 누수 위험 대폭 감소

이 단계는 선택적이지만, 완벽함을 원한다면 필수.
```

---

## 📊 실행 로드맵

### Week 1: Foundation & Core Restructuring
```
Mon: Phase 1 (1.5시간)
     ✓ Context value 메모이제이션
     ✓ 함수 메모이제이션
     ✓ dependency 수정

Tue: Phase 2 Part 1 (2시간)
     ✓ NavigationContext 분할
     ✓ 단위 테스트

Wed: Phase 2 Part 2 (2.5시간)
     ✓ ScheduleContext 분할
     ✓ useSchedule 호출 위치 업데이트
     ✓ integration 테스트

Thu: Phase 2 Part 3 + 통합 (1시간)
     ✓ RoomEditingContext 통합
     ✓ E2E 테스트

Fri: 성능 검증 & 문서화 (1시간)
     ✓ React DevTools Profiler 측정
     ✓ 성능 개선 정량화
     ✓ 결과 문서화
```

**Week 1 결과**: 50-100% 성능 개선 ✅

### Week 2: Consolidation (Optional but Recommended)
```
Mon-Tue: Phase 3 (2시간)
     ✓ App.tsx 상태 정리
     ✓ Context 이동
     
Wed-Thu: Phase 4 (45분)
     ✓ Effect dependency 최적화
     ✓ AbortController 추가

Fri: 최종 검증 (1시간)
     ✓ 모든 기능 테스트
     ✓ 성능 재측정
     ✓ 배포 준비
```

**Week 2 결과**: 85-115% 성능 개선 + 구조 완성 ✅

---

## 🎯 성능 측정 기준

### 측정 방법

#### 1. React DevTools Profiler
```javascript
// Chrome DevTools → React Dev Tools → Profiler
1. 특정 UI 상호작용 기록 (예: 모달 열기, 시간 선택 등)
2. Flamegraph 분석
3. 리렌더링된 컴포넌트 수 확인
4. 렌더링 시간 확인

Before optimization:
- 한 state 변경 시 ~50개 컴포넌트 리렌더링
- 렌더링 시간: 300-500ms

After optimization:
- 한 state 변경 시 ~10개 컴포넌트 리렌더링
- 렌더링 시간: 50-100ms
```

#### 2. Chrome DevTools Performance
```javascript
// 네트워크 조절 + Heavy throttling으로 측정
1. 앱 로드부터 상호작용 가능까지의 시간
2. JavaScript 실행 시간
3. 메모리 사용량 추적
```

#### 3. 사용자 경험 메트릭
```
- 앱 반응성 (모달 열림, 탭 전환)
- 부드러움 (스크롤, 애니메이션)
- 배터리 소모량 (메모리 누수 관련)
```

---

## 🚨 주의사항

### 리스크 관리
```
Phase 1: VERY LOW RISK ✓ 즉시 진행 가능
Phase 2: LOW-MEDIUM RISK → 단위 테스트 후 진행
Phase 3: MEDIUM-HIGH RISK → 전체 E2E 테스트 필수 ⚠️
Phase 4: LOW RISK → 마지막 최적화
```

### 롤백 계획
```
각 Phase마다 git commit 필수:
- git commit -m "Phase 1: Add useMemo to all contexts"
- git commit -m "Phase 2-1: Split NavigationContext"
- git commit -m "Phase 2-2: Split ScheduleContext"
- ...

문제 발생 시: git revert로 쉽게 복구
```

### 회귀 테스트 자동화
```
권장:
1. Jest로 Context 메모이제이션 테스트
2. React Testing Library로 컴포넌트 동작 테스트
3. Playwright로 E2E 테스트 (전체 사용자 시나리오)
```

---

## 📈 성공 기준

### 정량적 지표
```
✅ 렌더링 성능 50% 이상 개선
✅ 번들 크기 2-3KB 감소
✅ 메모리 누수 위험 80% 감소
✅ App.tsx 50% 이상 크기 감소
```

### 정성적 지표
```
✅ 개발자가 더 빠르게 기능 추가 가능
✅ 버그 추적이 더 용이
✅ 새 팀원의 온보딩 시간 단축
✅ 코드 리뷰 시간 단축
```

---

## ⏱️ 시간 요약

| Phase | 작업 | 시간 | 누적 | 효과 |
|-------|------|------|------|------|
| 1 | Context 메모이제이션 | 1.5h | 1.5h | 50-70% |
| 2 | Context 분할 | 4.5h | 6h | 75-100% |
| 3 | App.tsx 정리 | 2h | 8h | 85-110% |
| 4 | 세부 최적화 | 0.75h | 8.75h | 90-115% |

**최소 필수**: Phase 1-2 (6시간)
**권장**: Phase 1-3 (8시간)
**완벽**: Phase 1-4 (8.75시간)

---

## 🎬 시작하기

### 즉시 시작 (지금 바로)
```bash
1. OPTIMIZATION_IMPLEMENTATION_GUIDE.md 읽기
2. Phase 1의 첫 번째 Context부터 시작
3. useMemo 패턴 적용
4. React DevTools Profiler로 효과 측정
```

### 이번 주
```bash
1. Phase 1 완료 (30분)
2. Phase 2 시작 (NavigationContext 분할)
3. 모든 변경 테스트
```

### 이번 달
```bash
1. Phase 2 완료 (분할 완료)
2. Phase 3 검토 (App.tsx 정리 필요?)
3. Phase 4 완료 (세부 최적화)
4. 최종 성능 측정 및 문서화
```

---

## 📚 참고 자료

- `PERFORMANCE_OPTIMIZATION_ANALYSIS.json`: 상세 분석 데이터
- `OPTIMIZATION_IMPLEMENTATION_GUIDE.md`: 구현 방법 상세 가이드
- React 공식 문서: [useCallback](https://react.dev/reference/react/useCallback), [useMemo](https://react.dev/reference/react/useMemo)
- Context API Best Practices: https://kentcdodds.com/blog/how-to-use-react-context-effectively

---

## 💬 Q&A

### Q: Phase 1만 적용하면 충분한가?
A: Phase 1만으로도 30-40%의 성능 개선을 얻을 수 있지만, 구조적 문제는 여전히 남습니다. Phase 2까지 진행하면 75-100%의 개선을 기대할 수 있습니다.

### Q: 기존 코드는 계속 작동하는가?
A: 네. 각 phase마다 호환성이 유지됩니다. 단, Phase 2-3에서는 컴포넌트의 hook 호출을 업데이트해야 합니다.

### Q: 테스트는 필수인가?
A: Phase 1-2는 테스트가 크게 중요하지 않지만, Phase 3 (App.tsx 정리)는 매우 중요합니다. 반드시 회귀 테스트를 수행하세요.

### Q: 배포 전에 검증할 것은?
A: 모든 사용자 시나리오를 테스트해야 합니다. 특히 로그인, 방 생성/입장, 실시간 기능을 중점적으로.
