# MealChat UI 전면 개편 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MealChat 앱을 정보 위계가 명확하고 밝고 생동감 있는 UI로 개편하여 사용성을 크게 향상시킨다.

**Architecture:** 
- 색상 팔레트를 설계에 맞게 통일
- RoomCard 컴포넌트로 약속 카드를 표준화하여 정보 위계 명확화
- 메인 화면과 각 탭의 레이아웃을 재정리하여 시각적 계층 강조
- 플로팅 액션 버튼으로 주요 액션 강조

**Tech Stack:** React Native, Expo, TypeScript, Lucide icons, Supabase realtime

## Global Constraints

- React Native 스타일로 구현 (StyleSheet 사용)
- 모든 텍스트는 명확한 크기와 두께 지정
- 색상은 THEME에서 참조
- 기존 기능 (실시간 채팅, Supabase, 알림 등) 유지
- 모든 변경 사항은 작은 커밋으로 저장

---

## PHASE 1: 색상 팔레트 및 기본 구조

### Task 1: theme.ts 업데이트 - 설계 색상 추가

**Files:**
- Modify: `src/lib/theme.ts`

**Interfaces:**
- Produces: 다음의 색상들이 THEME에 추가됨:
  - `menuNeeded: '#FF8C42'` (주황색)
  - `menuComplete: '#4ECDC4'` (청록색)
  - `scheduleInProgress: '#5B9BD5'` (파란색)
  - `confirmed: '#9B59B6'` (보라색)
  - `unreadBadge: '#FF0000'` (빨간색)
  - `textTertiary: '#999999'` (텍스트 보조)

- [ ] **Step 1: theme.ts 파일 현재 상태 확인**

기존 theme.ts를 확인하면 이미 기본 색상이 정의되어 있습니다. 설계 색상을 추가합니다.

- [ ] **Step 2: light 모드에 새 색상 추가**

`themeColors.light` 객체에 다음 속성들을 추가합니다:

```typescript
export const themeColors = {
  light: {
    // ... 기존 속성들 ...
    background: '#FAFAFB',
    primary: '#23A455',
    primaryPressed: '#1E8E49',
    secondary: '#00A3FF',
    accent: '#FF7A00',
    surface: '#FFFFFF',
    surfaceDarker: '#E5E7EB',
    text: '#333333',
    textMuted: '#8E8E93',
    textTertiary: '#999999', // 새 추가
    border: '#E5E7EB',
    input: '#FFFFFF',
    danger: '#FF6B8B',
    success: '#27AE60',
    warning: '#FFD600',
    card: '#FFFFFF',
    cardBorder: '#E5E7EB',
    avatarBg: '#E5E7EB',
    modalOverlay: 'rgba(51, 51, 51, 0.4)',
    badgeBg: 'rgba(35, 164, 85, 0.08)',
    // UI 설계 색상 추가
    menuNeeded: '#FF8C42',
    menuComplete: '#4ECDC4',
    scheduleInProgress: '#5B9BD5',
    confirmed: '#9B59B6',
    unreadBadge: '#FF0000',
  },
```

- [ ] **Step 3: dark 모드에도 동일하게 추가**

`themeColors.dark` 객체에도 같은 속성들을 추가합니다 (어두운 톤 유지):

```typescript
  dark: {
    // ... 기존 속성들 ...
    background: '#0F172A',
    primary: '#27AE60',
    primaryPressed: '#2ecc71',
    surface: '#1E293B',
    surfaceDarker: '#0F172A',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    textTertiary: '#B0B8C4', // 새 추가
    border: 'rgba(255, 255, 255, 0.08)',
    input: 'rgba(255, 255, 255, 0.05)',
    danger: '#EF4444',
    success: '#10B981',
    warning: '#FFD600',
    card: 'rgba(255, 255, 255, 0.02)',
    cardBorder: 'rgba(255, 255, 255, 0.05)',
    avatarBg: 'rgba(255, 255, 255, 0.03)',
    modalOverlay: 'rgba(0, 0, 0, 0.7)',
    badgeBg: 'rgba(255, 255, 255, 0.04)',
    // UI 설계 색상 추가 (다크 톤)
    menuNeeded: '#FF9A4D',
    menuComplete: '#5FE3D8',
    scheduleInProgress: '#6BA5E8',
    confirmed: '#B984E0',
    unreadBadge: '#FF4444',
  }
```

- [ ] **Step 4: TypeScript 타입 확장 (선택)**

theme 객체의 타입을 명시적으로 정의하려면 다음을 추가:

```typescript
export type ThemeType = typeof themeColors.light;
```

- [ ] **Step 5: 커밋**

```bash
git add src/lib/theme.ts
git commit -m "feat: add UI redesign colors to theme palette"
```

---

### Task 2: RoomCard 컴포넌트 생성

**Files:**
- Create: `src/components/RoomCard.tsx`

**Interfaces:**
- Consumes: 
  - `Room` type (from `src/lib/types`)
  - `THEME` (from `src/lib/theme`)
  - Icons from `lucide-react-native` (MessageSquare, Utensils, Calendar)
- Produces: `<RoomCard room={Room} onPress={()=>void} onChatPress={()=>void} onMenuPress={()=>void} onSchedulePress={()=>void} />`

