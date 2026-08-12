import { useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Modal, Share, Alert, Linking, KeyboardAvoidingView, Platform, NativeModules, Image } from 'react-native';
// react-native 내장 SafeAreaView는 iOS 전용이라 Android에서 아무 여백도 만들지 않습니다.
// (시연 영상은 iOS라 정상으로 보였고, Android에서만 상태바·네비게이션 바에 겹쳤습니다)
// Expo 표준 패키지로 교체해 양 플랫폼에서 동작하게 합니다.
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as expoCalendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';

import { supabase } from './lib/supabaseClient';
import { withSessionRetry, describeJwtError } from './lib/supabaseRetry';
import type { Room, PersonalData, ScheduleAvailability, Profile, AppNotification, Message, PrivacySettings, RoomSummary } from './lib/types';
import { usePanResponderSwipeBack } from './lib/usePanResponderSwipeBack';
import { ProfileSetup } from './components/ProfileSetup';
import ScheduleTab from './screens/ScheduleTab';
import RoomInfoModal from './screens/RoomInfoModal';
import AIRecommendModal from './screens/AIRecommendModal';
import ProfileViewModal from './screens/ProfileViewModal';
import CreateRoomModal from './screens/CreateRoomModal';
import GlobalDutchPayModal from './screens/GlobalDutchPayModal';
import LocationPickerModal from './screens/LocationPickerModal';
import RoomListView from './screens/RoomListView';
import RoomScheduleSheet from './screens/RoomScheduleSheet';
import RoomMenuTab from './screens/RoomMenuTab';
import { HomeTab } from './screens/HomeTab';
import { BottomNav } from './components/BottomNav';
import { MealChatLogo } from './components/MealChatLogo';
import { calculateAIRecommendations } from './lib/aiRecommender';
import { DutchPay } from './components/DutchPay';
import { AuthScreen } from './components/AuthScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { storage } from './lib/storage';
import { THEME } from './lib/theme';
import { resolveRoomOwnerProfileId, getMeetingDateDisplay } from './lib/roomUtils';
import { sendScheduleConfirmedNotification, sendRoomParticipationNotification, sendMessageNotification, setupNotificationListeners, sendUnpaidBillNotification, sendRoomCreatedNotification, sendUserJoinedNotification, scheduleConfirmedReminderNotification, cancelNotificationsByType } from './lib/notificationUtils';
import type { NotificationTarget } from './lib/notificationUtils';
import { Bell, Lock, ExternalLink, Send, Volume2, ChevronLeft, X, Settings, Smile } from 'lucide-react-native';
import {
  AuthProvider,
  NetworkProvider,
  LoadingProvider,
  NavigationProvider,
  RoomProvider,
  ProfileProvider,
  RoomEditingProvider,
  NotificationProvider,
  AIProvider,
  RoomCreationProvider,
  RoomTimerProvider,
  useNetwork,
  useLoading,
  useNavigation,
  useRoom,
  useRoomTimer,
  useProfile,
  useAuth,
  useRoomCreation,
  useRoomEditing,
  useAI,
  useNotification
} from './contexts';
import type { AppTab } from './contexts';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // SDK 53부터 shouldShowAlert가 deprecated되고
    // shouldShowBanner / shouldShowList로 분리되었습니다.
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const KAKAO_REST_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY || '';

export default function App() {
  return (
    // SafeAreaProvider가 최상위에 있어야 하위 SafeAreaView/useSafeAreaInsets가 동작합니다.
    <SafeAreaProvider>
    <AuthProvider>
      <NetworkProvider>
        <LoadingProvider>
          <NavigationProvider>
            <RoomProvider>
              <RoomTimerProvider>
                <ProfileProvider>
                  <RoomEditingProvider>
                    <NotificationProvider>
                      <AIProvider>
                        <RoomCreationProvider>
                          <AppContent />
                        </RoomCreationProvider>
                      </AIProvider>
                    </NotificationProvider>
                  </RoomEditingProvider>
                </ProfileProvider>
              </RoomTimerProvider>
            </RoomProvider>
          </NavigationProvider>
        </LoadingProvider>
      </NetworkProvider>
    </AuthProvider>
    </SafeAreaProvider>
  );
}

const EMOTICONS_MAP: { [key: string]: any } = {
  dudu_meet: require('../public/characters/dudu_emoticon_meet.png'),
  dudu_sad: require('../public/characters/dudu_emoticon_sad.png'),
  dudu_love: require('../public/characters/dudu_emoticon_love.png'),
  dudu_wink: require('../public/characters/dudu_emoticon_wink.png'),
  dudu_shock: require('../public/characters/dudu_emoticon_shock.png'),
  moa_ok: require('../public/characters/moa_emoticon_ok.png'),
  moa_hello: require('../public/characters/moa_emoticon_hello.png'),
  moa_busy: require('../public/characters/moa_emoticon_busy.png'),
  moa_sleep: require('../public/characters/moa_emoticon_sleep.png'),
  moa_party: require('../public/characters/moa_emoticon_party.png'),
  welling_eat: require('../public/characters/welling_emoticon_eat.png'),
  welling_coffee: require('../public/characters/welling_emoticon_coffee.png'),
  welling_starving: require('../public/characters/welling_emoticon_starving.png'),
  welling_full: require('../public/characters/welling_emoticon_full.png'),
  welling_thumbs: require('../public/characters/welling_emoticon_thumbs.png'),
  ttori_dutch: require('../public/characters/ttori_emoticon_dutch.png'),
  ttori_angry: require('../public/characters/ttori_emoticon_angry.png'),
};

