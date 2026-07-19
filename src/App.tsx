import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  SafeAreaView,
  Share,
  Alert,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  NativeModules,
  PanResponder,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as expoCalendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import MapView, { Marker } from 'react-native-maps';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

import { supabase } from './lib/supabaseClient';
import type { Room, Participant, PersonalData, ScheduleAvailability, Follow, Profile, AppNotification, Message, AIRecommendation, RoomNote } from './lib/types';
import { usePanResponderSwipeBack } from './lib/usePanResponderSwipeBack';
import { ProfileSetup } from './components/ProfileSetup';
import { ScheduleGrid } from './components/ScheduleGrid';
import { MealChatLogo } from './components/MealChatLogo';
import { RoomCard } from './components/RoomCard';
import { calculateAIRecommendations } from './lib/aiRecommender';
import { MenuRecommendation } from './components/MenuRecommendation';
import { BaeminSurvey } from './components/BaeminSurvey';
import { DutchPay } from './components/DutchPay';
import { AuthScreen } from './components/AuthScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { storage } from './lib/storage';
import { THEME, PALETTE_COLORS } from './lib/theme';
import {
  requestNotificationPermissions,
  sendScheduleConfirmedNotification,
  sendRoomParticipationNotification,
  sendMessageNotification,
  setupNotificationListeners,
  sendUnpaidBillNotification,
  sendRoomCreatedNotification,
  sendUserJoinedNotification,
  scheduleConfirmedReminderNotification
} from './lib/notificationUtils';
import {
  Sparkles,
  Calendar as CalendarIcon,
  MessageSquare,
  User as UserIcon,
  Bell,
  CheckCircle,
  Share2,
  Lock,
  ExternalLink,
  Plus,
  ChevronDown,
  ChevronUp,
  Send,
  Volume2,
  ChevronLeft,
  X,
  Check,
  Settings,
  Smile
} from 'lucide-react-native';
import {
  AuthProvider,
  NetworkProvider,
  LoadingProvider,
  NavigationProvider,
  RoomProvider,
  ProfileProvider,
  RoomEditingProvider,
  LocationProvider,
  NotificationProvider,
  AIProvider,
  RoomCreationProvider,
  ScheduleProvider
} from './contexts';

const KAKAO_REST_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY || '';