- [ ] **Step 1: RoomCard 컴포넌트 작성**

`src/components/RoomCard.tsx` 파일을 생성하고 다음 코드를 작성합니다:

```typescript
import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MessageSquare, Utensils, Calendar } from 'lucide-react-native';
import { THEME } from '../lib/theme';
import type { Room } from '../lib/types';

interface RoomCardProps {
  room: Room;
  unreadCount: number;
  onPress: () => void;
  onChatPress: () => void;
  onMenuPress: () => void;
  onSchedulePress: () => void;
}

const getStatusColor = (room: Room): string => {
  if (room.is_confirmed) {
    return THEME.confirmed;
  }
  
  // 메뉴가 미선정이면 주황색
  // TODO: 메뉴 선정 여부 판단 로직 추가 필요
  return THEME.menuNeeded;
};

const getStatusBadgeLabel = (room: Room): string => {
  if (room.is_confirmed) {
    return '확정됨';
  }
  return '진행중';
};

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  unreadCount,
  onPress,
  onChatPress,
  onMenuPress,
  onSchedulePress,
}) => {
  const statusColor = useMemo(() => getStatusColor(room), [room]);
  const statusLabel = useMemo(() => getStatusBadgeLabel(room), [room]);

  const displayDate = room.meeting_date
    ? new Date(room.meeting_date).toLocaleDateString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
      })
    : '날짜 미정';

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: statusColor }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* 헤더: 상태 배지 + 약속명 + 미읽 배지 */}
      <View style={styles.headerRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusBadgeText}>{statusLabel}</Text>
        </View>
        <Text style={styles.roomTitle} numberOfLines={1}>
          {room.title}
        </Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* 메타정보: 날짜 + 참여자 수 */}
      <Text style={styles.metaInfo}>
        {displayDate} • {/* 참여자 수는 나중에 추가 */}
      </Text>

      {/* 주요 액션: 채팅, 메뉴, 일정 */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={onChatPress}>
          <MessageSquare size={18} color={THEME.text} />
          <Text style={styles.actionLabel}>채팅</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onMenuPress}>
          <Utensils size={18} color={THEME.text} />
          <Text style={styles.actionLabel}>메뉴</Text>
          {/* 메뉴 미선정 배지 추가 가능 */}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onSchedulePress}>
          <Calendar size={18} color={THEME.text} />
          <Text style={styles.actionLabel}>일정</Text>
          {/* 일정 상태 배지 추가 가능 */}
        </TouchableOpacity>
      </View>

      {/* 참여자 프로필 (추후 추가) */}
      {/* <View style={styles.participantsRow}>
        {participants.map(p => <ProfileIcon key={p.id} color={p.avatar_color} />)}
      </View> */}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  roomTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
  },
  unreadBadge: {
    backgroundColor: THEME.unreadBadge,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  metaInfo: {
    fontSize: 14,
    color: THEME.textMuted,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionLabel: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 4,
  },
});
```

- [ ] **Step 2: 테스트 - RoomCard 표시 확인**

App.tsx에서 임시로 RoomCard를 import하여 화면에 표시되는지 확인합니다. (나중에 Task 3에서 제대로 통합)

- [ ] **Step 3: 커밋**

```bash
git add src/components/RoomCard.tsx
git commit -m "feat: create RoomCard component with improved layout and status badges"
```

---

### Task 3: App.tsx - RoomCard 통합 및 약속 목록 레이아웃 개선

**Files:**
- Modify: `src/App.tsx` (약속 목록 렌더링 부분)

**Interfaces:**
- Consumes: `RoomCard` component (from Task 2)
- Produces: 개선된 약속 목록 UI

- [ ] **Step 1: RoomCard import 추가**

App.tsx 상단에 다음을 추가:

```typescript
import { RoomCard } from './components/RoomCard';
```

- [ ] **Step 2: 약속 목록 렌더링 함수 찾기**

App.tsx에서 `roomList`를 렌더링하는 부분을 찾습니다. (약 1500-2000줄 사이로 추정)

검색: `roomList.map` 또는 방 목록 렌더링 부분

- [ ] **Step 3: 기존 약속 목록 코드를 RoomCard로 교체**

기존 코드:
```typescript
// 기존 렌더링 코드 (제거할 것)
{roomList.map(room => (
  <View key={room.id} style={{...}}>
    {/* 약속 정보 표시 */}
  </View>
))}
```

새 코드:
```typescript
{roomList.map(room => {
  const unreadCount = appNotifications.filter(
    n => n.room_id === room.id && !n.is_read
  ).length;
  
  return (
    <RoomCard
      key={room.id}
      room={room}
      unreadCount={unreadCount}
      onPress={() => {
        setCurrentRoom(room);
        setRoomSubTab('schedule');
        setActiveTab('addons');
      }}
      onChatPress={() => {
        setCurrentRoom(room);
        setRoomSubTab('schedule');
        setActiveTab('addons');
        // TODO: 채팅 탭으로 이동
      }}
      onMenuPress={() => {
        setCurrentRoom(room);
        setRoomSubTab('menu');
        setActiveTab('addons');
      }}
      onSchedulePress={() => {
        setCurrentRoom(room);
        setRoomSubTab('schedule');
        setActiveTab('addons');
      }}
    />
  );
})}
```

