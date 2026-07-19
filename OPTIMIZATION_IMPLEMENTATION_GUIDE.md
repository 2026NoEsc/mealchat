# Context API 성능 최적화 구현 가이드

## 1. 즉시 시작 가능한 최적화 (Quick Wins)

### 1.1 모든 Context의 value 메모이제이션 추가
**소요 시간**: 30분 | **예상 효과**: 30-40% 렌더링 성능 개선

#### 패턴
```typescript
// Before
const value: AuthContextType = {
  user,
  globalProfile,
  myFollows,
  authLoading,
  setUser,
  setGlobalProfile,
  setMyFollows,
  setAuthLoading,
  loadProfile,
  logout,
};

return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;

// After
const value = useMemo(() => ({
  user,
  globalProfile,
  myFollows,
  authLoading,
  setUser,
  setGlobalProfile,
  setMyFollows,
  setAuthLoading,
  loadProfile,
  logout,
}), [user, globalProfile, myFollows, authLoading, setUser, setGlobalProfile, setMyFollows, setAuthLoading, loadProfile, logout]);

return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
```

#### 수정 대상 Context
- AuthContext.tsx
- NetworkContext.tsx
- LoadingContext.tsx
- NavigationContext.tsx
- RoomContext.tsx
- ProfileContext.tsx
- RoomEditingContext.tsx
- LocationContext.tsx
- NotificationContext.tsx
- AIContext.tsx
- RoomCreationContext.tsx
- ScheduleContext.tsx

#### 검증
```bash
# React DevTools Profiler에서 각 Context 리렌더링 횟수 추적
# 변경 전후 비교
```

---

### 1.2 자주 변경되는 함수에 useCallback 추가
**소요 시간**: 40분 | **예상 효과**: 추가 20-30% 성능 개선

#### NotificationContext 예시
```typescript
// Before
const addNotification = (notif: AppNotification) => {
  setAppNotifications(prev => [...prev, notif]);
};

// After
import { useCallback } from 'react';

const addNotification = useCallback((notif: AppNotification) => {
  setAppNotifications(prev => [...prev, notif]);
}, []);
```

#### RoomCreationContext 예시
```typescript
// Before
const addInvitedProfile = (profile: Participant) => {
  setInvitedProfiles(prev => {
    if (!prev.find(p => p.id === profile.id)) {
      return [...prev, profile];
    }
    return prev;
  });
};

// After
const addInvitedProfile = useCallback((profile: Participant) => {
  setInvitedProfiles(prev => {
    if (!prev.find(p => p.id === profile.id)) {
      return [...prev, profile];
    }
    return prev;
  });
}, []);
```

#### 적용 대상
- NotificationContext: `addNotification`, `removeNotification`
- RoomCreationContext: `addInvitedProfile`, `removeInvitedProfile`

---

### 1.3 App.tsx의 fetchRooms dependency 수정
**소요 시간**: 5분 | **예상 효과**: 불필요한 리렌더링 감소

```typescript
// Before (line 994)
useEffect(() => {
  fetchRooms();
}, [currentRoom, user, globalProfile?.id]); // currentRoom 변경 시마다 호출

// After
useEffect(() => {
  fetchRooms();
}, [user, globalProfile?.id]); // 로그인 상태만 추적
```

**이유**: currentRoom 변경이 fetchRooms 재호출을 유발하여 무한 루프 가능성

---

## 2. 핵심 최적화 (Phase 1-3)

### 2.1 NavigationContext 분할 (1시간 소요)

**문제**: 7개의 독립적인 boolean state가 하나에 혼재 → 한 state 변경 시 모두가 리렌더링

#### 구조
```
NavigationContext (현재)
├── activeTab
├── showCreateModal
├── showNotifications
├── showRoomInfoModal
├── showSettingsModal
├── isSettingsGameActive
└── isSwipeBackBlocked

↓ 분할 후

TabNavigationContext
└── activeTab

ModalStatesContext
├── showCreateModal
├── showNotifications
├── showRoomInfoModal
├── showSettingsModal

InteractionBlockContext
├── isSettingsGameActive
└── isSwipeBackBlocked
```

#### 생성할 파일
1. `src/contexts/TabNavigationContext.tsx`
2. `src/contexts/ModalStatesContext.tsx`
3. `src/contexts/InteractionBlockContext.tsx`