function AppContent() {
  // ── Context 이전 ──────────────────────────────────────────────────────
  // 이 컴포넌트가 들고 있던 useState 55개를 전부 Context 로 옮겼습니다.
  // 값과 세터 **이름을 그대로 유지**해서, 아래 6,000줄에서 이것들을 쓰는
  // 코드는 한 줄도 바뀌지 않았습니다. 그래서 이전 자체의 회귀 위험이 낮습니다.
  //
  // ⚠️ 지금은 AppContent 하나가 11개 Context 를 전부 구독하므로,
  //    리렌더 범위는 useState 였을 때와 같습니다. 실익은 이 컴포넌트를
  //    화면 단위로 쪼개서 각자 필요한 Context 만 구독할 때 생깁니다.
  const { isOnline, networkError, setIsOnline, setNetworkError } = useNetwork();
  const {
    loading, isSearchingFriends, refreshing,
    setLoading, setIsSearchingFriends, setRefreshing
  } = useLoading();
  const {
    activeTab, showCreateModal, showNotifications, showRoomInfoModal,
    showSettingsModal, isSettingsGameActive, isSwipeBackBlocked, showGlobalDutchPay,
    setActiveTab, setShowCreateModal, setShowNotifications, setShowRoomInfoModal,
    setShowSettingsModal, setIsSettingsGameActive, setIsSwipeBackBlocked,
    setShowGlobalDutchPay
  } = useNavigation();
  // Stage 2a — 방 목록 / 현재 방 상태
  const {
    roomList, currentRoom, participants, currentParticipant, roomMessages,
    newMessageText, roomOverlay, roomSubTab, showEmoticonPicker,
    roomsLoading, participantsLoading,
    setRoomList, setRoomSummaries, setCurrentRoom, setParticipants, setCurrentParticipant,
    setRoomMessages, setNewMessageText, setRoomOverlay, setRoomSubTab,
    setShowEmoticonPicker, setRoomsLoading, setParticipantsLoading
  } = useRoom();
  const { timeLeft, setTimeLeft } = useRoomTimer();
  // Stage 2b — 메이트 검색 / 프로필 모달
  const {
    selectedProfileId, selectedProfile, showProfileModal, searchFriendQuery,
    searchFriendResults, recommendedFriends, lastMessageSender,
    setSelectedProfileId, setSelectedProfile, setShowProfileModal,
    setSearchFriendQuery, setSearchFriendResults, setRecommendedFriends,
    setLastMessageSender
  } = useProfile();
  // Stage 2c — 로그인 사용자 / 내 프로필
  const {
    user, globalProfile, myFollows, authLoading,
    setUser, setGlobalProfile, setMyFollows, setAuthLoading
  } = useAuth();
  // Stage 3 — 나머지
  // 방 생성 / 초대 코드 입장
  const {
    currentCreateStep, newRoomTitle, newRoomDate, joinRoomCode,
    createRoomSelectedFriends, setCurrentCreateStep, setNewRoomTitle,
    setNewRoomDate, setJoinRoomCode, setCreateRoomSelectedFriends
  } = useRoomCreation();
  // 방 제목·장소 인라인 편집
  const {
    isEditingRoomTitle, editingRoomTitle, isEditingRoomLocation,
    editingRoomLocationName, editingRoomLatitude, editingRoomLongitude,
    locationSearchResults, showLocationResults, showLocationMapModal,
    mapRegion, setIsEditingRoomTitle, setEditingRoomTitle,
    setIsEditingRoomLocation, setEditingRoomLocationName,
    setEditingRoomLatitude, setEditingRoomLongitude,
    setLocationSearchResults, setShowLocationResults,
    setShowLocationMapModal, setMapRegion
  } = useRoomEditing();
  // AI 추천 TOP3 모달
  const {
    showAIRecommendModal, aiRecommendations, setShowAIRecommendModal,
    setAiRecommendations
  } = useAI();
  // 앱 내 알림
  const {
    appNotifications, showNotificationsRedDot, setAppNotifications,
    setShowNotificationsRedDot
  } = useNotification();
  // ──────────────────────────────────────────────────────────────────────

  // Authentication states

  // Emoticon state

  // 위 Context 값들을 effect/콜백 안에서 최신값으로 읽기 위한 ref 사본
  const isSettingsGameActiveRef = useRef(false);
  const profileSetupRef = useRef<any>(null);
  const isSwipeBackBlockedRef = useRef(false);

  useEffect(() => {
    isSettingsGameActiveRef.current = isSettingsGameActive;
  }, [isSettingsGameActive]);

  useEffect(() => {
    isSwipeBackBlockedRef.current = isSwipeBackBlocked;
  }, [isSwipeBackBlocked]);

  // 에러 처리 헬퍼 함수
  const handleApiError = (error: any, defaultMessage: string = '요청 처리 중 오류가 발생했습니다.') => {
    console.error('[API Error]', error);

    let message = defaultMessage;

    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('Network')) {
      message = '네트워크 연결을 확인해주세요.';
      setIsOnline(false);
      setNetworkError('인터넷 연결이 끊어졌습니다. 다시 시도해주세요.');
    } else if (describeJwtError(error)) {
      // 재시도까지 실패한 JWT 오류. 원인이 기기 시각일 가능성이 높으므로
      // "다시 로그인하세요"가 아니라 실제로 고칠 수 있는 방법을 알립니다.
      message = describeJwtError(error)!;
    } else if (error?.status === 401) {
      message = '인증이 만료되었습니다. 다시 로그인해주세요.';
    } else if (error?.status === 404) {
      message = '요청한 정보를 찾을 수 없습니다.';
    } else if (error?.status === 500) {
      message = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }

    return message;
  };

  // 네트워크 재시도 함수
  const retryWithBackoff = async (fn: () => Promise<any>, maxRetries: number = 3) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    throw lastError;
  };

  // 네트워크 재시도 및 Supabase 연결 확인 함수
  const handleRetryConnection = async () => {
    try {
      console.log('[Network] Attempting to reconnect...');
      // 1. Try a simple supabase check to check if server is reachable
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      // If we got here, network is working and Supabase is reachable!
      console.log('[Network] Connection test succeeded.');
      setIsOnline(true);
      setNetworkError(null);
      
      // Try reloading profiles and session
      if (data?.session?.user) {
        setUser(data.session.user);
        await loadProfileForUser(data.session.user.id);
      } else {
        setUser(null);
        setAuthLoading(false);
      }
    } catch (err: any) {
      console.error('[Network] Reconnect failed:', err);
      setIsOnline(false);
      setNetworkError('인터넷 연결이 끊겼습니다. 다시 시도해 주세요.');
      Alert.alert('연결 실패', '네트워크에 연결할 수 없습니다. 인터넷 설정을 확인하고 다시 시도해 주세요.');
    }
  };

  const handleSettingsViewChange = useCallback((v: 'main' | 'edit' | 'food_taste') => {
    setIsSettingsGameActive(v === 'food_taste');
  }, []);

  const settingsPanResponder = usePanResponderSwipeBack({
    enableCondition: () => !isSettingsGameActiveRef.current && !isSwipeBackBlockedRef.current,
    onSwipeBack: () => {
      const handled = profileSetupRef.current?.handleSwipeBack();
      if (!handled) {
        setShowSettingsModal(false);
      }
    }
  });

  const globalDutchPayPanResponder = usePanResponderSwipeBack({
    onSwipeBack: () => setShowGlobalDutchPay(false)
  });

  const roomDutchPayPanResponder = usePanResponderSwipeBack({
    onSwipeBack: () => setRoomOverlay(null)
  });
  
  // Room sub-navigation inside active room details

  // Room / Participant states

  const roomOwnerProfileId = useMemo(
    () => resolveRoomOwnerProfileId(participants, currentRoom?.owner_id),
    [participants, currentRoom?.owner_id]
  );

  // Chatting & Dropdown Overlay states

  // Room Notes states

  // Friend Search & Recommendation states

  // Global Profile & Follow states


  // UI state controllers


  
  // Active Rooms in Room List
  
  // Notifications states

  // Countdown timer string


  // Loading states for different sections

  const onRefresh = async () => {
    if (!user) return;
    try {
      setRefreshing(true);
      await loadProfileForUser(user.id);
      await fetchRooms();
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  // Profile completion check
  const isProfileIncomplete = !globalProfile || !globalProfile.name;

  const isCurrentRoomOneDay = currentRoom ? (() => {
    if (!currentRoom.expires_at || !currentRoom.meeting_date) return true;
    const start = new Date(currentRoom.meeting_date).getTime();
    const expires = new Date(currentRoom.expires_at).getTime();
    const diffDays = Math.round((expires - start) / (24 * 60 * 60 * 1000));
    return diffDays <= 3;
  })() : true;

  // 1. Listen for Supabase Authentication State changes
  useEffect(() => {
    console.log('[Auth] Initializing authentication listener...');
    // Check current session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[Auth] Error getting initial session:', error);
        handleApiError(error);
      }
      console.log('[Auth] Initial session user ID:', session?.user?.id || 'No active session');
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfileForUser(session.user.id);
      } else {
        setAuthLoading(false);
      }
    }).catch(err => {
      console.error('[Auth] Error getting session catch:', err);
      handleApiError(err);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[Auth] Auth state changed event: ${event}, user ID: ${session?.user?.id || 'None'}`);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfileForUser(session.user.id);
      } else {
        setGlobalProfile(null);
        setAuthLoading(false);
      }
    });

    return () => {
      console.log('[Auth] Cleaning up authentication listener.');
      subscription.unsubscribe();
    };
  }, []);



  useEffect(() => {
    if (currentRoom) {
      setEditingRoomTitle(currentRoom.title);
      setIsEditingRoomTitle(false);
      setEditingRoomLocationName(currentRoom.location_name || '');
      setEditingRoomLatitude(currentRoom.latitude || 37.5665);
      setEditingRoomLongitude(currentRoom.longitude || 126.9780);
      setIsEditingRoomLocation(false);
    }
  }, [currentRoom]);

  // 딥링크 자동 초대방 입장 처리 (강화된 검증)
  const handleJoinRoomDirectly = async (code: string) => {
    try {
      setLoading(true);
      const upper = code.trim().toUpperCase();
      console.log(`[JoinRoomDirectly] Attempting to join directly with code: ${upper}`);

      // 1. 코드 유효성 검증 (6자 영숫자)
      if (!/^[A-Z0-9]{6}$/.test(upper)) {
        console.error('[JoinRoomDirectly] Invalid code format:', upper);
        Alert.alert('오류', '유효하지 않은 초대 코드입니다.');
        return;
      }

      // 2. 방 정보 재조회
      // 초대코드 조회는 RPC 로 합니다. rooms 직접 조회는 멤버·방장으로
      // 좁혀져 있어(모든 방의 초대코드가 노출되던 문제), 아직 멤버가 아닌
      // 시점에는 이 함수로만 방을 찾을 수 있습니다.
      const { data: rooms, error } = await supabase
        .rpc('get_room_by_code', { p_code: upper });
      const room = rooms?.[0] ?? null;

      if (error || !room) {
        console.error('[JoinRoomDirectly] Room not found:', error);
        if (error?.code === 'PGRST116') {
          Alert.alert('오류', '방을 찾을 수 없습니다.');
        } else {
          Alert.alert('오류', '유효하지 않은 초대 코드입니다.');
        }
        return;
      }

      console.log('[JoinRoomDirectly] Room found:', room);

      // 3. 방 만료 여부 재확인 (최신 데이터)
      const now = new Date();
      const expiresAt = new Date(room.expires_at);

      if (expiresAt.getTime() < now.getTime()) {
        console.log(`[JoinRoomDirectly] Room has expired. expires_at: ${room.expires_at}, now: ${now.toISOString()}`);
        Alert.alert('만료', '방이 만료되었습니다.');
        return;
      }

      // 4. 프로필 검증
      if (!globalProfile || !globalProfile.id) {
        console.error('[JoinRoomDirectly] Global profile not available');
        Alert.alert('오류', '프로필 정보를 불러올 수 없습니다.');
        return;
      }

      // 5. 이미 참가했는지 재확인 (중복 입장 방지)
      // setCurrentParticipant에 그대로 넘기므로 전체 컬럼이 필요합니다.
      const { data: pts, error: ptsError } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', room.id)
        .eq('profile_id', globalProfile.id);

      if (ptsError) {
        console.error('[JoinRoomDirectly] Error checking participant status:', ptsError);
        Alert.alert('오류', '참여 상태 확인 중 오류가 발생했습니다.');
        return;
      }

      // 이미 참여한 경우
      if (pts && pts.length > 0) {
        console.log('[JoinRoomDirectly] User is already a participant:', pts[0].id);
        await storage.setItem(`bobyak_part_id_${room.id}`, pts[0].id);
        setCurrentParticipant(pts[0]);
        Alert.alert('안내', '이미 참여한 방입니다.');
        setCurrentRoom(room);
        setRoomSubTab('schedule');
        setActiveTab('chat');
        return;
      }

      // 6. 새로운 참가자로 자동 입장
      console.log('[JoinRoomDirectly] User is not a participant, auto joining room with profile ID:', globalProfile.id);
      await joinRoomWithProfile(room.id, globalProfile);

      // 7. 방 및 탭 설정
      setCurrentRoom(room);
      setRoomSubTab('schedule');
      setActiveTab('chat');

      Alert.alert('초대 수락 완료', `'${room.title}' 방에 성공적으로 입장했습니다! 🎉`);
    } catch (err) {
      console.error('[JoinRoomDirectly] Unexpected error during join:', err);
      Alert.alert('오류', '방 초대 수락 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 딥링크 수신 파서 (강화된 검증 및 URL 형식 지원 개선)
  const handleDeepLink = async (url: string) => {
    try {
      console.log('[DeepLink] Incoming Deep Link:', url);
      let code = '';

      // Filter out Expo development server URLs (localhost, 192.168.*, 127.0.0.1)
      if (url.includes('localhost') || url.match(/192\.168\.[0-9.]+/) || url.includes('127.0.0.1')) {
        console.log('[DeepLink] Ignoring Expo development server URL:', url);
        return;
      }

      // Fix 3: Improved code extraction with better pattern matching for all URL formats
      // Support: bobyak://join/CODE, exp://..../--/join/CODE, http://...?code=CODE, etc.

      // Strategy 1: Try /join/ path format
      if (url.includes('/join/')) {
        const match = url.match(/\/join\/([A-Z0-9]{6})/i);
        if (match) {
          code = match[1].toUpperCase();
          console.log('[DeepLink] Extracted code from /join/ path:', code);
        }
      }

      // Strategy 2: Try query parameter format (code=...)
      if (!code && url.includes('code=')) {
        const match = url.match(/[?&]code=([A-Z0-9]{6})/i);
        if (match) {
          code = match[1].toUpperCase();
          console.log('[DeepLink] Extracted code from query parameter:', code);
        }
      }

      // Strategy 3: Try direct alphanumeric at the end of URL (fallback)
      if (!code) {
        const match = url.match(/([A-Z0-9]{6})(?:[/?#]|$)/i);
        if (match && !url.includes('http') && !url.includes('exp://')) {
          // Only use this for non-web URLs (avoid accidental matches)
          code = match[1].toUpperCase();
          console.log('[DeepLink] Extracted code from direct pattern:', code);
        }
      }

      // Final validation
      if (!code) {
        console.error('[DeepLink] Could not extract valid code from URL:', url);
        console.log('[DeepLink] Trying alternative extraction methods...');
        // Try one more aggressive extraction
        const anyMatch = url.match(/([A-Z0-9]{6})/i);
        if (anyMatch) {
          const candidate = anyMatch[1].toUpperCase();
          // Validate it looks like our code format
          if (/^[A-Z0-9]{6}$/.test(candidate)) {
            code = candidate;
            console.log('[DeepLink] Extracted code from aggressive pattern:', code);
          }
        }
      }

      // 1. 코드 형식 검증
      if (!code || !/^[A-Z0-9]{6}$/.test(code)) {
        console.error('[DeepLink] Invalid or missing code after extraction:', code, 'Original URL:', url);
        Alert.alert('오류', '유효하지 않은 초대 코드입니다. 초대 링크를 다시 확인해주세요.');
        return;
      }

      console.log('[DeepLink] Extracted and validated code:', code);

      // 2. 로그인 상태 확인
      if (!user) {
        console.log('[DeepLink] User not logged in, storing pending code:', code);
        Alert.alert('로그인 필요', `로그인 완료 후 [${code}] 방으로 자동 연결됩니다.`);
        await storage.setItem('pending_join_code', code);
        return;
      }

      // 3. 프로필 로드 확인
      if (!globalProfile) {
        console.log('[DeepLink] Profile not loaded yet, storing pending code:', code);
        Alert.alert('잠깐만 기다려주세요', '프로필을 로드하는 중입니다...');
        await storage.setItem('pending_join_code', code);
        return;
      }

      // 4. 방 코드 유효성 재검증 (DB에서 확인)
      // 초대코드 조회는 RPC 로 합니다. rooms 직접 조회는 멤버·방장으로
      // 좁혀져 있어(모든 방의 초대코드가 노출되던 문제), 아직 멤버가 아닌
      // 시점에는 이 함수로만 방을 찾을 수 있습니다.
      const { data: dlRooms, error: roomError } = await supabase
        .rpc('get_room_by_code', { p_code: code });
      const room = dlRooms?.[0] ?? null;

      if (roomError || !room) {
        console.error('[DeepLink] Room validation failed:', roomError);
        Alert.alert('오류', '방을 찾을 수 없습니다. 초대 코드가 정확한지 확인해주세요.');
        return;
      }

      // 5. 방 만료 여부 확인
      const now = new Date();
      const expiresAt = new Date(room.expires_at);

      if (expiresAt.getTime() < now.getTime()) {
        console.log('[DeepLink] Room has expired:', room.expires_at);
        Alert.alert('만료', '방이 만료되었습니다.');
        return;
      }

      // 6. 모든 검증 통과, 방 입장 처리
      console.log('[DeepLink] All validations passed, proceeding to join room');
      await handleJoinRoomDirectly(code);
    } catch (e) {
      console.error('[DeepLink] Error parsing deep link:', e);
      Alert.alert('오류', '초대 링크 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 딥링크 리스너 효과
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
  }, [user, globalProfile]);

  // 로그인 성공 후 보류 중인 초대 코드가 있다면 자동 입장 처리 (재검증)
  //
  // ⚠️ 과거 버그 3종을 함께 수정한 블록입니다. 구조를 바꿀 때 주의하세요.
  //  (1) 의존성이 [user, globalProfile] 객체였습니다. 참조가 바뀔 때마다 재실행되어
  //      같은 Alert가 10회 이상 쌓였습니다. → id만 의존하도록 좁혔습니다.
  //  (2) 코드 제거를 각 실패 분기에서 했습니다. 비동기 경쟁으로 제거 전에 다음 실행이
  //      시작돼 중복 Alert가 났습니다. → 읽은 직후 한 번만 제거합니다.
  //  (3) .single()은 0행일 때 PGRST116 에러를 던집니다. "방이 없음"은 정상 흐름인데
  //      에러로 처리해 사용자에게 Alert를 띄웠습니다. → maybeSingle()로 바꿨습니다.
  const pendingJoinHandledRef = useRef(false);
  useEffect(() => {
    if (!user?.id || !globalProfile?.id) return;
    if (pendingJoinHandledRef.current) return;
    pendingJoinHandledRef.current = true;

    (async () => {
      const code = await storage.getItem('pending_join_code');
      if (!code) return;

      // 재시도 루프를 막기 위해 읽는 즉시 제거합니다.
      await storage.removeItem('pending_join_code');
      console.log('[PendingJoinCode] Found pending code:', code);

      {
        {
          // 1. 코드 형식 재검증
          const upperCode = code.trim().toUpperCase();
          if (!/^[A-Z0-9]{6}$/.test(upperCode)) {
            console.warn('[PendingJoinCode] Invalid code format, ignoring:', code);
            return;
          }

          // 2. 방 존재 및 만료 여부 재확인
          // 초대코드 조회는 RPC 로 합니다 (rooms 직접 조회는 멤버·방장 전용).
          const { data: pjRooms, error: roomError } = await supabase
            .rpc('get_room_by_code', { p_code: upperCode });
          const room = pjRooms?.[0] ?? null;

          if (roomError) {
            console.error('[PendingJoinCode] Lookup failed:', roomError);
            Alert.alert('오류', '방 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
            return;
          }
          if (!room) {
            // 코드가 만료·삭제된 방을 가리키는 흔한 경우입니다. 조용히 종료합니다.
            console.log('[PendingJoinCode] No room for code, ignoring:', upperCode);
            return;
          }

          // 3. 방 만료 확인
          const now = new Date();
          const expiresAt = new Date(room.expires_at);

          if (expiresAt.getTime() < now.getTime()) {
            console.log('[PendingJoinCode] Room has expired');
            Alert.alert('만료', '방이 만료되었습니다.');
            return;
          }

          // 4. 중복 입장 확인
          const { data: existingParticipant } = await supabase
            .from('participants')
            .select('id')
            .eq('room_id', room.id)
            .eq('profile_id', globalProfile.id)
            .maybeSingle();

          if (existingParticipant) {
            console.log('[PendingJoinCode] User already participates in this room');
            Alert.alert('안내', '이미 참여한 방입니다.');
            setCurrentRoom(room as Room);
            setActiveTab('chat');
            return;
          }

          // 5. 모든 검증 통과, 방 입장 처리
          console.log('[PendingJoinCode] All validations passed, joining room:', upperCode);
          await handleJoinRoomDirectly(upperCode);
        }
      }
    })();
  }, [user?.id, globalProfile?.id]);

  // 알림을 탭했을 때 해당 방으로 이동합니다.
  // (setupNotificationListeners가 import만 되고 호출되지 않아 알림 탭이 무반응이었습니다.)
  useEffect(() => {
    if (!globalProfile?.id) return;

    const openRoomById = async (roomId: string, target: NotificationTarget) => {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .maybeSingle();

        if (error || !data) {
          console.error('[NotificationTap] Room lookup failed:', roomId, error);
          return;
        }

        setCurrentRoom(data as Room);
        setRoomSubTab(target === 'dutch' ? 'dutch' : 'schedule');
        setRoomOverlay(null);
        setActiveTab('chat');
      } catch (err) {
        console.error('[NotificationTap] Unexpected error:', err);
      }
    };

    const unsubscribe = setupNotificationListeners({
      onOpenRoom: openRoomById,
      onMessageReceived: (roomId) => openRoomById(roomId, 'schedule')
    });

    return unsubscribe;
  }, [globalProfile?.id]);

  // 알림 권한을 확보하고 FCM 기기 토큰을 반환합니다.
  const registerForPushNotificationsAsync = async (): Promise<string | undefined> => {
    let token: string | undefined;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      // 네이티브 FCM 토큰을 씁니다. (getExpoPushTokenAsync 아님)
      //
      // 서버(send-push Edge Function)가 exp.host 를 거치지 않고 FCM HTTP v1 로
      // 직접 보내기 때문입니다. Expo 푸시 토큰을 받아 두면 FCM 이 인식하지 못해
      // 발송이 전부 INVALID_ARGUMENT 로 실패합니다.
      //
      // google-services.json 이 없으면 여기서 예외가 납니다
      // ("Default FirebaseApp is not initialized"). 그 경우 토큰 없이 반환되고,
      // 로컬 알림만 동작합니다.
      const tokenData = await Notifications.getDevicePushTokenAsync();
      // 웹에서는 data 가 객체({endpoint, keys})라 문자열일 때만 씁니다.
      token = typeof tokenData.data === 'string' ? tokenData.data : undefined;
      if (token) console.log('FCM device token 등록됨');
      else console.warn('푸시 토큰 형식이 예상과 다릅니다:', typeof tokenData.data);
    } catch (error) {
      console.log('Error getting push token:', error);
    }

    return token;
  };

  const savePushTokenToProfile = async (token: string, userId: string) => {
    try {
      // 토큰은 profiles 가 아니라 push_tokens 에 저장합니다.
      // profiles 는 profiles_select(using true) 라서 모든 로그인 사용자에게
      // 전체가 보이는데, Expo 푸시 토큰은 그것만 있으면 누구나 임의 알림을
      // 보낼 수 있습니다. push_tokens 는 본인 행만 읽도록 RLS 가 걸려 있고,
      // 발송은 service_role 을 쓰는 send-push Edge Function 이 담당합니다.
      const { error } = await supabase
        .from('push_tokens')
        .upsert(
          { profile_id: userId, token, updated_at: new Date().toISOString() },
          { onConflict: 'profile_id' }
        );
      if (error) throw error;
      console.log('Push token saved successfully!');
    } catch (e) {
      console.error('Error saving push token:', e);
    }
  };

  const checkPendingBillsAndScheduleLocalNotification = async (myProfileId: string) => {
    try {
      const { data: unpaidMemberships, error } = await supabase
        .from('dutch_pay_members')
        .select('*, dutch_pay_bills(*)')
        .eq('profile_id', myProfileId)
        .eq('is_completed', false);

      if (error) throw error;

      if (unpaidMemberships && unpaidMemberships.length > 0) {
        // 이전 정산 알림만 정리합니다. 전체 취소하면 약속 리마인더까지 지워집니다.
        await cancelNotificationsByType('unpaid_bill');

        // 받아야 할 사람들에게만 알림 발송
        for (const membership of unpaidMemberships) {
          const bill = Array.isArray(membership.dutch_pay_bills)
            ? membership.dutch_pay_bills[0]
            : membership.dutch_pay_bills;

          if (bill) {
            // 받아야 할 사람(creditor)의 이름을 가져옴
            const creditorName = bill.account_holder || '정산 송금자';
            const amount = bill.total_amount || 0;

            // 돈 받아야 할 사람들에게 1일 1회 알림 발송
            await sendUnpaidBillNotification(creditorName, amount, bill.id);
          }
        }
        console.log('Sent unpaid bill notifications');
      } else {
        // 미납이 없으면 정산 알림만 걷어냅니다.
        // 이전에는 cancelAllScheduledNotificationsAsync()를 호출해서
        // 30초 폴링이 돌 때마다 약속 리마인더까지 전부 삭제되고 있었습니다.
        const cleared = await cancelNotificationsByType('unpaid_bill');
        console.log(`No unpaid bills. Cleared ${cleared} unpaid-bill notification(s).`);
      }
    } catch (e) {
      console.error('Error checking pending bills for notifications:', e);
    }
  };

  // Load User Profile from Supabase
  const loadProfileForUser = async (userId: string) => {
    try {
      setAuthLoading(true);

      // JWT 가 거부되면 세션을 갱신하고 한 번 더 시도합니다.
      // 기기 시각이 서버보다 앞서 있으면 PGRST303("JWT issued at future")로
      // 거부되는데, 예전에는 그대로 실패해서 "로그인은 됐는데 프로필이 안 뜨는"
      // 상태가 됐습니다. 복구 시도가 아예 없었습니다.
      const { data, error } = await withSessionRetry(() =>
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
      );

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const profile = data as Profile;
        setGlobalProfile(profile);

        // 푸시 토큰 등록.
        // 토큰은 push_tokens 테이블에만 저장하고 globalProfile 에는 담지 않습니다.
        // 화면에서 쓰는 값이 아니고, 프로필 객체에 실어두면 다른 곳으로 흘러가기
        // 쉽습니다.
        registerForPushNotificationsAsync().then((token) => {
          if (token) savePushTokenToProfile(token, profile.id);
        }).catch(e => console.log('Push token registration error:', e));

        // Save locally to AsyncStorage for offline backup
        await storage.setItem('bobyak_global_id', profile.id);
        await storage.setItem('bobyak_global_name', profile.name);
        await storage.setItem('bobyak_global_color', profile.avatar_color);
        await storage.setItem('bobyak_global_tag', profile.tag);
        await storage.setItem('bobyak_global_data', JSON.stringify(profile.personal_data));
        await storage.setItem('bobyak_global_schedule', JSON.stringify(profile.schedule || {}));
        if (profile.avatar_url) {
          await storage.setItem('bobyak_global_avatar_url', profile.avatar_url);
        } else {
          await storage.removeItem('bobyak_global_avatar_url');
        }
      } else {
        setGlobalProfile(null);
      }
    } catch (err: any) {
      console.error('Error loading profile for user:', err);
      handleApiError(err, '프로필 정보를 불러오는데 실패했습니다.');
    } finally {
      setAuthLoading(false);
    }
  };

  /**
   * 방 목록 카드가 쓰는 부가 정보(멤버 아바타 / 마지막 메시지)를 모아 온다.
   *
   * `rooms` 테이블에 없는 값이라 방마다 따로 필요하지만, 방 수만큼 쿼리를 날리는
   * 대신 참여자 1회 + 메시지 1회로 끝내고 클라이언트에서 방별로 접는다.
   * 실패해도 방 목록 자체는 이미 그려진 뒤이므로 조용히 넘긴다 — 카드가
   * 아바타/미리보기 없이 나올 뿐이다.
   */
  const fetchRoomSummaries = async (roomIds: string[]) => {
    if (roomIds.length === 0) {
      setRoomSummaries({});
      return;
    }
    try {
      const [membersResult, messagesResult] = await Promise.all([
        supabase
          .from('participants')
          .select('id, room_id, name, avatar_color, avatar_url')
          .in('room_id', roomIds),
        supabase
          .from('messages')
          .select('room_id, message, created_at')
          .in('room_id', roomIds)
          .order('created_at', { ascending: false })
          .limit(300),
      ]);

      if (membersResult.error) throw membersResult.error;
      if (messagesResult.error) throw messagesResult.error;

      const summaries: Record<string, RoomSummary> = {};
      for (const id of roomIds) {
        summaries[id] = { members: [] };
      }
      for (const row of membersResult.data || []) {
        summaries[row.room_id]?.members.push({
          id: row.id,
          name: row.name,
          avatarColor: row.avatar_color,
          avatarUrl: row.avatar_url || undefined,
        });
      }
      // created_at 내림차순이므로 방마다 처음 만나는 행이 마지막 메시지다
      for (const row of messagesResult.data || []) {
        const summary = summaries[row.room_id];
        if (summary && !summary.lastActivityAt) {
          summary.lastMessage = row.message;
          summary.lastActivityAt = row.created_at;
        }
      }
      setRoomSummaries(summaries);
    } catch (err) {
      console.warn('[FetchRoomSummaries] Could not load room card details:', err);
    }
  };

  // Fetch all active rooms
  const fetchRooms = async () => {
    if (!user || !globalProfile) return;
    try {
      setRoomsLoading(true);
      const nowIso = new Date().toISOString();
      console.log(`[FetchRooms] Fetching active rooms for profile ID: ${globalProfile.id}, current client time (UTC): ${nowIso}`);

      // Get room IDs where the user is a participant
      const { data: partData, error: partError } = await supabase
        .from('participants')
        .select('room_id')
        .eq('profile_id', globalProfile.id);

      if (partError) {
        console.error('[FetchRooms] Error fetching participant room links:', partError);
        const errorMsg = handleApiError(partError, '방 목록을 불러올 수 없습니다.');
        console.warn('[FetchRooms] Error handled:', errorMsg);
        throw partError;
      }

      const joinedRoomIds = partData?.map(p => p.room_id) || [];
      console.log('[FetchRooms] Participant room IDs linked to profile:', joinedRoomIds);

      if (joinedRoomIds.length === 0) {
        setRoomList([]);
        setRoomSummaries({});
        setRoomsLoading(false);
        return;
      }

      // Fetch active ones with retry
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .in('id', joinedRoomIds)
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[FetchRooms] Error loading room details:', error);
        const errorMsg = handleApiError(error, '방 정보를 불러올 수 없습니다.');
        console.warn('[FetchRooms] Error handled:', errorMsg);
        throw error;
      }

      console.log(`[FetchRooms] Succeeded. Loaded ${data?.length || 0} active rooms.`);
      setRoomList(data || []);
      setNetworkError(null); // Clear error on success
      await fetchRoomSummaries((data || []).map(room => room.id));
    } catch (err) {
      console.error('[FetchRooms] Unexpected error:', err);
      handleApiError(err, '방 목록을 불러올 수 없습니다.');
    } finally {
      setRoomsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [currentRoom, user, globalProfile?.id]);

  // Clear stale data immediately upon user change to prevent state leaking
  useEffect(() => {
    setRoomList([]);
    setCurrentRoom(null);
    setCurrentParticipant(null);
    setParticipants([]);
  }, [user?.id]);

  // Fetch notifications & follows
  //
  // 라운드 20260803140000(profiles_read_exposure)가 profiles 를 본인 행으로
  // 좁히면서, 남의 프로필은 profiles_public 뷰로만 읽을 수 있게 됐다.
  // 이 함수는 그 마이그레이션 이후에도 `profiles:following_id(*)` 로 원본
  // 테이블을 그대로 조인했다 — RLS 가 막아 following_id 가 나 자신이 아닌 한
  // 항상 profiles: null 이 됐다. follows 는 성공하고 "친구 목록에 있음" 도
  // 뜨지만, myFollows 를 쓰는 모든 화면(메이트 검색, 함께 조율 메이트 선택,
  // 방 만들기)에서 방금 추가한 친구가 조용히 안 보였다 — 마이그레이션 파일
  // 자신이 경고했던 "절반만 적용하면 조용히 빈 화면이 된다"가 그대로
  // 일어난 것이다. profiles_public 을 별도로 조회해 합친다.
  const fetchFollows = async (profileId: string) => {
    try {
      const { data: followRows, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', profileId);

      if (error) {
        handleApiError(error, '친구 목록을 불러올 수 없습니다.');
        throw error;
      }

      const followingIds = (followRows || []).map(f => f.following_id);
      let profilesById: Record<string, Profile> = {};
      if (followingIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles_public')
          .select('*')
          .in('id', followingIds);
        if (profilesError) throw profilesError;
        profilesById = Object.fromEntries(
          (profilesData || []).map((p: Profile) => [p.id, p])
        );
      }

      const merged = (followRows || []).map(f => ({
        ...f,
        profiles: profilesById[f.following_id]
      }));

      setMyFollows(merged);
      setNetworkError(null); // Clear error on success
    } catch (err) {
      console.error('Error fetching follows:', err);
      handleApiError(err, '친구 목록을 불러올 수 없습니다.');
    }
  };

  const fetchNotifications = async (roomIds: string[]) => {
    if (roomIds.length === 0) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false });

      if (error) {
        handleApiError(error, '알림을 불러올 수 없습니다.');
        throw error;
      }
      // target_profile_ids 가 있으면(독촉 알림) 나를 대상으로 한 것만 남긴다.
      // null 이면 방 전원 대상(정산 요청 생성 등)이라 그대로 둔다.
      const mine = (data || []).filter(
        (n: AppNotification) => !n.target_profile_ids || n.target_profile_ids.includes(globalProfile?.id ?? '')
      );
      setAppNotifications(mine);
      setNetworkError(null); // Clear error on success
    } catch (err) {
      console.error('Error fetching notifications:', err);
      handleApiError(err, '알림을 불러올 수 없습니다.');
    }
  };

  useEffect(() => {
    if (globalProfile?.id) {
      fetchFollows(globalProfile.id);
    }
  }, [globalProfile?.id]);

  useEffect(() => {
    if (!globalProfile?.id) {
      // 프로필이 없으면(로그아웃/기동 직후) 누구의 미납인지 판단할 수 없으므로
      // 정산 알림만 정리합니다. 앱 시작 시에도 이 분기를 타므로
      // 전체 취소를 하면 이전에 예약해 둔 약속 리마인더가 매번 사라집니다.
      cancelNotificationsByType('unpaid_bill');
      return;
    }

    // Run immediately
    checkPendingBillsAndScheduleLocalNotification(globalProfile.id);

    // Then run every 30 seconds
    const interval = setInterval(() => {
      checkPendingBillsAndScheduleLocalNotification(globalProfile.id);
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [globalProfile?.id]);

  useEffect(() => {
    if (roomList.length > 0) {
      const ids = roomList.map(r => r.id);
      fetchNotifications(ids);
    }
  }, [roomList]);

  // Real-time Subscription for notifications & participant sync
  useEffect(() => {
    console.log('[Realtime] Subscribing to notifications channel...');
    const notifChannel = supabase
      .channel('realtime_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          console.log('[Realtime] New notification Postgres change payload:', payload);
          // target_profile_ids 가 있으면(독촉 알림) 나를 대상으로 한 것만 반영한다.
          // 이미 낸 사람 기기에까지 실시간으로 배너·Alert 가 뜨던 것을 막는다.
          const isForMe =
            !newNotif.target_profile_ids || newNotif.target_profile_ids.includes(globalProfile?.id ?? '');
          if (roomList.some(r => r.id === newNotif.room_id) && isForMe) {
            setAppNotifications(prev => [newNotif, ...prev]);
            setShowNotificationsRedDot(true);
            Alert.alert('N빵 정산 알림 🔔', `${newNotif.title}\n${newNotif.message}`);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Notifications channel subscription status changed: ${status}`);
      });

    return () => {
      console.log('[Realtime] Unsubscribing from notifications channel.');
      supabase.removeChannel(notifChannel);
    };
  }, [roomList, globalProfile?.id]);

  // Fetch participants for selected room
  const fetchParticipants = async (roomId: string) => {
    try {
      setParticipantsLoading(true);
      const { data, error } = await supabase
        .from('participants')
        .select('*, profiles(*)')
        .eq('room_id', roomId);
      if (error) {
        handleApiError(error, '참가자 정보를 불러올 수 없습니다.');
        throw error;
      }

      const mapped = (data || []).map((p: any) => ({
        ...p,
        start_location_name: p.profiles?.start_location_name || p.start_location_name,
        start_latitude: p.profiles?.start_latitude || p.start_latitude,
        start_longitude: p.profiles?.start_longitude || p.start_longitude
      }));

      setParticipants(mapped);
      setNetworkError(null); // Clear error on success
      return mapped;
    } catch (err) {
      console.error('Error fetching participants:', err);
      handleApiError(err, '참가자 정보를 불러올 수 없습니다.');
      return [];
    } finally {
      setParticipantsLoading(false);
    }
  };

  // Setup Real-time listener for current room
  useEffect(() => {
    if (!currentRoom) return;

    const setupSync = async () => {
      const pts = await fetchParticipants(currentRoom.id);
      const cachedPartId = await storage.getItem(`bobyak_part_id_${currentRoom.id}`);
      
      if (cachedPartId) {
        const me = pts.find(p => p.id === cachedPartId);
        if (me) {
          setCurrentParticipant(me);
          return;
        }
      }
      
      if (globalProfile) {
        const existingMe = pts.find(p => p.profile_id === globalProfile.id);
        if (existingMe) {
          await storage.setItem(`bobyak_part_id_${currentRoom.id}`, existingMe.id);
          setCurrentParticipant(existingMe);
          return;
        }
        
        await joinRoomWithProfile(currentRoom.id, globalProfile);
      }
    };
    
    setupSync();

    console.log(`[Realtime] Subscribing to room sync channel for room ID: ${currentRoom.id}`);
    const channel = supabase
      .channel(`room_sync_${currentRoom.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${currentRoom.id}` },
        async (payload) => {
          console.log('[Realtime] Participants table Postgres change payload:', payload);
          const updatedPts = await fetchParticipants(currentRoom.id);
          const cachedPartId = await storage.getItem(`bobyak_part_id_${currentRoom.id}`);
          if (cachedPartId) {
            const me = updatedPts.find(p => p.id === cachedPartId);
            if (me) {
              setCurrentParticipant(me);
            } else {
              // Current user was kicked out by host
              setCurrentParticipant(null);
              setCurrentRoom(null);
              Alert.alert('알림', '방장에 의해 방에서 추방되었습니다.');
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${currentRoom.id}` },
        (payload: any) => {
          console.log('[Realtime] Rooms table Postgres UPDATE payload:', payload);
          setCurrentRoom(payload.new as Room);
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Room sync (ID: ${currentRoom.id}) subscription status: ${status}`);
      });

    return () => {
      console.log(`[Realtime] Unsubscribing from room sync channel for room ID: ${currentRoom.id}`);
      supabase.removeChannel(channel);
    };
  }, [currentRoom?.id, globalProfile]);

  // Fetch and subscribe to chat messages for current room
  useEffect(() => {
    if (!currentRoom) {
      setRoomMessages([]);
      return;
    }

    const fetchInitialMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', currentRoom.id)
          .order('created_at', { ascending: true });
        if (error) {
          handleApiError(error, '메시지를 불러올 수 없습니다.');
          throw error;
        }
        setRoomMessages(data || []);
        setNetworkError(null); // Clear error on success
      } catch (err) {
        console.error('Error fetching chat messages:', err);
        handleApiError(err, '메시지를 불러올 수 없습니다.');
      }
    };

    fetchInitialMessages();

    console.log(`[Realtime] Subscribing to chat channel for room ID: ${currentRoom.id}`);
    const chatChannel = supabase
      .channel(`room_chat_${currentRoom.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${currentRoom.id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          console.log('[Realtime] New chat message Postgres change payload:', payload);
          setRoomMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Chat subscription (ID: ${currentRoom.id}) status: ${status}`);
      });

    return () => {
      console.log(`[Realtime] Unsubscribing from chat channel for room ID: ${currentRoom.id}`);
      supabase.removeChannel(chatChannel);
    };
  }, [currentRoom?.id]);

  const handleSendMessage = async () => {
    if (!newMessageText.trim() || !currentRoom || !globalProfile) return;

    try {
      const text = newMessageText.trim();
      setNewMessageText('');

      const newMsg = {
        room_id: currentRoom.id,
        sender_id: globalProfile.id,
        sender_name: globalProfile.name,
        sender_color: globalProfile.avatar_color,
        message: text
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([newMsg])
        .select();

      if (error) {
        const errorMsg = handleApiError(error, '메시지 전송에 실패했습니다.');
        throw error;
      }

      if (data && data.length > 0) {
        setRoomMessages(prev => [...prev, data[0] as Message]);
      } else {
        setRoomMessages(prev => [...prev, { id: Date.now().toString(), ...newMsg } as Message]);
      }

      // 메시지 받은 사람들에게 알림 발송 (모두에게)
      await sendMessageNotification(globalProfile.name, text, currentRoom.id);

      setNetworkError(null); // Clear error on success
    } catch (err) {
      console.error('Error sending message:', err);
      setNewMessageText('');
      const errorMsg = handleApiError(err, '메시지 전송에 실패했습니다.');
      Alert.alert('오류', errorMsg);
    }
  };

  const handleSendEmoticon = async (emoticonKey: string) => {
    if (!currentRoom || !globalProfile) return;

    try {
      const emoticonMsgCode = `[emoticon:${emoticonKey}]`;
      setShowEmoticonPicker(false);

      const newMsg = {
        room_id: currentRoom.id,
        sender_id: globalProfile.id,
        sender_name: globalProfile.name,
        sender_color: globalProfile.avatar_color,
        message: emoticonMsgCode
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([newMsg])
        .select();

      if (error) {
        throw error;
      }

      const nameMap: { [k: string]: string } = {
        dudu_meet: '약속 두두 이모티콘',
        dudu_sad: '우는 두두 이모티콘',
        dudu_love: '하트 두두 이모티콘',
        dudu_wink: '윙크 두두 이모티콘',
        dudu_shock: '깜놀 두두 이모티콘',
        moa_ok: '확인 모아 이모티콘',
        moa_hello: '안녕 모아 이모티콘',
        moa_busy: '바쁜 모아 이모티콘',
        moa_sleep: '낮잠 모아 이모티콘',
        moa_party: '파티 모아 이모티콘',
        welling_eat: '냠냠 웰링 이모티콘',
        welling_coffee: '커피 웰링 이모티콘',
        welling_starving: '배고픈 웰링 이모티콘',
        welling_full: '배부른 웰링 이모티콘',
        welling_thumbs: '최고 웰링 이모티콘',
        ttori_dutch: '정산 또리 이모티콘',
        ttori_angry: '화난 또리 이모티콘',
      };
      const notificationText = `이모티콘을 보냈습니다: ${nameMap[emoticonKey] || emoticonKey}`;

      if (data && data.length > 0) {
        setRoomMessages(prev => [...prev, data[0] as Message]);
      } else {
        setRoomMessages(prev => [...prev, { id: Date.now().toString(), ...newMsg } as Message]);
      }

      await sendMessageNotification(globalProfile.name, notificationText, currentRoom.id);
      setNetworkError(null);
    } catch (err) {
      console.error('Error sending emoticon:', err);
      const errorMsg = handleApiError(err, '이모티콘 전송에 실패했습니다.');
      Alert.alert('오류', errorMsg);
    }
  };


  // Proactive registration into room
  const joinRoomWithProfile = async (roomId: string, profile: Profile) => {
    try {
      const { data: existing, error: checkError } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('profile_id', profile.id);

      if (!checkError && existing && existing.length > 0) {
        await storage.setItem(`bobyak_part_id_${roomId}`, existing[0].id);
        setCurrentParticipant(existing[0]);
        return;
      }

      const { data, error } = await supabase
        .from('participants')
        .insert([{
          room_id: roomId,
          profile_id: profile.id,
          name: profile.name,
          avatar_color: profile.avatar_color,
          personal_data: profile.personal_data,
          schedule: profile.schedule || {},
          voted_items: [],
          // 출발지를 복사하지 않아 participants.start_* 가 항상 null이었고,
          // 중간지점·이동시간 계산이 전부 무효화됐습니다.
          start_location_name: profile.start_location_name ?? null,
          start_latitude: profile.start_latitude ?? null,
          start_longitude: profile.start_longitude ?? null
        }])
        .select();

      if (error) throw error;
      if (data && data[0]) {
        await storage.setItem(`bobyak_part_id_${roomId}`, data[0].id);
        setCurrentParticipant(data[0]);
      }
    } catch (err) {
      console.error('Error auto joining with profile:', err);
    }
  };

  // Countdown timer for 24h explosion
  useEffect(() => {
    if (!currentRoom) return;

    const timer = setInterval(() => {
      const difference = new Date(currentRoom.expires_at).getTime() - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft('폭파됨 💥');
        clearInterval(timer);
        handleExitRoom();
        fetchRooms();
      } else {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}시간 ${minutes}분 ${seconds}초 남음`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentRoom?.expires_at]);

  // Create Room handler (manual creation)
  const handleCreateRoom = async () => {
    if (!globalProfile) {
      Alert.alert('알림', '먼저 프로필을 등록해 주세요.');
      return;
    }
    if (!newRoomTitle.trim()) {
      Alert.alert('알림', '방 이름을 입력해 주세요.');
      return;
    }

    try {
      setLoading(true);
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const date = newRoomDate || new Date().toISOString().split('T')[0];
      const expiresAt = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('rooms')
        .insert([{
          code,
          title: newRoomTitle.trim(),
          meeting_date: date,
          expires_at: expiresAt,
          // 방장을 기록합니다. 예전에는 한 번도 채우지 않아 owner_id 가 늘 null 이었고,
          // 방장 판별을 '가장 먼저 참여한 사람'으로 추정해야 했습니다.
          // RLS 정책도 이 값이 있어야 "내 방에만 초대 가능"을 표현할 수 있습니다.
          owner_id: globalProfile?.id ?? null
        }])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        // Add creator and selected friends to participants
        const invitedParticipants = [
          {
            room_id: data[0].id,
            profile_id: globalProfile.id,
            name: globalProfile.name,
            avatar_color: globalProfile.avatar_color,
            personal_data: globalProfile.personal_data,
            schedule: globalProfile.schedule || {},
            voted_items: []
          },
          ...myFollows
            .filter(f => createRoomSelectedFriends.includes(f.following_id) && f.profiles)
            .map(f => ({
              room_id: data[0].id,
              profile_id: f.profiles!.id,
              name: f.profiles!.name,
              avatar_color: f.profiles!.avatar_color,
              personal_data: f.profiles!.personal_data,
              schedule: f.profiles!.schedule || {},
              voted_items: []
            }))
        ];

        const { error: partError } = await supabase
          .from('participants')
          .insert(invitedParticipants);

        if (partError) throw partError;

        setNewRoomTitle('');
        setNewRoomDate('');
        setCreateRoomSelectedFriends([]);
        setCurrentCreateStep(1);
        setShowCreateModal(false);

        // 방 생성 시에는 device calendar에 저장하지 않음
        // 약속이 확정될 때 실제 시간으로 저장됨
        // (This prevents hardcoded 12:00-13:30 issue)

        Alert.alert('방 개설 완료', `초대코드: ${code}\n스마트폰 캘린더에도 자동 저장되었습니다.`);

        setCurrentRoom(data[0]);
        setRoomSubTab('schedule');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('오류', '방 생성 실패. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  // Join via Invite Code (강화된 검증)
  const handleJoinRoomByCode = async () => {
    if (!joinRoomCode.trim()) return;

    try {
      setLoading(true);
      const upper = joinRoomCode.trim().toUpperCase();
      console.log(`[JoinRoomByCode] Attempting to join room with code: ${upper}`);

      // 1. 코드 형식 검증
      if (!/^[A-Z0-9]{6}$/.test(upper)) {
        console.error('[JoinRoomByCode] Invalid code format:', upper);
        Alert.alert('오류', '유효하지 않은 초대 코드입니다.');
        return;
      }

      // 2. 방 정보 조회
      // 초대코드 조회는 RPC 로 합니다. rooms 직접 조회는 멤버·방장으로
      // 좁혀져 있어(모든 방의 초대코드가 노출되던 문제), 아직 멤버가 아닌
      // 시점에는 이 함수로만 방을 찾을 수 있습니다.
      const { data: foundRooms, error } = await supabase
        .rpc('get_room_by_code', { p_code: upper });
      const data = foundRooms?.[0] ?? null;

      if (error || !data) {
        console.error('[JoinRoomByCode] Room not found:', error);
        if (error?.code === 'PGRST116') {
          Alert.alert('오류', '방을 찾을 수 없습니다.');
        } else {
          Alert.alert('오류', '유효하지 않은 초대 코드입니다.');
        }
        return;
      }

      console.log('[JoinRoomByCode] Found room metadata:', data);

      // 3. 방 만료 여부 확인
      if (new Date(data.expires_at).getTime() < new Date().getTime()) {
        console.log(`[JoinRoomByCode] Room has expired. expires_at: ${data.expires_at}, now: ${new Date().toISOString()}`);
        Alert.alert('만료', '방이 만료되었습니다.');
        return;
      }

      // 4. 중복 입장 확인
      if (globalProfile) {
        const { data: existingParticipant, error: checkError } = await supabase
          .from('participants')
          .select('id')
          .eq('room_id', data.id)
          .eq('profile_id', globalProfile.id)
          .single();

        if (!checkError && existingParticipant) {
          console.log('[JoinRoomByCode] User already participates in this room');
          Alert.alert('안내', '이미 참여한 방입니다.');
          setJoinRoomCode('');
          setCurrentRoom(data);
          setRoomSubTab('schedule');
          setActiveTab('chat');
          return;
        }
      }

      setJoinRoomCode('');
      setCurrentRoom(data);
      setRoomSubTab('schedule');
      setActiveTab('chat');

      // 방에 입장한 사람이 들어왔다는 알림 발송 (모두에게)
      if (globalProfile) {
        await sendUserJoinedNotification(globalProfile.name, data.title, data.id);
        await sendRoomParticipationNotification(
          '👤 참여자 변경',
          `${globalProfile.name}님이 '${data.title}' 약속방에 참여했습니다.`,
          data.id
        );
      }

      Alert.alert('방 입장', `'${data.title}' 방으로 입장했습니다!`);
    } catch (err) {
      console.error('[JoinRoomByCode] Unexpected error while joining room:', err);
      Alert.alert('오류', '방 입장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };


  // Tab 1 Coordination confirmation (create room + invite selected friends automatically)
  const handleCoordinationConfirm = async (
    title: string,
    startDate: string,
    selectedFriends: Profile[],
    locationName?: string,
    latitude?: number,
    longitude?: number
  ) => {
    if (!globalProfile) {
      Alert.alert('알림', '먼저 프로필을 등록해 주세요.');
      return;
    }

    try {
      setLoading(true);
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const startDateObj = new Date(startDate);
      const expiresTime = startDateObj.getTime() + 2 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(expiresTime).toISOString();

      // Create Room
      const { data: rooms, error: roomError } = await supabase
        .from('rooms')
        .insert([{
          code,
          title,
          meeting_date: startDate,
          expires_at: expiresAt,
          owner_id: globalProfile?.id ?? null,
          is_confirmed: false,
          confirmed_slot: null,
          color: '#23A455', // default green
          location_name: locationName || null,
          latitude: latitude || null,
          longitude: longitude || null
        }])
        .select();

      if (roomError) throw roomError;
      if (!rooms || rooms.length === 0) throw new Error('방 개설 실패');

      const room = rooms[0] as Room;

      // Add participants: user + friends
      // 출발지(start_*)를 함께 복사해야 중간지점·이동시간 계산이 동작합니다.
      const toParticipantRow = (p: Profile) => ({
        room_id: room.id,
        profile_id: p.id,
        name: p.name,
        avatar_color: p.avatar_color,
        personal_data: p.personal_data,
        schedule: p.schedule || {},
        voted_items: [],
        start_location_name: p.start_location_name ?? null,
        start_latitude: p.start_latitude ?? null,
        start_longitude: p.start_longitude ?? null
      });

      const newParticipants = [
        toParticipantRow(globalProfile),
        ...selectedFriends.map(toParticipantRow)
      ];

      const { error: partError } = await supabase
        .from('participants')
        .insert(newParticipants);

      if (partError) throw partError;


      Alert.alert(
        '방 개설 완료',
        `약속 조율 방이 생성되었습니다!\n초대코드: ${code}`
      );

      setActiveTab('chat');
      setCurrentRoom(room);
      setRoomOverlay('schedule');
      setRoomSubTab('schedule');

      await fetchParticipants(room.id);
      await fetchRooms();

      // 방 개설 완료 알림 발송 (모두에게)
      await sendRoomCreatedNotification('🎉 밀챗 방이 생성되었습니다!', title, room.code);
    } catch (err: any) {
      console.error(err);
      Alert.alert('오류', '방 개설 및 친구 초대 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 방장 전용 필드(제목·장소·색상·확정 일정 등)를 고친다.
   *
   * 라운드 AR: `rooms` UPDATE 는 방 멤버 전원이 시도할 수 있지만, 방장
   * 전용 필드를 방장이 아닌 사람이 고치려 하면 DB 트리거가 막고 예외를
   * 던진다(`docs/UI/15` 라운드 AR, `20260805010000_room_update_column_scope.sql`).
   * `.select()` 없이 `error` 만 보면 그 예외를 못 잡을 수 있어(트리거가
   * 던진 예외는 PostgREST 가 에러로 돌려주지만, 혹시 몰라 0행도 함께
   * 방어한다) 방장이 아닌데 시도한 경우를 조용히 넘기지 않는다.
   */
  const updateRoomAsOwner = async (roomId: string, patch: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from('rooms')
      .update(patch)
      .eq('id', roomId)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('방장만 이 정보를 수정할 수 있습니다.');
    }
  };

  const handleChangeRoomColor = async (color: string) => {
    if (!currentRoom) return;
    try {
      await updateRoomAsOwner(currentRoom.id, { color });

      setCurrentRoom(prev => prev ? { ...prev, color } : null);
      await fetchRooms();
    } catch (err) {
      console.error('Error updating room color:', err);
      Alert.alert('오류', '방 테마 색상 변경 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateRoomTitle = async () => {
    if (!editingRoomTitle.trim()) {
      Alert.alert('알림', '방 이름을 입력해 주세요.');
      return;
    }
    if (!currentRoom) return;

    try {
      setLoading(true);
      await updateRoomAsOwner(currentRoom.id, { title: editingRoomTitle.trim() });

      // Update event in device calendar
      try {
        const { status } = await expoCalendar.requestCalendarPermissionsAsync();
        if (status === 'granted') {
          const calendars = await expoCalendar.getCalendarsAsync(expoCalendar.EntityTypes.EVENT);
          const calendarIds = calendars.map(cal => cal.id);

          const baseDate = new Date(currentRoom.meeting_date);
          const startDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
          const endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 3, 0);

          const events = await expoCalendar.getEventsAsync(calendarIds, startDate, endDate);
          const targetEvent = events.find(e => e.notes && e.notes.includes(currentRoom.code));

          if (targetEvent) {
            const isConfirmed = currentRoom.is_confirmed;
            const newTitle = isConfirmed ? `[밀챗] ${editingRoomTitle.trim()}` : `[밀챗 대기] ${editingRoomTitle.trim()}`;
            await expoCalendar.updateEventAsync(targetEvent.id, {
              title: newTitle
            });
            console.log('Successfully updated device calendar event title!');
          }
        }
      } catch (calError) {
        console.error('Error updating device calendar event title:', calError);
      }

      setCurrentRoom(prev => prev ? { ...prev, title: editingRoomTitle.trim() } : null);
      await fetchRooms();
      setIsEditingRoomTitle(false);
      Alert.alert('완료', '방 이름이 변경되었습니다.');
    } catch (err) {
      console.error('Error updating room title:', err);
      Alert.alert('오류', '방 이름 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 장소 검색 및 지도 선택
  const handleSearchLocation = async (query: string) => {
    if (!query.trim()) {
      Alert.alert('알림', '검색할 장소명을 입력해 주세요.');
      return;
    }

    try {
      setLoading(true);
      const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&sort=accuracy`;
      
      const headers: Record<string, string> = {};
      if (KAKAO_REST_API_KEY) {
        headers['Authorization'] = `KakaoAK ${KAKAO_REST_API_KEY}`;
      }

      const response = await fetch(url, { headers });

      // 키 문제(401/403)를 '검색 결과 없음'으로 뭉뚱그리면 원인을 못 찾습니다.
      if (!response.ok) {
        const body = await response.text();
        console.warn(`[Kakao] 장소 검색 실패 (HTTP ${response.status})`, body);
        setLocationSearchResults([]);
        setShowLocationResults(false);
        Alert.alert(
          '장소 검색 불가',
          '카카오 장소 검색을 사용할 수 없습니다.\n관리자에게 API 키 설정을 문의해 주세요.'
        );
        return;
      }

      const data = await response.json();

      if (data.documents && Array.isArray(data.documents) && data.documents.length > 0) {
        setLocationSearchResults(data.documents);
        setShowLocationResults(true);
      } else {
        setLocationSearchResults([]);
        setShowLocationResults(false);
        Alert.alert('알림', '검색 결과가 없습니다.');
      }
    } catch (err) {
      console.error('Error searching location:', err);
      Alert.alert('오류', '장소 검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocation = (arg1: number | any, arg2?: number) => {
    if (typeof arg1 === 'object' && arg1 !== null) {
      const place = arg1;
      const latVal = parseFloat(place.y);
      const lngVal = parseFloat(place.x);
      setEditingRoomLocationName(place.place_name);
      setEditingRoomLatitude(latVal);
      setEditingRoomLongitude(lngVal);
      setShowLocationResults(false);
      
      setMapRegion({
        latitude: latVal,
        longitude: lngVal,
        latitudeDelta: 0.0092,
        longitudeDelta: 0.0042,
      });
    } else if (typeof arg1 === 'number' && typeof arg2 === 'number') {
      setEditingRoomLatitude(arg1);
      setEditingRoomLongitude(arg2);
      setShowLocationMapModal(false);
    }
  };

  const handleUpdateRoomLocation = async () => {
    if (!editingRoomLocationName.trim()) {
      Alert.alert('알림', '약속 장소 이름을 입력해 주세요.');
      return;
    }
    if (!currentRoom) return;

    try {
      setLoading(true);
      await updateRoomAsOwner(currentRoom.id, {
        location_name: editingRoomLocationName.trim(),
        latitude: editingRoomLatitude,
        longitude: editingRoomLongitude
      });

      setCurrentRoom(prev => prev ? {
        ...prev,
        location_name: editingRoomLocationName.trim(),
        latitude: editingRoomLatitude,
        longitude: editingRoomLongitude
      } : null);
      await fetchRooms();
      setIsEditingRoomLocation(false);
      Alert.alert('완료', '약속 장소가 변경되었습니다.');
    } catch (err) {
      console.error('Error updating room location:', err);
      Alert.alert('오류', '약속 장소 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAIRecommendations = async () => {
    if (!currentRoom) return;

    try {
      setLoading(true);

      // 1. Fetch latest participants to get updated schedules
      const { data: pts, error: ptsError } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', currentRoom.id);

      if (ptsError) throw ptsError;

      const participantList = pts || [];

      // 2. Run recommendations calculation
      const recommendations = await calculateAIRecommendations(currentRoom, participantList);

      // 3. Cache recommendations to DB
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ ai_recommendations: recommendations })
        .eq('id', currentRoom.id);

      if (roomError) console.error('Error saving AI recommendations to room:', roomError);

      setAiRecommendations(recommendations);
      setShowAIRecommendModal(true);
    } catch (err) {
      console.error('Error calculating AI recommendations:', err);
      Alert.alert('오류', 'AI 일정 추천을 실행하는 도중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Share Room details (강화된 초대 정보)
  const handleShareRoom = async () => {
    if (!currentRoom) return;

    try {
      // 유효성 기간 계산
      const now = new Date();
      const expiresAt = new Date(currentRoom.expires_at);
      const diffMs = expiresAt.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      let validityText = '';
      if (diffHours <= 0) {
        validityText = '⚠️ 유효 기간이 만료되었습니다.';
      } else if (diffHours < 1) {
        validityText = `⏰ ${diffMinutes}분 남음`;
      } else {
        validityText = `⏰ ${diffHours}시간 ${diffMinutes}분 남음`;
      }

      // 참여자 수
      const { data: participants, error: partError } = await supabase
        .from('participants')
        .select('id')
        .eq('room_id', currentRoom.id);

      const participantCount = partError ? 0 : (participants?.length || 0);

      let inviteLink = `mealchat://join/${currentRoom.code}`;

      // Expo Go Metro Bundler 주소 동적 감지하여 링크 생성 (테스트 편의용)
      try {
        const scriptURL = NativeModules.SourceCode?.scriptURL || '';
        const match = scriptURL.match(/^https?:\/\/([^/]+)\//);
        if (match && match[1]) {
          inviteLink = `exp://${match[1]}/--/join/${currentRoom.code}`;
        }
      } catch (e) {
        console.error('Error parsing scriptURL for share link:', e);
      }

      const meetingDateDisplay = getMeetingDateDisplay(currentRoom);

      const shareText = `[밀챗] '${currentRoom.title}' 밀챗 방에 초대되었습니다! 🎉

📅 일정: ${meetingDateDisplay}
👥 현재 참여자: ${participantCount}명
⏱️ 초대 코드 유효시간: ${validityText}

초대 코드: ${currentRoom.code}

👉 바로 입장하기 링크:
${inviteLink}

일정 조율과 메뉴 설문에 참여하세요!`;

      console.log('[ShareRoom] Sharing room with code:', currentRoom.code);

      await Share.share({
        message: shareText,
        title: `Bob-yak 초대: ${currentRoom.title}`
      });
    } catch (err) {
      console.error('[ShareRoom] Share failed:', err);
      Alert.alert('오류', '초대 링크 공유 중 오류가 발생했습니다.');
    }
  };

  // Save/Update profile from Profile tab
  const handleSaveProfile = async (
    name: string,
    color: string,
    personalData: PersonalData,
    tag: string,
    avatarUrl?: string,
    startLocationName?: string,
    startLatitude?: number,
    startLongitude?: number
  ) => {
    if (!user) {
      Alert.alert('오류', '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
      return;
    }

    try {
      setLoading(true);
      const schedule = globalProfile?.schedule || {};

      const profileData: any = {
        id: user.id,
        name,
        tag,
        avatar_color: color,
        personal_data: personalData,
        schedule,
        avatar_url: avatarUrl || null,
        start_location_name: startLocationName || null,
        start_latitude: startLatitude || null,
        start_longitude: startLongitude || null
      };

      // (name, tag) 에 유니크 인덱스(profiles_name_tag_key)가 걸려 있다.
      // 태그는 100~999 난수라 900가지뿐이고, 같은 닉네임 사용자가 늘면 충돌한다.
      //
      // 예전에는 충돌 시 그냥 실패했다. 태그는 ProfileSetup 에서 한 번만
      // 생성되어 state 에 남으므로, 다시 눌러도 **같은 태그로 재시도**해
      // 영원히 저장되지 않았다. 흔한 닉네임이면 프로필을 만들 수 없었다.
      // 여기서 태그를 새로 뽑아 몇 번 다시 시도한다.
      let saveError: any = null;
      let usedTag = tag;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { error } = await supabase
          .from('profiles')
          .upsert({ ...profileData, tag: usedTag });

        if (!error) {
          saveError = null;
          break;
        }
        saveError = error;
        // 23505 = unique_violation. 그 외 오류는 재시도해도 소용없다.
        if (error.code !== '23505') break;
        usedTag = String(Math.floor(100 + Math.random() * 900));
        console.warn(`[SaveProfile] 태그 충돌. 새 태그로 재시도: ${usedTag}`);
      }

      if (saveError) {
        if (saveError.code === '23505') {
          Alert.alert(
            '닉네임 사용 불가',
            `'${name}' 은(는) 이미 많은 분이 쓰고 있어 태그를 발급하지 못했습니다.\n` +
              `다른 닉네임으로 바꿔 주세요.`
          );
          return;
        }
        throw saveError;
      }
      // 재시도로 태그가 바뀌었을 수 있으므로 이후 저장에 실제 값을 쓴다.
      profileData.tag = usedTag;
      tag = usedTag;

      await storage.setItem('bobyak_global_id', user.id);
      await storage.setItem('bobyak_global_name', name);
      await storage.setItem('bobyak_global_color', color);
      await storage.setItem('bobyak_global_tag', tag);
      await storage.setItem('bobyak_global_data', JSON.stringify(personalData));
      if (avatarUrl) {
        await storage.setItem('bobyak_global_avatar_url', avatarUrl);
      } else {
        await storage.removeItem('bobyak_global_avatar_url');
      }

      const updatedProfile: Profile = {
        id: user.id,
        name,
        tag,
        avatar_color: color,
        personal_data: personalData,
        schedule,
        avatar_url: avatarUrl || undefined,
        created_at: '',
        start_location_name: startLocationName || undefined,
        start_latitude: startLatitude || undefined,
        start_longitude: startLongitude || undefined
      };

      setGlobalProfile(updatedProfile);
      Alert.alert('완료', '프로필이 성공적으로 저장되었습니다!');

      // 참여 중인 모든 방의 내 참여자 행을 갱신합니다.
      // 예전에는 열려 있는 방(currentParticipant) 하나만 갱신해서, 다른 방에는
      // 예전 이름·출발지가 그대로 남았습니다.
      // participants_update_self 정책이 profile_id = auth.uid() 로 범위를 보장합니다.
      const { error: partUpdateError } = await supabase
        .from('participants')
        .update({
          name,
          avatar_color: color,
          personal_data: personalData,
          avatar_url: avatarUrl || null,
          start_location_name: startLocationName || null,
          start_latitude: startLatitude || null,
          start_longitude: startLongitude || null
        })
        .eq('profile_id', user.id);
      if (partUpdateError) console.error('Error updating participant profile:', partUpdateError);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      Alert.alert('오류', '프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Load profile for viewing
  const handleViewProfile = async (profileId: string) => {
    if (!profileId || profileId === 'null') {
      Alert.alert('알림', '유효하지 않은 사용자 프로필입니다.');
      return;
    }
    try {
      const { data, error } = await supabase
        // 남의 프로필은 profiles_public 뷰로 읽습니다.
        // profiles 원본은 본인 행만 조회 가능하도록 좁혔습니다
        // (계좌번호·생년월일이 전원에게 열려 있었습니다).
        .from('profiles_public')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) throw error;

      if (data) {
        setSelectedProfile(data as Profile);
        setShowProfileModal(true);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      Alert.alert('오류', '프로필을 불러올 수 없습니다.');
    }
  };

  // Add Friend Handler
  const handleAddFriend = async (friendId: string) => {
    if (!globalProfile) return;
    try {
      const { error } = await supabase
        .from('follows')
        .insert([{
          follower_id: globalProfile.id,
          following_id: friendId,
          role: 'mate'
        }]);

      if (error) throw error;

      await fetchFollows(globalProfile.id);
      Alert.alert('완료', '친구 추가가 완료되었습니다! 🎉');
    } catch (err) {
      console.error('Error adding friend:', err);
      Alert.alert('오류', '친구 추가에 실패했습니다.');
    }
  };

  // Remove Friend Handler
  const handleRemoveFriend = async (friendId: string) => {
    if (!globalProfile) return;
    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', globalProfile.id)
        .eq('following_id', friendId);

      if (error) throw error;

      await fetchFollows(globalProfile.id);
      Alert.alert('완료', '친구를 삭제했습니다.');
    } catch (err) {
      console.error('Error removing friend:', err);
      Alert.alert('오류', '친구 삭제에 실패했습니다.');
    }
  };

  // Check if field is visible based on privacy settings
  const isFieldVisible = (
    fieldName: keyof PrivacySettings,
    profile: Profile
  ): boolean => {
    if (!profile.privacy_settings) return true; // Default to public if not set

    const privacy = profile.privacy_settings[fieldName];
    if (privacy === 'public') return true;
    if (privacy === 'private') return false;
    if (privacy === 'best') {
      // Check if current user marked this person as best friend
      const isBestFriend = myFollows.some(f =>
        f.following_id === profile.id && f.role === 'leader'
      );
      return isBestFriend;
    }
    return true; // Default to visible if not private
  };

  // 계정 삭제
  const handleDeleteAccount = async () => {
    if (!user) return;

    Alert.alert(
      '계정 삭제',
      '정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', onPress: () => {} },
        {
          text: '삭제',
          onPress: async () => {
            try {
              setLoading(true);

              // 프로필 삭제
              if (globalProfile?.id) {
                await supabase
                  .from('profiles')
                  .delete()
                  .eq('id', globalProfile.id);
              }

              // 인증 계정 삭제
              await supabase.auth.admin.deleteUser(user.id);

              Alert.alert('완료', '계정이 삭제되었습니다.');
              await handleLogout();
            } catch (err: any) {
              Alert.alert('오류', '계정 삭제 실패');
              console.error(err);
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // 데이터 내보내기
  const handleExportData = async () => {
    try {
      if (!globalProfile) {
        Alert.alert('오류', '프로필을 불러올 수 없습니다.');
        return;
      }

      const exportData = {
        profile: {
          id: globalProfile.id,
          name: globalProfile.name,
          tag: globalProfile.tag,
          email: user?.email,
          createdAt: globalProfile.created_at,
          personalData: globalProfile.personal_data,
          privacySettings: globalProfile.privacy_settings
        },
        follows: myFollows.map(f => ({
          id: f.following_id,
          name: f.profiles?.name,
          role: f.role
        })),
        rooms: roomList.map(r => ({
          id: r.id,
          code: r.code,
          title: r.title,
          meetingDate: r.meeting_date,
          createdAt: r.created_at
        })),
        exportedAt: new Date().toISOString()
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      // 공유 기능 사용
      await Share.share({
        message: `Bob-yak 데이터 백업:\n\n${jsonString}`,
        title: `bobyak_backup_${new Date().getTime()}.json`
      });

      Alert.alert('완료', '데이터 내보내기가 완료되었습니다.');
    } catch (err: any) {
      console.error(err);
      Alert.alert('오류', '데이터 내보내기 실패');
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      
      // Clear local storage
      await storage.removeItem('bobyak_global_id');
      await storage.removeItem('bobyak_global_name');
      await storage.removeItem('bobyak_global_color');
      await storage.removeItem('bobyak_global_tag');
      await storage.removeItem('bobyak_global_data');
      await storage.removeItem('bobyak_global_schedule');

      setGlobalProfile(null);
      setUser(null);
      setCurrentRoom(null);
      setCurrentParticipant(null);
      setParticipants([]);
      setRoomList([]); // Clear rooms list
      Alert.alert('완료', '로그아웃되었습니다.');
    } catch (err) {
      console.error('Error logging out:', err);
      Alert.alert('오류', '로그아웃 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Save availability from Schedule Coordination tab
  const handleSaveProfileSchedule = async (schedule: ScheduleAvailability) => {
    if (!globalProfile?.id) {
      Alert.alert('알림', '프로필 설정을 완료하고 일정을 저장해 주세요.');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ schedule })
        .eq('id', globalProfile.id);

      if (error) throw error;

      await storage.setItem('bobyak_global_schedule', JSON.stringify(schedule));
      setGlobalProfile({ ...globalProfile, schedule });
      Alert.alert('완료', '내 개인 일정이 저장되었습니다!');
    } catch (err) {
      console.error('Error saving schedule:', err);
    }
  };

  // Save availability inside a Room
  const handleSaveParticipantSchedule = async (schedule: ScheduleAvailability) => {
    if (!currentParticipant) {
      Alert.alert('알림', '프로필을 먼저 저장해 주세요.');
      return;
    }

    try {
      const { error } = await supabase
        .from('participants')
        .update({ schedule })
        .eq('id', currentParticipant.id);

      if (error) throw error;
      Alert.alert('완료', '방 내 일정이 저장되었습니다!');
    } catch (err) {
      console.error('Error saving participant schedule:', err);
    }
  };

  const handleConfirmSchedule = async (
    slot: string,
    placeName?: string,
    placeCoords?: { latitude?: number; longitude?: number }
  ) => {
    if (!currentRoom) return;

    try {
      const meetingDateTime = new Date(currentRoom.meeting_date);
      meetingDateTime.setHours(23, 59, 59, 999);
      const expiresAt = new Date(meetingDateTime.getTime() + 48 * 60 * 60 * 1000).toISOString();

      // Fix 2: Delete old confirmed_slot reference from scheduled_time if exists
      if (currentRoom.is_confirmed && currentRoom.confirmed_slot) {
        console.log('[ConfirmSchedule] Cleaning up old confirmed_slot references...');
        try {
          const { error: deleteError } = await supabase
            .from('scheduled_time')
            .delete()
            .eq('room_id', currentRoom.id)
            .eq('slot_type', 'confirmed');
          if (deleteError) {
            console.warn('[ConfirmSchedule] Warning deleting old scheduled_time:', deleteError);
          }
        } catch (cleanupErr) {
          console.warn('[ConfirmSchedule] Cleanup error (non-critical):', cleanupErr);
        }
      }

      const proceedConfirm = async (
        targetSlot: string,
        targetLocation?: string | null,
        targetCoords?: { latitude?: number; longitude?: number }
      ) => {
        // 장소 이름과 함께 좌표도 저장합니다.
        // 이전에는 이름만 저장해 방 상세에 '(위도: undefined, 경도: undefined)'가 떴습니다.
        // 좌표를 모르는 경우(직접 입력 등)에는 기존 값을 덮어쓰지 않습니다.
        const locationPatch: Record<string, unknown> = {
          is_confirmed: true,
          confirmed_slot: targetSlot,
          expires_at: expiresAt,
          location_name: targetLocation || null
        };
        if (targetCoords?.latitude != null && targetCoords?.longitude != null) {
          locationPatch.latitude = targetCoords.latitude;
          locationPatch.longitude = targetCoords.longitude;
        }

        await updateRoomAsOwner(currentRoom.id, locationPatch);

        const updatedRoom = {
          ...currentRoom,
          is_confirmed: true,
          confirmed_slot: targetSlot,
          expires_at: expiresAt,
          location_name: targetLocation || undefined,
          ...(targetCoords?.latitude != null && targetCoords?.longitude != null
            ? { latitude: targetCoords.latitude, longitude: targetCoords.longitude }
            : {})
        };
        setCurrentRoom(updatedRoom);

        // rooms 배열도 함께 업데이트
        setRoomList(prevRooms =>
          prevRooms.map(r => r.id === currentRoom.id ? updatedRoom : r)
        );

        // Fix 1: Delete previous calendar event before adding new one
        try {
          const { status } = await expoCalendar.requestCalendarPermissionsAsync();
          if (status === 'granted') {
            const calendars = await expoCalendar.getCalendarsAsync(expoCalendar.EntityTypes.EVENT);
            const calendarIds = calendars.map(cal => cal.id);

            // 1. Find and delete old calendar event
            if (currentRoom.is_confirmed && currentRoom.confirmed_slot) {
              console.log('[ConfirmSchedule] Searching for old calendar event to delete...');
              const baseDate = new Date(currentRoom.meeting_date);
              const startDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
              const endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 3, 0);

              const events = await expoCalendar.getEventsAsync(calendarIds, startDate, endDate);

              // Find event with matching room ID in notes (prevent conflicts with multiple rooms on same day)
              const oldEvent = events.find(e =>
                e.notes && e.notes.includes(`ID:${currentRoom.id}`)
              );

              if (oldEvent) {
                console.log('[ConfirmSchedule] Deleting old calendar event:', oldEvent.id);
                try {
                  await expoCalendar.deleteEventAsync(oldEvent.id);
                } catch (deleteErr) {
                  console.warn('[ConfirmSchedule] Error deleting old event (may already be deleted):', deleteErr);
                }
              }
            }

            // 2. Add new calendar event
            if (calendars.length > 0) {
              const defaultCalendarId = calendars[0].id;

              let startDateVal = new Date(currentRoom.meeting_date);
              let endDateVal = new Date(startDateVal);
              let isAllDay = false;

              if (targetSlot) {
                // 단일 시간 약속 처리 (예: "6월 28일 (일) 14:30")
                const timeMatch = targetSlot.match(/(\d{1,2}):(\d{2})/);
                if (timeMatch) {
                  const hour = parseInt(timeMatch[1]);
                  const minute = parseInt(timeMatch[2]);

                  // 날짜는 meeting_date 사용
                  const dateParts = currentRoom.meeting_date.split('-');
                  const year = parseInt(dateParts[0]);
                  const month = parseInt(dateParts[1]) - 1;
                  const day = parseInt(dateParts[2]);

                  startDateVal = new Date(year, month, day, hour, minute, 0);
                  endDateVal = new Date(year, month, day, hour + 1, minute, 0);
                  isAllDay = false;
                }
              }

              // 모든 약속을 device calendar에 추가
              if (startDateVal && endDateVal) {
                console.log('[ConfirmSchedule] Creating new calendar event...');
                try {
                  await expoCalendar.createEventAsync(defaultCalendarId, {
                    title: `[밀챗] ${currentRoom.title}`,
                    startDate: startDateVal,
                    endDate: endDateVal,
                    allDay: isAllDay,
                    location: targetLocation || '',
                    notes: `약속 시간: ${targetSlot}\n초대 코드: ${currentRoom.code}\nID:${currentRoom.id}`
                  });
                } catch (err) {
                  console.warn('[ConfirmSchedule] Error creating calendar event:', err);
                }
              }
            }
          }
        } catch (calError) {
          console.error('Error updating device calendar:', calError);
        }

        Alert.alert('약속 확정', '약속 일정이 확정되었습니다! 🎉\n스마트폰 캘린더에도 자동 저장되었습니다.');

        // Send notification to all participants
        if (globalProfile?.name) {
          await sendScheduleConfirmedNotification(
            '약속 확정',
            `${currentRoom.title}의 일정이 ${targetSlot}으로 확정되었습니다!`,
            currentRoom.id,
            targetSlot
          );

          // 약속방 상태 변경 알림
          await sendRoomParticipationNotification(
            '📌 약속 상태 변경',
            `'${currentRoom.title}' 약속이 ${targetSlot}으로 확정되었습니다!`,
            currentRoom.id
          );

          // 약속 1시간 전 알림 스케줄
          await scheduleConfirmedReminderNotification(
            currentRoom.title,
            targetSlot,
            currentRoom.id,
            currentRoom.meeting_date
          );
        }
      };

      let finalLocationName = currentRoom.location_name;

      if (placeName && placeName.trim()) {
        const currentLoc = currentRoom.location_name;
        if (currentLoc && currentLoc.trim() && currentLoc.trim() !== placeName.trim()) {
          // Ask user whether they want to override the location
          Alert.alert(
            '📍 약속 장소 변경',
            `이미 지정된 약속 장소('${currentLoc}')가 있습니다.\nAI가 추천한 '${placeName}'(으)로 장소를 변경하시겠습니까?`,
            [
              {
                text: '예 (장소 변경)',
                onPress: async () => {
                  try {
                    await proceedConfirm(slot, placeName, placeCoords);
                  } catch (e) {
                    console.error(e);
                    Alert.alert('오류', '장소 변경 중 오류가 발생했습니다.');
                  }
                }
              },
              {
                text: '아니오 (시간만 확정)',
                onPress: async () => {
                  try {
                    await proceedConfirm(slot, currentLoc);
                  } catch (e) {
                    console.error(e);
                    Alert.alert('오류', '일정 확정 중 오류가 발생했습니다.');
                  }
                }
              },
              {
                text: '취소',
                style: 'cancel'
              }
            ]
          );
          return;
        } else {
          finalLocationName = placeName;
        }
      }

      await proceedConfirm(slot, finalLocationName, finalLocationName === placeName ? placeCoords : undefined);
    } catch (err) {
      console.error('Error confirming schedule:', err);
      Alert.alert('오류', '약속 확정 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // Search friends by name and tag
  const handleSearchFriend = async (query: string) => {
    if (!query.trim()) {
      setSearchFriendResults([]);
      return;
    }

    setIsSearchingFriends(true);
    try {
      const { data, error } = await supabase
        // 남의 프로필은 profiles_public 뷰로 읽습니다.
        // profiles 원본은 본인 행만 조회 가능하도록 좁혔습니다
        // (계좌번호·생년월일이 전원에게 열려 있었습니다).
        .from('profiles_public')
        .select('*')
        .or(`name.ilike.%${query}%,tag.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      // Filter out already followed users
      const followingIds = myFollows.map(f => f.following_id);
      const filtered = (data || []).filter(
        profile => profile.id !== globalProfile?.id && !followingIds.includes(profile.id)
      );

      setSearchFriendResults(filtered);
    } catch (err) {
      console.error('Error searching friends:', err);
    } finally {
      setIsSearchingFriends(false);
    }
  };

  // Get recommended friends (not yet followed, max 5)
  const getRecommendedFriends = async () => {
    if (!globalProfile?.id) return;

    try {
      const followingIds = myFollows.map(f => f.following_id);

      const { data, error } = await supabase
        // 남의 프로필은 profiles_public 뷰로 읽습니다.
        // profiles 원본은 본인 행만 조회 가능하도록 좁혔습니다
        // (계좌번호·생년월일이 전원에게 열려 있었습니다).
        .from('profiles_public')
        .select('*')
        .not('id', 'in', `(${[globalProfile.id, ...followingIds].map(() => '?').join(',')})`)
        .limit(5);

      if (error) throw error;

      // Alternative: fetch all and filter on client
      const allProfiles = data || [];
      const recommended = allProfiles.filter(
        p => p.id !== globalProfile.id && !followingIds.includes(p.id)
      ).slice(0, 5);

      setRecommendedFriends(recommended);
    } catch (err) {
      console.error('Error getting recommended friends:', err);
    }
  };

  // Follow user
  const handleFollowUser = async (profileId: string) => {
    if (!globalProfile?.id) {
      Alert.alert('오류', '프로필을 먼저 설정해주세요.');
      return;
    }

    try {
      const { error } = await supabase
        .from('follows')
        .insert([{
          follower_id: globalProfile.id,
          following_id: profileId,
          role: 'mate',
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      // Reload follows and recommended friends
      await loadProfileForUser(user.id);
      await getRecommendedFriends();
      setSearchFriendResults(searchFriendResults.filter(p => p.id !== profileId));
      Alert.alert('완료', '팔로우했습니다!');
    } catch (err) {
      console.error('Error following user:', err);
      Alert.alert('오류', '팔로우에 실패했습니다.');
    }
  };

  // Retry coordination (reset confirmed state and start new voting)
  const handleRetryCoordination = async (roomId: string) => {
    if (!currentRoom || roomOwnerProfileId !== globalProfile?.id) {
      Alert.alert('권한 필요', '방장만 일정 재조율을 할 수 있습니다.');
      return;
    }

    try {
      await updateRoomAsOwner(roomId, {
        is_confirmed: false,
        confirmed_slot: null,
        expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      });

      setCurrentRoom({
        ...currentRoom,
        is_confirmed: false,
        confirmed_slot: undefined
      });

      Alert.alert('완료', '일정 재조율이 요청되었습니다 🔄');

      // Send notification to all participants
      participants.forEach(p => {
        if (p.profile_id && p.profile_id !== globalProfile?.id) {
          sendScheduleConfirmedNotification(
            '일정 재조율',
            `${currentRoom.title}의 일정을 다시 투표합니다 🔄`,
            roomId,
            ''
          );
        }
      });

      // 약속방 상태 변경 알림
      await sendRoomParticipationNotification(
        '📌 약속 상태 변경',
        `'${currentRoom.title}' 약속이 취소되었습니다. 일정 재조율을 시작합니다.`,
        roomId
      );
    } catch (err) {
      console.error('Error retrying coordination:', err);
      Alert.alert('오류', '일정 재조율에 실패했습니다.');
    }
  };

  // Update Baemin Poll items
  const handleUpdatePoll = async (newItems: any[]) => {
    if (!currentRoom) return;
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ voting_items: newItems })
        .eq('id', currentRoom.id);
      if (error) throw error;
    } catch (err) {
      console.error(err);
    }
  };

  // Update my Baemin menu votes
  const handleUpdateMyVote = async (votedIds: string[]) => {
    if (!currentParticipant) return;
    try {
      const { error } = await supabase
        .from('participants')
        .update({ voted_items: votedIds })
        .eq('id', currentParticipant.id);
      if (error) throw error;
      setCurrentParticipant({
        ...currentParticipant,
        voted_items: votedIds
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleExitRoom = () => {
    setCurrentRoom(null);
    setCurrentParticipant(null);
    setParticipants([]);
    setRoomOverlay(null);
    setShowRoomInfoModal(false);
  };

  // 방 삭제 (모든 멤버 가능)
  const handleDeleteRoom = async () => {
    if (!currentRoom) return;

    Alert.alert(
      '방 삭제',
      '이 밀챗 방을 완전히 삭제하시겠습니까? 모든 데이터가 사라집니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              // 캘린더 이벤트 삭제
              try {
                const { status } = await expoCalendar.requestCalendarPermissionsAsync();
                if (status === 'granted') {
                  const calendars = await expoCalendar.getCalendarsAsync(expoCalendar.EntityTypes.EVENT);
                  const calendarIds = calendars.map(cal => cal.id);

                  const baseDate = new Date(currentRoom.meeting_date);
                  const startDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
                  const endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 3, 0);

                  const events = await expoCalendar.getEventsAsync(calendarIds, startDate, endDate);
                  const roomEvents = events.filter(e =>
                    e.notes && e.notes.includes(currentRoom.code) && e.title.includes('[밀챗')
                  );

                  for (const event of roomEvents) {
                    try {
                      await expoCalendar.deleteEventAsync(event.id);
                    } catch (deleteErr) {
                      console.warn('Error deleting calendar event:', deleteErr);
                    }
                  }
                }
              } catch (calError) {
                console.warn('Calendar event deletion error (non-critical):', calError);
              }

              // Delete all participants
              await supabase.from('participants').delete().eq('room_id', currentRoom.id);
              // Delete room
              await supabase.from('rooms').delete().eq('id', currentRoom.id);

              setCurrentRoom(null);
              setRoomList(prev => prev.filter(r => r.id !== currentRoom.id));
              handleExitRoom();
              Alert.alert('완료', '방이 삭제되었습니다.');
            } catch (err) {
              console.error('Error deleting room:', err);
              Alert.alert('오류', '방 삭제에 실패했습니다.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // 멤버 추방
  const handleKickParticipant = async (participantId: string, participantName: string) => {
    if (!currentRoom) return;

    Alert.alert(
      '멤버 추방',
      `정말로 '${participantName}'님을 이 방에서 추방하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '추방',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('participants')
                .delete()
                .eq('id', participantId);

              if (error) throw error;

              // Send system message to chat room
              const systemMsg = {
                room_id: currentRoom.id,
                sender_id: 'system',
                sender_name: '시스템',
                sender_color: '#64748b',
                message: `'${participantName}'님이 방장에 의해 추방되었습니다.`
              };

              await supabase.from('messages').insert([systemMsg]);

              // Update participants list
              await fetchParticipants(currentRoom.id);
              Alert.alert('완료', `'${participantName}'님이 방에서 추방되었습니다.`);
            } catch (err) {
              console.error('Error kicking participant:', err);
              Alert.alert('오류', '멤버 추방에 실패했습니다.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // 첫 번째 참가자(방장) 확인
  const isRoomCreator = async (roomId: string): Promise<boolean> => {
    if (!currentRoom || !globalProfile) return false;
    return roomOwnerProfileId === globalProfile.id;
  };

  // 방장 위치 이전
  const handleTransferRoomOwnership = async (newOwnerId: string) => {
    if (!currentRoom || !currentParticipant) return;

    try {
      const newOwner = participants.find(p => p.id === newOwnerId);
      if (!newOwner || !newOwner.profile_id) throw new Error('New owner not found');

      // rooms.owner_id 를 실제로 옮긴다.
      //
      // 예전에는 participants.created_at 을 1970년으로 바꿔서 "가장 먼저
      // 참여한 사람 = 방장"이라는 옛 판정 로직을 속였다. 라운드 AL-5 부터
      // RLS 가 owner_id 만 보게 되면서, 그 방식으로는 화면만 방장으로
      // 보이고 실제 쓰기 권한은 안 넘어갔다 — 원래 방장은 이 함수 끝에서
      // 방을 나가 버리니, 진짜 owner_id 를 쥔 사람이 참여자 목록에서도
      // 사라져 그 방을 아무도 못 고치게 될 뻔했다(라운드 AR).
      //
      // .select() 로 실제 갱신된 행을 받아 0행이면(= 내가 방장이 아니었던
      // 경우) 조용히 넘어가지 않고 에러로 잡는다.
      const { data, error } = await supabase
        .from('rooms')
        .update({ owner_id: newOwner.profile_id })
        .eq('id', currentRoom.id)
        .select('id');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('방장만 방장 위치를 넘길 수 있습니다.');
      }
      // 이 함수 끝에서 본인이 방을 나가며 handleExitRoom() 이 currentRoom 을
      // 비우므로, 여기서 로컬 currentRoom.owner_id 를 갱신할 필요는 없다.

      // 3. 채팅창에 방장 위임 시스템 메시지 전송
      const systemMsg = {
        room_id: currentRoom.id,
        sender_id: 'system',
        sender_name: '시스템',
        sender_color: '#64748b',
        message: `'${currentParticipant.name}'님이 방장을 '${newOwner.name}'님에게 위임하고 퇴장하셨습니다.`
      };
      await supabase.from('messages').insert([systemMsg]);

      Alert.alert('완료', '방장 위치가 이전되었습니다.');

      // 방에서 나가기
      await supabase
        .from('participants')
        .delete()
        .eq('id', currentParticipant.id);

      await storage.removeItem(`bobyak_part_id_${currentRoom.id}`);
      handleExitRoom();
      await fetchRooms();
    } catch (err) {
      console.error('Error transferring ownership:', err);
      Alert.alert('오류', '방장 위치 이전에 실패했습니다.');
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentRoom || !currentParticipant) return;

    const creator = await isRoomCreator(currentRoom.id);

    if (creator && participants.length > 1) {
      // 방장인 경우, 방장 위치를 넘기거나 삭제 선택
      Alert.alert(
        '방 나가기 🚪',
        '방장입니다. 나가기 전에 다른 멤버에게 방장 위치를 넘기거나 방을 삭제할 수 있습니다.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '방 삭제',
            style: 'destructive',
            onPress: handleDeleteRoom
          },
          {
            text: '방장 위치 넘기기',
            style: 'default',
            onPress: () => {
              const otherMembers = participants.filter(p => p.id !== currentParticipant.id);
              const memberOptions = [
                ...otherMembers.map(m => ({
                  text: m.name,
                  onPress: () => handleTransferRoomOwnership(m.id)
                })),
                { text: '취소', style: 'cancel' as const }
              ];
              Alert.alert('방장 위치 이전', '방장 위치를 이전할 멤버를 선택하세요.', memberOptions);
            }
          }
        ]
      );
    } else {
      // 방장이 아니면 그냥 나가기
      Alert.alert(
        '방 나가기 🚪',
        '정말로 이 밀챗 방에서 나가시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '나가기',
            style: 'destructive',
            onPress: async () => {
              try {
                setLoading(true);

                const { error } = await supabase
                  .from('participants')
                  .delete()
                  .eq('id', currentParticipant.id);

                if (error) throw error;

                await storage.removeItem(`bobyak_part_id_${currentRoom.id}`);
                handleExitRoom();
                await fetchRooms();
                Alert.alert('완료', '방에서 정상적으로 퇴장하셨습니다.');
              } catch (err) {
                console.error('Error leaving room:', err);
                Alert.alert('오류', '방에서 나가는 도중 오류가 발생했습니다.');
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    }
  };

  // Swipe gesture to exit room back to room list
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.nativeEvent.pageX;
    touchStartY.current = e.nativeEvent.pageY;
  };

  const handleTouchEnd = (e: any) => {
    const touchEndX = e.nativeEvent.pageX;
    const touchEndY = e.nativeEvent.pageY;

    const dx = touchEndX - touchStartX.current;
    const dy = touchEndY - touchStartY.current;

    // Swipe from Left to Right: dx > 100 and minimal vertical movement
    if (dx > 100 && Math.abs(dy) < 60) {
      handleExitRoom();
    }
  };

  // Click on Notification -> Link to KakaoPay QR or Money Transfer
  const handleNotifClick = (notif: AppNotification) => {
    if (notif.bank_name && notif.account_number && notif.amount) {
      const kakaopayDeepLink = `kakaotalk://kakaopay/money/to/qr?bank_name=${encodeURIComponent(notif.bank_name)}&account_number=${encodeURIComponent(notif.account_number)}&amount=${notif.amount}`;
      Linking.canOpenURL(kakaopayDeepLink)
        .then(supported => {
          if (supported) {
            Linking.openURL(kakaopayDeepLink);
          } else {
            Alert.alert('카카오톡 미설치', '기기에 카카오톡이 설치되어 있지 않습니다.');
          }
        })
        .catch(err => console.error('An error occurred opening KakaoPay link:', err));
    }
  };

  const handleTabChange = (tab: AppTab) => {
    // TODO(담당자 B): "프로필을 탭으로 전환" 이 끝나면 이 분기를 지우고
    //   `activeTab === 'profile'` 에서 ProfileSetup 의 'main' 뷰를 직렬 렌더할 것.
    //   그 전까지는 기존 설정 모달을 열어 동작을 보존한다.
    if (tab === 'profile') {
      setShowSettingsModal(true);
      return;
    }
    setActiveTab(tab);
    if (globalProfile?.id) {
      fetchFollows(globalProfile.id);
      fetchRooms();
    }
  };




  // 1. Offline Loading Screen
  if (!isOnline) {
    return <LoadingScreen isOffline={true} onRetry={handleRetryConnection} />;
  }

  // 2. Loading Screen for Authentication Checks
  if (authLoading) {
    return <LoadingScreen />;
  }

  // Not Logged In -> Show Auth Screen
  if (!user) {
    return (
      <SafeAreaView style={[styles.appContainer, { backgroundColor: THEME.background }]}>
        <StatusBar style="dark" />
        <AuthScreen onAuthSuccess={(userId) => loadProfileForUser(userId)} />
      </SafeAreaView>
    );
  }

  // Profile Setup forced if incomplete
  if (user && isProfileIncomplete) {
    return (
      <SafeAreaView style={[styles.appContainer, { backgroundColor: THEME.background, flex: 1 }]}>
        <StatusBar style="dark" />
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: THEME.border, backgroundColor: THEME.surface }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: THEME.text, textAlign: 'center' }}>프로필 설정 👤</Text>
          <Text style={{ fontSize: 12, color: THEME.textMuted, textAlign: 'center', marginTop: 4 }}>
            서비스를 이용하시기 전에 내 정보를 먼저 입력해 주세요.
          </Text>
        </View>
        <ProfileSetup
          ref={profileSetupRef}
          initialData={globalProfile}
          onSave={handleSaveProfile}
          onSaveSchedule={handleSaveProfileSchedule}
          roomParticipants={[]}
          activeRooms={roomList}
          onLogout={handleLogout}
          onViewChange={handleSettingsViewChange}
          onSwipeBackBlockChange={(blocked) => setIsSwipeBackBlocked(blocked)}
          onSearchFriend={handleSearchFriend}
          onGetRecommendedFriends={getRecommendedFriends}
          onFollowUser={handleFollowUser}
          searchResults={searchFriendResults}
          recommendedFriends={recommendedFriends}
          isSearching={isSearchingFriends}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.appContainer, { backgroundColor: THEME.background }]}>
      <StatusBar style="dark" />

      {/* Network Error Banner */}
      {networkError && (
        <View style={styles.networkErrorBanner}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.networkErrorText}>{networkError}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setNetworkError(null);
                fetchRooms();
                if (globalProfile?.id) {
                  fetchFollows(globalProfile.id);
                  fetchNotifications(roomList.map(r => r.id));
                }
              }}
            >
              <Text style={styles.retryBtnText}>재시도</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => setNetworkError(null)}
            >
              <X size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >


      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.logoRow} onPress={handleExitRoom}>
          <MealChatLogo size={24} />
          <Text style={styles.logoText}>밀챗</Text>
        </TouchableOpacity>

        <View style={styles.headerControls}>
          {/* 새 약속 만들기는 Figma `채팅방/홈` 처럼 방 목록 카드의 + 버튼으로 옮겼다 */}

          {/* Alarm Bell */}
          <TouchableOpacity
            style={[styles.bellBtn, showNotifications && styles.bellBtnActive]}
            onPress={() => {
              if (isProfileIncomplete) {
                Alert.alert('알림', '프로필 설정을 먼저 완료해 주세요!');
                return;
              }
              setShowNotifications(!showNotifications);
              setShowNotificationsRedDot(false);
            }}
          >
            <Bell size={16} color={showNotifications ? '#ef4444' : '#94a3b8'} />
            {showNotificationsRedDot && <View style={styles.redDot} />}
          </TouchableOpacity>

          {/* Settings Button */}
          <TouchableOpacity
            style={styles.settingsHeaderBtn}
            onPress={() => {
              setShowSettingsModal(true);
            }}
          >
            <Settings size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Drawer Overlay */}
      {showNotifications && (
        <View style={styles.notificationsDrawer}>
          <View style={styles.notifHeader}>
            <Text style={styles.notifTitle}>정산 알림 목록 🔔</Text>
            <TouchableOpacity onPress={() => setShowNotifications(false)}>
              <Text style={styles.notifClose}>닫기</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.notifScroll}>
            {appNotifications.length > 0 ? (
              appNotifications.map(notif => (
                <TouchableOpacity
                  key={notif.id}
                  style={styles.notifCard}
                  onPress={() => handleNotifClick(notif)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifItemTitle}>{notif.title}</Text>
                    <Text style={styles.notifItemDesc}>{notif.message}</Text>
                  </View>
                  <View style={styles.payLinkBadge}>
                    <ExternalLink size={12} color="black" />
                    <Text style={styles.payLinkText}>송금</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noNotifsText}>도착한 정산 알림이 없습니다.</Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* Main Content Area */}
      <View style={styles.contentBody}>

        {/* TAB 0: 홈 (Figma 2_홈/홈/메인) */}
        {activeTab === 'home' && (
          <HomeTab
            userName={globalProfile?.name ?? '밀챗'}
            rooms={roomList}
            unsettledCount={appNotifications.filter(notif => notif.amount > 0).length}
            onCreateSchedule={() => setShowCreateModal(true)}
            onSelectSchedule={roomId => {
              const room = roomList.find(r => r.id === roomId);
              if (!room) return;
              setCurrentRoom(room);
              setRoomSubTab('schedule');
              setActiveTab('chat');
            }}
            onViewSettlements={() => setShowGlobalDutchPay(true)}
          />
        )}

        {/* TAB 1: 일정 조정 (Friend Heatmap Coordination) */}
        {activeTab === 'schedule' && (
          <ScheduleTab
            onSaveSchedule={handleSaveProfileSchedule}
            onCoordinationConfirm={handleCoordinationConfirm}
            onUpdateRoom={fetchRooms}
            onViewProfile={handleViewProfile}
            onRefreshFollows={() => {
              if (globalProfile?.id) fetchFollows(globalProfile.id);
            }}
          />
        )}

        {/* TAB 2: 부가기능 (Rooms & Settlings) */}
        {activeTab === 'chat' && (
          <View style={styles.tabBodyContainer}>
            {currentRoom ? (
              <View style={{ flex: 1, backgroundColor: THEME.background }}>
                {/* Room Info Bar & 24h Countdown */}
                <View style={styles.roomInfoBar}>
                  <TouchableOpacity style={styles.backChevronBtn} onPress={handleExitRoom}>
                    <ChevronLeft size={24} color={THEME.text} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={{ flex: 1, marginLeft: 8 }}
                    onPress={() => setShowRoomInfoModal(true)}
                  >
                    <View style={styles.roomBarTitleRow}>
                      <Text style={styles.roomBarTitle} numberOfLines={1}>{currentRoom.title} ▾</Text>
                      <View style={styles.countdownContainer}>
                        <Lock size={10} color="#f87171" style={{ marginRight: 3 }} />
                        <Text style={styles.countdownText}>{timeLeft}</Text>
                      </View>
                    </View>
                    <View style={styles.roomBarMetaRow}>
                      <Text style={[styles.roomBarMembers, { marginLeft: 0 }]}>
                        멤버 {participants.length}명 | 정보 확인 & 코드 공유 ➜
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* 방 나가기/삭제 버튼 */}
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: THEME.border }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#FEE2E2', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}
                    onPress={handleLeaveRoom}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#DC2626' }}>🚪 방 나가기</Text>
                  </TouchableOpacity>
                </View>

                {/* KakaoNotice Bar */}
                <View style={styles.kakaoNoticeArea}>
                  <View style={styles.kakaoNoticeHeader}>
                    <Volume2 size={14} color={THEME.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.kakaoNoticeHeaderText} numberOfLines={1}>
                      📢 [공지] {currentRoom.is_confirmed 
                        ? `약속 확정! 🗓️ ${currentRoom.confirmed_slot}` 
                        : '밀챗 약속 일정을 조율해 주세요!'}
                    </Text>
                  </View>

                  <View style={styles.kakaoNoticeTabs}>
                    {isCurrentRoomOneDay && (
                      <TouchableOpacity 
                        style={[styles.noticeTabBtn, roomOverlay === 'schedule' && styles.noticeTabBtnActive]}
                        onPress={() => setRoomOverlay(roomOverlay === 'schedule' ? null : 'schedule')}
                      >
                        <Text style={[styles.noticeTabBtnText, roomOverlay === 'schedule' && styles.noticeTabBtnTextActive]}>
                          🗓️ 일정 조율
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={[
                        styles.noticeTabBtn, 
                        roomOverlay === 'dutch' && styles.noticeTabBtnActive,
                        !isCurrentRoomOneDay && { flex: 1 }
                      ]}
                      onPress={() => setRoomOverlay(roomOverlay === 'dutch' ? null : 'dutch')}
                    >
                      <Text style={[styles.noticeTabBtnText, roomOverlay === 'dutch' && styles.noticeTabBtnTextActive]}>
                        💸 N빵 정산
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 참여자 정보 헤더 */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  // ⚠️ flexGrow: 0 을 빼지 마세요. 높이도 다시 고정하지 마세요.
                  //
                  // ScrollView 는 RN 내부 기본 스타일로 `flexGrow: 1` 을 달고 나옵니다.
                  // 예전 코드의 `height: 60` 은 그 기본값을 **취소하지 못합니다.** 그래서
                  // 이 줄이 남는 세로 공간을 아래 본문과 반씩 나눠 가져 279dp 를 차지했고
                  // (onLayout 실측), 아바타는 60dp 뿐이라 나머지 219dp 가 빈 공간으로
                  // 남았습니다. 메뉴 탭과 채팅 본문은 그만큼 눌려 219dp 밖에 못 썼습니다.
                  //
                  // 높이를 60 → 75 로 늘리는 식으로 때우지 않은 이유: 아바타(40) + 여백(4)
                  // + 이름 줄 + 상하 패딩(16) 은 글꼴 크기에 따라 달라집니다. 실제로
                  // 60dp 로 묶었을 때 이름이 가로로 잘렸습니다. 내용이 높이를 정하게 둡니다.
                  style={{ flexGrow: 0, flexShrink: 0, paddingVertical: 8 }}
                  contentContainerStyle={{ paddingHorizontal: 12, gap: 12 }}
                >
                  {participants.map(p => (
                    <View
                      key={p.id}
                      style={{ alignItems: 'center' }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: p.avatar_color,
                          justifyContent: 'center',
                          alignItems: 'center'
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

                {/* Main Body - Menu Tab or Live chatroom or drop down active panel */}
                {roomSubTab === 'menu' ? (
                  <RoomMenuTab
                    onUpdateMyVote={handleUpdateMyVote}
                    onUpdatePoll={handleUpdatePoll}
                  />
                ) : (
                  // Chatroom view
                  <View
                    style={{ flex: 1, position: 'relative' }}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                  >

                    {/* Chatroom view */}
                    <View style={{ flex: 1 }}>
                    <ScrollView
                      style={[styles.chatScroll, { flex: 1 }]}
                      contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
                      keyboardShouldPersistTaps="handled"
                      ref={(ref) => {
                        setTimeout(() => ref?.scrollToEnd({ animated: true }), 100);
                      }}
                    >
                        {roomMessages.length > 0 ? (
                          roomMessages.map((msg, index) => {
                            const isMe = msg.sender_id === globalProfile?.id;
                            const prevMsg = index > 0 ? roomMessages[index - 1] : null;
                            const isSameSender = prevMsg && prevMsg.sender_id === msg.sender_id;
                            const showAvatar = !isMe && !isSameSender;

                            // Message time formatting
                            const messageTime = msg.created_at
                              ? new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false
                                })
                              : '';

                            return (
                              <View key={msg.id} style={[styles.chatRow, isMe ? styles.chatRowMe : styles.chatRowOther]}>
                                {showAvatar ? (
                                  <TouchableOpacity
                                    style={[styles.chatAvatar, { backgroundColor: msg.sender_color }]}
                                    onPress={() => handleViewProfile(msg.sender_id)}
                                  >
                                    <Text style={styles.chatAvatarText}>{msg.sender_name[0]}</Text>
                                  </TouchableOpacity>
                                ) : !isMe ? (
                                  <View style={{ width: 40 }} />
                                ) : null}
                                <View style={{ maxWidth: '75%' }}>
                                  {showAvatar && !isMe && (
                                    <TouchableOpacity onPress={() => handleViewProfile(msg.sender_id)}>
                                      <Text style={styles.chatSenderName}>{msg.sender_name}</Text>
                                    </TouchableOpacity>
                                  )}
                                  {(() => {
                                    const isEmoticon = msg.message.startsWith('[emoticon:') && msg.message.endsWith(']');
                                    if (isEmoticon) {
                                      const key = msg.message.slice(10, -1);
                                      const imageSource = EMOTICONS_MAP[key];
                                      if (imageSource) {
                                        return (
                                          <View>
                                            <View style={styles.chatEmoticonBubble}>
                                              <Image source={imageSource} style={styles.chatEmoticonImage} />
                                            </View>
                                            {messageTime && (
                                              <Text style={styles.chatMessageTime}>{messageTime}</Text>
                                            )}
                                          </View>
                                        );
                                      }
                                    }
                                    return (
                                      <View>
                                        <View
                                          style={[
                                            styles.chatBubble,
                                            isMe
                                              ? styles.chatBubbleMe
                                              : {
                                                  ...styles.chatBubbleOther,
                                                  backgroundColor: msg.sender_color ? msg.sender_color + '20' : THEME.surface
                                                }
                                          ]}
                                        >
                                          <Text style={[styles.chatText, isMe ? styles.chatTextMe : styles.chatTextOther]}>
                                            {msg.message}
                                          </Text>
                                        </View>
                                        {messageTime && (
                                          <Text style={styles.chatMessageTime}>{messageTime}</Text>
                                        )}
                                      </View>
                                    );
                                  })()}
                                </View>
                              </View>
                            );
                          })
                        ) : (
                          <Text style={styles.emptyChatText}>
                            대화방이 개설되었습니다. 메이트들과 인사를 나눠보세요! 👋
                          </Text>
                        )}
                      </ScrollView>

                    {/* Chat Input */}
                    <View style={styles.chatInputBar}>
                      <TouchableOpacity
                        style={styles.emoticonToggleBtn}
                        onPress={() => setShowEmoticonPicker(!showEmoticonPicker)}
                      >
                        <Smile size={22} color={showEmoticonPicker ? THEME.primary : THEME.textMuted} />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.chatTextInput}
                        placeholder="메시지를 입력해 주세요..."
                        placeholderTextColor={THEME.textMuted}
                        value={newMessageText}
                        onChangeText={(t) => {
                          setNewMessageText(t);
                          if (showEmoticonPicker) setShowEmoticonPicker(false);
                        }}
                        multiline
                      />
                      <TouchableOpacity style={styles.chatSendBtn} onPress={handleSendMessage}>
                        <Send size={16} color="white" />
                      </TouchableOpacity>
                    </View>

                    {/* Emoticon Picker */}
                    {showEmoticonPicker && (
                      <View style={styles.emoticonPickerContainer}>
                        <Text style={styles.emoticonPickerTitle}>밀챗 캐릭터 이모티콘</Text>
                        <ScrollView showsVerticalScrollIndicator={true} style={styles.emoticonPickerScrollContainer} contentContainerStyle={styles.emoticonPickerGrid}>
                          {Object.keys(EMOTICONS_MAP).map((key) => {
                            const nameMap: { [k: string]: string } = {
                              dudu_meet: '약속두두',
                              dudu_sad: '슬픈두두',
                              dudu_love: '하트두두',
                              dudu_wink: '윙크두두',
                              dudu_shock: '깜놀두두',
                              moa_ok: '확인모아',
                              moa_hello: '안녕모아',
                              moa_busy: '바쁜모아',
                              moa_sleep: '낮잠모아',
                              moa_party: '파티모아',
                              welling_eat: '냠냠웰링',
                              welling_coffee: '커피웰링',
                              welling_starving: '배고픈웰링',
                              welling_full: '배부른웰링',
                              welling_thumbs: '최고웰링',
                              ttori_dutch: '정산또리',
                              ttori_angry: '화난또리',
                            };
                            return (
                              <TouchableOpacity
                                key={key}
                                style={styles.emoticonPickerItem}
                                onPress={() => handleSendEmoticon(key)}
                              >
                                <Image source={EMOTICONS_MAP[key]} style={styles.emoticonPickerImage} />
                                <Text style={styles.emoticonPickerName}>{nameMap[key]}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  </View>
                )}

                {/* 일정 조율 / N빵 정산 시트
                    방 컨테이너 직속으로 둔다. 예전에는 채팅 뷰 안쪽에 있어
                    position:absolute 의 기준이 하단 일부 영역이 되었고,
                    시트가 화면의 아래 26% 에만 갇혀 열렸다.
                    문서 06 의 원본 레이아웃은 화면을 덮는 전체 패널이다. */}
                {roomOverlay === 'schedule' && (
                  <RoomScheduleSheet
                    onRunAIRecommendations={handleRunAIRecommendations}
                    onSaveParticipantSchedule={handleSaveParticipantSchedule}
                    onConfirmSchedule={handleConfirmSchedule}
                    onRetryCoordination={handleRetryCoordination}
                    onUpdateRoom={fetchRooms}
                  />
                )}

                  {roomOverlay === 'dutch' && (
                    <View style={styles.noticeDropdownOverlay} {...roomDutchPayPanResponder.panHandlers}>
                      <View style={styles.overlayHeader}>
                        <Text style={styles.overlayHeaderTitle}>💸 N빵 정산</Text>
                        <TouchableOpacity onPress={() => setRoomOverlay(null)} style={styles.overlayCloseBtn}>
                          <Text style={styles.overlayCloseText}>접기 ✕</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={{ flex: 1 }}>
                        <DutchPay
                          roomId={currentRoom.id}
                          roomTitle={currentRoom.title}
                          currentParticipant={currentParticipant}
                          participants={participants}
                          globalProfile={globalProfile}
                        />
                      </View>
                    </View>
                  )}
              </View>
            ) : (

              <RoomListView
                onRefresh={onRefresh}
                onJoinRoomByCode={handleJoinRoomByCode}
                isProfileIncomplete={isProfileIncomplete}
              />
            )}
          </View>
        )}

      </View>


      {/* Bottom Tab Navigation — Figma Design System / BottomNav1~4 */}
      {!currentRoom && <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />}

      {/* 프로필 상세 모달 — screens/ProfileViewModal.tsx 로 분리 */}
      <ProfileViewModal
        onAddFriend={handleAddFriend}
        isFieldVisible={isFieldVisible}
      />



      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: THEME.background }} {...settingsPanResponder.panHandlers}>
          <ProfileSetup
            ref={profileSetupRef}
            initialData={globalProfile}
            onSave={(name, color, personalData, tag, avatarUrl, startLocationName, startLatitude, startLongitude, isTasteGame) => {
              handleSaveProfile(name, color, personalData, tag, avatarUrl, startLocationName, startLatitude, startLongitude);
              if (!isTasteGame) {
                setShowSettingsModal(false);
              }
            }}
            onSaveSchedule={handleSaveProfileSchedule}
            roomParticipants={participants}
            roomCode={currentRoom?.code}
            activeRooms={currentRoom ? [currentRoom] : []}
            onLogout={() => {
              handleLogout();
              setShowSettingsModal(false);
            }}
            onDeleteAccount={handleDeleteAccount}
            onExportData={handleExportData}
            onViewChange={handleSettingsViewChange}
            onSwipeBackBlockChange={(blocked) => setIsSwipeBackBlocked(blocked)}
            onClose={() => setShowSettingsModal(false)}
            onSearchFriend={handleSearchFriend}
            onGetRecommendedFriends={getRecommendedFriends}
            onFollowUser={handleFollowUser}
            searchResults={searchFriendResults}
            recommendedFriends={recommendedFriends}
            isSearching={isSearchingFriends}
          />
        </SafeAreaView>
      </Modal>

      {/* 방 상세 정보 모달 — screens/RoomInfoModal.tsx 로 분리 */}
      <RoomInfoModal
        onUpdateRoomTitle={handleUpdateRoomTitle}
        onUpdateRoomLocation={handleUpdateRoomLocation}
        onSearchLocation={handleSearchLocation}
        onSelectLocation={handleSelectLocation}
        onChangeRoomColor={handleChangeRoomColor}
        onKickParticipant={handleKickParticipant}
        onShareRoom={handleShareRoom}
        onViewProfile={handleViewProfile}
      />

      {/* N빵 정산 대장 — screens/GlobalDutchPayModal.tsx 로 분리 */}
      <GlobalDutchPayModal panHandlers={globalDutchPayPanResponder.panHandlers} />

      {/* 새 약속 만들기 모달 — screens/CreateRoomModal.tsx 로 분리 */}
      <CreateRoomModal onCreateRoom={handleCreateRoom} />

      {/* AI 추천 TOP3 모달 — screens/AIRecommendModal.tsx 로 분리 */}
      <AIRecommendModal onConfirmSchedule={handleConfirmSchedule} />

      {/* 장소 선택 지도 모달 — screens/LocationPickerModal.tsx 로 분리 */}
      <LocationPickerModal onSelectLocation={handleSelectLocation} />
      </KeyboardAvoidingView>
    </SafeAreaView>
    );
  }

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: THEME.background
  },
  header: {
    height: 56,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.text,
    letterSpacing: -0.5
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  bellBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.avatarBg,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  bellBtnActive: {
    backgroundColor: 'rgba(211, 47, 47, 0.15)'
  },
  settingsHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.avatarBg,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  redDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.danger
  },
  notificationsDrawer: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    zIndex: 200,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    padding: 12,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    paddingBottom: 6,
    marginBottom: 8
  },
  notifTitle: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: 'bold'
  },
  notifClose: {
    color: THEME.textMuted,
    fontSize: 11
  },
  notifScroll: {
    flex: 1
  },
  notifCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    padding: 8,
    marginVertical: 4
  },
  notifItemTitle: {
    color: THEME.primary,
    fontSize: 11,
    fontWeight: 'bold'
  },
  notifItemDesc: {
    color: THEME.textMuted,
    fontSize: 10,
    marginTop: 2
  },
  payLinkBadge: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    backgroundColor: '#FEE500',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  payLinkText: {
    color: 'black',
    fontSize: 10,
    fontWeight: 'bold'
  },
  noNotifsText: {
    color: THEME.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 20
  },
  contentBody: {
    flex: 1
  },
  tabBody: {
    flex: 1,
    padding: 16
  },
  tabBodyContainer: {
    flex: 1
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 12
  },
  joinCard: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  joinRow: {
    flexDirection: 'row',
    gap: 8
  },
  joinInput: {
    flex: 1,
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    color: THEME.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13
  },
  joinBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  joinBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  roomCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#323333',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  roomCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text
  },
  roomCardMeta: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 4
  },
  badge: {
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4
  },
  badgeSuccess: {
    backgroundColor: 'rgba(134, 155, 96, 0.12)',
    color: THEME.primary
  },
  badgeInfo: {
    backgroundColor: 'rgba(134, 155, 96, 0.06)',
    color: THEME.textMuted
  },
  badgeWarning: {
    backgroundColor: 'rgba(245, 124, 0, 0.08)',
    color: THEME.warning
  },
  roomEnterArrow: {
    color: THEME.primary,
    fontSize: 12,
    fontWeight: 'bold'
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    color: THEME.textMuted,
    fontSize: 13,
    fontWeight: 'bold'
  },
  emptySubText: {
    color: THEME.textMuted,
    fontSize: 11,
    marginTop: 4
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  loadingText: {
    color: THEME.textMuted,
    fontSize: 12,
    marginTop: 12
  },
  roomInfoBar: {
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  roomBarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  roomBarTitle: {
    color: THEME.text,
    fontSize: 14,
    fontWeight: 'bold'
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(211, 47, 47, 0.08)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  countdownText: {
    color: THEME.danger,
    fontSize: 9,
    fontWeight: 'bold'
  },
  roomBarMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  roomBarCode: {
    fontSize: 11,
    color: THEME.primary,
    fontWeight: 'bold'
  },
  shareRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6
  },
  shareRowText: {
    fontSize: 11,
    fontWeight: 'bold'
  },
  roomBarMembers: {
    fontSize: 11,
    color: THEME.textMuted
  },
  exitBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  exitBtnText: {
    color: THEME.textMuted,
    fontSize: 11,
    textDecorationLine: 'underline'
  },
  bottomNav: {
    height: 60,
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  navItemText: {
    fontSize: 10,
    color: THEME.textMuted,
    marginTop: 4
  },
  navItemTextActive: {
    color: THEME.primary,
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 16,
    textAlign: 'center'
  },
  modalFormGroup: {
    marginBottom: 14
  },
  modalLabel: {
    fontSize: 12,
    color: THEME.textMuted,
    marginBottom: 6
  },
  modalInput: {
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    color: THEME.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  modalBtnCancel: {
    backgroundColor: '#F4F3EA',
    borderWidth: 1,
    borderColor: THEME.border
  },
  modalBtnCancelText: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold'
  },
  modalBtnSubmit: {
    backgroundColor: THEME.primary
  },
  modalBtnSubmitText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold'
  },
  chatScroll: {
    flex: 1,
    backgroundColor: THEME.background
  },
  chatRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end'
  },
  chatRowMe: {
    justifyContent: 'flex-end'
  },
  chatRowOther: {
    justifyContent: 'flex-start'
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  chatAvatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14
  },
  chatSenderName: {
    fontSize: 12,
    color: THEME.textMuted,
    marginBottom: 4,
    marginLeft: 8
  },
  chatBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    maxWidth: '100%'
  },
  chatBubbleMe: {
    backgroundColor: THEME.primary,
    marginLeft: 8
  },
  chatBubbleOther: {
    backgroundColor: THEME.surface,
    marginLeft: 8
  },
  chatText: {
    fontSize: 14,
    lineHeight: 18
  },
  chatTextMe: {
    color: 'white'
  },
  chatTextOther: {
    color: THEME.text
  },
  chatMessageTime: {
    fontSize: 12,
    color: THEME.textTertiary,
    marginTop: 4,
    marginLeft: 8
  },
  chatInputBar: {
    flexDirection: 'row',
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    padding: 12,
    alignItems: 'flex-end',
    gap: 8
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: THEME.text,
    maxHeight: 100
  },
  chatSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.accent,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyChatText: {
    textAlign: 'center',
    color: THEME.textMuted,
    fontSize: 14,
    marginTop: 40
  },
  kakaoNoticeArea: {
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  kakaoNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  kakaoNoticeHeaderText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.text,
    flex: 1,
  },
  kakaoNoticeTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  noticeTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 8,
  },
  noticeTabBtnActive: {
    backgroundColor: THEME.accent,
    borderColor: THEME.accent,
  },
  noticeTabBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8E8E93',
  },
  noticeTabBtnTextActive: {
    color: '#FFFFFF',
  },
  noticeDropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: THEME.background,
    zIndex: 1000,
  },
  overlayHeader: {
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: THEME.surface,
  },
  overlayHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text,
  },
  overlayCloseBtn: {
    padding: 6,
  },
  overlayCloseText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  backChevronBtn: {
    paddingRight: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center'
  },
  leaveRoomBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  leaveRoomBtnText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: 'bold'
  },
  modalProfileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalProfileAvatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold'
  },
  globalDutchPayBtnCard: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  globalDutchPayBtnCardContent: {
    flex: 1,
    marginRight: 12,
  },
  globalDutchPayBtnCardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.text,
  },
  globalDutchPayBtnCardSubtitle: {
    fontSize: 10,
    color: THEME.textMuted,
    marginTop: 4,
  },
  globalDutchPayBtnCardArrow: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  globalDutchPayHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.surface,
  },
  globalDutchPayHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text,
  },
  globalDutchPayCloseBtn: {
    padding: 6,
  },
  networkErrorBanner: {
    backgroundColor: '#fee2e2',
    borderBottomWidth: 1,
    borderBottomColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  networkErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626'
  },
  retryBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white'
  },
  dismissBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emoticonToggleBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  emoticonPickerContainer: {
    // 채팅 컬럼은 방 상단 UI(공지·참여자 등)를 빼고 나면 219dp 밖에 안 될 때가
    // 있는데, 피커는 280dp 였습니다. RN 의 flexShrink 기본값이 0 이라 줄어들지
    // 못하고 그대로 넘쳐 **내비게이션 바 아래로 파고들었습니다.**
    // 부모가 좁으면 스스로 줄어들도록 flexShrink 를 켭니다.
    flexShrink: 1,
    backgroundColor: '#FAFAFB',
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  emoticonPickerTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.textMuted,
    marginBottom: 10,
  },
  emoticonPickerScrollContainer: {
    maxHeight: 180,
    // 피커가 줄어들 때 실제로 줄어드는 쪽은 이 스크롤 영역이다.
    flexShrink: 1,
  },
  emoticonPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 10,
  },
  emoticonPickerItem: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 6,
    width: '23%',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emoticonPickerImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  emoticonPickerName: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.text,
  },
  chatEmoticonBubble: {
    padding: 2,
    marginVertical: 8,
  },
  chatEmoticonImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
});