- [ ] **Step 4: 플로팅 액션 버튼(FAB) 스타일 개선**

새 약속 만들기 버튼을 찾아서 스타일 개선:

```typescript
<TouchableOpacity
  style={[
    {
      position: 'absolute',
      bottom: 24,
      right: 16,
      backgroundColor: THEME.menuNeeded, // 주황색
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 24,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    }
  ]}
  onPress={() => setShowCreateModal(true)}
>
  <Plus size={20} color="#FFFFFF" />
  <Text style={{ color: '#FFFFFF', fontWeight: 'bold', marginLeft: 8 }}>
    새 약속 만들기
  </Text>
</TouchableOpacity>
```

- [ ] **Step 5: 테스트 - 약속 목록 화면 확인**

앱을 실행하여 다음을 확인:
- 약속 카드가 올바른 색상과 배지로 표시되는가
- 미읽 채팅 개수가 우측 상단에 표시되는가
- 각 액션 버튼(채팅, 메뉴, 일정)이 동작하는가
- FAB 버튼이 올바르게 표시되는가

Run: `npm start` 또는 `expo start`

- [ ] **Step 6: 커밋**

```bash
git add src/App.tsx src/components/RoomCard.tsx
git commit -m "feat: integrate RoomCard component and improve room list layout"
```

---

## PHASE 2: 탭 UI 개선

### Task 4: 채팅 탭 UI 개선

**Files:**
- Modify: `src/App.tsx` (채팅 탭 렌더링 부분)

**Interfaces:**
- Consumes: 기존 채팅 메시지 로직
- Produces: 개선된 채팅 UI (메시지 배경, 이모티콘 크기, 여백)

- [ ] **Step 1: 채팅 메시지 렌더링 부분 찾기**

App.tsx에서 `roomMessages` 또는 채팅 화면 렌더링 부분을 찾습니다. (약 3000-4000줄)

검색: `roomMessages.map` 또는 `ChatScreen` 또는 메시지 렌더링

- [ ] **Step 2: 메시지 컨테이너 스타일 개선**

기존 메시지 스타일을 다음과 같이 개선:

```typescript
const messageContainerStyle = {
  backgroundColor: sender_color ? sender_color + '20' : THEME.surface, // 참여자 색상 배경
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 8,
  marginVertical: 4,
  maxWidth: '85%',
};
```

- [ ] **Step 3: 이모티콘 크기 증가**

이모티콘 렌더링 부분을 찾아 크기를 증가:

```typescript
// 기존 (추정)
// {emoticon && <Image source={emoticon} style={{ width: 40, height: 40 }} />}

// 개선됨
{emoticon && (
  <Image
    source={emoticon}
    style={{
      width: 60,
      height: 60,
      marginVertical: 8,
    }}
  />
)}
```

- [ ] **Step 4: 메시지 시간 표시 개선**

메시지 시간을 작은 텍스트로 우측에 표시:

```typescript
<View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
  {/* 메시지 내용 */}
  <Text style={{ fontSize: 12, color: THEME.textTertiary }}>
    {new Date(message.created_at).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })}
  </Text>
</View>
```

- [ ] **Step 5: 참여자 정보 헤더 추가**

채팅 탭 상단에 참여자 목록 표시:

```typescript
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  style={{ height: 60, paddingVertical: 8 }}
>
  {participants.map(p => (
    <View
      key={p.id}
      style={{
        alignItems: 'center',
        marginHorizontal: 8,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: p.avatar_color,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
          {p.name[0]}
        </Text>
      </View>
      <Text style={{ fontSize: 10, marginTop: 4, color: THEME.textMuted }}>
        {p.name}
      </Text>
    </View>
  ))}
</ScrollView>
```

- [ ] **Step 6: 테스트 - 채팅 탭 확인**

앱을 실행하여:
- 메시지 배경이 참여자 색상으로 표시되는가
- 이모티콘이 크게 표시되는가
- 메시지 시간이 표시되는가
- 참여자 정보가 상단에 표시되는가

- [ ] **Step 7: 커밋**

```bash
git add src/App.tsx
git commit -m "feat: improve chat tab UI with better message styling and participant info"
```

---

### Task 5: 메뉴 탭 UI 개선

**Files:**
- Modify: `src/App.tsx` (메뉴 탭 렌더링 부분)

**Interfaces:**
- Consumes: 기존 메뉴 선정 로직
- Produces: 개선된 메뉴 탭 UI

- [ ] **Step 1: 메뉴 탭 렌더링 부분 찾기**

App.tsx에서 메뉴 탭 렌더링 부분을 찾습니다.

검색: `MenuTab` 또는 메뉴 렌더링 부분 (약 3500-4500줄)

- [ ] **Step 2: 현황 표시 개선**

메뉴 탭 상단에 진행도를 시각적으로 표시:

