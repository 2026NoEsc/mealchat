import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Image,
  PanResponder,
  Animated,
  Dimensions,
  Vibration,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, User, Heart, Sparkles, Check, Users, Search, Trash2, Calendar, X, ChevronDown, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { SafeMapView as MapView, isGoogleMapsConfigured } from './SafeMapView';
import { supabase } from '../lib/supabaseClient';
import { Button } from './Button';
import { THEME } from '../lib/theme';
import type { PersonalData, Profile, Follow, ScheduleAvailability, PrivacySettings, Room } from '../lib/types';
import { ScheduleGrid } from './ScheduleGrid';
import { POPULAR_FOODS, FoodItem } from '../constants/foodData';
import { formatBirthdate } from '../lib/personalDataUtils';
import type { PrivacyLevel } from '../lib/types';

/**
 * Figma `프로필/정보 공개 범위`(256:2494) 는 on/off 토글이지만, 이 앱의 공개
 * 범위는 `공개 / 친구 / 비공개` 3단계이고 App.tsx 의 isFieldVisible 이 실제로
 * 그 값을 읽는다. 단계를 줄이면 "친한 친구에게만" 이 사라지므로 3단계를 유지하고
 * Figma 의 카드/행 구조만 가져왔다.
 */
const PRIVACY_LEVELS: { value: PrivacyLevel; label: string }[] = [
  { value: 'public', label: '공개' },
  { value: 'best', label: '친구' },
  { value: 'private', label: '비공개' },
];

const PRIVACY_BASIC_FIELDS = [
  { key: 'birthdate' as const, label: '생년월일' },
  { key: 'gender' as const, label: '성별' },
  { key: 'bio' as const, label: '한마디 멘트' },
];

const PRIVACY_SENSITIVE_FIELDS = [
  { key: 'bank_account' as const, label: '계좌번호', hint: '정산할 때만 쓰여요' },
];
import { optimizeImage } from '../lib/imageOptimizer';
import {
  ALLERGY_PRESETS,
  HEALTH_PRESETS,
  allergyLabel,
  healthLabel,
  normalizeAllergies,
  normalizeHealthIssues,
} from '../lib/personalDataUtils';
import {
  SEOUL_CITY_HALL,
  isStoredLocationVerified,
  resolveStartLocationForSave,
  didDropCoordinates
} from '../lib/locationUtils';

// 출발지 장소 검색용. 없으면 검색 버튼이 안내 메시지를 띄웁니다.
const KAKAO_REST_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY || '';

interface ProfileSetupProps {
  initialData?: Profile | null;
  onSave: (
    name: string,
    color: string,
    personalData: PersonalData,
    tag: string,
    avatarUrl?: string,
    startLocationName?: string,
    startLatitude?: number,
    startLongitude?: number,
    isTasteGame?: boolean
  ) => void;
  onSaveSchedule?: (schedule: ScheduleAvailability) => Promise<void> | void;
  roomParticipants?: any[];
  roomCode?: string;
  activeRooms?: Room[];
  onLogout?: () => void;
  onDeleteAccount?: () => void;
  onExportData?: () => void;
  onViewChange?: (view: 'main' | 'edit' | 'food_taste') => void;
  onSwipeBackBlockChange?: (blocked: boolean) => void;
  onClose?: () => void;
  onSearchFriend?: (query: string) => void;
  onGetRecommendedFriends?: () => void;
  onFollowUser?: (profileId: string) => void;
  searchResults?: Profile[];
  recommendedFriends?: Profile[];
  isSearching?: boolean;
}

const PRESET_COLORS = ['#23A455', '#2AC1BC', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];
const BANK_PRESETS = ['카카오뱅크', '토스뱅크', '국민은행', '신한은행', '우리은행', '하나은행', '농협은행', '기업은행'];

const PROFILE_BG_COLORS = [
  '#FECACA', // Light Red
  '#FED7AA', // Light Orange
  '#FEF08A', // Light Yellow
  '#BBF7D0', // Light Green
  '#BFDBFE', // Light Blue
  '#C7D2FE', // Light Indigo
  '#E9D5FF', // Light Purple
  '#FBCFE8', // Light Pink
];

const MALE_EMOJIS = ['🙋‍♂️', '👨‍💻', '👨‍🎓', '🦁', '🐯', '🐻', '🐶', '⚽', '🎮', '🚀'];
const FEMALE_EMOJIS = ['🙋‍♀️', '👩‍🎨', '👩‍🎓', '🐱', '🐰', '🦊', '🐼', '🎨', '🌸', '🍰'];
const NEUTRAL_EMOJIS = ['🍕', '🥑', '🍀', '🚀', '🎨', '🍔', '🌮', '🍣'];

const FOOD_PRESETS = [
  { id: 'meat', label: '고기류 🥩' },
  { id: 'seafood', label: '해산물 🍣' },
  { id: 'noodles', label: '면류 🍜' },
  { id: 'rice', label: '한식/밥 🍚' },
  { id: 'soup', label: '탕/찌개 🍲' },
  { id: 'pizza', label: '피자/양식 🍕' },
  { id: 'fastfood', label: '패스트푸드 🍔' },
  { id: 'salad', label: '샐러드 🥗' },
  { id: 'dessert', label: '디저트 🍰' }
];

const TIME_SLOTS = [
  '11:30', '12:00', '12:30', '13:00', '13:30',
  '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
];