export default function App() {
  return (
    <AuthProvider>
      <NetworkProvider>
        <LoadingProvider>
          <NavigationProvider>
            <RoomProvider>
              <ProfileProvider>
                <RoomEditingProvider>
                  <LocationProvider>
                    <NotificationProvider>
                      <AIProvider>
                        <RoomCreationProvider>
                          <ScheduleProvider>
                            <AppContent />
                          </ScheduleProvider>
                        </RoomCreationProvider>
                      </AIProvider>
                    </NotificationProvider>
                  </LocationProvider>
                </RoomEditingProvider>
              </ProfileProvider>
            </RoomProvider>
          </NavigationProvider>
        </LoadingProvider>
      </NetworkProvider>
    </AuthProvider>
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
  // Authentication states
  const [user, setUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Emoticon state
  const [showEmoticonPicker, setShowEmoticonPicker] = useState(false);

  // Network states
  const [isOnline, setIsOnline] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Navigation states: 'schedule' (일정 조정), 'addons' (부가기능 - 룸/정산)
  const [activeTab, setActiveTab] = useState<'schedule' | 'addons'>('schedule');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSettingsGameActive, setIsSettingsGameActive] = useState(false);
  const isSettingsGameActiveRef = useRef(false);
  const profileSetupRef = useRef<any>(null);
  const [isSwipeBackBlocked, setIsSwipeBackBlocked] = useState(false);
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
  const [roomSubTab, setRoomSubTab] = useState<'schedule' | 'menu' | 'baemin' | 'dutch'>('schedule');

  // Room / Participant states
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);

  const roomOwnerProfileId = useMemo(() => {
    if (participants.length === 0) return null;
    const sorted = [...participants].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : Infinity;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : Infinity;
      return aTime - bTime;
    });
    return sorted[0]?.profile_id || null;
  }, [participants]);

  // Chatting & Dropdown Overlay states
  const [roomMessages, setRoomMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [roomOverlay, setRoomOverlay] = useState<'schedule' | 'dutch' | null>(null);

  // Room Notes states

  // Friend Search & Recommendation states
  const [searchFriendQuery, setSearchFriendQuery] = useState('');
  const [searchFriendResults, setSearchFriendResults] = useState<Profile[]>([]);
  const [recommendedFriends, setRecommendedFriends] = useState<Profile[]>([]);
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);
  const [lastMessageSender, setLastMessageSender] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Global Profile & Follow states
  const [globalProfile, setGlobalProfile] = useState<Profile | null>(null);
  const [myFollows, setMyFollows] = useState<Follow[]>([]);


  // UI state controllers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoomInfoModal, setShowRoomInfoModal] = useState(false);
  const [isEditingRoomTitle, setIsEditingRoomTitle] = useState(false);
  const [editingRoomTitle, setEditingRoomTitle] = useState('');
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomDate, setNewRoomDate] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [createRoomSelectedFriends, setCreateRoomSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [isEditingRoomLocation, setIsEditingRoomLocation] = useState(false);
  const [editingRoomLocationName, setEditingRoomLocationName] = useState('');
  const [editingRoomLatitude, setEditingRoomLatitude] = useState(37.5665);
  const [editingRoomLongitude, setEditingRoomLongitude] = useState(126.9780);

  const [showAIRecommendModal, setShowAIRecommendModal] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);
  
  // Active Rooms in Room List
  const [roomList, setRoomList] = useState<Room[]>([]);
  
  // Notifications states
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [showNotificationsRedDot, setShowNotificationsRedDot] = useState(false);
  const [showGlobalDutchPay, setShowGlobalDutchPay] = useState(false);

  // Countdown timer string
  const [timeLeft, setTimeLeft] = useState('');

  const [refreshing, setRefreshing] = useState(false);

  // Loading states for different sections
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [participantsLoading, setParticipantsLoading] = useState(false);

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
      const { data: room, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', upper)
        .single();

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
      const { data: pts, error: ptsError } = await supabase
        .from('participants')
        .select('id, profile_id')
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
        setActiveTab('addons');
        return;
      }

      // 6. 새로운 참가자로 자동 입장
      console.log('[JoinRoomDirectly] User is not a participant, auto joining room with profile ID:', globalProfile.id);
      await joinRoomWithProfile(room.id, globalProfile);

      // 7. 방 및 탭 설정
      setCurrentRoom(room);
      setRoomSubTab('schedule');
      setActiveTab('addons');

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
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, expires_at')
        .eq('code', code)
        .single();

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
  useEffect(() => {
    if (user && globalProfile) {
      storage.getItem('pending_join_code').then(async (code) => {
        if (code) {
          console.log('[PendingJoinCode] Found pending code:', code);

          // 1. 코드 형식 재검증
          const upperCode = code.trim().toUpperCase();
          if (!/^[A-Z0-9]{6}$/.test(upperCode)) {
            console.error('[PendingJoinCode] Invalid code format, removing:', code);
            await storage.removeItem('pending_join_code');
            Alert.alert('오류', '유효하지 않은 초대 코드입니다.');
            return;
          }

          // 2. 방 존재 및 만료 여부 재확인
          const { data: room, error: roomError } = await supabase
            .from('rooms')
            .select('id, expires_at, title')
            .eq('code', upperCode)
            .single();

          if (roomError || !room) {
            console.error('[PendingJoinCode] Room not found or error:', roomError);
            await storage.removeItem('pending_join_code');
            Alert.alert('오류', '방을 찾을 수 없습니다.');
            return;
          }

          // 3. 방 만료 확인
          const now = new Date();
          const expiresAt = new Date(room.expires_at);

          if (expiresAt.getTime() < now.getTime()) {
            console.log('[PendingJoinCode] Room has expired, removing pending code');
            await storage.removeItem('pending_join_code');
            Alert.alert('만료', '방이 만료되었습니다.');
            return;
          }

          // 4. 중복 입장 확인
          const { data: existingParticipant, error: checkError } = await supabase
            .from('participants')
            .select('id')
            .eq('room_id', room.id)
            .eq('profile_id', globalProfile.id)
            .single();

          if (!checkError && existingParticipant) {
            console.log('[PendingJoinCode] User already participates in this room');
            await storage.removeItem('pending_join_code');
            Alert.alert('안내', '이미 참여한 방입니다.');
            setCurrentRoom(room as Room);
            setActiveTab('addons');
            return;
          }

          // 5. 모든 검증 통과, 방 입장 처리
          console.log('[PendingJoinCode] All validations passed, joining room:', upperCode);
          await storage.removeItem('pending_join_code');
          await handleJoinRoomDirectly(upperCode);
        }
      });
    }
  }, [user, globalProfile]);

  // Generate sample schedules for demo (3 months)
  const generateSampleSchedules = (role: 'cheolhee' | 'youngsoo'): ScheduleAvailability => {
    const schedule: ScheduleAvailability = {};
    const today = new Date(); // Current date

    // Generate for 3 months (June, July, August)
    for (let m = 0; m < 3; m++) {
      const month = today.getMonth() + m;
      const year = today.getFullYear() + Math.floor((today.getMonth() + m) / 12);
      const actualMonth = month % 12;

      const daysInMonth = new Date(year, actualMonth + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${(actualMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

        const date = new Date(year, actualMonth, day);
        const dayOfWeek = date.getDay();

        let slots: string[] = [];

        if (role === 'cheolhee') {
          // 철희: 평일 저녁 6-9시, 토요일 오후 2-6시
          if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday-Friday
            slots = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];
          } else if (dayOfWeek === 6) { // Saturday
            slots = ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];
          }
        } else if (role === 'youngsoo') {
          // 영수: 기본 일정 없음
        }

        if (slots.length > 0) {
          schedule[dateStr] = slots;
        }
      }
    }

    return schedule;
  };

  // Initialize sample data
  const initializeSampleData = async (userId: string) => {
    try {
      // UUID format sample IDs (새로운 친구들)
      const sampleIds = {
        cheolhee: '00000000-0000-0000-0000-000000000011',
        youngsoo: '00000000-0000-0000-0000-000000000012'
      };

      // Check if sample follows already exist for this user to avoid duplicating follows logic
      const { data: existingFollows, error: checkError } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', userId)
        .in('following_id', [sampleIds.cheolhee, sampleIds.youngsoo]);

      if (!checkError && existingFollows && existingFollows.length >= 2) {
        console.log('✨ Sample users exist. Updating coordinates and locations...');
      }

      // Create 철희
      const cheolheeSchedule = generateSampleSchedules('cheolhee');
      const { error: cheolheeError } = await supabase.from('profiles').upsert({
        id: sampleIds.cheolhee,
        name: '철희',
        tag: 'ch1',
        avatar_color: '#FF6B6B',
        personal_data: {},
        schedule: cheolheeSchedule,
        privacy_settings: {
          birthdate: 'public',
          gender: 'public',
          bank_account: 'private'
        },
        start_location_name: '부산대 자택',
        start_latitude: 35.2315,
        start_longitude: 129.0830,
        created_at: new Date().toISOString()
      });

      if (cheolheeError) {
        console.error('Error upserting 철희:', cheolheeError);
        return;
      }

      // Create 영수
      const youngsooSchedule = generateSampleSchedules('youngsoo');
      const { error: youngsooError } = await supabase.from('profiles').upsert({
        id: sampleIds.youngsoo,
        name: '영수',
        tag: 'ys1',
        avatar_color: '#4ECDC4',
        personal_data: {},
        schedule: youngsooSchedule,
        privacy_settings: {
          birthdate: 'public',
          gender: 'public',
          bank_account: 'private'
        },
        start_location_name: '광안리 자택',
        start_latitude: 35.1530,
        start_longitude: 129.1190,
        created_at: new Date().toISOString()
      });

      if (youngsooError) {
        console.error('Error upserting 영수:', youngsooError);
        return;
      }

      // Create mutual follows (current user follows both, and both follow current user back)
      const { error: followError } = await supabase.from('follows').upsert([
        {
          follower_id: userId,
          following_id: sampleIds.cheolhee,
          role: 'leader', // default leader for testing best friend 메모 공개범위
          created_at: new Date().toISOString()
        },
        {
          follower_id: userId,
          following_id: sampleIds.youngsoo,
          role: 'mate',
          created_at: new Date().toISOString()
        },
        {
          follower_id: sampleIds.cheolhee,
          following_id: userId,
          role: 'mate',
          created_at: new Date().toISOString()
        },
        {
          follower_id: sampleIds.youngsoo,
          following_id: userId,
          role: 'mate',
          created_at: new Date().toISOString()
        }
      ], { onConflict: 'follower_id,following_id' });

      if (followError) console.error('Error creating follows:', followError);

      console.log('✨ Sample data initialized: 철희, 영수');
    } catch (err) {
      console.error('Error initializing sample data:', err);
    }
  };

  // Register push notifications and get Expo Push Token
  const registerForPushNotificationsAsync = async () => {
    let token;
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
      
      let projectId: string | undefined = undefined;
      try {
        const Constants = require('expo-constants').default;
        const easId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (easId && uuidRegex.test(easId)) {
          projectId = easId;
        }
      } catch (e) {
        // Safe fallback if Constants is not available
      }

      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      token = tokenData.data;
      console.log('Expo Push Token:', token);
    } catch (error) {
      console.log('Error getting push token:', error);
    }

    return token;
  };

  const savePushTokenToProfile = async (token: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);
      if (error) throw error;
      console.log('Push token saved to profiles successfully!');
    } catch (e) {
      console.error('Error saving push token to profile:', e);
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
        await Notifications.cancelAllScheduledNotificationsAsync();

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
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log('No unpaid bills. Cancelled all notifications.');
      }
    } catch (e) {
      console.error('Error checking pending bills for notifications:', e);
    }
  };

  // Load User Profile from Supabase
  const loadProfileForUser = async (userId: string) => {
    try {
      setAuthLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        // Initialize sample data if profile exists
        await initializeSampleData(userId);

        const profile = data as Profile;
        setGlobalProfile(profile);

        // Register push notification token
        registerForPushNotificationsAsync().then((token) => {
          if (token) {
            savePushTokenToProfile(token, profile.id);
            setGlobalProfile(prev => prev ? { ...prev, push_token: token } : null);
          }
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
  const fetchFollows = async (profileId: string) => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('*, profiles:following_id(*)')
        .eq('follower_id', profileId);

      if (error) {
        handleApiError(error, '친구 목록을 불러올 수 없습니다.');
        throw error;
      }
      setMyFollows(data || []);
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
      setAppNotifications(data || []);
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
      Notifications.cancelAllScheduledNotificationsAsync();
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
          if (roomList.some(r => r.id === newNotif.room_id)) {
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
  }, [roomList]);

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
          voted_items: []
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
          expires_at: expiresAt
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
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', upper)
        .single();

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
          setActiveTab('addons');
          return;
        }
      }

      setJoinRoomCode('');
      setCurrentRoom(data);
      setRoomSubTab('schedule');
      setActiveTab('addons');

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

  const getMeetingDateDisplay = (room: Room) => {
    if (!room.meeting_date || !room.expires_at) return '';
    try {
      const diffTime = new Date(room.expires_at).getTime() - new Date(room.meeting_date).getTime();
      const diffDays = Math.round(diffTime / (24 * 60 * 60 * 1000));
      const duration = diffDays - 2;
      if (duration > 1) {
        const end = new Date(new Date(room.meeting_date).getTime() + (duration - 1) * 24 * 60 * 60 * 1000);
        const endStr = end.toISOString().split('T')[0];
        return `${room.meeting_date} ~ ${endStr} (${duration}일간)`;
      }
    } catch (e) {
      console.error(e);
    }
    return room.meeting_date;
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
      const newParticipants = [
        {
          room_id: room.id,
          profile_id: globalProfile.id,
          name: globalProfile.name,
          avatar_color: globalProfile.avatar_color,
          personal_data: globalProfile.personal_data,
          schedule: globalProfile.schedule || {},
          voted_items: []
        },
        ...selectedFriends.map(f => ({
          room_id: room.id,
          profile_id: f.id,
          name: f.name,
          avatar_color: f.avatar_color,
          personal_data: f.personal_data,
          schedule: f.schedule || {},
          voted_items: []
        }))
      ];

      const { error: partError } = await supabase
        .from('participants')
        .insert(newParticipants);

      if (partError) throw partError;


      Alert.alert(
        '방 개설 완료',
        `약속 조율 방이 생성되었습니다!\n초대코드: ${code}`
      );

      setActiveTab('addons');
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

  const handleChangeRoomColor = async (color: string) => {
    if (!currentRoom) return;
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ color })
        .eq('id', currentRoom.id);
      
      if (error) throw error;
      
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
      const { error } = await supabase
        .from('rooms')
        .update({ title: editingRoomTitle.trim() })
        .eq('id', currentRoom.id);

      if (error) throw error;

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
  const [locationSearchResults, setLocationSearchResults] = useState<any[]>([]);
  const [showLocationResults, setShowLocationResults] = useState(false);
  const [showLocationMapModal, setShowLocationMapModal] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: editingRoomLatitude || 37.5665,
    longitude: editingRoomLongitude || 126.9780,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

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
      const { error } = await supabase
        .from('rooms')
        .update({
          location_name: editingRoomLocationName.trim(),
          latitude: editingRoomLatitude,
          longitude: editingRoomLongitude
        })
        .eq('id', currentRoom.id);

      if (error) throw error;

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

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error) throw error;

      // Initialize sample data (friends, follows) once profile exists
      await initializeSampleData(user.id);

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

      if (currentParticipant) {
        const { error } = await supabase
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
          .eq('id', currentParticipant.id);
        if (error) console.error('Error updating participant profile:', error);
      }
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
        .from('profiles')
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
      Alert.alert('성공', '친구 추가가 완료되었습니다! 🎉');
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
      Alert.alert('성공', '친구를 삭제했습니다.');
    } catch (err) {
      console.error('Error removing friend:', err);
      Alert.alert('오류', '친구 삭제에 실패했습니다.');
    }
  };

  // Check if field is visible based on privacy settings
  const isFieldVisible = (
    fieldName: 'birthdate' | 'gender' | 'bank_account',
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

  const handleConfirmSchedule = async (slot: string, placeName?: string) => {
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

      const proceedConfirm = async (targetSlot: string, targetLocation?: string | null) => {
        const { error } = await supabase
          .from('rooms')
          .update({
            is_confirmed: true,
            confirmed_slot: targetSlot,
            expires_at: expiresAt,
            location_name: targetLocation || null
          })
          .eq('id', currentRoom.id);

        if (error) throw error;

        const updatedRoom = {
          ...currentRoom,
          is_confirmed: true,
          confirmed_slot: targetSlot,
          expires_at: expiresAt,
          location_name: targetLocation || null
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
                    await proceedConfirm(slot, placeName);
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

      await proceedConfirm(slot, finalLocationName);
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
        .from('profiles')
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
        .from('profiles')
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
      Alert.alert('권한 없음', '방장만 일정 재조율을 할 수 있습니다.');
      return;
    }

    try {
      const { error } = await supabase
        .from('rooms')
        .update({
          is_confirmed: false,
          confirmed_slot: null,
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', roomId);

      if (error) throw error;

      setCurrentRoom({
        ...currentRoom,
        is_confirmed: false,
        confirmed_slot: null
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
      if (!newOwner) throw new Error('New owner not found');

      // 1. 새 방장의 created_at을 가장 과거로 변경하여 방장 권한 이전
      const { error } = await supabase
        .from('participants')
        .update({ created_at: new Date(0).toISOString() })
        .eq('id', newOwnerId)
        .eq('room_id', currentRoom.id);

      if (error) throw error;

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
                { text: '취소', style: 'cancel' }
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

  const handleTabChange = (tab: 'schedule' | 'addons') => {
    setActiveTab(tab);
    if (globalProfile?.id) {
      fetchFollows(globalProfile.id);
      fetchRooms();
    }
  };

  // Menu selection data calculation
  const getMenuProgress = () => {
    const selectedCount = participants.filter(p => p.voted_items && p.voted_items.length > 0).length;
    const totalCount = participants.length;
    return { selectedCount, totalCount };
  };

  // Get all unique selected menus
  const getAllSelectedMenus = () => {
    const menuSet = new Set<string>();
    participants.forEach(p => {
      if (p.voted_items) {
        p.voted_items.forEach(item => menuSet.add(item));
      }
    });
    return Array.from(menuSet);
  };

  // Get vote count for each menu
  const getMenuVoteCount = (menuName: string) => {
    return participants.filter(p => p.voted_items && p.voted_items.includes(menuName)).length;
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
          {activeTab === 'addons' && !currentRoom && !isProfileIncomplete && (
            <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
              <Plus size={16} color="white" style={{ marginRight: 6 }} />
              <Text style={styles.createBtnText}>새 약속 만들기</Text>
            </TouchableOpacity>
          )}

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
        
        {/* TAB 1: 일정 조정 (Friend Heatmap Coordination) */}
        {activeTab === 'schedule' && (
          <View style={styles.tabBodyContainer}>
            <ScheduleGrid
              meetingDate={new Date().toISOString().split('T')[0]}
              participants={[]}
              currentParticipantId={globalProfile?.id || ''}
              onSaveSchedule={handleSaveProfileSchedule}
              isCoordination={true}
              myProfile={globalProfile}
              follows={myFollows}
              onCoordinationConfirm={handleCoordinationConfirm}
              activeRooms={roomList}
              onUpdateRoom={fetchRooms}
              onViewProfile={handleViewProfile}
              onRefreshFollows={() => globalProfile?.id && fetchFollows(globalProfile.id)}
            />
          </View>
        )}

        {/* TAB 2: 부가기능 (Rooms & Settlings) */}
        {activeTab === 'addons' && (
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
                  style={{ height: 60, paddingVertical: 8 }}
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
                  // Menu Tab UI
                  <View style={{ flex: 1, backgroundColor: THEME.background }}>
                    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}>
                      {/* 현황 표시 */}
                      {(() => {
                        const { selectedCount, totalCount } = getMenuProgress();
                        const progressPercentage = totalCount > 0 ? (selectedCount / totalCount) * 100 : 0;

                        return (
                          <View style={{ paddingVertical: 12, marginBottom: 16 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: THEME.text }}>
                              메뉴 선정
                            </Text>
                            <Text style={{ fontSize: 14, color: THEME.textMuted, marginTop: 4 }}>
                              {selectedCount}명 중 {selectedCount}명 선정 완료
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
                                  width: `${progressPercentage}%`,
                                  backgroundColor: THEME.menuComplete,
                                }}
                              />
                            </View>
                          </View>
                        );
                      })()}

                      {/* AI 추천 메뉴 섹션 */}
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
                          <Text style={{ fontSize: 12, color: THEME.textMuted, marginTop: 4 }}>
                            AI가 분석한 최고의 메뉴 선택지입니다.
                          </Text>
                          <TouchableOpacity
                            style={{
                              marginTop: 10,
                              paddingVertical: 8,
                              backgroundColor: THEME.menuNeeded,
                              borderRadius: 6,
                              alignItems: 'center',
                            }}
                            onPress={handleRunAIRecommendations}
                          >
                            <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 }}>
                              추천 메뉴 보기
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* 선택된 메뉴 카드 */}
                      {(() => {
                        const menus = getAllSelectedMenus();
                        return menus.length > 0 ? (
                          <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: THEME.text, marginBottom: 12 }}>
                              선택된 메뉴
                            </Text>
                            {menus.map(menuName => {
                              const voteCount = getMenuVoteCount(menuName);
                              const isCurrentUserSelected = currentParticipant?.voted_items?.includes(menuName);

                              return (
                                <TouchableOpacity
                                  key={menuName}
                                  style={{
                                    backgroundColor: isCurrentUserSelected ? THEME.menuComplete : THEME.surface,
                                    borderWidth: 2,
                                    borderColor: isCurrentUserSelected ? THEME.menuComplete : THEME.border,
                                    borderRadius: 12,
                                    padding: 12,
                                    marginBottom: 8,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                  }}
                                  onPress={() => {
                                    if (currentParticipant) {
                                      const newVotes = currentParticipant.voted_items || [];
                                      if (newVotes.includes(menuName)) {
                                        newVotes.splice(newVotes.indexOf(menuName), 1);
                                      } else {
                                        newVotes.push(menuName);
                                      }
                                      handleUpdateMyVote(newVotes);
                                    }
                                  }}
                                >
                                  <Text style={{ fontSize: 15, fontWeight: '600', color: isCurrentUserSelected ? '#FFFFFF' : THEME.text, flex: 1 }}>
                                    {menuName}
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
                                      {voteCount}명
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        ) : (
                          <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                            <Text style={{ fontSize: 14, color: THEME.textMuted, textAlign: 'center' }}>
                              아직 선택된 메뉴가 없습니다.
                            </Text>
                            <Text style={{ fontSize: 12, color: THEME.textMuted, marginTop: 4, textAlign: 'center' }}>
                              메뉴 추천을 받거나 메뉴를 직접 제안해 보세요.
                            </Text>
                          </View>
                        );
                      })()}

                      {/* 참여자별 선택 */}
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
                              paddingVertical: 8,
                              borderBottomWidth: 1,
                              borderBottomColor: THEME.border,
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
                            <Text style={{ flex: 1, color: THEME.text, fontWeight: '500' }}>
                              {p.name}
                            </Text>
                            <Text style={{ color: p.voted_items?.length ? THEME.menuComplete : THEME.textMuted, fontWeight: '600', fontSize: 12 }}>
                              {p.voted_items?.length ? p.voted_items.join(', ') : '선정 대기 중'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
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

                  {/* Dropdowns */}
                  {roomOverlay === 'schedule' && (
                    <View style={styles.noticeDropdownOverlay}>
                      <View style={styles.overlayHeader}>
                        <Text style={styles.overlayHeaderTitle}>🗓️ 일정 조율</Text>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          <TouchableOpacity
                            style={{
                              backgroundColor: THEME.primary,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 6,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4
                            }}
                            onPress={handleRunAIRecommendations}
                          >
                            <Sparkles size={12} color="white" />
                            <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>AI 맞춤 추천</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setRoomOverlay(null)} style={styles.overlayCloseBtn}>
                            <Text style={styles.overlayCloseText}>접기 ✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Progress Display */}
                      {(() => {
                        const scheduleSelectedCount = participants.filter(p =>
                          p.schedule && Object.keys(p.schedule).length > 0
                        ).length;
                        const totalParticipants = participants.length;
                        const progressPercent = totalParticipants > 0 ? (scheduleSelectedCount / totalParticipants) * 100 : 0;

                        return (
                          <View style={{ paddingVertical: 12, paddingHorizontal: 16, marginBottom: 16 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: THEME.text }}>
                              일정 조율
                            </Text>
                            <Text style={{ fontSize: 14, color: THEME.textMuted, marginTop: 4 }}>
                              {scheduleSelectedCount}명 중 {scheduleSelectedCount}명 선택 완료
                            </Text>
                            {/* Progress Bar */}
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
                                  width: `${progressPercent}%`,
                                  backgroundColor: THEME.scheduleInProgress,
                                }}
                              />
                            </View>
                          </View>
                        );
                      })()}

                      <View style={{ flex: 1, paddingHorizontal: 16 }}>
                        {/* ScheduleGrid Container */}
                        <View
                          style={{
                            borderWidth: 1,
                            borderColor: THEME.border,
                            borderRadius: 8,
                            overflow: 'hidden',
                            marginBottom: 16,
                            flex: 1,
                          }}
                        >
                          <ScheduleGrid
                            meetingDate={currentRoom.meeting_date}
                            participants={participants}
                            currentParticipantId={currentParticipant?.id || ''}
                            onSaveSchedule={handleSaveParticipantSchedule}
                            isConfirmed={currentRoom.is_confirmed}
                            confirmedSlot={currentRoom.confirmed_slot}
                            onConfirmSchedule={(slot) => {
                              handleConfirmSchedule(slot);
                              setRoomOverlay(null);
                            }}
                            activeRooms={roomList}
                            onUpdateRoom={fetchRooms}
                            roomExpiresAt={currentRoom.expires_at}
                            onRetryCoordination={handleRetryCoordination}
                            roomId={currentRoom.id}
                            roomOwner={roomOwnerProfileId || ''}
                            currentProfileId={globalProfile?.id || ''}
                          />
                        </View>

                        {/* Confirmed Time Display */}
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
                            <Text style={{ fontWeight: 'bold', color: THEME.text, fontSize: 14 }}>
                              ✓ 확정 시간: {currentRoom.confirmed_slot}
                            </Text>
                          </View>
                        )}

                        {/* Estimated Cost Display */}
                        {currentRoom.is_confirmed && (
                          <View
                            style={{
                              backgroundColor: THEME.surface,
                              borderWidth: 1,
                              borderColor: THEME.border,
                              borderRadius: 8,
                              padding: 12,
                              marginBottom: 16,
                            }}
                          >
                            <Text style={{ fontSize: 14, color: THEME.textMuted }}>
                              예상 비용
                            </Text>
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
                              onPress={() => {
                                setRoomOverlay('dutch');
                              }}
                            >
                              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
                                정산 상세 보기
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
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
                </View>
                )}
              </View>
            ) : (

              // Active Rooms List
              <ScrollView 
                style={styles.tabBody} 
                contentContainerStyle={{ paddingBottom: 30 }}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />
                }
              >
                <Text style={styles.sectionHeading}>현재 개설된 밀챗 방</Text>

                {/* Join Room Code Input */}
                <View style={styles.joinCard}>
                  <View style={styles.joinRow}>
                    <TextInput
                      style={styles.joinInput}
                      placeholder="초대 코드 6자리 입력"
                      placeholderTextColor="#64748b"
                      value={joinRoomCode}
                      onChangeText={setJoinRoomCode}
                      autoCapitalize="characters"
                      maxLength={6}
                    />
                    <TouchableOpacity style={styles.joinBtn} onPress={handleJoinRoomByCode}>
                      <Text style={styles.joinBtnText}>입장</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* My Dutch Pay Ledger Button */}
                <TouchableOpacity
                  style={styles.globalDutchPayBtnCard}
                  onPress={() => {
                    if (isProfileIncomplete) {
                      Alert.alert('알림', '프로필 설정을 먼저 완료해 주세요!');
                      return;
                    }
                    setShowGlobalDutchPay(true);
                  }}
                >
                  <View style={styles.globalDutchPayBtnCardContent}>
                    <Text style={styles.globalDutchPayBtnCardTitle}>💸 나의 N빵 정산 대장</Text>
                    <Text style={styles.globalDutchPayBtnCardSubtitle}>
                      방이 폭파된 후에도 남아있는 미완료 정산 내역을 확인하고 송금할 수 있습니다.
                    </Text>
                  </View>
                  <Text style={styles.globalDutchPayBtnCardArrow}>보기 ➜</Text>
                </TouchableOpacity>

                {/* Room Card List */}
                {roomsLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={THEME.primary} />
                    <Text style={styles.loadingText}>방 목록을 불러오는 중...</Text>
                  </View>
                ) : roomList.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {roomList.map(room => {
                      // Calculate unread count for this room
                      const roomUnreadCount = appNotifications.filter(notif => notif.room_id === room.id).length;

                      return (
                        <RoomCard
                          key={room.id}
                          room={room}
                          unreadCount={roomUnreadCount}
                          onPress={() => {
                            setCurrentRoom(room);
                            setRoomSubTab('schedule');
                          }}
                          onChatPress={() => {
                            setCurrentRoom(room);
                            setRoomSubTab('schedule');
                            setActiveTab('addons');
                          }}
                          onMenuPress={() => {
                            setCurrentRoom(room);
                            setRoomSubTab('menu');
                            setActiveTab('addons');
                          }}
                          onSchedulePress={() => {
                            setCurrentRoom(room);
                            setRoomOverlay('schedule');
                            setActiveTab('addons');
                          }}
                        />
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>참여 중인 밀챗 방이 없습니다.</Text>
                    <Text style={styles.emptySubText}>[일정 조정] 탭에서 방을 개설하거나 초대코드로 참여해 보세요.</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        )}

      </View>


      {/* Bottom Tab Navigation */}
      {!currentRoom && (
        <View style={styles.tabNavigation}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'schedule' && styles.tabButtonActive]}
            onPress={() => handleTabChange('schedule')}
          >
            <CalendarIcon size={20} color={activeTab === 'schedule' ? THEME.primary : THEME.textMuted} />
            <Text style={[styles.tabButtonText, activeTab === 'schedule' && styles.tabButtonTextActive]}>
              일정 조율
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'addons' && styles.tabButtonActive]}
            onPress={() => handleTabChange('addons')}
          >
            <Sparkles size={20} color={activeTab === 'addons' ? THEME.primary : THEME.textMuted} />
            <Text style={[styles.tabButtonText, activeTab === 'addons' && styles.tabButtonTextActive]}>
              채팅방
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Profile View Modal */}
      <Modal
        visible={showProfileModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.modalContent, { width: '90%', maxWidth: 350, position: 'relative' }]}>
            {selectedProfile && (
              <View>
                {/* 우측 상단 X 닫기 버튼 */}
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    zIndex: 10,
                    padding: 8
                  }}
                  onPress={() => setShowProfileModal(false)}
                >
                  <X size={20} color={THEME.textMuted} />
                </TouchableOpacity>

                <View style={{ alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: THEME.border }}>
                  <View style={[styles.modalProfileAvatar, { backgroundColor: selectedProfile.avatar_color }]}>
                    <Text style={styles.modalProfileAvatarText}>{selectedProfile.name[0]}</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: THEME.text, marginTop: 8 }}>
                    {selectedProfile.name}
                  </Text>
                  {selectedProfile.personal_data?.bio && (
                    <Text style={{ fontSize: 12, color: THEME.textMuted, marginTop: 4, textAlign: 'center' }}>
                      {selectedProfile.personal_data.bio}
                    </Text>
                  )}

                  {globalProfile && selectedProfile.id !== globalProfile.id && (
                    (() => {
                      const isFriend = myFollows.some(f => f.following_id === selectedProfile.id);
                      if (isFriend) {
                        return (
                          <View
                            style={{
                              marginTop: 12,
                              backgroundColor: '#f1f5f9',
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              borderRadius: 20,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: 1,
                              borderColor: THEME.border
                            }}
                          >
                            <Check size={14} color="#64748b" style={{ marginRight: 4 }} />
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748b' }}>친구 목록에 있음</Text>
                          </View>
                        );
                      } else {
                        return (
                          <TouchableOpacity
                            style={{
                              marginTop: 12,
                              backgroundColor: THEME.primary,
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              borderRadius: 20,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onPress={() => handleAddFriend(selectedProfile.id)}
                          >
                            <Plus size={14} color="white" style={{ marginRight: 4 }} />
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: 'white' }}>친구 추가하기</Text>
                          </TouchableOpacity>
                        );
                      }
                    })()
                  )}
                </View>

                <ScrollView style={{ maxHeight: 300 }}>
                  {isFieldVisible('allergies', selectedProfile) && selectedProfile.personal_data?.allergies?.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 4 }}>알레르기</Text>
                      <Text style={{ fontSize: 12, color: THEME.text }}>{selectedProfile.personal_data.allergies.join(', ')}</Text>
                    </View>
                  )}
                  {isFieldVisible('likes', selectedProfile) && selectedProfile.personal_data?.likes?.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 4 }}>좋아하는 음식</Text>
                      <Text style={{ fontSize: 12, color: THEME.text }}>{selectedProfile.personal_data.likes.join(', ')}</Text>
                    </View>
                  )}
                  {isFieldVisible('dislikes', selectedProfile) && selectedProfile.personal_data?.dislikes?.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 4 }}>싫어하는 음식</Text>
                      <Text style={{ fontSize: 12, color: THEME.text }}>{selectedProfile.personal_data.dislikes.join(', ')}</Text>
                    </View>
                  )}
                  {isFieldVisible('health_issues', selectedProfile) && selectedProfile.personal_data?.health_issues?.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 4 }}>건강 주의사항</Text>
                      <Text style={{ fontSize: 12, color: THEME.text }}>{selectedProfile.personal_data.health_issues.join(', ')}</Text>
                    </View>
                  )}
                  {isFieldVisible('birthdate', selectedProfile) && selectedProfile.personal_data?.birthdate && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 4 }}>생년월일</Text>
                      <Text style={{ fontSize: 12, color: THEME.text }}>{selectedProfile.personal_data.birthdate}</Text>
                    </View>
                  )}
                  {isFieldVisible('gender', selectedProfile) && selectedProfile.personal_data?.gender && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 4 }}>성별</Text>
                      <Text style={{ fontSize: 12, color: THEME.text }}>{selectedProfile.personal_data.gender}</Text>
                    </View>
                  )}
                  {/* 5-Day Busy Schedule Mini Grid */}
                  {selectedProfile.schedule && (
                    <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: THEME.border }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: THEME.text, marginBottom: 4 }}>
                        📅 5일간 바쁜 시간대 요약
                      </Text>
                      <Text style={{ fontSize: 10, color: THEME.textMuted, marginBottom: 8 }}>
                        보라색 슬롯은 친구가 바쁜 시간대(약속 불가)입니다.
                      </Text>
                      
                      {/* Mini Grid */}
                      <View style={{ flexDirection: 'row', backgroundColor: THEME.surfaceDarker, borderRadius: 8, padding: 8 }}>
                        {/* Time Axis */}
                        <View style={{ marginRight: 6, gap: 2 }}>
                          <View style={{ height: 20, justifyContent: 'center' }}><Text style={{ fontSize: 8, color: 'transparent' }}>시간</Text></View>
                          {['11:30', '12:00', '12:30', '13:00', '13:30', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'].map(t => (
                            <View key={t} style={{ height: 12, justifyContent: 'center' }}>
                              <Text style={{ fontSize: 8, color: THEME.textMuted, fontWeight: '600' }}>{t}</Text>
                            </View>
                          ))}
                        </View>

                        {/* Columns */}
                        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                          {(() => {
                            const base = new Date();
                            const dates = [];
                            for (let i = 0; i < 5; i++) {
                              const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
                              dates.push(d.toISOString().split('T')[0]);
                            }

                            const getDayName = (dateStr: string) => {
                              const days = ['일', '월', '화', '수', '목', '금', '토'];
                              const d = new Date(dateStr);
                              return days[d.getDay()];
                            };

                            return dates.map(date => {
                              const busySlots = selectedProfile.schedule?.[date] || [];
                              const [, m, d] = date.split('-');
                              return (
                                <View key={date} style={{ flex: 1, alignItems: 'center' }}>
                                  <View style={{ height: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
                                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: THEME.text }}>{getDayName(date)}</Text>
                                    <Text style={{ fontSize: 7, color: THEME.textMuted }}>{parseInt(m, 10)}/{parseInt(d, 10)}</Text>
                                  </View>

                                  {['11:30', '12:00', '12:30', '13:00', '13:30', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'].map(time => {
                                    const isBusy = !busySlots.includes(time);
                                    return (
                                      <View
                                        key={`${date}-${time}`}
                                        style={{
                                          width: '100%',
                                          height: 12,
                                          backgroundColor: isBusy ? '#8b5cf6' : '#FFFFFF',
                                          borderWidth: 0.5,
                                          borderColor: 'rgba(0,0,0,0.05)',
                                          borderRadius: 2,
                                          marginVertical: 1
                                        }}
                                      />
                                    );
                                  })}
                                </View>
                              );
                            });
                          })()}
                        </View>
                      </View>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>



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

      {/* Room Info Modal */}
      <Modal
        visible={showRoomInfoModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowRoomInfoModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.modalContent, { width: '90%', maxWidth: 360, position: 'relative' }]}>
            {currentRoom && (
              <View>
                {!isEditingRoomTitle && (
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 }}>
                    <TouchableOpacity
                      style={{ padding: 4 }}
                      onPress={() => setShowRoomInfoModal(false)}
                    >
                      <X size={20} color={THEME.textMuted} />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={{ marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: THEME.border }}>
                  {isEditingRoomTitle ? (
                    <View style={{ gap: 8 }}>
                      <TextInput
                        style={{
                          backgroundColor: THEME.input,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          borderRadius: 8,
                          color: THEME.text,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 14,
                        }}
                        value={editingRoomTitle}
                        onChangeText={setEditingRoomTitle}
                        placeholder="방 이름 입력"
                        placeholderTextColor={THEME.textMuted}
                        maxLength={20}
                      />
                      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'flex-end' }}>
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#F4F3EA',
                            borderWidth: 1,
                            borderColor: THEME.border,
                            borderRadius: 6,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                          }}
                          onPress={() => {
                            setIsEditingRoomTitle(false);
                            setEditingRoomTitle(currentRoom.title);
                          }}
                        >
                          <Text style={{ fontSize: 11, color: THEME.text, fontWeight: 'bold' }}>취소</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{
                            backgroundColor: THEME.primary,
                            borderRadius: 6,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                          }}
                          onPress={handleUpdateRoomTitle}
                        >
                          <Text style={{ fontSize: 11, color: 'white', fontWeight: 'bold' }}>저장</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: THEME.text, flex: 1 }}>
                        {currentRoom.title}
                      </Text>
                      <TouchableOpacity
                        style={{
                          backgroundColor: THEME.avatarBg,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: THEME.border
                        }}
                        onPress={() => setIsEditingRoomTitle(true)}
                      >
                        <Text style={{ fontSize: 10, color: THEME.text, fontWeight: 'bold' }}>이름 변경</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <Text style={{ fontSize: 12, color: THEME.textMuted, marginTop: 4 }}>
                    약속 방 상세 정보
                  </Text>
                </View>

                {/* 방 상세 정보 표시 영역 */}
                <View style={{ gap: 12, marginBottom: 16 }}>
                  {/* 코드 */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.textMuted }}>초대 코드</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: THEME.primary }}>{currentRoom.code}</Text>
                      <TouchableOpacity 
                        style={{ backgroundColor: THEME.avatarBg, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 }}
                        onPress={handleShareRoom}
                      >
                        <Text style={{ fontSize: 10, color: THEME.text, fontWeight: 'bold' }}>공유</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 일시 */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.textMuted }}>약속 일시</Text>
                    <Text style={{ fontSize: 12, color: THEME.text }}>{getMeetingDateDisplay(currentRoom)}</Text>
                  </View>

                  {/* 약속 장소 */}
                  <View style={{ borderTopWidth: 1, borderTopColor: THEME.border, paddingTop: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 6 }}>약속 장소</Text>
                    {isEditingRoomLocation ? (
                      <View style={{ gap: 8 }}>
                        <TextInput
                          style={{
                            backgroundColor: THEME.input,
                            borderWidth: 1,
                            borderColor: THEME.border,
                            borderRadius: 8,
                            color: THEME.text,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            fontSize: 13,
                          }}
                          value={editingRoomLocationName}
                          onChangeText={setEditingRoomLocationName}
                          placeholder="장소 이름 입력"
                          placeholderTextColor={THEME.textMuted}
                        />
                        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'space-between', alignItems: 'center' }}>
                          <TouchableOpacity
                            style={{
                              backgroundColor: THEME.avatarBg,
                              borderWidth: 1,
                              borderColor: THEME.border,
                              borderRadius: 6,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                            }}
                            onPress={() => handleSearchLocation(editingRoomLocationName)}
                          >
                            <Text style={{ fontSize: 10, color: THEME.primary, fontWeight: 'bold' }}>🔍 장소 검색</Text>
                          </TouchableOpacity>

                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#F4F3EA',
                                borderWidth: 1,
                                borderColor: THEME.border,
                                borderRadius: 6,
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                              }}
                              onPress={() => {
                                setIsEditingRoomLocation(false);
                                setEditingRoomLocationName(currentRoom.location_name || '');
                                setEditingRoomLatitude(currentRoom.latitude || 37.5665);
                                setEditingRoomLongitude(currentRoom.longitude || 126.9780);
                                setShowLocationResults(false);
                              }}
                            >
                              <Text style={{ fontSize: 11, color: THEME.text, fontWeight: 'bold' }}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{
                                backgroundColor: THEME.primary,
                                borderRadius: 6,
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                              }}
                              onPress={handleUpdateRoomLocation}
                            >
                              <Text style={{ fontSize: 11, color: 'white', fontWeight: 'bold' }}>저장</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* 검색 결과: 버튼 행의 바깥에 배치하여 온전한 가로 너비를 차지하게 함 */}
                        {showLocationResults && locationSearchResults.length > 0 && (
                          <ScrollView style={{ maxHeight: 150, marginTop: 4, borderWidth: 1, borderColor: THEME.border, borderRadius: 6, backgroundColor: THEME.surface }}>
                            {locationSearchResults.map((result, idx) => (
                              <TouchableOpacity
                                key={idx}
                                style={{
                                  padding: 10,
                                  borderBottomWidth: idx < locationSearchResults.length - 1 ? 1 : 0,
                                  borderBottomColor: THEME.border
                                }}
                                onPress={() => handleSelectLocation(result)}
                              >
                                <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.text }}>
                                  {result.place_name}
                                </Text>
                                <Text style={{ fontSize: 10, color: THEME.textMuted, marginTop: 2 }}>
                                  {result.address_name}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        )}
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: THEME.text, flex: 1 }}>
                          {currentRoom.location_name ? `${currentRoom.location_name} (위도: ${currentRoom.latitude?.toFixed(2)}, 경도: ${currentRoom.longitude?.toFixed(2)})` : '설정된 장소 없음'}
                        </Text>
                        <TouchableOpacity
                          style={{
                            backgroundColor: THEME.avatarBg,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: THEME.border
                          }}
                          onPress={() => setIsEditingRoomLocation(true)}
                        >
                          <Text style={{ fontSize: 10, color: THEME.text, fontWeight: 'bold' }}>장소 설정</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                {/* 약속 테마 색상 변경 */}
                <View style={{ borderTopWidth: 1, borderTopColor: THEME.border, paddingTop: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 8 }}>
                    약속 테마 색상 변경
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                    {PALETTE_COLORS.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: c,
                          borderWidth: (currentRoom.color || '#23A455') === c ? 2 : 0,
                          borderColor: THEME.text,
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                        onPress={() => handleChangeRoomColor(c)}
                      >
                        {(currentRoom.color || '#23A455') === c && (
                          <Check size={12} color="white" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* 구성 멤버 목록 */}
                <View style={{ borderTopWidth: 1, borderTopColor: THEME.border, paddingTop: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 8 }}>
                    구성 멤버 ({participants.length}명)
                  </Text>

                  {participantsLoading ? (
                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                      <ActivityIndicator size="small" color={THEME.primary} />
                      <Text style={{ color: THEME.textMuted, fontSize: 11, marginTop: 8 }}>멤버 정보를 불러오는 중...</Text>
                    </View>
                  ) : (
                    <ScrollView style={{ maxHeight: 200 }} contentContainerStyle={{ gap: 8 }}>
                      {participants.length > 0 ? (
                        participants.map((member) => (
                          <View
                            key={member.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              padding: 8,
                              backgroundColor: '#F4F3EA',
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: THEME.border,
                              gap: 8
                            }}
                          >
                            <TouchableOpacity
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                flex: 1
                              }}
                              onPress={() => {
                                setShowRoomInfoModal(false);
                                if (member.profile_id) {
                                  handleViewProfile(member.profile_id);
                                } else {
                                  Alert.alert('알림', '프로필 정보가 없는 사용자입니다.');
                                }
                              }}
                            >
                              <View
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  backgroundColor: member.avatar_color || THEME.primary,
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  marginRight: 10
                                }}
                              >
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>
                                  {(member.name || '알')[0]}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: 'bold', color: THEME.text }}>
                                  {member.name}
                                  {member.profile_id === roomOwnerProfileId && (
                                    <Text style={{ fontSize: 10, color: THEME.primary, fontWeight: 'bold' }}> (방장)</Text>
                                  )}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 11, color: THEME.textMuted }}>프로필 ➜</Text>
                            </TouchableOpacity>

                            {/* Kick button: only visible to host, and cannot kick themselves */}
                            {roomOwnerProfileId === globalProfile?.id && member.profile_id !== roomOwnerProfileId && (
                              <TouchableOpacity
                                style={{
                                  backgroundColor: '#FEE2E2',
                                  borderColor: '#EF4444',
                                  borderWidth: 1,
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 6
                                }}
                                onPress={() => handleKickParticipant(member.id, member.name)}
                              >
                                <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: 'bold' }}>추방</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))
                      ) : (
                        <Text style={{ color: THEME.textMuted, fontSize: 11, textAlign: 'center', paddingVertical: 8 }}>
                          멤버가 없습니다.
                        </Text>
                      )}
                    </ScrollView>
                  )}
                </View>

              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Global Dutch Pay Modal */}
      <Modal
        visible={showGlobalDutchPay}
        animationType="slide"
        onRequestClose={() => setShowGlobalDutchPay(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: THEME.background }} {...globalDutchPayPanResponder.panHandlers}>
          <View style={styles.globalDutchPayHeader}>
            <Text style={styles.globalDutchPayHeaderTitle}>💸 나의 N빵 정산 대장</Text>
            <TouchableOpacity
              style={styles.globalDutchPayCloseBtn}
              onPress={() => setShowGlobalDutchPay(false)}
            >
              <X size={20} color={THEME.text} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <DutchPay
              globalProfile={globalProfile}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Slide-Up Create Room Modal (Manual Room creation in Tab 2) */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { marginBottom: 120, width: '90%', maxWidth: 400, borderRadius: 16 }]}>
            <Text style={styles.modalTitle}>새 밀챗 방 만들기</Text>
            
            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>약속 모임 이름</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="예: 삼겹살 번개 모임 🐷"
                placeholderTextColor={THEME.textMuted}
                value={newRoomTitle}
                onChangeText={setNewRoomTitle}
              />
            </View>

            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>친구 초대하기 (선택)</Text>
              {myFollows.length === 0 ? (
                <Text style={{ fontSize: 12, color: THEME.textMuted, marginVertical: 4 }}>등록된 친구가 없습니다.</Text>
              ) : (
                <ScrollView 
                  style={{ 
                    maxHeight: 180, 
                    borderWidth: 1, 
                    borderColor: THEME.border, 
                    borderRadius: 8, 
                    paddingHorizontal: 12, 
                    backgroundColor: THEME.background 
                  }}
                  nestedScrollEnabled={true}
                >
                  {myFollows.map(f => {
                    const profile = f.profiles;
                    if (!profile) return null;
                    const isSelected = createRoomSelectedFriends.includes(f.following_id);
                    return (
                      <TouchableOpacity
                        key={f.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: THEME.border,
                          justifyContent: 'space-between'
                        }}
                        onPress={() => {
                          if (isSelected) {
                            setCreateRoomSelectedFriends(prev => prev.filter(id => id !== f.following_id));
                          } else {
                            setCreateRoomSelectedFriends(prev => [...prev, f.following_id]);
                          }
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              backgroundColor: profile.avatar_color || THEME.primary,
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 10
                            }}
                          >
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>
                              {profile.name.substring(0, 1)}
                            </Text>
                          </View>
                          <View>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.text }}>{profile.name}</Text>
                            <Text style={{ fontSize: 11, color: THEME.textMuted }}>{profile.start_location_name || '위치 미설정'}</Text>
                          </View>
                        </View>
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            borderWidth: 2,
                            borderColor: isSelected ? THEME.primary : '#cbd5e1',
                            backgroundColor: isSelected ? THEME.primary : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {isSelected && <Check size={12} color="white" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={handleCreateRoom}
                disabled={loading}
              >
                <Text style={styles.modalBtnSubmitText}>방 개설 완료 🎉</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </Modal>

        {/* AI Recommendations Modal */}
        <Modal
          visible={showAIRecommendModal}
          animationType="slide"
          onRequestClose={() => setShowAIRecommendModal(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: THEME.background }}>
            <View style={styles.globalDutchPayHeader}>
              <Text style={styles.globalDutchPayHeaderTitle}>✨ AI 추천 일정 후보 TOP 3</Text>
              <TouchableOpacity
                style={styles.globalDutchPayCloseBtn}
                onPress={() => setShowAIRecommendModal(false)}
              >
                <X size={20} color={THEME.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
              {aiRecommendations.length > 0 ? (
                aiRecommendations.map((rec) => {
                  const isRank1 = rec.rank === 1;
                  const isRank2 = rec.rank === 2;
                  const borderTheme = isRank1 ? '#8b5cf6' : isRank2 ? '#3b82f6' : '#64748b';

                  return (
                    <View
                      key={rec.rank}
                      style={{
                        backgroundColor: THEME.surface,
                        borderRadius: 12,
                        borderWidth: isRank1 ? 2 : 1,
                        borderColor: borderTheme,
                        padding: 16,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <View style={{
                          backgroundColor: borderTheme,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6
                        }}>
                          <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>
                            {rec.rank}순위 추천
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: THEME.primary }}>
                          적합도: {rec.score}점
                        </Text>
                      </View>

                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: THEME.text, marginBottom: 4 }}>
                        {rec.date} ({rec.time})
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        <Text style={{ fontSize: 13, color: THEME.text, fontWeight: '600' }}>
                          {rec.ai_reason}
                        </Text>
                        <View style={{
                          backgroundColor: '#F1F5F9',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 9999,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 2,
                          borderWidth: 1,
                          borderColor: '#E2E8F0'
                        }}>
                          <Text style={{ fontSize: 9, color: '#64748b', fontWeight: 'bold' }}>AI 요약</Text>
                          <Text style={{ fontSize: 9, color: '#64748b' }}>ⓘ</Text>
                        </View>
                      </View>

                      <View style={{ gap: 6, marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 12, color: THEME.textMuted }}>👥 참석 현황:</Text>
                          <Text style={{ fontSize: 12, color: THEME.text, fontWeight: 'bold' }}>
                            {rec.attendance_count}명 / {rec.total_participants}명 참석 가능
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 12, color: THEME.textMuted }}>🌤️ 날씨 예보:</Text>
                          <Text style={{ fontSize: 12, color: THEME.text }}>
                            {rec.weather_status} (강수확률 {rec.precipitation_probability}%)
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 12, color: THEME.textMuted }}>🚗 이동 시간:</Text>
                          <Text style={{ fontSize: 12, color: THEME.text }}>
                            평균 약 {rec.average_travel_time}분 소요
                          </Text>
                        </View>
                      </View>

                      {rec.recommended_place && (
                        <View style={{
                          marginTop: 12,
                          paddingTop: 12,
                          borderTopWidth: 1,
                          borderTopColor: THEME.border,
                          marginBottom: 16,
                          gap: 3
                        }}>
                          {/* Name */}
                          <Text style={{ fontSize: 16, fontWeight: 'bold', color: THEME.text }}>
                            {rec.recommended_place.type === '술집' ? '🍺 ' : '☕ '}{rec.recommended_place.name}
                          </Text>
                          
                          {/* Category and business hours */}
                          <Text style={{ fontSize: 12, color: THEME.textMuted }}>
                            {rec.recommended_place.type} · 영업시간: {rec.recommended_place.business_hours}
                          </Text>

                          {/* Menu and Price */}
                          {rec.recommended_place.menu && (
                            <Text style={{ fontSize: 12, color: THEME.text, marginTop: 2 }}>
                              🍴 <Text style={{ fontWeight: '600' }}>대표 메뉴:</Text> {rec.recommended_place.menu}
                            </Text>
                          )}
                          {rec.recommended_place.price && (
                            <Text style={{ fontSize: 12, color: THEME.text, marginTop: 2 }}>
                              💵 <Text style={{ fontWeight: '600' }}>평균 가격대:</Text> {rec.recommended_place.price}
                            </Text>
                          )}
                          
                          {/* Slogan & AI Summary badge */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                            <Text style={{ fontSize: 13, color: THEME.text, fontWeight: '600' }}>
                              {rec.recommended_place.reason}
                            </Text>
                            <View style={{
                              backgroundColor: THEME.badgeBg,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 9999,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 2,
                              borderWidth: 1,
                              borderColor: THEME.primary
                            }}>
                              <Text style={{ fontSize: 9, color: THEME.primary, fontWeight: 'bold' }}>AI 요약</Text>
                              <Text style={{ fontSize: 9, color: THEME.primary }}>ⓘ</Text>
                            </View>
                          </View>

                          {rec.recommended_place.description && (
                            <Text style={{ fontSize: 11.5, color: THEME.textMuted, fontStyle: 'italic', marginTop: 2 }}>
                              "{rec.recommended_place.description}"
                            </Text>
                          )}
                        </View>
                      )}

                      <TouchableOpacity
                        style={{
                          backgroundColor: borderTheme,
                          borderRadius: 8,
                          paddingVertical: 12,
                          alignItems: 'center'
                        }}
                        onPress={async () => {
                          const formattedSlot = `${rec.date} ${rec.time}`;
                          await handleConfirmSchedule(formattedSlot, rec.recommended_place?.name);
                          setShowAIRecommendModal(false);
                          setRoomOverlay(null);
                        }}
                      >
                        <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>
                          이 시간으로 약속 확정하기
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              ) : (
                <Text style={{ textAlign: 'center', color: THEME.textMuted, marginTop: 40 }}>
                  추천 일정을 불러올 수 없습니다. 장소 설정과 참가자 시간표를 확인해 주세요.
                </Text>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* 장소 선택 지도 모달 */}
        <Modal
          visible={showLocationMapModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowLocationMapModal(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
            <View style={{ flex: 1 }}>
              <MapView
                style={{ flex: 1 }}
                region={mapRegion}
                onRegionChange={setMapRegion}
              >
                <Marker
                  coordinate={{
                    latitude: mapRegion.latitude,
                    longitude: mapRegion.longitude,
                  }}
                  title="선택된 위치"
                  pinColor={THEME.primary}
                />
              </MapView>
            </View>

            {/* 지도 하단 컨트롤 */}
            <View
              style={{
                backgroundColor: THEME.surface,
                borderTopWidth: 1,
                borderTopColor: THEME.border,
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: 'row',
                gap: 12,
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#F4F3EA',
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
                onPress={() => setShowLocationMapModal(false)}
              >
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: THEME.text }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: THEME.primary,
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
                onPress={() => {
                  handleSelectLocation(mapRegion.latitude, mapRegion.longitude);
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: 'white' }}>이 위치로 설정</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
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
  createBtn: {
    backgroundColor: THEME.menuNeeded,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4
  },
  createBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
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
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    height: 60,
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent'
  },
  tabButtonActive: {
    borderBottomColor: THEME.primary
  },
  tabButtonText: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 4,
    fontWeight: '500'
  },
  tabButtonTextActive: {
    color: THEME.primary,
    fontWeight: 'bold'
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