```typescript
const menuSelectedCount = participants.filter(p =>
  p.voted_items && p.voted_items.length > 0
).length;

const progressText = `${menuSelectedCount}명 중 ${menuSelectedCount}명 선정 완료`;

<View style={{ paddingVertical: 12 }}>
  <Text style={{ fontSize: 18, fontWeight: 'bold', color: THEME.text }}>
    메뉴 선정
  </Text>
  <Text style={{ fontSize: 14, color: THEME.textMuted, marginTop: 4 }}>
    {progressText}
  </Text>
  {/* 진행도 바 (선택) */}
  <View
    style={{
      height: 6,
      backgroundColor: THEME.border,
      borderRadius: 3,
      marginTop: 8,
      overflow: 'hidden',
    }}
  >
    <View
      style={{
        height: '100%',
        width: `${(menuSelectedCount / participants.length) * 100}%`,
        backgroundColor: THEME.menuComplete,
      }}
    />
  </View>
</View>
```

- [ ] **Step 3: AI 추천 메뉴 섹션 강조**

AI 추천 섹션이 있다면 시작 부분에 배치하고 강조:

```typescript
{aiRecommendations.length > 0 && (
  <View
    style={{
      backgroundColor: THEME.menuNeeded + '10',
      borderLeftWidth: 4,
      borderLeftColor: THEME.menuNeeded,
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    }}
  >
    <Text style={{ fontSize: 16, fontWeight: 'bold', color: THEME.text }}>
      🤖 AI 추천 메뉴
    </Text>
    {/* 추천 메뉴 표시 */}
  </View>
)}
```

- [ ] **Step 4: 메뉴 카드 스타일 개선**

메뉴 카드에 투표 수 배지 및 선택 상태 표시:

```typescript
<TouchableOpacity
  style={{
    backgroundColor: p.voted_items?.includes(menu.id) ? THEME.menuComplete : THEME.surface,
    borderWidth: 2,
    borderColor: p.voted_items?.includes(menu.id) ? THEME.menuComplete : THEME.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  }}
>
  {menu.image && (
    <Image
      source={{ uri: menu.image }}
      style={{ width: '100%', height: 160, borderRadius: 8 }}
    />
  )}
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
    <Text style={{ fontSize: 16, fontWeight: 'bold', color: THEME.text }}>
      {menu.name}
    </Text>
    <View
      style={{
        backgroundColor: THEME.menuNeeded,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>
        {menu.voteCount}
      </Text>
    </View>
  </View>
</TouchableOpacity>
```

- [ ] **Step 5: 참여자별 선택 메뉴 표시**

각 참여자가 선택한 메뉴를 명확하게 표시:

```typescript
<View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: THEME.border }}>
  <Text style={{ fontSize: 14, fontWeight: 'bold', color: THEME.text, marginBottom: 12 }}>
    참여자별 선택
  </Text>
  {participants.map(p => (
    <View
      key={p.id}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: p.avatar_color,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 8,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 }}>
          {p.name[0]}
        </Text>
      </View>
      <Text style={{ flex: 1, color: THEME.text }}>
        {p.name}
      </Text>
      <Text style={{ color: p.voted_items?.length ? THEME.menuComplete : THEME.textMuted }}>
        {p.voted_items?.length > 0 ? p.voted_items.join(', ') : '선정 대기 중'}
      </Text>
    </View>
  ))}
</View>
```

- [ ] **Step 6: 테스트 - 메뉴 탭 확인**

앱을 실행하여:
- 진행도가 표시되는가
- AI 추천 메뉴가 강조되어 표시되는가
- 메뉴 카드의 선택 상태가 색상으로 표시되는가
- 참여자별 선택이 명확하게 표시되는가

- [ ] **Step 7: 커밋**

```bash
git add src/App.tsx
git commit -m "feat: improve menu tab UI with progress display and voting status"
```

---

### Task 6: 일정 탭 UI 개선

**Files:**
- Modify: `src/App.tsx` (일정 탭 렌더링 부분)

**Interfaces:**
- Consumes: 기존 일정 조율 로직
- Produces: 개선된 일정 탭 UI

- [ ] **Step 1: 일정 탭 렌더링 부분 찾기**

App.tsx에서 일정 탭 렌더링 부분을 찾습니다. (ScheduleGrid 컴포넌트 사용 부분)

검색: `ScheduleGrid` 또는 일정 탭 렌더링

- [ ] **Step 2: 현황 표시 추가**

일정 탭 상단에 진행도 표시:

```typescript
const scheduleSelectedCount = participants.filter(p =>
  p.schedule && Object.keys(p.schedule).length > 0
).length;

<View style={{ paddingVertical: 12, marginBottom: 16 }}>
  <Text style={{ fontSize: 18, fontWeight: 'bold', color: THEME.text }}>
    일정 조율
  </Text>
  <Text style={{ fontSize: 14, color: THEME.textMuted, marginTop: 4 }}>
    {scheduleSelectedCount}명 중 {scheduleSelectedCount}명 선택 완료
  </Text>
  {/* 진행도 바 */}
  <View
    style={{
      height: 6,
      backgroundColor: THEME.border,
      borderRadius: 3,
      marginTop: 8,
      overflow: 'hidden',
    }}
  >
    <View
      style={{
        height: '100%',
        width: `${(scheduleSelectedCount / participants.length) * 100}%`,
        backgroundColor: THEME.scheduleInProgress,
      }}
    />
  </View>
</View>
```