#### 예시 코드
```typescript
// src/contexts/TabNavigationContext.tsx
import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

interface TabNavigationContextType {
  activeTab: 'schedule' | 'addons';
  setActiveTab: (tab: 'schedule' | 'addons') => void;
}

const TabNavigationContext = createContext<TabNavigationContextType | undefined>(undefined);

export const TabNavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'addons'>('schedule');

  const value = useMemo(() => ({
    activeTab,
    setActiveTab,
  }), [activeTab]);

  return <TabNavigationContext.Provider value={value}>{children}</TabNavigationContext.Provider>;
};

export const useTabNavigation = () => {
  const context = useContext(TabNavigationContext);
  if (context === undefined) {
    throw new Error('useTabNavigation must be used within TabNavigationProvider');
  }
  return context;
};
```

#### App.tsx 업데이트
```typescript
// Before
<NavigationProvider>
  <AppContent />
</NavigationProvider>

// After
<TabNavigationProvider>
  <ModalStatesProvider>
    <InteractionBlockProvider>
      <AppContent />
    </InteractionBlockProvider>
  </ModalStatesProvider>
</TabNavigationProvider>
```

#### 업데이트 영향 범위
- `setActiveTab` 호출 위치: ~15곳
- `setShowCreateModal` 호출 위치: ~10곳
- `showSettingsModal` 사용 위치: ~8곳

---

### 2.2 ScheduleContext 분할 (1.5시간 소요)

**문제**: 18개 state로 인한 과도한 리렌더링

#### 구조
```
ScheduleContext (현재: 18개 state)
│
├── Schedule 데이터 (변경 빈도: 낮음)
│   ├── mySchedule
│   └── selectedDate
│
└── Note Form (변경 빈도: 매우 높음)
    ├── noteDuration
    ├── noteTimeEnabled
    ├── noteTitle
    ├── noteContent
    ├── noteColor
    ├── noteVisibility
    ├── editingNoteId
    ├── editingRoomId
    ├── showNoteForm
    ├── noteTimeAmPm
    ├── noteTimeHour
    ├── noteTimeMinute
    ├── noteEndTimeAmPm
    ├── noteEndTimeHour
    ├── noteEndTimeMinute
    ├── showTimePickerModal
    └── activeTimeField

↓ 분할 후

ScheduleDataContext (낮은 변경)
├── mySchedule
├── selectedDate
├── setMySchedule
└── setSelectedDate

NoteFormContext (높은 변경)
├── (위의 16개 form state)
└── (위의 16개 setter)
```

#### 생성할 파일
1. `src/contexts/ScheduleDataContext.tsx`
2. `src/contexts/NoteFormContext.tsx`

#### App.tsx 업데이트
```typescript
// Before
<ScheduleProvider>
  <AppContent />
</ScheduleProvider>

// After
<ScheduleDataProvider>
  <NoteFormProvider>
    <AppContent />
  </NoteFormProvider>
</ScheduleDataProvider>
```

#### 주의사항
- `NoteFormContext`를 사용하는 컴포넌트는 form 입력 시에만 리렌더링
- `ScheduleDataContext`를 사용하는 컴포넌트는 일정 데이터 변경 시에만 리렌더링

---

### 2.3 App.tsx 상태 정리 (2시간 소요)

**목표**: 중복된 상태 제거, App.tsx 파일 크기 감소

#### 제거할 상태 (Context로 이동)
```typescript
// Before: App.tsx에서 관리되는 상태들
const [user, setUser] = useState<any | null>(null);
const [authLoading, setAuthLoading] = useState(true);
const [isOnline, setIsOnline] = useState(true);
const [networkError, setNetworkError] = useState<string | null>(null);
const [activeTab, setActiveTab] = useState<'schedule' | 'addons'>('schedule');
const [loading, setLoading] = useState(false);
// ... 50개 이상의 state

// After: Context에서만 관리
// App.tsx는 Context hooks만 사용
```

#### 리팩토링 전략
1. **단계별 마이그레이션**
   - 한 번에 하나의 state만 이동
   - 각 이동 후 테스트

2. **App.tsx 크기 감소**
   - 현재: 5126줄
   - 목표: 2000줄 이하

3. **검증 체크리스트**
   - [ ] 로그인/로그아웃 기능
   - [ ] 방 생성 및 입장
   - [ ] 실시간 메시지 동기화
   - [ ] 알림 표시
   - [ ] 정산 기능
   - [ ] 딥링크 자동 입장

---

## 3. 고급 최적화 (Phase 4)

### 3.1 Effect dependency 최적화
**소요 시간**: 30분

#### 수정 대상
```typescript
// 1. deepLink effect (line 570)
useEffect(() => {
  Linking.getInitialURL().then((url) => {
    if (url) handleDeepLink(url);
  });

  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url);
  });

  return () => {
    subscription.remove();
  };
}, [user, globalProfile]); // ❌ 전체 객체 비교

// Fix: user?.id와 globalProfile?.id만 추적
useEffect(() => {
  // ...
}, [user?.id, globalProfile?.id]); // ✓
```