export const ProfileSetup = forwardRef<any, ProfileSetupProps>(({
  initialData,
  onSave,
  onSaveSchedule,
  roomParticipants = [],
  roomCode = '',
  activeRooms = [],
  onLogout,
  onDeleteAccount,
  onExportData,
  onViewChange,
  onSwipeBackBlockChange,
  onClose,
  onSearchFriend,
  onGetRecommendedFriends,
  onFollowUser,
  searchResults = [],
  recommendedFriends = [],
  isSearching = false
}, ref) => {
  const [name, setName] = useState(initialData?.name || '');
  const [avatarColor, setAvatarColor] = useState(initialData?.avatar_color || PRESET_COLORS[0]);
  const [tag, setTag] = useState(initialData?.tag || '');
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatar_url || '');
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'follows' | 'settings'>('settings');
  const [activeSettingSection, setActiveSettingSection] = useState<'profile' | 'schedule' | 'privacy' | null>(null);

  // bio 는 나중에 추가된 항목이라 기존 프로필에는 값이 없다. isFieldVisible 은
  // 값이 없으면 공개로 보므로, 화면에서도 '공개' 가 골라진 상태로 시작해야
  // 실제 동작과 어긋나지 않는다.
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    birthdate: 'public',
    gender: 'public',
    bank_account: 'private',
    bio: 'public',
    ...(initialData?.privacy_settings || {}),
  });

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const [showMapModal, setShowMapModal] = useState(false);
  const [mapTargetField, setMapTargetField] = useState<'startLocation' | 'preferredLocation'>('startLocation');
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.5665,
    longitude: 126.9780,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01
  });
  const [selectedMapCoords, setSelectedMapCoords] = useState({
    latitude: 37.5665,
    longitude: 126.9780
  });
  const currentMapCoordsRef = useRef({
    latitude: 37.5665,
    longitude: 126.9780
  });

  useEffect(() => {
    if (onSwipeBackBlockChange) {
      onSwipeBackBlockChange(showMapModal || showPrivacyModal);
    }
    return () => {
      if (onSwipeBackBlockChange) {
        onSwipeBackBlockChange(false);
      }
    };
  }, [showMapModal, showPrivacyModal, onSwipeBackBlockChange]);

  const handleOpenMapSelector = async (targetField: 'startLocation' | 'preferredLocation') => {
    setMapTargetField(targetField);
    let lat = targetField === 'startLocation' ? startLatitude : 37.5665;
    let lng = targetField === 'startLocation' ? startLongitude : 126.9780;

    // If starting coordinates are default Seoul or empty, center the map to their actual current physical location
    if (!lat || lat === 37.5665 || lat === 0) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } catch (err) {
        console.log('Error getting location for map default region:', err);
      }
    }

    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    const finalLat = (isNaN(parsedLat) || parsedLat === 0) ? 37.5665 : parsedLat;
    const finalLng = (isNaN(parsedLng) || parsedLng === 0) ? 126.9780 : parsedLng;

    setSelectedMapCoords({ latitude: finalLat, longitude: finalLng });
    currentMapCoordsRef.current = { latitude: finalLat, longitude: finalLng };
    setMapRegion({
      latitude: finalLat,
      longitude: finalLng,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015
    });
    setShowMapModal(true);
  };

  /**
   * 출발지를 이름으로 검색합니다 (카카오 로컬).
   *
   * 왜 필요한가
   *   이 화면은 원래 이름(자유 입력)과 좌표(GPS·지도)를 **따로** 받았습니다.
   *   둘을 잇는 로직이 없어서 "Seomyeon(부산)인데 좌표는 서울시청" 같은
   *   조합이 그대로 저장됐고, 그 좌표가 중간지점·이동시간 계산에 쓰였습니다.
   *   검색 결과를 고르면 이름과 좌표를 한 번에 맞춰 넣습니다.
   */
  const handleSearchStartLocation = async () => {
    const query = startLocationName.trim();
    if (!query) {
      Alert.alert('알림', '검색할 장소 이름을 먼저 입력해 주세요.');
      return;
    }
    if (!KAKAO_REST_API_KEY) {
      Alert.alert('장소 검색 불가', '카카오 장소 검색을 사용할 수 없습니다.\n관리자에게 API 키 설정을 문의해 주세요.');
      return;
    }

    setIsSearchingLocation(true);
    try {
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=5`,
        { headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` } }
      );

      if (!response.ok) {
        const body = await response.text();
        console.warn(`[Kakao] 출발지 검색 실패 (HTTP ${response.status})`, body);
        Alert.alert('장소 검색 불가', '카카오 장소 검색을 사용할 수 없습니다.\n관리자에게 API 키 설정을 문의해 주세요.');
        setStartLocationResults([]);
        return;
      }

      const data = await response.json();
      const docs = data.documents || [];
      setStartLocationResults(docs);
      if (docs.length === 0) {
        Alert.alert('알림', '검색 결과가 없습니다. 다른 이름으로 시도해 보세요.');
      }
    } catch (err) {
      console.error('Error searching start location:', err);
      Alert.alert('오류', '장소 검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  /** 검색 결과 선택 — 이름과 좌표를 함께 설정합니다. 유일하게 둘을 잇는 경로입니다. */
  const handleSelectStartLocation = (place: any) => {
    setStartLocationName(place.place_name);
    setStartLatitude(parseFloat(place.y));
    setStartLongitude(parseFloat(place.x));
    setStartLocationVerified(true);
    setStartLocationResults([]);
  };

  /**
   * 이름 입력칸이 바뀌면 좌표와의 짝이 깨집니다.
   * `서면역` 을 골라놓고 이름을 `우리집` 으로 고치는 것은 괜찮지만,
   * 이름을 통째로 다른 장소로 바꾸는 것도 같은 동작이라 구분할 수 없습니다.
   * 안전한 쪽(미확정)으로 둡니다 — 다시 검색을 한 번 누르면 됩니다.
   */
  const handleChangeStartLocationName = (text: string) => {
    setStartLocationName(text);
    setStartLocationVerified(false);
  };

  /**
   * 저장 함수에 넘길 출발지 3개 값을 만듭니다.
   *
   * 좌표가 이름과 짝지어지지 않았으면 **좌표를 버리고 이름만** 넘깁니다.
   * 틀린 좌표는 다른 참여자들의 약속 장소까지 끌고 가지만, 없는 좌표는
   * 계산에서 그냥 빠지기 때문입니다(`resolveMeetingCenter` 참고).
   *
   * 좌표를 버렸을 때는 조용히 넘어가지 않고 사용자에게 알립니다 —
   * 안 그러면 "위치를 넣었는데 왜 반영이 안 되지?" 가 됩니다.
   */
  const startLocationArgs = (): [string | undefined, number | undefined, number | undefined] => {
    const saved = resolveStartLocationForSave({
      name: startLocationName,
      latitude: startLatitude,
      longitude: startLongitude,
      verified: startLocationVerified
    });

    if (didDropCoordinates(saved)) {
      Alert.alert(
        '출발 위치 좌표가 확인되지 않았습니다',
        `"${saved.start_location_name}" 의 좌표를 확인하지 못해 이름만 저장했습니다.\n\n` +
          'AI 추천은 좌표로 중간 지점을 계산하므로, 이 상태로는 내 위치가 반영되지 않습니다.\n' +
          '🔍 이름으로 장소 검색 을 눌러 목록에서 고르면 좌표가 함께 저장됩니다.'
      );
    }

    return [
      saved.start_location_name ?? undefined,
      saved.start_latitude ?? undefined,
      saved.start_longitude ?? undefined
    ];
  };

  const handleGetCurrentLocation = async (targetField: 'startLocation' | 'preferredLocation') => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '실제 기기 위치를 가져오기 위해 위치 권한이 필요합니다.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const { latitude, longitude } = loc.coords;

      if (targetField === 'startLocation') {
        setStartLatitude(latitude);
        setStartLongitude(longitude);
        // GPS 는 좌표가 먼저 확정되고, 아래 역지오코딩이 그 좌표의 이름을 채웁니다.
        // 즉 이름과 좌표가 같은 지점에서 나오므로 확정으로 봅니다.
        setStartLocationVerified(true);
      }

      // Reverse geocoding
      try {
        const address = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (address && address.length > 0) {
          const first = address[0];
          const name = first.district || first.city || first.street || '현재 위치';
          if (targetField === 'startLocation') {
            setStartLocationName(name);
          } else if (targetField === 'preferredLocation') {
            setPreferredLocation(name);
          }
        } else {
          if (targetField === 'startLocation') {
            setStartLocationName('현재 위치');
          } else if (targetField === 'preferredLocation') {
            setPreferredLocation('현재 위치');
          }
        }
      } catch (geoErr) {
        console.error(geoErr);
        if (targetField === 'startLocation') {
          setStartLocationName('현재 위치');
        } else if (targetField === 'preferredLocation') {
          setPreferredLocation('현재 위치');
        }
      }
      Alert.alert('완료', '실제 기기 GPS 위치 기반으로 위치가 지정되었습니다!');
    } catch (err: any) {
      console.error(err);
      Alert.alert('오류', '현재 위치를 가져오는 도중 오류가 발생했습니다.');
    }
  };

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '프로필 사진을 변경하려면 사진첩 접근 권한이 필요합니다.');
        return;
      }

      setIsUploadingImage(true);
      setUploadProgress(0);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;

        // Optimize image
        const optimizationResult = await optimizeImage(imageUri, (progress) => {
          setUploadProgress(progress);
        });

        if (optimizationResult.success && optimizationResult.base64) {
          setAvatarUrl(optimizationResult.base64);
          setUploadProgress(100);
          setTimeout(() => {
            setIsUploadingImage(false);
            setUploadProgress(0);
          }, 500);
        } else {
          setIsUploadingImage(false);
          setUploadProgress(0);
          Alert.alert('오류', optimizationResult.error || '이미지 최적화에 실패했습니다.');
        }
      } else {
        setIsUploadingImage(false);
        setUploadProgress(0);
      }
    } catch (err: any) {
      console.error('Error picking image:', err);
      setIsUploadingImage(false);
      setUploadProgress(0);
      Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
    }
  };
  
  // Personal data states
  const [birthdate, setBirthdate] = useState(initialData?.personal_data?.birthdate || '');
  const [gender, setGender] = useState(initialData?.personal_data?.gender || 'none');
  const [bankName, setBankName] = useState('카카오뱅크');
  const [accountNumber, setAccountNumber] = useState('');
  const [bio, setBio] = useState(initialData?.personal_data?.bio || '');
  const [startLocationName, setStartLocationName] = useState(initialData?.start_location_name || '');
  const [startLatitude, setStartLatitude] = useState(initialData?.start_latitude || SEOUL_CITY_HALL.latitude);
  const [startLongitude, setStartLongitude] = useState(initialData?.start_longitude || SEOUL_CITY_HALL.longitude);
  /**
   * 위 좌표가 **이름과 같은 동작으로** 정해졌는가.
   *
   * 이름은 자유 입력이고 좌표는 검색·GPS·지도로 따로 들어옵니다. 둘이 어긋난 채
   * 저장되면 AI 가 좌표를 믿고 엉뚱한 동네를 추천합니다(라운드 AE-8).
   * 그래서 "짝지어졌다"는 사실 자체를 상태로 들고 다닙니다.
   * 판단 규칙은 `lib/locationUtils` 에 있고 테스트로 고정돼 있습니다.
   */
  const [startLocationVerified, setStartLocationVerified] = useState(
    isStoredLocationVerified(initialData?.start_latitude, initialData?.start_longitude)
  );
  // 출발지 장소 검색 결과.
  // 이름과 좌표가 따로 놀지 않도록, 검색 결과를 고르면 둘을 함께 설정합니다.
  const [startLocationResults, setStartLocationResults] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [preferredLocation, setPreferredLocation] = useState(initialData?.personal_data?.preferred_location || '');

  const [showFriends, setShowFriends] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [travelTime, setTravelTime] = useState<number>(initialData?.personal_data?.travelTime || 0);
  const [showTravelTimePicker, setShowTravelTimePicker] = useState(false);

  // Tinder food swipe & Emoji customizer states
  const [profileEmoji, setProfileEmoji] = useState(initialData?.personal_data?.profileEmoji || '🦁');
  const [profileBgColor, setProfileBgColor] = useState(initialData?.personal_data?.profileBgColor || '#BFDBFE');
  
  const [hasCompletedProfilePhotoTutorial, setHasCompletedProfilePhotoTutorial] = useState(initialData?.personal_data?.hasCompletedProfilePhotoTutorial || false);
  const [hasCompletedLocationTutorial, setHasCompletedLocationTutorial] = useState(initialData?.personal_data?.hasCompletedLocationTutorial || false);
  const [hasCompletedFoodTasteTutorial, setHasCompletedFoodTasteTutorial] = useState(initialData?.personal_data?.hasCompletedFoodTasteTutorial || false);
  
  const [zoomModalVisible, setZoomModalVisible] = useState(false);
  const [view, setView] = useState<'main' | 'edit' | 'food_taste'>('main');

  useEffect(() => {
    if (onViewChange) {
      onViewChange(view);
    }
  }, [view, onViewChange]);

  useImperativeHandle(ref, () => ({
    handleSwipeBack: () => {
      if (view === 'food_taste') {
        // Block swipe back during the food taste game
        return true;
      }
      if (activeSettingSection !== null) {
        setActiveSettingSection(null);
        return true;
      }
      if (activeSubTab !== 'settings') {
        setActiveSubTab('settings');
        return true;
      }
      return false; // Already at main settings, let parent close the modal
    }
  }));

  const [gameState, setGameState] = useState<'intro' | 'swiping' | 'questions' | 'alcohol' | 'result'>('intro');
  const [gameFoods, setGameFoods] = useState<FoodItem[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [likedFoods, setLikedFoods] = useState<string[]>([]);
  const [dislikedFoods, setDislikedFoods] = useState<string[]>([]);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionAnswers, setQuestionAnswers] = useState<('left' | 'right')[]>([]);

  const [selectedLiquors, setSelectedLiquors] = useState<string[]>(initialData?.personal_data?.alcoholLiquor || []);
  const [noAlcohol, setNoAlcohol] = useState(false);

  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(initialData?.personal_data?.allergyFoods || []);
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>(initialData?.personal_data?.chronicDiseases || []);

  // 저장값은 옛 한글 표기일 수도 있으므로, 선택 상태를 비교하기 전에 id 로
  // 맞춥니다. 이걸 빼면 '갑각류'로 저장된 프로필이 화면에서 선택 해제된
  // 것처럼 보이고, 저장하는 순간 조용히 지워집니다.
  const normalizedAllergies = normalizeAllergies(selectedAllergies);
  const normalizedDiseases = normalizeHealthIssues(selectedDiseases);
  const [selectedDislikes, setSelectedDislikes] = useState<string[]>(initialData?.personal_data?.customDislikedFoods || []);
  const [expandedSection, setExpandedSection] = useState<'allergy' | 'disease' | 'dislike' | null>(null);

  const [foodTasteScores, setFoodTasteScores] = useState<any>(initialData?.personal_data?.foodTasteScores || null);

  const fullBankAccount = `${bankName} ${accountNumber.trim()}`;

  const pan = useRef(new Animated.ValueXY()).current;
  const introOpacity = useRef(new Animated.Value(0)).current;

  // Follow states
  const [follows, setFollows] = useState<Follow[]>([]);
  const [searchFriendQuery, setSearchFriendQuery] = useState('');
  const [followLoading, setFollowLoading] = useState(false);

  // Friend Calendar Overlay state
  const [selectedFriendForCalendar, setSelectedFriendForCalendar] = useState<Profile | null>(null);

  // Refs to avoid stale closures in PanResponder
  const gameStateRef = useRef(gameState);
  const cardIndexRef = useRef(cardIndex);
  const questionIndexRef = useRef(questionIndex);
  const gameFoodsRef = useRef(gameFoods);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    cardIndexRef.current = cardIndex;
  }, [cardIndex]);

  useEffect(() => {
    questionIndexRef.current = questionIndex;
  }, [questionIndex]);

  useEffect(() => {
    gameFoodsRef.current = gameFoods;
  }, [gameFoods]);

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const date = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${date}`;
  };

  // Generate 5 days starting from June 21, 2026 for read-only preview
  const previewDates: string[] = [];
  const baseDate = new Date('2026-06-21');
  for (let i = 0; i < 5; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    previewDates.push(d.toISOString().split('T')[0]);
  }

  // Load follows list
  //
  // App.tsx 의 fetchFollows 와 같은 이유로 profiles 원본이 아니라
  // profiles_public 을 따로 조회해 합친다 — profiles RLS 가 본인 행으로
  // 좁혀져 있어 `profiles!following_id(*)` 조인은 항상 null 을 돌려준다.
  const fetchFollows = async () => {
    if (!initialData?.id) return;
    try {
      const { data: followRows, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', initialData.id);

      if (error) throw error;

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

      setFollows(
        (followRows || []).map(f => ({ ...f, profiles: profilesById[f.following_id] }))
      );
    } catch (err) {
      console.error('Error fetching follows:', err);
    }
  };

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setAvatarColor(initialData.avatar_color);
      setTag(initialData.tag);
      setAvatarUrl(initialData.avatar_url || '');
      setBirthdate(initialData.personal_data?.birthdate || '');
      setGender(initialData.personal_data?.gender || 'none');
      setBio(initialData.personal_data?.bio || '');
      setStartLocationName(initialData.start_location_name || '');
      setStartLatitude(initialData.start_latitude || 37.5665);
      setStartLongitude(initialData.start_longitude || 126.9780);

      // Load privacy settings if available.
      // 나중에 생긴 항목(bio)은 저장된 값에 없을 수 있으므로 기본값 위에 덮는다.
      if (initialData.privacy_settings) {
        setPrivacySettings({ bio: 'public', ...initialData.privacy_settings });
      }
      
      const bankAcct = initialData.personal_data?.bank_account || '';
      if (bankAcct) {
        const parts = bankAcct.split(' ');
        if (parts.length >= 2) {
          setBankName(parts[0]);
          setAccountNumber(parts.slice(1).join(' '));
        } else {
          setAccountNumber(bankAcct);
        }
      }

      // Load swiper, customizer and tutorials
      setProfileEmoji(initialData.personal_data?.profileEmoji || '🦁');
      setProfileBgColor(initialData.personal_data?.profileBgColor || '#BFDBFE');
      setHasCompletedProfilePhotoTutorial(initialData.personal_data?.hasCompletedProfilePhotoTutorial || false);
      setHasCompletedLocationTutorial(initialData.personal_data?.hasCompletedLocationTutorial || false);
      setHasCompletedFoodTasteTutorial(initialData.personal_data?.hasCompletedFoodTasteTutorial || false);
      setSelectedLiquors(initialData.personal_data?.alcoholLiquor || []);
      setSelectedAllergies(initialData.personal_data?.allergyFoods || []);
      setSelectedDiseases(initialData.personal_data?.chronicDiseases || []);
      setSelectedDislikes(initialData.personal_data?.customDislikedFoods || []);
      setFoodTasteScores(initialData.personal_data?.foodTasteScores || null);
      
      fetchFollows();

      if (!initialData.name) {
        setActiveSubTab('settings');
        setActiveSettingSection('profile');
      }
    }
  }, [initialData]);

  // Handle follow addition
  const handleFollowFriend = async () => {
    if (!initialData?.id) {
      Alert.alert('알림', '먼저 내 프로필을 저장해 주세요!');
      return;
    }
    if (!searchFriendQuery.trim() || !searchFriendQuery.includes('#')) {
      Alert.alert('알림', '친구이름#태그 형식으로 입력해 주세요. (예: 영희#007)');
      return;
    }

    const parts = searchFriendQuery.trim().split('#');
    const fName = parts[0];
    const fTag = parts[1];

    if (fName === initialData.name && fTag === initialData.tag) {
      Alert.alert('알림', '자기 자신은 팔로우할 수 없습니다.');
      return;
    }

    try {
      setFollowLoading(true);
      // Query profile
      const { data: profiles, error: pError } = await supabase
        // 남의 프로필은 profiles_public 뷰로 읽습니다.
        .from('profiles_public')
        .select('*')
        .eq('name', fName)
        .eq('tag', fTag);

      if (pError) throw pError;

      if (!profiles || profiles.length === 0) {
        Alert.alert('찾을 수 없음', '해당 닉네임과 태그를 가진 친구를 찾을 수 없습니다.');
        return;
      }

      const friend = profiles[0] as Profile;

      // Check if already followed
      if (follows.some(f => f.following_id === friend.id)) {
        Alert.alert('알림', '이미 팔로우한 친구입니다.');
        return;
      }

      // Insert follow (me -> friend)
      const { error: fError } = await supabase
        .from('follows')
        .insert([{
          follower_id: initialData.id,
          following_id: friend.id,
          role: 'mate' // default role is mate
        }]);

      if (fError) throw fError;

      setSearchFriendQuery('');
      Alert.alert('완료', `${friend.name}님과 맞팔로우 관계가 되었습니다!`);
      fetchFollows();
    } catch (err: any) {
      console.error(err);
      Alert.alert('오류', '팔로우 처리 중 오류가 발생했습니다.');
    } finally {
      setFollowLoading(false);
    }
  };

  // Toggle leader/mate role
  const handleToggleRole = async (followId: string, currentRole: 'leader' | 'mate') => {
    const nextRole = currentRole === 'mate' ? 'leader' : 'mate';
    try {
      const { error } = await supabase
        .from('follows')
        .update({ role: nextRole })
        .eq('id', followId);

      if (error) throw error;
      fetchFollows();
    } catch (err) {
      console.error('Error updating follow role:', err);
    }
  };

  // Handle unfollow
  const handleUnfollow = async (followId: string, friendName: string) => {
    Alert.alert('팔로우 취소', `${friendName}님의 팔로우를 취소하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '확인',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('follows')
              .delete()
              .eq('id', followId);

            if (error) throw error;
            fetchFollows();
          } catch (err) {
            console.error('Error deleting follow:', err);
          }
        }
      }
    ]);
  };

  // Tinder food swipe game functions
  const startTasteFinder = () => {
    const shuffled = [...POPULAR_FOODS].sort(() => 0.5 - Math.random());
    setGameFoods(shuffled.slice(0, 10));
    setCardIndex(0);
    setLikedFoods([]);
    setDislikedFoods([]);
    setQuestionIndex(0);
    setQuestionAnswers([]);
    setSelectedLiquors(initialData?.personal_data?.alcoholLiquor || []);
    setNoAlcohol(false);
    setSelectedAllergies(initialData?.personal_data?.allergyFoods || []);
    setSelectedDiseases(initialData?.personal_data?.chronicDiseases || []);
    setSelectedDislikes(initialData?.personal_data?.customDislikedFoods || []);
    setExpandedSection(null);
    
    setGameState('intro');
    setView('food_taste');

    Animated.sequence([
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.delay(1500),
      Animated.timing(introOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setGameState('swiping');
    });
  };

  const makeDecision = (liked: boolean) => {
    const currentFood = gameFoodsRef.current[cardIndexRef.current];
    if (!currentFood) return;
    if (liked) {
      setLikedFoods(prev => [...prev, currentFood.id]);
      Vibration.vibrate(40);
    } else {
      setDislikedFoods(prev => [...prev, currentFood.id]);
      Vibration.vibrate(20);
    }

    if (cardIndexRef.current < 9) {
      setCardIndex(prev => prev + 1);
    } else {
      setGameState('questions');
    }
    pan.setValue({ x: 0, y: 0 });
  };

  const handleButtonDecision = (liked: boolean) => {
    if (gameState !== 'swiping') return;
    Animated.timing(pan, {
      toValue: { x: liked ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100, y: 0 },
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      makeDecision(liked);
    });
  };

  const makeQuestionDecision = (choice: 'left' | 'right') => {
    setQuestionAnswers(prev => [...prev, choice]);
    Vibration.vibrate(30);

    if (questionIndexRef.current < 2) {
      setQuestionIndex(prev => prev + 1);
    } else {
      setGameState('alcohol');
    }
    pan.setValue({ x: 0, y: 0 });
  };

  const saveTastePreferenceData = async () => {
    const scores = {
      meatScore: 0,
      seafoodScore: 0,
      spicyScore: 0,
      greasyScore: 0,
      cleanScore: 0,
    };

    likedFoods.forEach(foodId => {
      const item = POPULAR_FOODS.find(f => f.id === foodId);
      if (item) {
        if (item.labels.meat) scores.meatScore += 1;
        if (item.labels.seafood) scores.seafoodScore += 1;
        if (item.labels.spicy) scores.spicyScore += 1;
        if (item.labels.greasy) scores.greasyScore += 1;
        if (item.labels.clean) scores.cleanScore += 1;
      }
    });

    dislikedFoods.forEach(foodId => {
      const item = POPULAR_FOODS.find(f => f.id === foodId);
      if (item) {
        if (item.labels.meat) scores.meatScore -= 0.5;
        if (item.labels.seafood) scores.seafoodScore -= 0.5;
        if (item.labels.spicy) scores.spicyScore -= 0.5;
        if (item.labels.greasy) scores.greasyScore -= 0.5;
        if (item.labels.clean) scores.cleanScore -= 0.5;
      }
    });

    if (questionAnswers[0] === 'right') {
      scores.meatScore += 3;
      scores.seafoodScore -= 1;
    } else {
      scores.seafoodScore += 3;
      scores.meatScore -= 1;
    }

    if (questionAnswers[1] === 'right') {
      scores.cleanScore += 3;
      scores.greasyScore -= 1;
    } else {
      scores.greasyScore += 3;
      scores.cleanScore -= 1;
    }

    if (questionAnswers[2] === 'right') {
      scores.spicyScore += 3;
    } else {
      scores.spicyScore = -10; // 맵찔이
    }

    const fullBankAccount = `${bankName} ${accountNumber.trim()}`;
    let userTag = tag;
    if (!userTag) {
      userTag = Math.floor(100 + Math.random() * 900).toString();
      setTag(userTag);
    }

    try {
      const isPhotoCompleted = !!avatarUrl || (profileEmoji !== '🦁' || profileBgColor !== '#BFDBFE');
      const isLocationCompleted = !!startLocationName.trim();
      const newPhotoTutorial = hasCompletedProfilePhotoTutorial || isPhotoCompleted;
      const newLocationTutorial = hasCompletedLocationTutorial || isLocationCompleted;

      setHasCompletedProfilePhotoTutorial(newPhotoTutorial);
      setHasCompletedLocationTutorial(newLocationTutorial);
      setHasCompletedFoodTasteTutorial(true);
      setFoodTasteScores(scores);

      await onSave(name.trim(), avatarColor, {
        birthdate,
        gender,
        bank_account: fullBankAccount,
        bio,
        travelTime,

        profileEmoji,
        profileBgColor,
        hasCompletedProfilePhotoTutorial: newPhotoTutorial,
        hasCompletedLocationTutorial: newLocationTutorial,
        hasCompletedFoodTasteTutorial: true,
        foodTasteScores: scores,

        // 게임 ①③④단계에서 수집한 값. 이전에는 payload에 없어서
        // 화면에서 고르기만 하고 저장되지 않았습니다.
        // 그 결과 AI 장소 추천이 항상 '카페'로, 메뉴 룰렛의 '안심 지킴이'가
        // 무력화되어 있었습니다. (docs/UI/10 참조)
        // preferredFoods는 표시 전용이라 id(f1, f3…) 대신 음식 이름으로 저장합니다.
        // (알레르기·지병·기피는 매칭에 쓰이므로 id 그대로 유지)
        preferredFoods: likedFoods
          .map(id => POPULAR_FOODS.find(f => f.id === id)?.name)
          .filter((n): n is string => !!n),
        alcoholLiquor: noAlcohol ? [] : selectedLiquors,
        allergyFoods: selectedAllergies,
        chronicDiseases: selectedDiseases,
        customDislikedFoods: selectedDislikes
      }, userTag, avatarUrl, ...startLocationArgs());

      Vibration.vibrate([0, 100, 50, 100]);
      setView('main');
      setActiveSubTab('profile');
      Alert.alert('분석 완료', '음식 취향 및 백그라운드 점수가 등록 완료되었습니다!');
    } catch (err) {
      console.error('Error saving taste profile:', err);
      Alert.alert('오류', '취향 정보 저장 실패');
    }
  };

  const getFoodTasteSummary = () => {
    const scores = foodTasteScores || initialData?.personal_data?.foodTasteScores;
    if (!hasCompletedFoodTasteTutorial || !scores) {
      return '아직 설정 안됨';
    }
    const summaries: string[] = [];

    if (scores.meatScore > scores.seafoodScore) {
      summaries.push('육식파 🥩');
    } else if (scores.seafoodScore > scores.meatScore) {
      summaries.push('해산물파 🍣');
    }

    if (scores.cleanScore > scores.greasyScore) {
      summaries.push('깔끔·담백 🥗');
    } else if (scores.greasyScore > scores.cleanScore) {
      summaries.push('기름진 요리 🍔');
    }

    if (scores.spicyScore >= 2) {
      summaries.push('매운맛 선호 🌶️');
    } else if (scores.spicyScore < 0) {
      summaries.push('맵찔이 🧊');
    }

    const firstCustomDislike = selectedDislikes[0] || initialData?.personal_data?.customDislikedFoods?.[0];
    if (firstCustomDislike) {
      summaries.push(`기피(${firstCustomDislike})`);
    }

    return summaries.join(', ') || '균형 잡힌 입맛';
  };

  const SCREEN_WIDTH = Dimensions.get('window').width;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dx > 120) {
          Animated.timing(pan, {
            toValue: { x: SCREEN_WIDTH + 100, y: gestureState.dy },
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            if (gameStateRef.current === 'swiping') {
              makeDecision(true);
            } else if (gameStateRef.current === 'questions') {
              makeQuestionDecision('right');
            }
          });
        } else if (gestureState.dx < -120) {
          Animated.timing(pan, {
            toValue: { x: -SCREEN_WIDTH - 100, y: gestureState.dy },
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            if (gameStateRef.current === 'swiping') {
              makeDecision(false);
            } else if (gameStateRef.current === 'questions') {
              makeQuestionDecision('left');
            }
          });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 4,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const isValidBirthdate = (dateStr: string): boolean => {
    if (!/^\d{8}$/.test(dateStr)) return false;
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10);
    const day = parseInt(dateStr.substring(6, 8), 10);
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear) return false;
    if (month < 1 || month > 12) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;
    return true;
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('오류', '닉네임을 입력해 주세요.');
      return;
    }
    if (name.trim().length > 6) {
      Alert.alert('오류', '닉네임은 최대 6자까지 입력 가능합니다.');
      return;
    }
    if (!accountNumber.trim()) {
      Alert.alert('오류', '계좌번호를 입력해 주세요.');
      return;
    }
    if (birthdate && !isValidBirthdate(birthdate)) {
      Alert.alert('오류', '생년월일은 8자리 숫자(YYYYMMDD) 형식이어야 하며 올바른 날짜여야 합니다.');
      return;
    }

    const fullBankAccount = `${bankName} ${accountNumber.trim()}`;

    // If tag is not set, generate a random 3-digit tag
    let userTag = tag;
    if (!userTag) {
      userTag = Math.floor(100 + Math.random() * 900).toString(); // '100'~'999'
      setTag(userTag);
    }

    try {
      const isPhotoCompleted = !!avatarUrl || (profileEmoji !== '🦁' || profileBgColor !== '#BFDBFE');
      const isLocationCompleted = !!startLocationName.trim();

      const newPhotoTutorial = hasCompletedProfilePhotoTutorial || isPhotoCompleted;
      const newLocationTutorial = hasCompletedLocationTutorial || isLocationCompleted;

      setHasCompletedProfilePhotoTutorial(newPhotoCompleted => newPhotoCompleted || newPhotoTutorial);
      setHasCompletedLocationTutorial(newLocationCompleted => newLocationCompleted || newLocationTutorial);

      await onSave(name.trim(), avatarColor, {
        birthdate,
        gender,
        bank_account: fullBankAccount,
        bio,
        travelTime,

        // Swiper, customizer and tutorials
        profileEmoji,
        profileBgColor,
        hasCompletedProfilePhotoTutorial: newPhotoTutorial,
        hasCompletedLocationTutorial: newLocationTutorial,
        hasCompletedFoodTasteTutorial,
        foodTasteScores,

        // 일반 프로필 저장 시에도 함께 보존해야 합니다.
        // 빠뜨리면 프로필만 수정해도 게임에서 저장한 취향이 지워집니다.
        // preferredFoods는 표시 전용이라 id(f1, f3…) 대신 음식 이름으로 저장합니다.
        // (알레르기·지병·기피는 매칭에 쓰이므로 id 그대로 유지)
        preferredFoods: likedFoods
          .map(id => POPULAR_FOODS.find(f => f.id === id)?.name)
          .filter((n): n is string => !!n),
        alcoholLiquor: noAlcohol ? [] : selectedLiquors,
        allergyFoods: selectedAllergies,
        chronicDiseases: selectedDiseases,
        customDislikedFoods: selectedDislikes
      }, userTag, avatarUrl, ...startLocationArgs());

      // Save privacy settings
      // 주의: getSession()의 반환은 { data: { session } } 구조입니다.
      // 이전에는 { data: session }으로 잘못 구조 분해해 session.user가 항상
      // undefined였고, 그 결과 공개 범위 설정이 저장되지 않았습니다.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { error } = await supabase
          .from('profiles')
          .update({ privacy_settings: privacySettings })
          .eq('id', session.user.id);

        if (error) console.error('Error saving privacy settings:', error);
      }

      setActiveSubTab('profile');
      setActiveSettingSection(null);
    } catch (err) {
      console.error(err);
    }
  };

  const getDayName = (dateStr: string) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const d = new Date(dateStr);
    return days[d.getDay()];
  };

  const formattedBirthdate = birthdate && birthdate.length === 8
    ? `${birthdate.substring(0, 4)}년 ${birthdate.substring(4, 6)}월 ${birthdate.substring(6)}일`
    : birthdate || '미입력';

  // Tinder food swipe card rotation and transform style
  const rotate = pan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ['-30deg', '0deg', '30deg'],
    extrapolate: 'clamp',
  });
  const swipeCardStyle = {
    transform: [...pan.getTranslateTransform(), { rotate }],
  };

  // Tutorial progress calculation (3 steps max)
  let tutorialScore = 0;
  if (hasCompletedProfilePhotoTutorial) tutorialScore++;
  if (hasCompletedLocationTutorial) tutorialScore++;
  if (hasCompletedFoodTasteTutorial) tutorialScore++;
  const tutorialProgress = (tutorialScore / 3) * 100;

  // ── Figma `프로필/프로필 홈`(159:544) 이 쓰는 파생값 ──
  // "계정 완성하기" 3단계는 실제 입력 여부로 판단한다. 튜토리얼 플래그
  // (hasCompleted*Tutorial)는 안내를 봤는지일 뿐 값이 채워졌다는 뜻이 아니다.
  const ACCOUNT_STEP_TOTAL = 3;
  const hasProfileEmoji = Boolean(avatarUrl) || profileEmoji !== '🦁';
  const hasStartLocation = Boolean(startLocationName);
  const hasFoodTaste = Boolean(
    foodTasteScores || (initialData?.personal_data?.preferredFoods || []).length > 0
  );
  const completedStepCount =
    (hasProfileEmoji ? 1 : 0) + (hasStartLocation ? 1 : 0) + (hasFoodTaste ? 1 : 0);
  const progressWidth: `${number}%` = `${(completedStepCount / ACCOUNT_STEP_TOTAL) * 100}%`;

  // 공개 범위 행에 지금 값이 무엇인지 함께 보여준다 (Figma 256:2505 등)
  const privacyPreview: Record<'birthdate' | 'gender' | 'bio', string> = {
    birthdate: formatBirthdate(birthdate),
    gender: gender === 'male' ? '남성' : gender === 'female' ? '여성' : '아직 설정 안됨',
    bio: bio || '아직 설정 안됨',
  };

  if (view === 'food_taste') {
    return (
      <View style={styles.gameContainer}>
        {gameState === 'intro' && (
          <Animated.View style={[styles.introOverlay, { opacity: introOpacity }]}>
            <View style={styles.introContent}>
              <Sparkles size={60} color={THEME.primary} style={styles.introIcon} />
              <Text style={styles.introTitle}>푸드 취향 분석</Text>
              <Text style={styles.introSubtitle}>
                내가 좋아하는 음식 취향을 찾아보세요.{"\n"}오른쪽(호) 또는 왼쪽(불호)으로 스와이프!
              </Text>
            </View>
          </Animated.View>
        )}

        {gameState === 'swiping' && gameFoods.length > 0 && (
          <View style={styles.swipeContainer}>
            <Text style={styles.gameHeaderTitle}>음식 선호도 매칭 ({cardIndex + 1} / 10)</Text>
            
            <View style={styles.cardStackContainer}>
              {cardIndex < 9 && (
                <View style={[styles.foodCard, styles.nextFoodCard]}>
                  <Text style={styles.foodCardEmoji}>{gameFoods[cardIndex + 1].emoji}</Text>
                  <Text style={styles.foodCardName}>{gameFoods[cardIndex + 1].name}</Text>
                  <View style={styles.foodTagsRow}>
                    {Object.keys(gameFoods[cardIndex + 1].labels).map(lbl => {
                      if (lbl === 'meat' && gameFoods[cardIndex + 1].labels.meat) return <Text key={lbl} style={styles.foodTag}>#육류</Text>;
                      if (lbl === 'seafood' && gameFoods[cardIndex + 1].labels.seafood) return <Text key={lbl} style={styles.foodTag}>#해산물</Text>;
                      if (lbl === 'spicy' && gameFoods[cardIndex + 1].labels.spicy) return <Text key={lbl} style={styles.foodTag}>#매콤</Text>;
                      if (lbl === 'greasy' && gameFoods[cardIndex + 1].labels.greasy) return <Text key={lbl} style={styles.foodTag}>#느끼</Text>;
                      if (lbl === 'clean' && gameFoods[cardIndex + 1].labels.clean) return <Text key={lbl} style={styles.foodTag}>#깔끔</Text>;
                      return null;
                    })}
                  </View>
                </View>
              )}

              <Animated.View style={[styles.foodCard, swipeCardStyle]} {...panResponder.panHandlers}>
                <Text style={styles.foodCardEmoji}>{gameFoods[cardIndex].emoji}</Text>
                <Text style={styles.foodCardName}>{gameFoods[cardIndex].name}</Text>
                
                <View style={styles.foodTagsRow}>
                  {Object.keys(gameFoods[cardIndex].labels).map(lbl => {
                    if (lbl === 'meat' && gameFoods[cardIndex].labels.meat) return <Text key={lbl} style={styles.foodTag}>#육류</Text>;
                    if (lbl === 'seafood' && gameFoods[cardIndex].labels.seafood) return <Text key={lbl} style={styles.foodTag}>#해산물</Text>;
                    if (lbl === 'spicy' && gameFoods[cardIndex].labels.spicy) return <Text key={lbl} style={styles.foodTag}>#매콤</Text>;
                    if (lbl === 'greasy' && gameFoods[cardIndex].labels.greasy) return <Text key={lbl} style={styles.foodTag}>#느끼</Text>;
                    if (lbl === 'clean' && gameFoods[cardIndex].labels.clean) return <Text key={lbl} style={styles.foodTag}>#깔끔</Text>;
                    return null;
                  })}
                </View>
              </Animated.View>
            </View>

            <View style={styles.gameIndicatorRow}>
              <TouchableOpacity 
                style={[styles.gameIndicatorBox, styles.dislikeIndicatorBox]} 
                onPress={() => handleButtonDecision(false)}
                activeOpacity={0.7}
              >
                <X size={26} color={THEME.danger} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.gameIndicatorBox, styles.likeIndicatorBox]} 
                onPress={() => handleButtonDecision(true)}
                activeOpacity={0.7}
              >
                <Heart size={24} color={THEME.success} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {gameState === 'questions' && (
          <View style={styles.swipeContainer}>
            <Text style={styles.gameHeaderTitle}>입맛 카테고리 문답 ({questionIndex + 1} / 3)</Text>
            
            <View style={styles.cardStackContainer}>
              <Animated.View style={[styles.foodCard, swipeCardStyle]} {...panResponder.panHandlers}>
                <Text style={styles.questionIconEmoji}>
                  {questionIndex === 0 ? '🦞🥩' : (questionIndex === 1 ? '🍕🥗' : '🌶️🧊')}
                </Text>
                
                {questionIndex === 0 && (
                  <View style={styles.questionCardBody}>
                    <Text style={styles.questionTitle}>해산물 vs 육류</Text>
                    <Text style={styles.questionInstruction}>왼쪽으로 밀면 해산물 선호,{"\n"}오른쪽으로 밀면 육류 선호!</Text>
                    <View style={styles.choiceLabels}>
                      <Text style={styles.choiceLeft}>🦞 해산물</Text>
                      <Text style={styles.choiceRight}>육류 🥩</Text>
                    </View>
                  </View>
                )}

                {questionIndex === 1 && (
                  <View style={styles.questionCardBody}>
                    <Text style={styles.questionTitle}>느끼한 맛 vs 깔끔한 맛</Text>
                    <Text style={styles.questionInstruction}>왼쪽으로 밀면 느끼하고 기름진 맛 선호,{"\n"}오른쪽으로 밀면 깔끔하고 가벼운 맛 선호!</Text>
                    <View style={styles.choiceLabels}>
                      <Text style={styles.choiceLeft}>🍕 기름짐</Text>
                      <Text style={styles.choiceRight}>깔끔함 🥗</Text>
                    </View>
                  </View>
                )}

                {questionIndex === 2 && (
                  <View style={styles.questionCardBody}>
                    <Text style={styles.questionTitle}>매운 음식 취향</Text>
                    <Text style={styles.questionInstruction}>왼쪽으로 밀면 매운 음식을 아예 못 먹음,{"\n"}오른쪽으로 밀면 매운 음식을 잘 먹고 선호함!</Text>
                    <View style={styles.choiceLabels}>
                      <Text style={styles.choiceLeft}>🧊 맵찔이</Text>
                      <Text style={styles.choiceRight}>매운맛 🌶️</Text>
                    </View>
                  </View>
                )}
              </Animated.View>
            </View>
          </View>
        )}

        {gameState === 'alcohol' && (
          <View style={styles.alcoholContainer}>
            <View>
              <Text style={styles.alcoholHeaderTitle}>🍺 선호하는 주종 설정</Text>
              <Text style={styles.alcoholSubtitle}>만나는 자리에서 선호하는 주종을 선택해 주세요. (중복 선택 가능)</Text>
            </View>
            
            <View style={styles.liquorCard}>
              {[
                { label: '소주', value: 'SOJU' },
                { label: '맥주', value: 'BEER' },
                { label: '칵테일/하이볼', value: 'COCKTAIL' },
                { label: '위스키/양주', value: 'WHISKEY' },
                { label: '와인', value: 'WINE' },
                { label: '고량주/전통주', value: 'HIGH_ALCOHOL' },
                { label: '막걸리', value: 'MAKGEOLLI' },
              ].map((liq) => {
                const isChecked = selectedLiquors.includes(liq.value);
                return (
                  <TouchableOpacity 
                    key={liq.value} 
                    style={[styles.liquorItem, isChecked && styles.liquorItemChecked, noAlcohol && styles.liquorItemDisabled]}
                    onPress={() => {
                      if (noAlcohol) return;
                      setSelectedLiquors(prev => 
                        prev.includes(liq.value) 
                          ? prev.filter(v => v !== liq.value) 
                          : [...prev, liq.value]
                      );
                    }}
                    disabled={noAlcohol}
                  >
                    <Text style={[styles.liquorLabel, isChecked && styles.liquorLabelChecked]}>{liq.label}</Text>
                    {isChecked && <Check size={20} color={THEME.primary} />}
                  </TouchableOpacity>
                );
              })}

              <View style={styles.divider} />
              
              <TouchableOpacity 
                style={[styles.noAlcoholToggle, noAlcohol && styles.noAlcoholToggleActive]}
                onPress={() => {
                  setNoAlcohol(!noAlcohol);
                  if (!noAlcohol) {
                    setSelectedLiquors([]);
                  }
                }}
              >
                <Text style={[styles.noAlcoholText, noAlcohol && styles.noAlcoholTextActive]}>
                  ❌ 술을 안 마십니다 / 못 마십니다.
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.alcoholFooter}>
              <Button
                variant="completeAndNext"
                label="다음 단계로"
                onPress={() => setGameState('result')}
                disabled={!noAlcohol && selectedLiquors.length === 0}
              />
            </View>
          </View>
        )}

        {gameState === 'result' && (
          <ScrollView contentContainerStyle={styles.resultContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.resultCheckHeader}>
              <View style={styles.checkmarkBadge}>
                <Check size={40} color="#FFFFFF" />
              </View>
              <Text style={styles.resultTitle}>당신의 취향이 분석되었습니다!</Text>
              <Text style={styles.resultSubtitle}>
                추천 음식 필터링에 반영하기 위해 알레르기, 지병 또는 못 먹는 기피 음식을 추가 입력해 주세요.
              </Text>
            </View>

            <View style={styles.accordionCard}>
              <TouchableOpacity 
                style={styles.accordionHeader} 
                onPress={() => setExpandedSection(prev => prev === 'allergy' ? null : 'allergy')}
              >
                <Text style={styles.accordionTitle}>🛡️ 식품 알레르기 여부 ({selectedAllergies.length})</Text>
                <ChevronDown size={18} color={THEME.textMuted} />
              </TouchableOpacity>
              {expandedSection === 'allergy' && (
                <View style={styles.accordionContent}>
                  <View style={styles.tagSelector}>
                    {/* 목록을 여기 하드코딩하지 않습니다. 예전에는 이 화면만
                        한글 라벨('갑각류')을 저장하고 취향 게임은 id('shellfish')를
                        저장해서, 같은 컬럼에 두 어휘가 섞였고 필터가 걸리지
                        않았습니다. 이제 표준 목록을 그대로 렌더합니다. */}
                    {ALLERGY_PRESETS.map(({ id, label }) => {
                      const isSelected = normalizedAllergies.includes(id);
                      return (
                        <TouchableOpacity
                          key={id}
                          style={[styles.tagSelectorItem, isSelected && styles.tagSelectorItemActive]}
                          onPress={() => setSelectedAllergies(
                            isSelected
                              ? normalizedAllergies.filter(o => o !== id)
                              : [...normalizedAllergies, id]
                          )}
                        >
                          <Text style={[styles.tagSelectorText, isSelected && styles.tagSelectorTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.accordionCard}>
              <TouchableOpacity 
                style={styles.accordionHeader} 
                onPress={() => setExpandedSection(prev => prev === 'disease' ? null : 'disease')}
              >
                <Text style={styles.accordionTitle}>🩺 건강상 지병 여부 ({selectedDiseases.length})</Text>
                <ChevronDown size={18} color={THEME.textMuted} />
              </TouchableOpacity>
              {expandedSection === 'disease' && (
                <View style={styles.accordionContent}>
                  <View style={styles.tagSelector}>
                    {HEALTH_PRESETS.map(({ id, label }) => {
                      const isSelected = normalizedDiseases.includes(id);
                      return (
                        <TouchableOpacity
                          key={id}
                          style={[styles.tagSelectorItem, isSelected && styles.tagSelectorItemActive]}
                          onPress={() => setSelectedDiseases(
                            isSelected
                              ? normalizedDiseases.filter(o => o !== id)
                              : [...normalizedDiseases, id]
                          )}
                        >
                          <Text style={[styles.tagSelectorText, isSelected && styles.tagSelectorTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.accordionCard}>
              <TouchableOpacity 
                style={styles.accordionHeader} 
                onPress={() => setExpandedSection(prev => prev === 'dislike' ? null : 'dislike')}
              >
                <Text style={styles.accordionTitle}>🤢 못 먹는 음식 기피 ({selectedDislikes.length})</Text>
                <ChevronDown size={18} color={THEME.textMuted} />
              </TouchableOpacity>
              {expandedSection === 'dislike' && (
                <View style={styles.accordionContent}>
                  <View style={styles.tagSelector}>
                    {['오이', '가지', '고수', '민트초코', '파인애플 피자', '당근', '굴', '마늘', '양파'].map(opt => {
                      const isSelected = selectedDislikes.includes(opt);
                      return (
                        <TouchableOpacity 
                          key={opt}
                          style={[styles.tagSelectorItem, isSelected && styles.tagSelectorItemActive]}
                          onPress={() => setSelectedDislikes(prev => 
                            prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
                          )}
                        >
                          <Text style={[styles.tagSelectorText, isSelected && styles.tagSelectorTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.resultFooter}>
              <TouchableOpacity style={styles.retakeBtn} onPress={startTasteFinder} activeOpacity={0.8}>
                <Text style={styles.retakeBtnText}>다시하기</Text>
              </TouchableOpacity>
              <View style={{ flex: 2 }}>
                <Button variant="complete" label="모두 저장하기" onPress={saveTastePreferenceData} />
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {!initialData?.name && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningBannerText}>
            ⚠️ 일정 조율 및 정산 대장을 이용하시려면 먼저 프로필 설정을 완료해 주세요!
          </Text>
        </View>
      )}
      {/* Figma `프로필/프로필 홈` 에는 화면 제목이 없다 — AppHeader 아래 바로 본문이다.
          "설정 닫기" 버튼도 뺐다. 프로필이 모달이 아니라 탭이 되면서 onClose 가
          더 이상 넘어오지 않아 죽은 버튼이었다. */}

      {activeSubTab === 'profile' && (
        <View>
          <TouchableOpacity
            style={[styles.settingsBackButton, { marginBottom: 16 }]}
            onPress={() => setActiveSubTab('settings')}
          >
            <Text style={styles.settingsBackButtonText}>◀ 뒤로 가기</Text>
          </TouchableOpacity>

          {/* Profile Card Container - Improved */}
          <View style={styles.profileCardContainer}>
            {/* Avatar - 80x80 */}
            <TouchableOpacity
              style={styles.profileAvatarTouchable}
              onPress={() => setZoomModalVisible(true)}
              activeOpacity={0.9}
            >
              {/* 사진 > 이모지 > 이니셜 순서로 보여줍니다.
                  예전에는 이모지 단계가 없어서, '나만의 이모지 프로필 커스텀'
                  에서 고른 이모지와 배경색이 **정작 자기 프로필 화면에는
                  안 나오고** 이니셜만 떴습니다. 시간표의 메이트 카드는
                  이모지를 쓰고 있어서 같은 사람이 화면마다 달라 보였습니다. */}
              <View
                style={[
                  styles.profileAvatar,
                  { backgroundColor: (avatarUrl ? avatarColor : profileBgColor) || avatarColor || THEME.primary },
                ]}
              >
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                ) : profileEmoji ? (
                  <Text style={{ fontSize: 40 }}>{profileEmoji}</Text>
                ) : (
                  <Text style={styles.profileAvatarText}>{name?.[0]?.toUpperCase() || 'U'}</Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Name */}
            <Text style={styles.profileName}>{name}</Text>

            {/* Tag */}
            <Text style={styles.profileTag}>@{tag}</Text>

            {/* Edit Button */}
            <TouchableOpacity
              style={styles.profileEditButton}
              onPress={() => {
                setActiveSubTab('settings');
                setActiveSettingSection('profile');
              }}
            >
              <Text style={styles.profileEditButtonText}>프로필 편집</Text>
            </TouchableOpacity>
          </View>

          {/* Food Preferences Section */}
          {(selectedAllergies?.length > 0 || selectedDiseases?.length > 0 || selectedDislikes?.length > 0) && (
            <View style={styles.foodPrefSection}>
              <Text style={styles.foodPrefTitle}>음식 취향</Text>
              <View style={styles.foodPrefChips}>
                {/* 저장값을 그대로 찍으면 id 로 저장된 프로필은 사용자에게
                    'shellfish' 같은 영문이 그대로 노출됩니다. */}
                {selectedAllergies && selectedAllergies.map((allergy, i) => (
                  <View key={`allergy-${i}`} style={styles.foodChip}>
                    <Text style={styles.foodChipText}>⚠️ {allergyLabel(allergy)}</Text>
                  </View>
                ))}
                {selectedDiseases && selectedDiseases.map((disease, i) => (
                  <View key={`disease-${i}`} style={styles.foodChip}>
                    <Text style={styles.foodChipText}>🩺 {healthLabel(disease)}</Text>
                  </View>
                ))}
                {selectedDislikes && selectedDislikes.map((dislike, i) => (
                  <View key={`dislike-${i}`} style={styles.foodChip}>
                    <Text style={styles.foodChipText}>{dislike}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Friends List Section */}
          {follows && follows.length > 0 && (
            <View style={styles.friendListSection}>
              <View style={styles.friendListHeader}>
                <Text style={styles.friendListTitle}>친구 목록 ({follows.length})</Text>
                <TouchableOpacity
                  onPress={() => setActiveSubTab('follows')}
                  style={styles.friendListAddBtn}
                >
                  <Plus size={20} color={THEME.primary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 300 }}>
                {follows.map((follow) => {
                  const friend = follow.profiles;
                  if (!friend) return null;

                  return (
                    <View key={follow.id} style={styles.friendListItem}>
                      <View style={[styles.friendAvatar, { backgroundColor: friend.avatar_color || THEME.primary }]}>
                        {friend.avatar_url ? (
                          <Image source={{ uri: friend.avatar_url }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                        ) : (
                          <Text style={styles.friendAvatarText}>{friend.name?.[0]?.toUpperCase()}</Text>
                        )}
                      </View>
                      <View style={styles.friendInfo}>
                        <Text style={styles.friendName}>{friend.name}</Text>
                        <Text style={styles.friendTag}>@{friend.tag}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.unfollowBtn}
                        onPress={() => handleUnfollow(follow.id, friend.name)}
                      >
                        <Text style={styles.unfollowBtnText}>언팔로우</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Account completion tutorial checklist */}
          <View style={styles.tutorialCard}>
            <View style={styles.tutorialHeader}>
              <Text style={styles.tutorialTitle}>🎉 계정 완성하기</Text>
              <Text style={styles.tutorialCount}>{tutorialScore} / 3 단계 완료</Text>
            </View>
            
            {/* progress bar */}
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${tutorialProgress}%` }]} />
            </View>

            {/* Step 1 */}
            <View style={styles.tutorialItem}>
              <View style={styles.tutorialItemLeft}>
                <View style={[styles.checkCircle, hasCompletedProfilePhotoTutorial && styles.checkCircleActive]}>
                  {hasCompletedProfilePhotoTutorial && <Check size={12} color="#FFFFFF" />}
                </View>
                <View style={styles.tutorialTextContainer}>
                  <Text style={styles.tutorialItemName}>프로필 사진/이모지 수정</Text>
                  <Text style={styles.tutorialItemDesc}>나만의 고유 이모지와 배경색을 수정해 보세요.</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.tutorialBtn, hasCompletedProfilePhotoTutorial && styles.tutorialBtnDone]}
                onPress={() => {
                  setActiveSubTab('settings');
                  setActiveSettingSection('profile');
                }}
                disabled={hasCompletedProfilePhotoTutorial}
              >
                <Text style={[styles.tutorialBtnText, hasCompletedProfilePhotoTutorial && styles.tutorialBtnTextDone]}>
                  {hasCompletedProfilePhotoTutorial ? '완료됨' : '설정하기'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Step 2 */}
            <View style={styles.tutorialItem}>
              <View style={styles.tutorialItemLeft}>
                <View style={[styles.checkCircle, hasCompletedLocationTutorial && styles.checkCircleActive]}>
                  {hasCompletedLocationTutorial && <Check size={12} color="#FFFFFF" />}
                </View>
                <View style={styles.tutorialTextContainer}>
                  <Text style={styles.tutorialItemName}>사는 곳 설정</Text>
                  <Text style={styles.tutorialItemDesc}>모임 중간 장소 계산을 위해 출발지를 설정해 주세요.</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.tutorialBtn, hasCompletedLocationTutorial && styles.tutorialBtnDone]}
                onPress={() => {
                  setActiveSubTab('settings');
                  setActiveSettingSection('profile');
                }}
                disabled={hasCompletedLocationTutorial}
              >
                <Text style={[styles.tutorialBtnText, hasCompletedLocationTutorial && styles.tutorialBtnTextDone]}>
                  {hasCompletedLocationTutorial ? '완료됨' : '설정하기'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Step 3 */}
            <View style={styles.tutorialItem}>
              <View style={styles.tutorialItemLeft}>
                <View style={[styles.checkCircle, hasCompletedFoodTasteTutorial && styles.checkCircleActive]}>
                  {hasCompletedFoodTasteTutorial && <Check size={12} color="#FFFFFF" />}
                </View>
                <View style={styles.tutorialTextContainer}>
                  <Text style={styles.tutorialItemName}>음식 취향 매칭</Text>
                  <Text style={styles.tutorialItemDesc}>매칭 게임으로 입맛 취향 카테고리를 설정하세요.</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.tutorialBtn, hasCompletedFoodTasteTutorial && styles.tutorialBtnDone]}
                onPress={startTasteFinder}
              >
                <Text style={[styles.tutorialBtnText, hasCompletedFoodTasteTutorial && styles.tutorialBtnTextDone]}>
                  {hasCompletedFoodTasteTutorial ? '다시하기' : '게임 시작'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {activeSubTab === 'follows' && (
        <View style={styles.followSection}>
          <TouchableOpacity
            style={[styles.settingsBackButton, { marginBottom: 16 }]}
            onPress={() => setActiveSubTab('settings')}
          >
            <Text style={styles.settingsBackButtonText}>◀ 뒤로 가기</Text>
          </TouchableOpacity>

          <Text style={styles.followSectionTitle}>
            <Users size={16} color={THEME.primary} /> 친구 팔로우 관리
          </Text>
          
          {/* Search Friend */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={searchFriendQuery}
              onChangeText={(text) => {
                setSearchFriendQuery(text);
                if (onSearchFriend && text.trim()) {
                  onSearchFriend(text);
                }
              }}
              placeholder="친구 이름 또는 태그로 검색"
              placeholderTextColor="#64748b"
            />
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={() => {
                if (searchFriendQuery.includes('#')) {
                  handleFollowFriend();
                } else if (onSearchFriend && searchFriendQuery.trim()) {
                  onSearchFriend(searchFriendQuery);
                }
              }}
            >
              <Search size={16} color="white" />
            </TouchableOpacity>
          </View>

          {/* Search Results - New Friends to Follow */}
          {(searchResults.length > 0 || recommendedFriends.length > 0) && (
            <View style={{ marginBottom: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
              <Text style={styles.followSectionTitle}>
                ➕ {searchFriendQuery ? '검색 결과' : '추천 친구'}
              </Text>
              <View style={styles.followsList}>
                {(searchFriendQuery ? searchResults : recommendedFriends).slice(0, 5).map(friend => (
                  <View key={friend.id} style={styles.followCard}>
                    <View style={styles.followInfoRow}>
                      <View style={[styles.avatarBubble, { backgroundColor: friend.avatar_color, overflow: 'hidden' }]}>
                        {friend.avatar_url ? (
                          <Image source={{ uri: friend.avatar_url }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                        ) : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.friendNameText}>{friend.name}#{friend.tag}</Text>
                        {friend.personal_data?.bio ? (
                          <Text style={styles.friendBioText} numberOfLines={1}>
                            &quot;{friend.personal_data.bio}&quot;
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.followActionRow}>
                      <TouchableOpacity
                        style={[
                          styles.viewCalBtn,
                          { backgroundColor: THEME.primary }
                        ]}
                        onPress={() => {
                          if (onFollowUser) {
                            onFollowUser(friend.id);
                          }
                        }}
                      >
                        <Text style={styles.viewCalText}>➕ 팔로우</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Initialize Recommended Friends if empty and no search */}
          {follows.length > 0 && recommendedFriends.length === 0 && !searchFriendQuery && onGetRecommendedFriends && (
            <TouchableOpacity
              style={{
                marginBottom: 16,
                paddingVertical: 10,
                backgroundColor: '#f0f4f8',
                borderRadius: 8,
                alignItems: 'center'
              }}
              onPress={() => onGetRecommendedFriends()}
            >
              <Text style={{ fontSize: 12, color: THEME.primary, fontWeight: 'bold' }}>
                💡 추천 친구 불러오기
              </Text>
            </TouchableOpacity>
          )}

          {/* Follows List */}
          {follows.length > 0 ? (
            <View style={styles.followsList}>
              {follows.map(follow => {
                const friend = follow.profiles;
                if (!friend) return null;
                
                return (
                  <View key={follow.id} style={styles.followCard}>
                    <View style={styles.followInfoRow}>
                      <View style={[styles.avatarBubble, { backgroundColor: friend.avatar_color, overflow: 'hidden' }]}>
                        {friend.avatar_url ? (
                          <Image source={{ uri: friend.avatar_url }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                        ) : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.friendNameText}>{friend.name}#{friend.tag}</Text>
                        {friend.personal_data?.bio ? (
                          <Text style={styles.friendBioText} numberOfLines={1}>
                            &quot;{friend.personal_data.bio}&quot;
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.followActionRow}>
                      <TouchableOpacity
                        style={[
                          styles.roleBadge,
                          follow.role === 'leader' ? styles.roleLeader : styles.roleMate
                        ]}
                        onPress={() => handleToggleRole(follow.id, follow.role)}
                      >
                        <Text style={styles.roleText}>
                          {follow.role === 'leader' ? '⭐ 친한 친구' : '👤 일반 친구'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.viewCalBtn}
                        onPress={() => setSelectedFriendForCalendar(friend)}
                      >
                        <Calendar size={12} color="white" />
                        <Text style={styles.viewCalText}>일정 확인</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleUnfollow(follow.id, friend.name)}
                      >
                        <Trash2 size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noFollowsText}>
              현재 팔로우한 친구가 없습니다. 친구의 닉네임과 태그를 통해 추가해 보세요!
            </Text>
          )}
        </View>
      )}

      {activeSubTab === 'settings' && (
        <View>
          {activeSettingSection === null && (
            <View style={styles.homeBody}>
              {/* 프로필 요약 — Figma 159:548 */}
              <TouchableOpacity
                style={styles.homeCard}
                activeOpacity={0.8}
                onPress={() => setActiveSubTab('profile')}
              >
                <View style={styles.homeProfileHead}>
                  <View style={styles.homeAvatar}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.homeAvatarImage} />
                    ) : (
                      <Text style={styles.homeAvatarEmoji}>{profileEmoji}</Text>
                    )}
                  </View>
                  <Text style={styles.homeName}>
                    {name || '이름 미설정'}{tag ? '#' + tag : ''}
                  </Text>
                  <Text style={styles.homeBio}>
                    {bio ? '“' + bio + '”' : '한마디 멘트를 남겨보세요'}
                  </Text>
                </View>

                <View style={styles.homeInfoRow}>
                  <Text style={styles.homeInfoLabel}>생년월일</Text>
                  <Text style={styles.homeInfoValue}>{formatBirthdate(birthdate)}</Text>
                </View>
                <View style={styles.homeInfoRow}>
                  <Text style={styles.homeInfoLabel}>성별</Text>
                  <Text style={styles.homeInfoValue}>{gender === 'male' ? '남성' : gender === 'female' ? '여성' : '아직 설정 안됨'}</Text>
                </View>
                <View style={styles.homeInfoRow}>
                  <Text style={styles.homeInfoLabel}>송금 계좌</Text>
                  <Text style={styles.homeInfoValue}>
                    {accountNumber ? bankName + ' ' + accountNumber : '아직 설정 안됨'}
                  </Text>
                </View>
                <View style={styles.homeInfoRow}>
                  <Text style={styles.homeInfoLabel}>음식 취향</Text>
                  <Text style={[styles.homeInfoValue, !hasFoodTaste && styles.homeInfoValueMissing]}>
                    {hasFoodTaste ? '설정 완료' : '아직 설정 안됨'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* 계정 완성하기 — Figma 159:566 */}
              <View style={styles.homeCard}>
                <View style={styles.homeCardHeader}>
                  <Text style={styles.homeCardTitle}>🎉 계정 완성하기</Text>
                  <Text style={styles.homeCardStep}>
                    {completedStepCount} / {ACCOUNT_STEP_TOTAL} 단계
                  </Text>
                </View>
                <View style={styles.homeProgressTrack}>
                  <View style={[styles.homeProgressFill, { width: progressWidth }]} />
                </View>

                <View style={styles.homeStepRow}>
                  <Text style={hasProfileEmoji ? styles.homeStepDone : styles.homeStepTodo}>
                    {hasProfileEmoji ? '✓' : '○'}
                  </Text>
                  <Text style={styles.homeStepLabel}>프로필 이모지 수정</Text>
                  {hasProfileEmoji ? (
                    <View style={styles.homeStepBadgeDone}>
                      <Text style={styles.homeStepBadgeDoneText}>완료됨</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.homeStepBadge}
                      onPress={() => setActiveSettingSection('profile')}
                    >
                      <Text style={styles.homeStepBadgeText}>수정하기</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.homeStepRow}>
                  <Text style={hasStartLocation ? styles.homeStepDone : styles.homeStepTodo}>
                    {hasStartLocation ? '✓' : '○'}
                  </Text>
                  <Text style={styles.homeStepLabel}>사는 곳 설정</Text>
                  {hasStartLocation ? (
                    <View style={styles.homeStepBadgeDone}>
                      <Text style={styles.homeStepBadgeDoneText}>완료됨</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.homeStepBadge}
                      onPress={() => setActiveSettingSection('profile')}
                    >
                      <Text style={styles.homeStepBadgeText}>설정하기</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.homeStepRow}>
                  <Text style={hasFoodTaste ? styles.homeStepDone : styles.homeStepTodo}>
                    {hasFoodTaste ? '✓' : '○'}
                  </Text>
                  <Text style={styles.homeStepLabel}>음식 취향 매칭</Text>
                  <TouchableOpacity style={styles.homeStepBadge} onPress={startTasteFinder}>
                    <Text style={styles.homeStepBadgeText}>
                      {hasFoodTaste ? '다시 하기' : '게임 시작'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 이동 메뉴 — Figma 159:587 */}
              <View style={styles.homeCard}>
                <TouchableOpacity
                  style={styles.homeLinkRow}
                  onPress={() => setActiveSettingSection('schedule')}
                >
                  <Text style={styles.homeLinkLabel}>일정 입력하기</Text>
                  <Text style={styles.homeLinkArrow}>→</Text>
                </TouchableOpacity>
                <View style={styles.homeLinkDivider} />
                <TouchableOpacity style={styles.homeLinkRow} onPress={() => setActiveSubTab('follows')}>
                  <Text style={styles.homeLinkLabel}>내 친구 관리</Text>
                  <Text style={styles.homeLinkArrow}>→</Text>
                </TouchableOpacity>
                <View style={styles.homeLinkDivider} />
                <TouchableOpacity
                  style={styles.homeLinkRow}
                  onPress={() => setActiveSettingSection('privacy')}
                >
                  <Text style={styles.homeLinkLabel}>정보 공개 범위 설정</Text>
                  <Text style={styles.homeLinkArrow}>→</Text>
                </TouchableOpacity>
                {onExportData && (
                  <>
                    <View style={styles.homeLinkDivider} />
                    <TouchableOpacity style={styles.homeLinkRow} onPress={onExportData}>
                      <Text style={styles.homeLinkLabel}>데이터 내보내기</Text>
                      <Text style={styles.homeLinkArrow}>→</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* 로그아웃 / 계정 삭제 — Figma 159:599 */}
              <View style={styles.homeFooter}>
                {onLogout && (
                  <TouchableOpacity onPress={onLogout}>
                    <Text style={styles.homeFooterLogout}>로그아웃</Text>
                  </TouchableOpacity>
                )}
                {onDeleteAccount && (
                  <TouchableOpacity onPress={onDeleteAccount}>
                    <Text style={styles.homeFooterDanger}>계정 삭제</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {activeSettingSection === 'profile' && (
            <View>
              <TouchableOpacity
                style={[styles.settingsBackButton, { marginBottom: 16 }]}
                onPress={() => setActiveSettingSection(null)}
              >
                <Text style={styles.settingsBackButtonText}>◀ 뒤로 가기</Text>
              </TouchableOpacity>

              {/* Figma `프로필/프로필 수정`(309:1086) — 폼 전체가 카드 한 장 안에 들어간다 */}
              <View style={styles.editCard}>
              <Text style={styles.editCardTitle}>프로필 수정</Text>

              {/* Profile Picture */}
              <View style={styles.avatarContainer}>
                <TouchableOpacity 
                  style={[styles.avatarFrame, { borderColor: avatarColor, backgroundColor: avatarUrl ? `${avatarColor}20` : profileBgColor, overflow: 'hidden', width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' }]}
                  onPress={pickImage}
                >
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                  ) : (
                    <Text style={{ fontSize: 36 }}>{profileEmoji}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={pickImage} style={styles.pickImageBtn} disabled={isUploadingImage}>
                  <Text style={styles.pickImageBtnText}>📸 사진 앱에서 이미지 선택</Text>
                </TouchableOpacity>
                {isUploadingImage && (
                  <View style={{ marginTop: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: THEME.text, marginBottom: 4 }}>업로드 중: {uploadProgress}%</Text>
                    <View style={{ width: '100%', height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                      {/* transition은 react-native-web 전용 CSS 속성입니다. 네이티브에서는 무시됩니다. */}
                      <View style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: avatarColor, ...({ transition: 'width 0.2s' } as object) }} />
                    </View>
                  </View>
                )}
                {avatarUrl && !isUploadingImage ? (
                  <TouchableOpacity onPress={() => setAvatarUrl('')} style={[styles.pickImageBtn, { marginTop: 4, backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}>
                    <Text style={[styles.pickImageBtnText, { color: '#ef4444' }]}>❌ 업로드한 사진 삭제 (이모지 프로필 사용)</Text>
                  </TouchableOpacity>
                ) : null}
                <Text style={[styles.avatarSubtext, { marginTop: 8 }]}>
                  {name ? `${name}#${tag}` : '닉네임을 등록하세요'}
                </Text>
                
                {/* Presets */}
                <View style={styles.colorPalette}>
                  {PRESET_COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorBubble, { backgroundColor: color }]}
                      onPress={() => setAvatarColor(color)}
                    >
                      {avatarColor === color && <Check size={14} color="white" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 나만의 프로필 이미지 만들기 */}
              <Text style={styles.subSectionLabel}>나만의 이모지 프로필 커스텀</Text>
              <View style={styles.pickerSection}>
                {/* 이모지 선택 */}
                <Text style={styles.subSectionLabel}>이모지 선택</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiList}>
                  {[...MALE_EMOJIS, ...FEMALE_EMOJIS, ...NEUTRAL_EMOJIS].map((emoji, idx) => (
                    <TouchableOpacity 
                      key={`emoji-${idx}`} 
                      style={[styles.emojiPickItem, profileEmoji === emoji && styles.emojiPickItemActive]}
                      onPress={() => setProfileEmoji(emoji)}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* 배경색 선택 */}
                <Text style={styles.subSectionLabel}>배경 색상 선택</Text>
                <View style={styles.colorGrid}>
                  {PROFILE_BG_COLORS.map((color, idx) => (
                    <TouchableOpacity 
                      key={`color-${idx}`} 
                      style={[styles.colorPickItem, { backgroundColor: color }, profileBgColor === color && styles.colorPickItemActive]}
                      onPress={() => setProfileBgColor(color)}
                    />
                  ))}
                </View>
              </View>

              {/* Nickname Input */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  닉네임 <Text style={{ color: THEME.danger }}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="이름 혹은 닉네임 입력"
                  placeholderTextColor="#64748b"
                  maxLength={12}
                />
              </View>

              {/* Birthdate & Gender */}
              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1.2, marginRight: 8 }]}>
                  <Text style={styles.label}>생년월일 (YYYYMMDD)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={birthdate}
                    onChangeText={setBirthdate}
                    placeholder="예: 19990512"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    maxLength={8}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 0.8 }]}>
                  <Text style={styles.label}>성별</Text>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => setShowGenderPicker(!showGenderPicker)}
                  >
                    <Text style={styles.dropdownText}>
                      {gender === 'male' ? '남성' : gender === 'female' ? '여성' : '선택안함'}
                    </Text>
                  </TouchableOpacity>
                  {showGenderPicker && (
                    <View style={styles.dropdownMenu}>
                      {['none', 'male', 'female'].map(g => (
                        <TouchableOpacity
                          key={g}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setGender(g);
                            setShowGenderPicker(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>
                            {g === 'male' ? '남성' : g === 'female' ? '여성' : '선택안함'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Bank Account */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  송금 계좌 정보 <Text style={{ color: THEME.danger }}>*</Text>
                </Text>
                <View style={styles.row}>
                  <TouchableOpacity 
                    style={[styles.dropdownButton, { flex: 1, marginRight: 8 }]}
                    onPress={() => setShowBankPicker(!showBankPicker)}
                  >
                    <Text style={styles.dropdownText}>{bankName}</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.textInput, { flex: 2 }]}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder="계좌번호 입력"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />
                </View>
                
                {showBankPicker && (
                  <View style={styles.dropdownMenuScroll}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                      {BANK_PRESETS.map(bank => (
                        <TouchableOpacity
                          key={bank}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setBankName(bank);
                            setShowBankPicker(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{bank}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Travel Time */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>평균 이동 시간 (편도)</Text>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setShowTravelTimePicker(!showTravelTimePicker)}
                >
                  <Text style={styles.dropdownText}>
                    {travelTime === 0 ? '이동 시간 없음 (자택 근처)' : travelTime === 30 ? '30분 내외' : travelTime === 60 ? '1시간 내외' : travelTime === 90 ? '1시간 30분 내외' : '2시간 이상'}
                  </Text>
                </TouchableOpacity>
                
                {showTravelTimePicker && (
                  <View style={styles.dropdownMenuScroll}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                      {[
                        { label: '이동 시간 없음 (자택 근처)', value: 0 },
                        { label: '30분 내외', value: 30 },
                        { label: '1시간 내외', value: 60 },
                        { label: '1시간 30분 내외', value: 90 },
                        { label: '2시간 이상', value: 120 }
                      ].map(item => (
                        <TouchableOpacity
                          key={item.value}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setTravelTime(item.value);
                            setShowTravelTimePicker(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{item.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Bio */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>한마디 멘트</Text>
                <TextInput
                  style={styles.textInput}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="상태나 각오 한마디!"
                  placeholderTextColor="#64748b"
                  maxLength={40}
                />
              </View>

              {/* Default Departure Location */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>기본 출발 위치 (평균 이동 시간 계산용)</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TextInput
                    style={[styles.textInput, { flex: 1.5 }]}
                    value={startLocationName}
                    onChangeText={handleChangeStartLocationName}
                    placeholder="출발지 이름 (예: 우리집, 회사)"
                    placeholderTextColor="#64748b"
                  />
                  <TouchableOpacity
                    style={[styles.dropdownButton, { flex: 1, alignItems: 'center', backgroundColor: THEME.input }]}
                    onPress={() => {
                      Alert.alert(
                        '📍 출발지 좌표 지정',
                        '출발지 위도/경도를 지정할 방법을 선택해 주세요.',
                        [
                          { text: '📡 현재 내 위치 (GPS)', onPress: () => handleGetCurrentLocation('startLocation') },
                          { text: '🗺️ 지도에서 직접 지정', onPress: () => handleOpenMapSelector('startLocation') },
                          { text: '취소', style: 'cancel' }
                        ]
                      );
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: THEME.primary }}>📍 좌표 지정</Text>
                  </TouchableOpacity>
                </View>
                {/* 이름으로 검색해서 좌표까지 한 번에 맞추기.
                    이름과 좌표를 따로 넣으면 서로 어긋난 채 저장됩니다. */}
                <TouchableOpacity
                  style={{
                    backgroundColor: THEME.avatarBg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 6,
                    paddingVertical: 8,
                    alignItems: 'center',
                    marginBottom: 8
                  }}
                  onPress={handleSearchStartLocation}
                  disabled={isSearchingLocation}
                >
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: THEME.primary }}>
                    {isSearchingLocation ? '검색 중...' : '🔍 이름으로 장소 검색 (좌표 자동 입력)'}
                  </Text>
                </TouchableOpacity>

                {startLocationResults.length > 0 && (
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 6,
                      marginBottom: 8,
                      overflow: 'hidden'
                    }}
                  >
                    {startLocationResults.map((place, idx) => (
                      <TouchableOpacity
                        key={`${place.id ?? idx}`}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderBottomWidth: idx < startLocationResults.length - 1 ? 1 : 0,
                          borderBottomColor: THEME.border
                        }}
                        onPress={() => handleSelectStartLocation(place)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.text }}>
                          {place.place_name}
                        </Text>
                        <Text style={{ fontSize: 11, color: THEME.textMuted, marginTop: 2 }}>
                          {place.road_address_name || place.address_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 좌표가 이름과 짝지어졌는지 저장 전에 보이게 합니다.
                    이 표시가 없으면 사용자는 위도·경도 숫자만 보고 "값이 있으니
                    됐다"고 생각하는데, 그 숫자가 지도 기본값(서울시청)일 수 있습니다. */}
                {startLocationName.trim().length > 0 && (
                  <View
                    style={{
                      backgroundColor: startLocationVerified ? THEME.success + '20' : THEME.warning + '20',
                      borderWidth: 1,
                      borderColor: startLocationVerified ? THEME.success : THEME.warning,
                      borderRadius: 6,
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      marginBottom: 8
                    }}
                  >
                    <Text style={{ fontSize: 11, color: startLocationVerified ? THEME.success : THEME.warning }}>
                      {startLocationVerified
                        ? '✅ 좌표가 이 장소로 확인되었습니다.'
                        : '⚠️ 좌표 미확인 — 이대로 저장하면 이름만 저장되고 AI 추천에 내 위치가 반영되지 않습니다. 위 🔍 검색으로 골라 주세요.'}
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 12, paddingLeft: 4 }}>
                  <Text style={{ fontSize: 11, color: THEME.textMuted }}>위도: {startLatitude.toFixed(4)}</Text>
                  <Text style={{ fontSize: 11, color: THEME.textMuted }}>경도: {startLongitude.toFixed(4)}</Text>
                </View>
              </View>

              </View>

              {/* Save Profile Button */}
              <View style={{ marginTop: 24 }}>
                <Button variant="complete" label="내 프로필 저장하기 ✨" onPress={handleSaveProfile} />
              </View>
            </View>
          )}

          {activeSettingSection === 'schedule' && (
            <View>
              <TouchableOpacity
                style={[styles.settingsBackButton, { marginBottom: 16 }]}
                onPress={() => setActiveSettingSection(null)}
              >
                <Text style={styles.settingsBackButtonText}>◀ 뒤로 가기</Text>
              </TouchableOpacity>

              <View style={{ minHeight: 600 }}>
                <ScheduleGrid
                  meetingDate={getLocalDateString()}
                  participants={[]}
                  currentParticipantId={initialData?.id || ''}
                  onSaveSchedule={async (schedule) => {
                    if (onSaveSchedule) {
                      await onSaveSchedule(schedule);
                    }
                    Alert.alert('완료', '내 주간 일정이 저장되었습니다!');
                    setActiveSettingSection(null);
                  }}
                  isCoordination={false}
                  myProfile={initialData}
                  follows={[]}
                  activeRooms={activeRooms}
                  onSwipeBackBlockChange={onSwipeBackBlockChange}
                  hideSummaryCard={true}
                />
              </View>
            </View>
          )}

          {activeSettingSection === 'privacy' && (
            <View style={styles.privacyBody}>
              <TouchableOpacity
                style={styles.privacyBack}
                onPress={() => setActiveSettingSection(null)}
              >
                <Text style={styles.privacyBackText}>◀ 뒤로 가기</Text>
              </TouchableOpacity>

              <Text style={styles.privacyTitle}>정보 공개 범위</Text>
              <Text style={styles.privacySubtitle}>밥약 메이트에게 보여줄 정보를 선택하세요</Text>

              <View style={styles.privacyCard}>
                <Text style={styles.privacyCardTitle}>기본 정보</Text>
                {PRIVACY_BASIC_FIELDS.map((field, index) => (
                  <View key={field.key}>
                    {index > 0 && <View style={styles.privacyDivider} />}
                    <View style={styles.privacyRow}>
                      <View style={styles.privacyRowText}>
                        <Text style={styles.privacyRowLabel}>{field.label}</Text>
                        <Text style={styles.privacyRowValue} numberOfLines={1}>
                          {privacyPreview[field.key]}
                        </Text>
                      </View>
                      <View style={styles.privacyLevels}>
                        {PRIVACY_LEVELS.map(level => {
                          const selected = privacySettings[field.key] === level.value;
                          return (
                            <TouchableOpacity
                              key={level.value}
                              style={[styles.privacyLevel, selected && styles.privacyLevelActive]}
                              onPress={() =>
                                setPrivacySettings({ ...privacySettings, [field.key]: level.value })
                              }
                            >
                              <Text
                                style={[
                                  styles.privacyLevelText,
                                  selected && styles.privacyLevelTextActive,
                                ]}
                              >
                                {level.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.privacyCard}>
                <Text style={[styles.privacyCardTitle, styles.privacyCardTitleDanger]}>민감 정보</Text>
                {PRIVACY_SENSITIVE_FIELDS.map((field, index) => (
                  <View key={field.key}>
                    {index > 0 && <View style={styles.privacyDivider} />}
                    <View style={styles.privacyRow}>
                      <View style={styles.privacyRowText}>
                        <Text style={styles.privacyRowLabel}>{field.label}</Text>
                        <Text style={styles.privacyRowValue} numberOfLines={1}>
                          {field.hint}
                        </Text>
                      </View>
                      <View style={styles.privacyLevels}>
                        {PRIVACY_LEVELS.map(level => {
                          const selected = privacySettings[field.key] === level.value;
                          return (
                            <TouchableOpacity
                              key={level.value}
                              style={[styles.privacyLevel, selected && styles.privacyLevelActive]}
                              onPress={() =>
                                setPrivacySettings({ ...privacySettings, [field.key]: level.value })
                              }
                            >
                              <Text
                                style={[
                                  styles.privacyLevelText,
                                  selected && styles.privacyLevelTextActive,
                                ]}
                              >
                                {level.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.privacyNote}>
                <Text style={styles.privacyNoteText}>🔒  비공개로 둔 정보는 방장에게도 보이지 않아요</Text>
              </View>

              {/* SKILL.md §4 매핑대로 공용 Button 을 쓴다 (담당자 B 가 바꿔 둔 방식) */}
              <Button variant="complete" label="저장하기" onPress={handleSaveProfile} />
            </View>
          )}
        </View>
      )}

      {/* Friend Calendar Overlay Modal */}
      <Modal
        visible={selectedFriendForCalendar !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedFriendForCalendar(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedFriendForCalendar && (
              <View>
                <Text style={styles.modalCalTitle}>
                  📅 {selectedFriendForCalendar.name}님의 일정표
                </Text>
                <Text style={styles.modalCalSubtitle}>
                  보라색 슬롯은 친구의 바쁜 시간대입니다. (2026년 6월 21일~25일)
                </Text>

                {/* Read-only Mini Grid */}
                <View style={styles.miniGridContainer}>
                  {/* Time Axis */}
                  <View style={styles.miniTimeAxis}>
                    {TIME_SLOTS.map(t => (
                      <View key={t} style={styles.miniTimeBox}>
                        <Text style={styles.miniTimeText}>{t}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Columns */}
                  <View style={{ flex: 1, flexDirection: 'row' }}>
                    {previewDates.map(date => {
                      const schedule = selectedFriendForCalendar.schedule || {};
                      const busySlots = schedule[date] || [];

                      return (
                        <View key={date} style={{ flex: 1, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.03)' }}>
                          <View style={styles.miniHeader}>
                            <Text style={styles.miniDayText}>{getDayName(date)}</Text>
                            <Text style={styles.miniDateText}>{date.substring(8)}</Text>
                          </View>

                          {TIME_SLOTS.map(time => {
                            const isBusy = busySlots.includes(time);
                            return (
                              <View
                                key={`${date}-${time}`}
                                style={[
                                  styles.miniCell,
                                  isBusy && { backgroundColor: '#8b5cf6' }
                                ]}
                              />
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedFriendForCalendar(null)}
                >
                  <Text style={styles.modalCloseText}>닫기</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 나만의 프로필 줌 팝업 모달 */}
      <Modal visible={zoomModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismissArea} onPress={() => setZoomModalVisible(false)} />
          <View style={styles.zoomModalContent}>
            
            <View style={[styles.largeAvatarCircle, { backgroundColor: profileBgColor || '#BFDBFE' }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%', borderRadius: 90, resizeMode: 'cover' }} />
              ) : (
                <Text style={styles.largeAvatarEmoji}>{profileEmoji || '🦁'}</Text>
              )}
            </View>
            
            <Text style={styles.largeUserName}>{name} <Text style={styles.largeUserCode}>#{tag}</Text></Text>
            
            <View style={styles.zoomModalButtons}>
              <TouchableOpacity 
                style={styles.zoomEditBtn} 
                onPress={() => {
                  setZoomModalVisible(false);
                  setActiveSubTab('settings');
                  setActiveSettingSection('profile');
                }}
              >
                <Camera size={18} color="#FFFFFF" />
                <Text style={styles.zoomEditBtnText}>프로필 수정하기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.zoomCloseBtn} onPress={() => setZoomModalVisible(false)}>
                <Text style={styles.zoomCloseBtnText}>닫기</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* Map Selector Modal */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowMapModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: THEME.surface }}>
          <View style={{ height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: THEME.border, backgroundColor: THEME.surface }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: THEME.text }}>🗺️ 지도에서 위치 지정</Text>
            <TouchableOpacity onPress={() => setShowMapModal(false)}>
              <Text style={{ fontSize: 13, color: THEME.textMuted, fontWeight: '600' }}>취소</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, position: 'relative' }}>
            {Platform.OS === 'web' ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: THEME.primary, marginBottom: 12 }}>🗺️ 웹 환경 지도 지정 안내</Text>
                <Text style={{ fontSize: 13, color: THEME.textMuted, textAlign: 'center', lineHeight: 20 }}>
                  현재 크롬/엣지 등 웹 브라우저 환경에서는 모바일 전용 지도 라이브러리(react-native-maps)가 지원되지 않습니다.{"\n\n"}
                  좌표 지정 버튼의 시뮬레이션 버튼(강남역/홍대입구역)을 터치하여 지정하시거나, 모바일 기기(Expo Go)로 접속하여 실시간 지도 지정을 사용해 주세요!
                </Text>
              </View>
            ) : (
              <>
                <MapView
                  style={StyleSheet.absoluteFillObject}
                  initialRegion={mapRegion}
                  minZoomLevel={8}
                  maxZoomLevel={19}
                  onRegionChangeComplete={(region) => {
                    if (region && typeof region.latitude === 'number' && typeof region.longitude === 'number' && !isNaN(region.latitude) && !isNaN(region.longitude)) {
                      // Clamp strictly to South Korea boundary coordinates and store in Ref (0 state updates, 0 lags!)
                      const clampedLat = Math.max(33.0, Math.min(38.9, region.latitude));
                      const clampedLng = Math.max(124.0, Math.min(132.0, region.longitude));
                      currentMapCoordsRef.current = {
                        latitude: clampedLat,
                        longitude: clampedLng
                      };
                    }
                  }}
                />

                {/* Center Pin Overlay (Pointer-events none so it doesn't block panning) */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    marginTop: -38, // Offsets the text emoji height to point exactly at center
                    marginLeft: -18,
                    width: 36,
                    height: 36,
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                  }}
                >
                  <Text style={{ fontSize: 36 }}>📍</Text>
                </View>

                {/* Floating Guide */}
                <View style={{ position: 'absolute', top: 12, left: 12, right: 12, backgroundColor: THEME.surface + 'F2', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: THEME.border, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 }}>
                  <Text style={{ fontSize: 11, color: THEME.text, fontWeight: '500' }}>지도를 쓸어 넘겨서 화면 중앙의 📍 핀에 원하는 위치를 맞춰주세요.</Text>
                </View>
              </>
            )}
          </View>

          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: THEME.border, backgroundColor: THEME.surface }}>
            <View style={{ marginBottom: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: THEME.primary, fontWeight: 'bold' }}>
                📍 화면 중앙의 핀(📍) 위치가 출발지로 지정됩니다.
              </Text>
            </View>

            {/* ⚠️ 지도가 안 그려지면 잠급니다. 키가 없으면 SafeMapView 가 안내 박스를
                그리는데, 그때는 지도를 움직일 수 없어 좌표가 초기값(서울시청) 그대로입니다.
                그 상태로 누르면 기본 좌표가 "내가 고른 위치"로 저장됩니다(AE-8 과 같은 부류). */}
            <Button
              variant="complete"
              disabled={!isGoogleMapsConfigured}
              label={isGoogleMapsConfigured ? '이 위치로 설정하기' : '지도를 쓸 수 없어 선택 불가'}
              onPress={async () => {
                const targetCoords = currentMapCoordsRef.current;
                if (mapTargetField === 'startLocation') {
                  setStartLatitude(targetCoords.latitude);
                  setStartLongitude(targetCoords.longitude);
                  // 지도에서 고른 좌표의 주소를 그대로 이름으로 씁니다.
                  // 둘이 같은 지점에서 나오므로 확정으로 봅니다.
                  setStartLocationVerified(true);

                  try {
                    const address = await Location.reverseGeocodeAsync({
                      latitude: targetCoords.latitude,
                      longitude: targetCoords.longitude
                    });
                    if (address && address.length > 0) {
                      const first = address[0];
                      const name = first.district || first.city || first.street || '지도 지정 위치';
                      setStartLocationName(name);
                    } else {
                      setStartLocationName('지도 지정 위치');
                    }
                  } catch (geoErr) {
                    console.error(geoErr);
                    setStartLocationName('지도 지정 위치');
                  }
                  Alert.alert('완료', '지도의 선택된 좌표와 주소가 출발지로 설정되었습니다!');
                } else {
                  try {
                    const address = await Location.reverseGeocodeAsync({
                      latitude: targetCoords.latitude,
                      longitude: targetCoords.longitude
                    });
                    if (address && address.length > 0) {
                      const first = address[0];
                      const name = first.district || first.city || first.street || '지도 지정 위치';
                      setPreferredLocation(name);
                    } else {
                      setPreferredLocation('지도 지정 위치');
                    }
                  } catch (geoErr) {
                    console.error(geoErr);
                    setPreferredLocation('지도 지정 위치');
                  }
                  Alert.alert('완료', '지도의 선택된 주소가 선호 모임 장소로 설정되었습니다!');
                }

                setShowMapModal(false);
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>

    </ScrollView>
  );
});

const styles = StyleSheet.create({
  // ── Figma `프로필/프로필 수정`(309:1086) ──
  editCard: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#A9A9A9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  editCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  // ── Figma `프로필/정보 공개 범위`(256:2494) ──
  privacyBody: {
    gap: 8,
    paddingVertical: 12,
  },
  privacyBack: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  privacyBackText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  privacyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
  },
  privacySubtitle: {
    fontSize: 12,
    color: THEME.textMuted,
    marginBottom: 4,
  },
  privacyCard: {
    backgroundColor: THEME.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  privacyCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 4,
  },
  privacyCardTitleDanger: {
    color: THEME.danger,
  },
  privacyDivider: {
    height: 1,
    backgroundColor: THEME.border,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  privacyRowText: {
    flex: 1,
    gap: 2,
  },
  privacyRowLabel: {
    fontSize: 13,
    color: THEME.text,
  },
  privacyRowValue: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  privacyLevels: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: THEME.surface,
    padding: 2,
    gap: 2,
  },
  privacyLevel: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  privacyLevelActive: {
    backgroundColor: THEME.primary,
  },
  privacyLevelText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  privacyLevelTextActive: {
    color: '#FFFFFF',
  },
  privacyNote: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: THEME.badgeBg,
  },
  privacyNoteText: {
    fontSize: 11,
    color: THEME.accentSoft,
  },
  // ── Figma `프로필/프로필 홈`(159:544) ──
  homeBody: {
    gap: 10,
    paddingVertical: 12,
  },
  homeCard: {
    backgroundColor: THEME.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  homeProfileHead: {
    alignItems: 'center',
    gap: 3,
    paddingTop: 4,
    paddingBottom: 8,
  },
  homeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: THEME.badgeBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  homeAvatarImage: {
    width: '100%',
    height: '100%',
  },
  homeAvatarEmoji: {
    fontSize: 30,
  },
  homeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
  },
  homeBio: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  homeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
    gap: 12,
  },
  homeInfoLabel: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  homeInfoValue: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: THEME.text,
    textAlign: 'right',
  },
  homeInfoValueMissing: {
    color: THEME.danger,
  },
  homeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  homeCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  homeCardStep: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  homeProgressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: THEME.border,
    overflow: 'hidden',
    marginTop: 2,
  },
  homeProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: THEME.primary,
  },
  homeStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  homeStepDone: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.primary,
  },
  homeStepTodo: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textTertiary,
  },
  homeStepLabel: {
    flex: 1,
    fontSize: 12,
    color: THEME.text,
  },
  homeStepBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: THEME.badgeBg,
  },
  homeStepBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.accentSoft,
  },
  homeStepBadgeDone: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: THEME.border,
  },
  homeStepBadgeDoneText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  homeLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  homeLinkLabel: {
    fontSize: 13,
    color: THEME.text,
  },
  homeLinkArrow: {
    fontSize: 13,
    color: THEME.textTertiary,
  },
  homeLinkDivider: {
    height: 1,
    backgroundColor: THEME.border,
  },
  homeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  homeFooterLogout: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  homeFooterDanger: {
    fontSize: 12,
    color: THEME.danger,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: THEME.background
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 16,
    textAlign: 'center'
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  avatarFrame: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  avatarSubtext: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 10
  },
  colorPalette: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center'
  },
  colorBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  formGroup: {
    marginBottom: 14
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.labelMuted,
    marginBottom: 6
  },
  textInput: {
    backgroundColor: THEME.card,
    borderRadius: 8,
    color: THEME.text,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    shadowColor: '#A9A9A9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 1
  },
  row: {
    flexDirection: 'row',
    marginBottom: 14
  },
  dropdownButton: {
    backgroundColor: THEME.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 13,
    justifyContent: 'center',
    shadowColor: '#A9A9A9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 1
  },
  dropdownText: {
    color: THEME.text,
    fontSize: 14
  },
  dropdownMenu: {
    position: 'absolute',
    // ⚠️ 예전에는 top: 50 이었습니다. 라벨(13pt + marginBottom 6) 과 버튼
    //    (paddingVertical 12 × 2 + 텍스트 + 테두리) 을 합치면 약 69 이라,
    //    메뉴가 버튼 위로 19 만큼 올라타 버튼 글자를 가렸습니다.
    //    '100%' 는 부모(formGroup) 높이를 그대로 따라가므로 글꼴이나
    //    패딩이 바뀌어도 항상 버튼 바로 아래에 붙습니다.
    top: '100%',
    marginTop: 4,
    left: 0,
    right: 0,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    zIndex: 99
  },
  dropdownMenuScroll: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    zIndex: 99
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border
  },
  dropdownItemText: {
    color: THEME.text,
    fontSize: 14
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1
  },
  tagActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primaryPressed
  },
  tagInactive: {
    backgroundColor: THEME.input,
    borderColor: THEME.border
  },
  tagText: {
    color: THEME.text,
    fontSize: 12
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 3,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxChecked: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primaryPressed
  },
  checkboxLabel: {
    color: THEME.textMuted,
    fontSize: 12
  },
  saveButton: {
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  
  // Follow UI Styles
  followSection: {
    marginTop: 0,
    paddingTop: 0
  },
  followSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 12
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  searchInput: {
    flex: 1,
    backgroundColor: THEME.input,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    color: THEME.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13
  },
  searchBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  followsList: {
    gap: 12
  },
  followCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#323333',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  followInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1
  },
  avatarBubble: {
    width: 32,
    height: 32,
    borderRadius: 16
  },
  friendNameText: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold'
  },
  friendBioText: {
    color: THEME.textMuted,
    fontSize: 11,
    marginTop: 2,
    maxWidth: 120
  },
  followActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  roleLeader: {
    backgroundColor: 'rgba(134, 155, 96, 0.12)',
    borderWidth: 1,
    borderColor: THEME.primary
  },
  roleMate: {
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border
  },
  roleText: {
    color: THEME.text,
    fontSize: 10,
    fontWeight: 'bold'
  },
  viewCalBtn: {
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  viewCalText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },
  noFollowsText: {
    color: THEME.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 20
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: THEME.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    width: '90%',
    padding: 16,
    maxHeight: '85%'
  },
  modalCalTitle: {
    color: THEME.text,
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  modalCalSubtitle: {
    color: THEME.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16
  },
  miniGridContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    overflow: 'hidden'
  },
  miniTimeAxis: {
    width: 40,
    backgroundColor: THEME.surfaceDarker,
    borderRightWidth: 1,
    borderRightColor: THEME.border,
    paddingTop: 30
  },
  miniTimeBox: {
    height: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  miniTimeText: {
    color: THEME.textMuted,
    fontSize: 8,
    fontWeight: 'bold'
  },
  miniHeader: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.background
  },
  miniDayText: {
    color: THEME.textMuted,
    fontSize: 8,
    fontWeight: 'bold'
  },
  miniDateText: {
    color: THEME.text,
    fontSize: 9,
    fontWeight: 'bold'
  },
  miniCell: {
    height: 22,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(134, 155, 96, 0.05)'
  },
  modalCloseBtn: {
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 20
  },
  modalCloseText: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold'
  },
  logoutBtn: {
    backgroundColor: THEME.danger + '15',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12
  },
  logoutBtnText: {
    color: THEME.danger,
    fontSize: 14,
    fontWeight: '700'
  },
  warningBanner: {
    backgroundColor: 'rgba(245, 124, 0, 0.08)',
    borderWidth: 1,
    borderColor: THEME.warning,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  warningBannerText: {
    color: THEME.warning,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 18
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#323333',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  profileCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.text,
    marginTop: 6
  },
  profileCardBio: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20
  },
  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 12
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  detailLabel: {
    fontSize: 12,
    color: THEME.textMuted,
    fontWeight: '500'
  },
  detailValue: {
    fontSize: 12,
    color: THEME.text,
    fontWeight: 'bold'
  },
  // Improved Profile UI Styles
  profileCardContainer: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  profileAvatarTouchable: {
    marginBottom: 12,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 4,
  },
  profileTag: {
    fontSize: 14,
    color: THEME.textMuted,
    marginBottom: 12,
  },
  profileEditButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  profileEditButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  foodPrefSection: {
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  foodPrefTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 8,
  },
  foodPrefChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  foodChip: {
    backgroundColor: THEME.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.primary,
  },
  foodChipText: {
    fontSize: 12,
    color: THEME.text,
  },
  friendListSection: {
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  friendListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  friendListTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text,
  },
  friendListAddBtn: {
    padding: 4,
  },
  friendListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  friendAvatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text,
  },
  friendTag: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  unfollowBtn: {
    borderWidth: 1,
    borderColor: THEME.menuNeeded,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  unfollowBtnText: {
    color: THEME.menuNeeded,
    fontWeight: 'bold',
    fontSize: 12,
  },

  prefSection: {
    marginTop: 10
  },
  prefTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 8
  },
  prefTagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  viewTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.background
  },
  viewTagText: {
    fontSize: 11,
    color: THEME.text
  },
  noPrefText: {
    fontSize: 11,
    color: THEME.textMuted,
    fontStyle: 'italic'
  },
  editBtn: {
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10
  },
  editBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  scheduleBtn: {
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10
  },
  scheduleBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  modalHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.surface
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.text
  },
  modalCloseIconBtn: {
    padding: 8
  },
  modalCloseIconText: {
    fontSize: 20,
    color: THEME.textMuted,
    fontWeight: 'bold'
  },
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.surfaceDarker,
    borderRadius: 8,
    padding: 2,
    marginBottom: 16
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  subTabActive: {
    backgroundColor: THEME.primary
  },
  subTabText: {
    fontSize: 13,
    color: THEME.textMuted,
    fontWeight: '600'
  },
  subTabTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  pickImageBtn: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: THEME.surfaceDarker,
    borderWidth: 1,
    borderColor: THEME.border
  },
  pickImageBtnText: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: 'bold'
  },
  privacySection: {
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.surfaceDarker,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border
  },
  privacySectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 16
  },
  privacyItem: {
    marginBottom: 12
  },
  privacyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 8
  },
  privacyButtonRow: {
    flexDirection: 'row',
    gap: 8
  },
  privacyBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center'
  },
  privacyBtnActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary
  },
  privacyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textMuted,
    textAlign: 'center'
  },
  privacyBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  settingsMenuCard: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#323333',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  settingsMenuCardText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text
  },
  settingsMenuCardSub: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 4
  },
  settingsBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  settingsBackButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.primary
  },
  
  // Game & Swiper Styles
  gameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.background,
  },
  introOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  introContent: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  introIcon: {
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.text,
    marginBottom: 10,
  },
  introSubtitle: {
    fontSize: 15,
    color: THEME.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '600',
  },
  swipeContainer: {
    width: '100%',
    flex: 1,
    padding: 24,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  gameIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 24,
    gap: 36,
  },
  gameIndicatorBox: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.card,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  dislikeIndicatorBox: {
    backgroundColor: THEME.danger + '20',
    borderColor: THEME.danger,
  },
  likeIndicatorBox: {
    backgroundColor: THEME.success + '20',
    borderColor: THEME.success,
  },
  indicatorText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textMuted,
  },
  gameHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.text,
    alignSelf: 'center',
    marginBottom: 20,
  },
  cardStackContainer: {
    width: '100%',
    height: 380,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: 10,
  },
  foodCard: {
    position: 'absolute',
    width: Dimensions.get('window').width - 64,
    height: 350,
    left: 8,
    top: 15,
    backgroundColor: THEME.card,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 8,
  },
  nextFoodCard: {
    zIndex: -1,
    transform: [{ scale: 0.95 }, { translateY: 15 }],
    opacity: 0.6,
  },
  foodCardEmoji: {
    fontSize: 110,
    marginBottom: 20,
  },
  foodCardName: {
    fontSize: 26,
    fontWeight: '900',
    color: THEME.text,
    marginBottom: 14,
  },
  foodTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  foodTag: {
    fontSize: 13,
    color: THEME.primary,
    backgroundColor: THEME.badgeBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '700',
  },
  gameButtonRow: {
    flexDirection: 'row',
    gap: 40,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  gameBtnCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  btnLike: {
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  btnDislike: {
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  questionIconEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  questionCardBody: {
    alignItems: 'center',
    width: '100%',
  },
  questionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.text,
    marginBottom: 10,
  },
  questionInstruction: {
    fontSize: 13,
    color: THEME.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  choiceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  choiceLeft: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.danger,
  },
  choiceRight: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.primary,
  },
  questionChoiceBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionChoiceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  alcoholContainer: {
    flex: 1,
    width: '100%',
    padding: 24,
    justifyContent: 'space-between',
  },
  alcoholHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.text,
    textAlign: 'center',
    marginTop: 10,
  },
  alcoholSubtitle: {
    fontSize: 13,
    color: THEME.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  liquorCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  liquorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  liquorItemChecked: {
    backgroundColor: THEME.primary + '0D',
  },
  liquorItemDisabled: {
    opacity: 0.3,
  },
  liquorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  liquorLabelChecked: {
    color: THEME.primary,
    fontWeight: '800',
  },
  noAlcoholToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: THEME.surface,
    marginTop: 10,
  },
  noAlcoholToggleActive: {
    backgroundColor: THEME.danger + '15',
  },
  noAlcoholText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textMuted,
  },
  noAlcoholTextActive: {
    color: THEME.danger,
  },
  alcoholFooter: {
    width: '100%',
    marginTop: 10,
  },
  resultContainer: {
    padding: 24,
    paddingBottom: 40,
    width: '100%',
  },
  resultCheckHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  checkmarkBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: THEME.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.text,
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: 12,
    color: THEME.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
    paddingHorizontal: 10,
  },
  accordionCard: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: THEME.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: THEME.card,
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
  },
  accordionContent: {
    padding: 16,
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  tagSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagSelectorItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: THEME.card,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: THEME.border,
  },
  tagSelectorItemActive: {
    backgroundColor: THEME.badgeBg,
    borderColor: THEME.primary,
  },
  tagSelectorText: {
    fontSize: 12,
    color: THEME.textMuted,
    fontWeight: '600',
  },
  tagSelectorTextActive: {
    color: THEME.primary,
    fontWeight: '800',
  },
  resultFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  retakeBtn: {
    flex: 1,
    backgroundColor: THEME.border,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakeBtnText: {
    color: THEME.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  modalDismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  zoomModalContent: {
    width: Dimensions.get('window').width - 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  largeAvatarCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: THEME.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  largeAvatarEmoji: {
    fontSize: 90,
  },
  largeUserName: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.text,
    marginBottom: 20,
  },
  largeUserCode: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.primary,
  },
  zoomModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  zoomEditBtn: {
    flex: 1.8,
    backgroundColor: THEME.primary,
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  zoomEditBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  zoomCloseBtn: {
    flex: 1,
    backgroundColor: THEME.border,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomCloseBtnText: {
    color: THEME.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },

  // Tutorial checklist card
  tutorialCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
    marginTop: 16,
    marginBottom: 16
  },
  tutorialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tutorialTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.text,
  },
  tutorialCount: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primary,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: THEME.border,
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.primary,
    borderRadius: 3,
  },
  tutorialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  tutorialItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: THEME.border,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  tutorialTextContainer: {
    flex: 1,
  },
  tutorialItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },
  tutorialItemDesc: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 2,
  },
  tutorialBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tutorialBtnDone: {
    backgroundColor: THEME.border,
  },
  tutorialBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tutorialBtnTextDone: {
    color: THEME.textMuted,
  },

  // Emojis and background color edit customizer
  pickerSection: {
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  avatarPreviewCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarPreviewEmoji: {
    fontSize: 40,
  },
  subSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textMuted,
    alignSelf: 'flex-start',
    marginBottom: 6,
    marginTop: 8,
  },
  emojiList: {
    width: '100%',
    paddingVertical: 4,
    marginBottom: 10,
  },
  emojiPickItem: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: THEME.card,
    borderWidth: 1.5,
    borderColor: THEME.border,
  },
  emojiPickItemActive: {
    borderColor: THEME.primary,
    backgroundColor: THEME.badgeBg,
  },
  emojiText: {
    fontSize: 22,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
    width: '100%',
  },
  colorPickItem: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  colorPickItemActive: {
    borderColor: THEME.text,
    borderWidth: 2,
  }
});

// forwardRef 로 감싼 컴포넌트는 이름이 없어 React DevTools 와
// 에러 스택에서 'ForwardRef' 로만 보입니다. 디버깅을 위해 이름을 붙입니다.
ProfileSetup.displayName = 'ProfileSetup';