- [ ] **Step 3: ScheduleGrid 컴포넌트 스타일 개선**

ScheduleGrid에서 반환된 요소의 스타일을 확인하고, 확정된 시간대를 강조:

- 배경: 밝은 회색
- 가능한 시간대: 참여자 색상
- 불가능한 시간대: 매우 옅은 회색
- 확정된 시간대: 굵은 선 또는 진한 색상

기존 ScheduleGrid를 수정하거나, 래퍼를 추가하여 개선:

```typescript
<View
  style={{
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  }}
>
  <ScheduleGrid {...scheduleProps} />
</View>
```

- [ ] **Step 4: 확정 시간 강조**

확정된 시간이 있다면 시각적으로 강조:

```typescript
{currentRoom.is_confirmed && (
  <View
    style={{
      backgroundColor: THEME.confirmed + '10',
      borderLeftWidth: 4,
      borderLeftColor: THEME.confirmed,
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    }}
  >
    <Text style={{ fontWeight: 'bold', color: THEME.text }}>
      ✓ 확정 시간: {currentRoom.confirmed_slot}
    </Text>
  </View>
)}
```

- [ ] **Step 5: 예상 비용 표시**

메뉴와 시간이 확정되었을 때 정산 정보 표시:

```typescript
{currentRoom.is_confirmed && (
  <View
    style={{
      backgroundColor: THEME.surface,
      borderWidth: 1,
      borderColor: THEME.border,
      borderRadius: 8,
      padding: 12,
      marginTop: 16,
    }}
  >
    <Text style={{ fontSize: 14, color: THEME.textMuted }}>예상 비용</Text>
    <Text style={{ fontSize: 20, fontWeight: 'bold', color: THEME.text, marginTop: 4 }}>
      1인당 ¥12,500
    </Text>
    <TouchableOpacity
      style={{
        marginTop: 12,
        paddingVertical: 8,
        backgroundColor: THEME.menuNeeded,
        borderRadius: 8,
        alignItems: 'center',
      }}
      onPress={() => {/* 정산 화면으로 이동 */}}
    >
      <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
        정산 상세 보기
      </Text>
    </TouchableOpacity>
  </View>
)}
```

- [ ] **Step 6: 테스트 - 일정 탭 확인**

앱을 실행하여:
- 진행도가 표시되는가
- 확정된 시간이 강조되는가
- 예상 비용 정보가 표시되는가
- 정산 화면으로 이동하는가

- [ ] **Step 7: 커밋**

```bash
git add src/App.tsx
git commit -m "feat: improve schedule tab UI with progress and confirmation display"
```

---

## PHASE 3: 추가 화면 개선

### Task 7: 프로필 화면 UI 개선

**Files:**
- Modify: `src/App.tsx` 또는 프로필 관련 부분
- Modify: `src/components/ProfileSetup.tsx` (이미 있는 경우)

**Interfaces:**
- Consumes: 기존 프로필 데이터
- Produces: 개선된 프로필 UI

- [ ] **Step 1: 프로필 화면 렌더링 부분 찾기**

App.tsx에서 프로필 화면을 렌더링하는 부분을 찾습니다.

검색: `ProfileScreen` 또는 프로필 렌더링 부분

- [ ] **Step 2: 프로필 카드 컨테이너 개선**

```typescript
<View
  style={{
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  }}
>
  {/* 프로필 사진 또는 아바타 */}
  <View
    style={{
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: globalProfile?.avatar_color || THEME.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    }}
  >
    <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: 'bold' }}>
      {globalProfile?.name?.[0]?.toUpperCase()}
    </Text>
  </View>

  <Text style={{ fontSize: 20, fontWeight: 'bold', color: THEME.text }}>
    {globalProfile?.name}
  </Text>
  <Text style={{ fontSize: 14, color: THEME.textMuted, marginTop: 4 }}>
    @{globalProfile?.tag}
  </Text>

  {/* 프로필 편집 버튼 */}
  <TouchableOpacity
    style={{
      marginTop: 12,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: THEME.menuNeeded,
      borderRadius: 8,
    }}
    onPress={() => setShowSettingsModal(true)}
  >
    <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
      프로필 편집
    </Text>
  </TouchableOpacity>
</View>
```

- [ ] **Step 3: 음식 취향 섹션 추가**

```typescript
<View
  style={{
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  }}
>
  <Text style={{ fontSize: 14, fontWeight: 'bold', color: THEME.text, marginBottom: 8 }}>
    음식 취향
  </Text>
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {/* 취향 칩들 */}
    {['🌶️ 맵기좋아', '🍱 일식선호', '🥩 육고기'].map((taste, i) => (
      <View
        key={i}
        style={{
          backgroundColor: THEME.menuNeeded + '20',
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: THEME.menuNeeded,
        }}
      >
        <Text style={{ fontSize: 12, color: THEME.text }}>
          {taste}
        </Text>
      </View>
    ))}
  </View>
</View>
```

- [ ] **Step 4: 친구 목록 섹션 개선**

