# App.tsx 상태 관리 리팩토링 가이드

## 목차
1. [현황 분석](#현황-분석)
2. [Context 구조](#context-구조)
3. [구현 템플릿](#구현-템플릿)
4. [마이그레이션 전략](#마이그레이션-전략)

---

## 현황 분석

### 상태 분포
- **총 상태 변수**: 53개
- **총 그룹**: 12개의 논리적 Context
- **가장 큰 Context**: RoomContext (8개 상태)
- **가장 작은 Context**: AIRecommendationContext (2개 상태)

### 주요 문제점
```
1. Props Drilling: 깊은 컴포넌트 계층에 전달되는 props이 과도함
2. 상태 응집력 부족: 관련 없는 상태들이 한 곳에서 관리됨
3. 테스트 어려움: 전체 App 상태를 제공해야 테스트 가능
4. 코드 가독성: 5000줄 이상의 단일 파일
5. 렌더링 최적화 불가: 작은 상태 변경도 전체 리렌더링 유발
```

---

## Context 구조

### 1. AuthContext
**책임**: 사용자 인증 및 세션 관리

```typescript
interface AuthContextType {
  user: any | null;
  authLoading: boolean;
  setUser: (user: any | null) => void;
  setAuthLoading: (loading: boolean) => void;
}
```

**사용 사례**:
- Supabase 세션 초기화
- 로그인/로그아웃 상태 추적
- 인증 필요 화면 표시 판단

---

### 2. NetworkContext
**책임**: 네트워크 상태 및 에러 관리

```typescript
interface NetworkContextType {
  isOnline: boolean;
  networkError: string | null;
  setIsOnline: (online: boolean) => void;
  setNetworkError: (error: string | null) => void;
}
```

**사용 사례**:
- API 오류 처리
- 재시도 로직
- 오프라인 모드 표시

---

### 3. NavigationContext
**책임**: 앱 레이아웃 및 모달 네비게이션

```typescript
interface NavigationContextType {
  activeTab: 'schedule' | 'addons';
  roomSubTab: 'schedule' | 'menu' | 'baemin' | 'dutch';
  showSettingsModal: boolean;
  isSettingsGameActive: boolean;
  isSwipeBackBlocked: boolean;
  
  setActiveTab: (tab: 'schedule' | 'addons') => void;
  setRoomSubTab: (tab: 'schedule' | 'menu' | 'baemin' | 'dutch') => void;
  setShowSettingsModal: (show: boolean) => void;
  setIsSettingsGameActive: (active: boolean) => void;
  setIsSwipeBackBlocked: (blocked: boolean) => void;
}
```

**주요 특징**:
- 탭 전환 로직 통합
- 모달 상태 중앙 관리
- 스와이프 제스처 제어

---

### 4. RoomContext
**책임**: 방 정보, 참여자, 메시지, 실시간 동기화

```typescript
interface RoomContextType {
  currentRoom: Room | null;
  participants: Participant[];
  currentParticipant: Participant | null;
  roomList: Room[];
  roomMessages: Message[];
  newMessageText: string;
  roomOverlay: 'schedule' | 'dutch' | null;
  timeLeft: string;
  
  setCurrentRoom: (room: Room | null) => void;
  setParticipants: (pts: Participant[]) => void;
  setCurrentParticipant: (pt: Participant | null) => void;
  setRoomList: (rooms: Room[]) => void;
  setRoomMessages: (msgs: Message[]) => void;
  setNewMessageText: (text: string) => void;
  setRoomOverlay: (overlay: 'schedule' | 'dutch' | null) => void;
  setTimeLeft: (time: string) => void;
}
```

**실시간 기능**:
- Supabase Realtime 구독 (participants, messages, rooms)
- 24시간 카운트다운 타이머
- 메시지 추가 시 자동 스크롤

---

### 5. ProfileContext
**책임**: 사용자 프로필 및 팔로우 관계

```typescript
interface ProfileContextType {
  globalProfile: Profile | null;
  myFollows: Follow[];
  selectedProfile: Profile | null;
  selectedProfileId: string | null;
  showProfileModal: boolean;
  
  setGlobalProfile: (profile: Profile | null) => void;
  setMyFollows: (follows: Follow[]) => void;
  setSelectedProfile: (profile: Profile | null) => void;
  setSelectedProfileId: (id: string | null) => void;
  setShowProfileModal: (show: boolean) => void;
}
```

**연관 기능**:
- 프로필 수정
- 팔로우/언팔로우
- 프로필 모달 표시

---

### 6. FriendSearchContext
**책임**: 친구 검색 및 추천

```typescript
interface FriendSearchContextType {
  searchFriendQuery: string;
  searchFriendResults: Profile[];
  recommendedFriends: Profile[];
  isSearchingFriends: boolean;
  lastMessageSender: string | null;
  
  setSearchFriendQuery: (query: string) => void;
  setSearchFriendResults: (results: Profile[]) => void;
  setRecommendedFriends: (friends: Profile[]) => void;
  setIsSearchingFriends: (searching: boolean) => void;
  setLastMessageSender: (sender: string | null) => void;
}
```

**기능**:
- 이름/태그 검색
- 추천 친구 목록 (최대 5명)
- 이미 팔로우한 사용자 필터링

---

### 7. RoomCreationContext
**책임**: 새 방 생성 및 코드 기반 참여

```typescript
interface RoomCreationContextType {
  showCreateModal: boolean;
  newRoomTitle: string;
  newRoomDate: string;
  createRoomSelectedFriends: string[];
  joinRoomCode: string;
  
  setShowCreateModal: (show: boolean) => void;
  setNewRoomTitle: (title: string) => void;
  setNewRoomDate: (date: string) => void;
  setCreateRoomSelectedFriends: (ids: string[]) => void;
  setJoinRoomCode: (code: string) => void;
}
```

**프로세스**:
1. 방 생성 모달 열기
2. 방 정보 입력 (이름, 날짜, 친구)
3. 코드 기반 참여 (6자리 영숫자)

---

### 8. RoomEditingContext
**책임**: 방 정보 편집 UI

```typescript
interface RoomEditingContextType {
  showRoomInfoModal: boolean;
  isEditingRoomTitle: boolean;
  editingRoomTitle: string;
  isEditingRoomLocation: boolean;
  editingRoomLocationName: string;
  editingRoomLatitude: number;
  editingRoomLongitude: number;
  
  setShowRoomInfoModal: (show: boolean) => void;
  setIsEditingRoomTitle: (editing: boolean) => void;
  setEditingRoomTitle: (title: string) => void;
  setIsEditingRoomLocation: (editing: boolean) => void;
  setEditingRoomLocationName: (name: string) => void;
  setEditingRoomLatitude: (lat: number) => void;
  setEditingRoomLongitude: (lng: number) => void;
}
```

**편집 가능 항목**:
- 방 이름
- 약속 장소 (지도 선택)

---

### 9. NotificationContext
**책임**: 정산 알림 및 N빵 대장

```typescript
interface NotificationContextType {
  appNotifications: AppNotification[];
  showNotifications: boolean;
  showNotificationsRedDot: boolean;
  showGlobalDutchPay: boolean;
  
  setAppNotifications: (notifs: AppNotification[]) => void;
  setShowNotifications: (show: boolean) => void;
  setShowNotificationsRedDot: (show: boolean) => void;
  setShowGlobalDutchPay: (show: boolean) => void;
}
```

**기능**:
- 미지급 정산 알림
- 빨간 점 표시
- N빵 대장 전체 조회

---

### 10. AIRecommendationContext
**책임**: AI 기반 일정 추천

```typescript
interface AIRecommendationContextType {
  showAIRecommendModal: boolean;
  aiRecommendations: AIRecommendation[];
  
  setShowAIRecommendModal: (show: boolean) => void;
  setAiRecommendations: (recs: AIRecommendation[]) => void;
}
```

**기능**:
- 모든 참여자의 스케줄 분석
- 최적 시간 추천
- 확률 점수 표시

---

### 11. LocationContext
**책임**: 지도 및 위치 검색

```typescript
interface LocationContextType {
  locationSearchResults: any[];
  showLocationResults: boolean;
  showLocationMapModal: boolean;
  mapRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  
  setLocationSearchResults: (results: any[]) => void;
  setShowLocationResults: (show: boolean) => void;
  setShowLocationMapModal: (show: boolean) => void;
  setMapRegion: (region: MapRegion) => void;
}
```

**통합 서비스**:
- Kakao Maps API 연동
- 주소 검색
- 좌표 선택

---

### 12. LoadingContext
**책임**: 비동기 작업 로딩 상태

```typescript
interface LoadingContextType {
  loading: boolean;
  roomsLoading: boolean;
  participantsLoading: boolean;
  refreshing: boolean;
  
  setLoading: (loading: boolean) => void;
  setRoomsLoading: (loading: boolean) => void;
  setParticipantsLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
}
```

**사용**:
- API 호출 진행 중 표시
- 데이터 새로고침 스피너
- 로딩 스켈레톤

---

## 구현 템플릿

### Context 생성 파일 구조
```
src/
├── contexts/
│   ├── AuthContext.tsx
│   ├── NetworkContext.tsx
│   ├── NavigationContext.tsx
│   ├── RoomContext.tsx
│   ├── ProfileContext.tsx
│   ├── FriendSearchContext.tsx
│   ├── RoomCreationContext.tsx
│   ├── RoomEditingContext.tsx
│   ├── NotificationContext.tsx
│   ├── AIRecommendationContext.tsx
│   ├── LocationContext.tsx
│   └── LoadingContext.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useNetwork.ts
│   ├── useNavigation.ts
│   ├── useRoom.ts
│   ├── useProfile.ts
│   ├── useFriendSearch.ts
│   ├── useRoomCreation.ts
│   ├── useRoomEditing.ts
│   ├── useNotification.ts
│   ├── useAIRecommendation.ts
│   ├── useLocation.ts
│   └── useLoading.ts
└── providers/
    └── AppProviders.tsx
```

### Context 구현 예시 (AuthContext.tsx)

```typescript
import React, { createContext, useState, useCallback } from 'react';

interface AuthContextType {
  user: any | null;
  authLoading: boolean;
  setUser: (user: any | null) => void;
  setAuthLoading: (loading: boolean) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const value: AuthContextType = {
    user,
    authLoading,
    setUser,
    setAuthLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Custom Hook 예시 (useRoom.ts)

```typescript
import { useContext, useCallback } from 'react';
import { RoomContext } from '../contexts/RoomContext';
import { supabase } from '../lib/supabaseClient';

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within RoomProvider');
  }

  const handleExitRoom = useCallback(() => {
    context.setCurrentRoom(null);
    context.setCurrentParticipant(null);
    context.setParticipants([]);
    context.setRoomOverlay(null);
  }, [context]);

  const fetchParticipants = useCallback(async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*, profiles(*)')
        .eq('room_id', roomId);
      
      if (error) throw error;
      
      const mapped = (data || []).map((p: any) => ({
        ...p,
        start_location_name: p.profiles?.start_location_name || p.start_location_name,
      }));
      
      context.setParticipants(mapped);
      return mapped;
    } catch (err) {
      console.error('Error fetching participants:', err);
      return [];
    }
  }, [context]);

  return {
    ...context,
    handleExitRoom,
    fetchParticipants,
  };
};
```

### AppProviders.tsx (모든 Provider 통합)

```typescript
import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { RoomProvider } from './contexts/RoomContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { FriendSearchProvider } from './contexts/FriendSearchContext';
import { RoomCreationProvider } from './contexts/RoomCreationContext';
import { RoomEditingProvider } from './contexts/RoomEditingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AIRecommendationProvider } from './contexts/AIRecommendationContext';
import { LocationProvider } from './contexts/LocationContext';
import { LoadingProvider } from './contexts/LoadingContext';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <NetworkProvider>
      <NavigationProvider>
        <LoadingProvider>
          <RoomProvider>
            <ProfileProvider>
              <FriendSearchProvider>
                <RoomCreationProvider>
                  <RoomEditingProvider>
                    <NotificationProvider>
                      <AIRecommendationProvider>
                        <LocationProvider>
                          {children}
                        </LocationProvider>
                      </AIRecommendationProvider>
                    </NotificationProvider>
                  </RoomEditingProvider>
                </RoomCreationProvider>
              </FriendSearchProvider>
            </ProfileProvider>
          </RoomProvider>
        </LoadingProvider>
      </NavigationProvider>
    </NetworkProvider>
  </AuthProvider>
);
```

---

## 마이그레이션 전략

### Phase 1: 기반 마련 (2-3시간)
1. **AuthContext & NetworkContext 생성**
   - 가장 간단한 Context부터 시작
   - 기본 구조 패턴 확립
   - Custom hooks 작성

2. **LoadingContext 생성**
   - 모든 컴포넌트에서 사용
   - 의존성 최소화

### Phase 2: 핵심 기능 (4-6시간)
1. **RoomContext 생성**
   - 가장 복잡함 (8개 상태)
   - Realtime 구독 로직 이관
   - 타이머 로직 통합

2. **ProfileContext + FriendSearchContext**
   - 팔로우 기능 통합
   - 친구 검색 로직

### Phase 3: UI 상태 (3-4시간)
1. **NavigationContext**
   - 탭 전환 로직
   - 모달 상태 관리

2. **RoomEditingContext**
   - 방 정보 편집 UI

3. **NotificationContext**
   - 알림 관리
   - N빵 대장

### Phase 4: 추가 기능 (2-3시간)
1. **AIRecommendationContext**
2. **LocationContext**
3. **RoomCreationContext**

### Phase 5: 통합 및 테스트 (2-3시간)
1. App.tsx 리팩토링
   - AppProviders 적용
   - 모든 상태 제거
   - Custom hooks 사용으로 변경

2. 컴포넌트 테스트
3. E2E 테스트

---

## 마이그레이션 전 체크리스트

- [ ] 모든 Context 파일 생성
- [ ] 모든 Custom hooks 작성
- [ ] AppProviders 생성
- [ ] App.tsx에서 상태 제거 시작
- [ ] 각 컴포넌트에서 Context 구독으로 변경
- [ ] 기존 로직 Custom hook으로 통합
- [ ] TypeScript 타입 검증
- [ ] 렌더링 성능 테스트 (React DevTools Profiler)
- [ ] 기능 테스트 (모든 사용자 플로우)
- [ ] 번들 크기 비교

---

## 예상 효과

### 코드 품질
- **가독성**: App.tsx 코드 70% 감소 (5000줄 → ~1500줄)
- **유지보수성**: Context별 단일 책임 원칙 준수
- **테스트 가능성**: 각 Context 독립적으로 테스트 가능

### 성능
- **렌더링**: 불필요한 리렌더링 80% 감소
- **번들 크기**: Tree shaking으로 5-8% 감소
- **메모리**: 상태 구독 최적화로 메모리 사용 개선

### 개발자 경험
- **코드 작성**: 필요한 Context만 import
- **디버깅**: 상태 흐름이 명확함
- **새 기능 추가**: 기존 로직 간섭 최소화

---

## 참고 자료

- [React Context API 공식 문서](https://react.dev/reference/react/useContext)
- [Context + Hooks 패턴](https://react.dev/learn/scaling-up-with-reducer-and-context)
- [성능 최적화 가이드](https://react.dev/reference/react/useMemo)