```typescript
// 2. room sync subscription (line 1200)
useEffect(() => {
  // ...
}, [currentRoom?.id, globalProfile]); // ❌ globalProfile 전체

// Fix
useEffect(() => {
  // ...
}, [currentRoom?.id, globalProfile?.id]); // ✓
```

### 3.2 AbortController 추가 (45분)
**목표**: 언마운트 중 async 작업 완료 방지

```typescript
// Example: pendingJoinCode fetch
useEffect(() => {
  const controller = new AbortController();
  
  if (user && globalProfile) {
    (async () => {
      try {
        const code = await storage.getItem('pending_join_code');
        if (!controller.signal.aborted) {
          // Process code...
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error(err);
        }
      }
    })();
  }
  
  return () => controller.abort();
}, [user?.id, globalProfile?.id]);
```

---

## 4. 구현 체크리스트

### Phase 1: Foundation (30분 - 40분)
- [ ] AuthContext에 useMemo 추가
- [ ] NetworkContext에 useMemo 추가
- [ ] LoadingContext에 useMemo 추가
- [ ] NavigationContext에 useMemo 추가
- [ ] RoomContext에 useMemo 추가
- [ ] ProfileContext에 useMemo 추가
- [ ] RoomEditingContext에 useMemo 추가
- [ ] LocationContext에 useMemo 추가
- [ ] NotificationContext에 useMemo + useCallback 추가
- [ ] AIContext에 useMemo 추가
- [ ] RoomCreationContext에 useMemo + useCallback 추가
- [ ] ScheduleContext에 useMemo 추가

### Phase 2: Restructuring (3시간)
- [ ] TabNavigationContext 생성
- [ ] ModalStatesContext 생성
- [ ] InteractionBlockContext 생성
- [ ] NavigationProvider 제거
- [ ] ScheduleDataContext 생성
- [ ] NoteFormContext 생성
- [ ] ScheduleProvider 제거
- [ ] App.tsx에서 import 업데이트
- [ ] 모든 useNavigation 호출 위치 업데이트
- [ ] 모든 useSchedule 호출 위치 업데이트

### Phase 3: Consolidation (2시간)
- [ ] App.tsx에서 중복 상태 제거
- [ ] Context로 상태 이동 완료
- [ ] 통합 테스트 진행
- [ ] 회귀 테스트

### Phase 4: Fine-tuning (45분)
- [ ] Effect dependency 최적화
- [ ] AbortController 추가
- [ ] 성능 측정 및 검증

---

## 5. 성능 측정 방법

### React DevTools Profiler 사용
```javascript
// Chrome DevTools에서
1. Components 탭 → Profiler
2. 특정 UI 상호작용 기록
3. 리렌더링 횟수 및 시간 분석
4. 최적화 전후 비교
```

### 예상 결과
```
Before optimization:
- 한 state 변경 시 12개 Provider 모두 리렌더링
- 렌더링 시간: ~300ms

After optimization:
- 영향받은 Context만 리렌더링
- 렌더링 시간: ~100-150ms (50-60% 감소)
```

---

## 6. 주의사항

### 회귀 테스트 필수
- 로그인/로그아웃
- 모든 modal open/close
- tab switching
- 실시간 업데이트
- 딥링크 처리

### TypeScript 타입 유지
- 분할된 Context의 타입 정의 확인
- useXxxxx hook의 return type 확인

### 백업
- 변경 전 git commit
- 각 phase마다 commit

---

## 7. 예상 효과 요약

| 최적화 | 소요 시간 | 효과 | 누적 개선 |
|--------|----------|------|----------|
| Context value 메모이제이션 | 30분 | 30-40% | 30-40% |
| useCallback 추가 | 40분 | +20-30% | 50-70% |
| Context 분할 | 2시간 | +15-25% | 65-95% |
| App.tsx 정리 | 2시간 | +10-15% | 75-110% |
| 세부 최적화 | 45분 | +5-10% | 80-120% |

**전체 소요 시간**: ~8시간
**총 성능 개선**: 50-100% (특히 높은 빈도 상호작용에서)

---

## 8. 장기 유지보수

### 가이드라인
1. **새로운 Context 추가 시**
   - 필수: useMemo로 value 메모이제이션
   - 함수 사용 시: useCallback 고려

2. **상태 추가 시**
   - 변경 빈도 평가
   - 다른 상태와 독립적인지 확인
   - 필요시 새로운 Context 분할

3. **Effect 작성 시**
   - 정확한 dependency 지정
   - cleanup 함수 작성
   - 장시간 작업은 AbortController 고려