```typescript
<View
  style={{
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  }}
>
  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    }}
  >
    <Text style={{ fontSize: 14, fontWeight: 'bold', color: THEME.text }}>
      친구 목록 ({myFollows.length})
    </Text>
    <TouchableOpacity onPress={() => {/* 친구 추가 */}}>
      <Plus size={20} color={THEME.menuNeeded} />
    </TouchableOpacity>
  </View>

  {myFollows.length > 0 ? (
    myFollows.map(f => (
      <View
        key={f.following_id}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: THEME.border,
        }}
      >
        {/* 친구 아바타 */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: f.profiles?.avatar_color || THEME.primary,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 8,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
            {f.profiles?.name?.[0]?.toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: 'bold', color: THEME.text }}>
            {f.profiles?.name}
          </Text>
          <Text style={{ fontSize: 12, color: THEME.textMuted }}>
            @{f.profiles?.tag}
          </Text>
        </View>

        <TouchableOpacity
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: THEME.menuNeeded,
            borderRadius: 6,
          }}
        >
          <Text style={{ color: THEME.menuNeeded, fontWeight: 'bold', fontSize: 12 }}>
            언팔로우
          </Text>
        </TouchableOpacity>
      </View>
    ))
  ) : (
    <Text style={{ color: THEME.textMuted, textAlign: 'center', paddingVertical: 16 }}>
      친구를 추가해보세요!
    </Text>
  )}
</View>
```

- [ ] **Step 5: 테스트 - 프로필 화면 확인**

앱을 실행하여:
- 프로필 정보가 깔끔하게 표시되는가
- 음식 취향이 칩 형식으로 표시되는가
- 친구 목록이 명확하게 표시되는가
- 모든 버튼이 동작하는가

- [ ] **Step 6: 커밋**

```bash
git add src/App.tsx src/components/ProfileSetup.tsx
git commit -m "feat: improve profile screen layout and styling"
```

---

### Task 8: 정산(더치페이) 화면 UI 개선

**Files:**
- Modify: `src/App.tsx` 또는 `src/components/DutchPay.tsx`

**Interfaces:**
- Consumes: 기존 정산 데이터
- Produces: 개선된 정산 UI

- [ ] **Step 1: 정산 화면 렌더링 부분 찾기**

App.tsx에서 정산 화면을 렌더링하는 부분을 찾습니다.

검색: `DutchPay` 또는 정산 렌더링 부분

- [ ] **Step 2: 정산 현황 헤더 개선**

```typescript
<View
  style={{
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  }}
>
  <Text style={{ fontSize: 18, fontWeight: 'bold', color: THEME.text }}>
    N빵 정산
  </Text>

  {/* 정산 필요 vs 완료 탭 */}
  <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
    <TouchableOpacity
      style={{
        flex: 1,
        paddingVertical: 12,
        backgroundColor: showGlobalDutchPay ? THEME.menuNeeded : THEME.border,
        borderRadius: 8,
        alignItems: 'center',
      }}
      onPress={() => setShowGlobalDutchPay(true)}
    >
      <Text
        style={{
          fontWeight: 'bold',
          color: showGlobalDutchPay ? '#FFFFFF' : THEME.textMuted,
        }}
      >
        정산 필요
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={{
        flex: 1,
        paddingVertical: 12,
        backgroundColor: !showGlobalDutchPay ? THEME.menuComplete : THEME.border,
        borderRadius: 8,
        alignItems: 'center',
      }}
      onPress={() => setShowGlobalDutchPay(false)}
    >
      <Text
        style={{
          fontWeight: 'bold',
          color: !showGlobalDutchPay ? '#FFFFFF' : THEME.textMuted,
        }}
      >
        정산 완료
      </Text>
    </TouchableOpacity>
  </View>
</View>
```

- [ ] **Step 3: 정산 필요 리스트 카드 개선**

```typescript
{dutchPayBills.map(bill => (
  <TouchableOpacity
    key={bill.id}
    style={{
      backgroundColor: bill.is_completed ? THEME.menuComplete : THEME.menuNeeded,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      opacity: bill.is_completed ? 0.6 : 1,
    }}
    onPress={() => {/* 상세 보기 */}}
  >
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <View>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' }}>
          {bill.room_title}
        </Text>
        <Text style={{ fontSize: 12, color: '#FFFFFF' + 'cc', marginTop: 4 }}>
          {new Date(bill.created_at).toLocaleDateString('ko-KR')}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
          ¥{bill.total_amount?.toLocaleString()}
        </Text>
        <Text style={{ fontSize: 12, color: '#FFFFFF' + 'cc', marginTop: 4 }}>
          {bill.participants?.length || 1}명 N빵
        </Text>
      </View>
    </View>

    {/* 상태 배지 */}
    <View
      style={{
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#FFFFFF' + '33',
      }}
    >
      <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: 'bold' }}>
        {bill.is_completed ? '✓ 정산 완료' : '정산 필요'}
      </Text>
    </View>
  </TouchableOpacity>
))}
```

- [ ] **Step 4: 정산 상세 정보 팝업 개선**

정산 카드 클릭 시 보여질 상세 정보:

```typescript
<Modal
  visible={selectedBill !== null}
  transparent
  animationType="slide"
  onRequestClose={() => setSelectedBill(null)}
>
  <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}>
    <View
      style={{
        backgroundColor: THEME.surface,
        borderRadius: 16,
        padding: 16,
        minHeight: '60%',
      }}
    >
      {/* 상단 닫기 버튼 */}
      <TouchableOpacity onPress={() => setSelectedBill(null)}>
        <X size={24} color={THEME.text} />
      </TouchableOpacity>

      <Text style={{ fontSize: 18, fontWeight: 'bold', color: THEME.text, marginTop: 12 }}>
        {selectedBill?.room_title}
      </Text>

      {/* 금액 분석 */}
      <View
        style={{
          backgroundColor: THEME.border,
          borderRadius: 12,
          padding: 12,
          marginTop: 16,
        }}
      >
        <Text style={{ fontSize: 14, color: THEME.textMuted }}>
          총액
        </Text>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: THEME.text }}>
          ¥{selectedBill?.total_amount?.toLocaleString()}
        </Text>
        <Text style={{ fontSize: 12, color: THEME.textMuted, marginTop: 8 }}>
          1인당: ¥{Math.round((selectedBill?.total_amount || 0) / (selectedBill?.participants?.length || 1))}
        </Text>
      </View>

      {/* 참여자별 정산 정보 */}
      <View style={{ marginTop: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: 'bold', color: THEME.text, marginBottom: 12 }}>
          정산 현황
        </Text>
        {selectedBill?.participants?.map((p: any, i: number) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: THEME.border,
            }}
          >
            <Text style={{ color: THEME.text }}>{p.name}</Text>
            <Text style={{ color: THEME.text, fontWeight: 'bold' }}>
              ¥{p.amount?.toLocaleString()}
            </Text>
          </View>
        ))}
      </View>

      {/* 완료 버튼 */}
      {!selectedBill?.is_completed && (
        <TouchableOpacity
          style={{
            marginTop: 16,
            paddingVertical: 12,
            backgroundColor: THEME.menuNeeded,
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={() => {/* 정산 완료 처리 */}}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
            정산 완료
          </Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
</Modal>
```

- [ ] **Step 5: 테스트 - 정산 화면 확인**

앱을 실행하여:
- 정산 필요 vs 완료 탭이 동작하는가
- 정산 카드가 올바른 색상으로 표시되는가
- 카드 클릭 시 상세 정보가 표시되는가
- 정산 완료 버튼이 동작하는가

- [ ] **Step 6: 커밋**

```bash
git add src/App.tsx src/components/DutchPay.tsx
git commit -m "feat: improve dutch pay screen layout and payment status display"
```

---

### Task 9: 약속 만들기 UI 개선

**Files:**
- Modify: `src/App.tsx` (모달 부분) 또는 `src/components` (분리된 컴포넌트)

**Interfaces:**
- Consumes: 기존 약속 생성 로직
- Produces: 개선된 약속 만들기 플로우

- [ ] **Step 1: 약속 만들기 모달/화면 렌더링 부분 찾기**

App.tsx에서 `showCreateModal` 또는 약속 생성 화면 렌더링 부분을 찾습니다.

- [ ] **Step 2: 모달 헤더 개선**

```typescript
<View
  style={{
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  }}
>
  <Text style={{ fontSize: 18, fontWeight: 'bold', color: THEME.text }}>
    새 약속 만들기
  </Text>
  <TouchableOpacity onPress={() => setShowCreateModal(false)}>
    <X size={24} color={THEME.text} />
  </TouchableOpacity>
</View>
```

- [ ] **Step 3: 단계별 진행도 표시**

```typescript
<View style={{ flexDirection: 'row', marginBottom: 16 }}>
  {[1, 2, 3].map(step => (
    <View
      key={step}
      style={{
        flex: 1,
        height: 6,
        backgroundColor: step <= currentStep ? THEME.menuNeeded : THEME.border,
        marginHorizontal: 2,
        borderRadius: 3,
      }}
    />
  ))}
</View>
<Text style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 16 }}>
  Step {currentStep} / 3
</Text>
```

- [ ] **Step 4: 각 단계별 입력 필드 개선**

Step 1 - 약속명:
```typescript
<TextInput
  style={{
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: THEME.text,
    marginBottom: 16,
  }}
  placeholder="예) 회사 팀 점심"
  placeholderTextColor={THEME.textMuted}
  value={newRoomTitle}
  onChangeText={setNewRoomTitle}
/>
```

Step 2 - 날짜 선택:
```typescript
<TouchableOpacity
  style={{
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  }}
  onPress={() => {/* 날짜 선택기 */}}
>
  <Text style={{ color: newRoomDate ? THEME.text : THEME.textMuted }}>
    {newRoomDate || '날짜를 선택해주세요'}
  </Text>
</TouchableOpacity>
```

Step 3 - 친구 초대:
```typescript
<ScrollView style={{ maxHeight: 300, marginBottom: 16 }}>
  {myFollows.map(f => (
    <TouchableOpacity
      key={f.following_id}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: THEME.border,
      }}
      onPress={() => {
        if (createRoomSelectedFriends.includes(f.following_id)) {
          setCreateRoomSelectedFriends(
            createRoomSelectedFriends.filter(id => id !== f.following_id)
          );
        } else {
          setCreateRoomSelectedFriends([...createRoomSelectedFriends, f.following_id]);
        }
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderWidth: 2,
          borderColor: createRoomSelectedFriends.includes(f.following_id)
            ? THEME.menuNeeded
            : THEME.border,
          borderRadius: 4,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}
      >
        {createRoomSelectedFriends.includes(f.following_id) && (
          <Check size={16} color={THEME.menuNeeded} />
        )}
      </View>
      <Text style={{ flex: 1, color: THEME.text }}>
        {f.profiles?.name}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>
```

- [ ] **Step 5: 하단 액션 버튼 개선**

```typescript
<View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
  <TouchableOpacity
    style={{
      flex: 1,
      paddingVertical: 12,
      backgroundColor: THEME.border,
      borderRadius: 8,
      alignItems: 'center',
    }}
    onPress={() => setShowCreateModal(false)}
  >
    <Text style={{ color: THEME.text, fontWeight: 'bold' }}>
      취소
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={{
      flex: 1,
      paddingVertical: 12,
      backgroundColor: THEME.menuNeeded,
      borderRadius: 8,
      alignItems: 'center',
    }}
    onPress={currentStep === 3 ? handleCreateRoom : () => setCurrentStep(currentStep + 1)}
  >
    <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
      {currentStep === 3 ? '만들기' : '다음'}
    </Text>
  </TouchableOpacity>
</View>
```

- [ ] **Step 6: 테스트 - 약속 만들기 플로우 확인**

앱을 실행하여:
- 진행도 표시가 정확한가
- 각 단계별 입력이 정상 작동하는가
- 단계별 이동이 부드러운가
- 약속 생성이 정상적으로 완료되는가

- [ ] **Step 7: 커밋**

```bash
git add src/App.tsx
git commit -m "feat: improve room creation flow with step-by-step UI"
```

---

## 최종 검증

### Task 10: 전체 앱 테스트 및 최종 정리

**Files:**
- Test all screens

**Interfaces:**
- All previous components and screens

- [ ] **Step 1: 전체 앱 실행 및 시각적 일관성 확인**

```bash
npm start  # 또는 expo start
```

다음을 확인:
- 모든 화면에서 색상이 일관되는가
- 정보 위계가 명확한가
- 애니메이션이 부드러운가
- 모든 버튼이 동작하는가
- 성능이 양호한가 (지연 없음)

- [ ] **Step 2: 실제 데이터로 테스트**

- 약속 목록에서 카드 표시 확인
- 미읽 메시지 배지 표시 확인
- 채팅 탭에서 메시지 송수신 확인
- 메뉴 탭에서 투표 확인
- 일정 탭에서 시간 선택 확인
- 정산 화면에서 정보 표시 확인

- [ ] **Step 3: 반응형 레이아웃 확인**

다양한 화면 크기에서 테스트 (작은 폰, 큰 폰):
- 텍스트가 보기 좋은가
- 버튼이 누르기 쉬운가
- 레이아웃이 깨지지 않는가

- [ ] **Step 4: 접근성 확인 (선택)**

- 텍스트 크기가 충분한가
- 색상 대비가 충분한가
- 터치 대상이 충분히 큰가

- [ ] **Step 5: 최종 정리 및 문서 업데이트**

README.md 또는 설계 문서에 UI 개편 결과 추가:

```markdown
## UI 개편 내역 (2026-07-19)

### 개선사항
- ✓ 정보 위계 명확화: 카드 + 배지 시스템 도입
- ✓ 색상 팔레트 통일: 밝고 생동감 있는 색상 사용
- ✓ 메인 화면: 카드 기반 약속 목록 표시
- ✓ 채팅 탭: 참여자 정보 및 향상된 메시지 스타일
- ✓ 메뉴 탭: 진행도 및 투표 상태 표시
- ✓ 일정 탭: 확정 시간 강조 및 예상 비용 표시
- ✓ 프로필 화면: 개선된 레이아웃
- ✓ 정산 화면: 명확한 상태 표시
- ✓ 약속 만들기: 단계별 플로우 UI
```

- [ ] **Step 6: 최종 커밋 및 정리**

```bash
git add -A
git commit -m "docs: update with UI redesign completion notes"
```

---

## 구현 체크리스트 요약

### PHASE 1: 기본 구조
- [ ] Task 1: theme.ts 업데이트
- [ ] Task 2: RoomCard 컴포넌트 생성
- [ ] Task 3: App.tsx 통합

### PHASE 2: 탭 개선
- [ ] Task 4: 채팅 탭 UI 개선
- [ ] Task 5: 메뉴 탭 UI 개선
- [ ] Task 6: 일정 탭 UI 개선

### PHASE 3: 추가 화면
- [ ] Task 7: 프로필 화면 개선
- [ ] Task 8: 정산 화면 개선
- [ ] Task 9: 약속 만들기 UI 개선

### 최종
- [ ] Task 10: 전체 테스트 및 정리

---

**총 10개 Task, 약 50-70개의 작은 단계로 구성되어 있습니다.**
각 Task는 독립적으로 테스트 가능하며, 작은 커밋으로 관리할 수 있습니다.
