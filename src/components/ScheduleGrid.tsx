import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Image,
  RefreshControl,
  FlatList,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SafeMapView as MapView, Marker } from './SafeMapView';
import { Calendar as CalendarIcon, Sparkles, CheckCircle, Clock, Check, Users, ChevronLeft, ChevronRight, Search, Plus, X, Pencil, Trash2 } from 'lucide-react-native';
import * as expoCalendar from 'expo-calendar';
import { storage } from '../lib/storage';
import { supabase } from '../lib/supabaseClient';
import { THEME, PALETTE_COLORS } from '../lib/theme';
import type { Participant, ScheduleAvailability, Room, Follow, Profile } from '../lib/types';
import { CalendarModal } from './CalendarModal';
import { isSlotFree } from '../lib/scheduleUtils';

// API 키 - 환경 변수에서 읽음
const KAKAO_REST_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY || '';
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const fetchKakaoPlaces = async (keyword: string, lat: number, lng: number) => {
  if (!KAKAO_REST_API_KEY) {
    console.warn('[Kakao] REST API 키가 없어 장소 검색을 건너뜁니다.');
    return [];
  }

  try {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}&x=${lng}&y=${lat}&radius=2000&size=3&sort=accuracy`;
    const response = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`
      }
    });
    if (!response.ok) {
      // 예전에는 여기서 getMockKakaoPlaces() 로 **지어낸 장소**를 돌려줬습니다.
      // 실존 브랜드명('블루보틀커피 서면역점')에 지어낸 주소와, 사용자 위치에서
      // 살짝 옮긴 좌표가 붙어 나갔습니다. 길찾기를 누르면 아무것도 없는 곳으로
      // 갑니다. 키 문제뿐 아니라 일시적 네트워크 오류에도 이 경로를 탔습니다.
      console.warn(
        `[Kakao] 장소 검색 실패 (HTTP ${response.status}). ` +
          `키 종류(REST API 키)와 콘솔의 카카오맵 활성화 여부를 확인하세요.`
      );
      return [];
    }
    const json = await response.json();
    return json.documents || [];
  } catch (err) {
    // 지어낸 장소로 메우지 않습니다. 위 주석 참고.
    console.error('Error fetching Kakao places:', err);
    return [];
  }
};


const extractJsonString = (text: string): string | null => {
  const startArray = text.indexOf('[');
  const startObject = text.indexOf('{');

  let startIdx = -1;
  let endIdx = -1;

  if (startArray !== -1 && startObject !== -1) {
    startIdx = Math.min(startArray, startObject);
  } else if (startArray !== -1) {
    startIdx = startArray;
  } else if (startObject !== -1) {
    startIdx = startObject;
  }

  if (startIdx === -1) return null;

  if (startIdx === startArray) {
    endIdx = text.lastIndexOf(']');
  } else {
    endIdx = text.lastIndexOf('}');
  }

  if (endIdx === -1 || endIdx < startIdx) return null;

  return text.substring(startIdx, endIdx + 1);
};

const parseReviewsCount = (ratingStr: string) => {
  if (!ratingStr) return '리뷰 0';
  const match = ratingStr.match(/\(([^)]+)\)/);
  if (match && match[1]) {
    let inner = match[1];
    inner = inner.replace('방문자', '').replace('개', '').replace('리뷰', '').trim();
    const num = parseInt(inner.replace(/,/g, ''), 10);
    if (!isNaN(num)) {
      return `리뷰 ${num.toLocaleString()}`;
    }
    return `리뷰 ${inner}`;
  }
  const numMatch = ratingStr.replace(/⭐\s*\d+\.\d+/, '').match(/(\d[\d,]*)/);
  if (numMatch) {
    const num = parseInt(numMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(num)) {
      return `리뷰 ${num.toLocaleString()}`;
    }
    return `리뷰 ${numMatch[1]}`;
  }
  return '리뷰 1,000+';
};

const getPlaceDetailsByCategory = (category: string, placeName: string) => {
  const detailsMap: Record<string, { menu: string; price: string }> = {
    '한식': {
      menu: '보리굴비 정식, 매콤 낙지볶음, 영양 갈비탕',
      price: '13,000원 ~ 20,000원'
    },
    '일식': {
      menu: '특선 모듬스시, 냉메밀 소바, 규동덮밥',
      price: '12,000원 ~ 22,000원'
    },
    '양식': {
      menu: '트러플 머쉬룸 리조또, 감바스 파스타, 안심 스테이크',
      price: '18,000원 ~ 35,000원'
    },
    '중식': {
      menu: '샤오롱바오 딤섬, 사천 탕수육, 명품 유니짜장',
      price: '9,000원 ~ 18,000원'
    },
    '고기': {
      menu: '숙성 삼겹살, 생목살 구이, 한우 차돌박이',
      price: '16,000원 ~ 25,000원'
    },
    '치킨': {
      menu: '오리지널 후라이드, 간장 갈릭 치킨, 국물 떡볶이 세트',
      price: '18,000원 ~ 23,000원'
    },
    '카페': {
      menu: '시그니처 드립 커피, 콜드브루 라떼, 크로플 디저트',
      price: '5,500원 ~ 8,500원'
    },
    '술집': {
      menu: '가마보코 오뎅탕, 바삭 먹태구이, 살얼음 맥주',
      price: '10,000원 ~ 18,000원'
    }
  };

  const matched = detailsMap[category] || {
    menu: '쉐프 추천 오늘의 메뉴, 시그니처 시즈널 드링크',
    price: '10,000원 ~ 20,000원'
  };

  const hoursMap: Record<string, string> = {
    '한식': '11:00 ~ 22:00 (Break 15~17시)',
    '일식': '11:30 ~ 22:00 (Break 14:30~17시)',
    '양식': '11:30 ~ 21:30 (라스트오더 20:30)',
    '중식': '11:00 ~ 21:30 (연중무휴)',
    '고기': '16:00 ~ 23:00 (주말 12:00~23:00)',
    '치킨': '16:00 ~ 01:00 (연중무휴)',
    '카페': '10:00 ~ 22:00',
    '술집': '17:00 ~ 02:00 (라스트오더 01:00)'
  };

  // ⚠️ 평점은 돌려주지 않습니다.
  //    예전에는 `4.4 + (placeName.charCodeAt(0) % 6) * 0.1` 로 별점을,
  //    `45 + (code % 350)` 으로 리뷰 수를 만들어 냈습니다. 이름 첫 글자로
  //    계산한 값이 실존 식당에 "⭐ 4.6 (340개 리뷰)" 로 붙어 나갔고,
  //    사람들은 그걸 보고 식당을 고릅니다. 출처가 없으면 보여주지 않습니다.
  //
  //    메뉴·가격·영업시간은 **카테고리 대표값**입니다. 특정 매장의 정보가
  //    아니므로 화면에서 그렇게 보이도록 표시해야 합니다.
  return {
    rating: '',
    menu: matched.menu,
    price: matched.price,
    business_hours: hoursMap[category] || '11:00 ~ 22:00',
    /** 이 값들이 특정 매장 확인 정보가 아니라 카테고리 대표값임을 표시 */
    isCategoryEstimate: true
  };
};

async function fetchWithTimeout(url: string, options: any, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

const fetchBatchPlaceDetailsWithGemini = async (
  places: { name: string; category: string }[],
  hubName: string,
  members: string[]
): Promise<Record<string, { rating: string; menu: string; price: string; description: string; business_hours: string }>> => {
  const result: Record<string, { rating: string; menu: string; price: string; description: string; business_hours: string }> = {};

  // Initialize defaults
  places.forEach(p => {
    const fallback = getPlaceDetailsByCategory(p.category, p.name);
    result[p.name] = {
      ...fallback,
      description: `메이트들이 선호하는 인기 매장`
    };
  });

  if (!GEMINI_API_KEY || places.length === 0) {
    return result;
  }

  try {
    const prompt = `
당신은 맛집 추천 전문가입니다. 아래 제공되는 ${places.length}개의 음식점 정보를 바탕으로 구글 검색을 통해 각각의 실제 대중 평점(리뷰수 포함), 대표 인기 메뉴 2~3가지, 1인당 평균 가격대, 그리고 실제 혹은 현실적인 영업시간(브레이크 타임 포함)을 조사해 주세요. 그리고 함께 모이는 메이트들의 선호 음식을 고려해 각 음식점별 '맞춤형 AI 매칭 코멘트'를 한 줄 평 형식으로 아주 짧게 작성해 주세요.

[대상 음식점 목록]
${places.map((p, idx) => `${idx + 1}. 매장명: ${p.name} (선호 카테고리: ${p.category}, 위치: ${hubName} 인근)`).join('\n')}

[참석 메이트 및 선호 음식]
${members.map(m => `- ${m}`).join('\n')}

[출력 규칙]
1. 결과는 다른 설명 없이 오직 규격화된 JSON 배열 객체로만 응답해야 합니다. 백틱(\`\`\`json) 마크다운을 포함하지 마세요.
2. 각 배열 원소는 다음 필드를 정확히 포함해야 합니다:
   - "name": 대상 매장명 (전달된 이름과 정확히 일치해야 함)
   - "rating": 실재하는 평점과 리뷰 개수 (예: "⭐ 4.6 (방문자 리뷰 340개)")
   - "menu": 해당 식당의 진짜 시그니처 인기 메뉴 2~3가지 (예: "숙성 통삼겹살, 김치찌개")
   - "price": 1인당 평균 식사 예산 (예: "1인당 약 15,000원 ~ 20,000원")
   - "business_hours": 영업시간 정보 (브레이크타임/정기휴무일을 포함하여 15자 내외로 매우 짧게 요약. 예: "11:00 ~ 22:00 (Break 15~17시)", "17:00 ~ 03:00")
   - "description": 존댓말이나 문장부호 없이 15~20자 내외의 극도로 짧고 명료한 한줄 평 AI 코멘트 (예: "고기 질이 좋고 넓어 쾌적한 회식 명소", "수제 맥주와 피자 궁합이 최고인 곳")
`;

    let response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          tools: [{
            googleSearch: {}
          }]
        })
      },
      30000
    );

    // If Search Grounding fails (e.g. 429 due to low Search limits on Free Tier), retry immediately without the Search Tool!
    if (!response.ok) {
      console.warn(`Bobyak: Gemini Search Grounding failed with status ${response.status}. Retrying query without Search tool...`);
      response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }]
          })
        },
        15000
      );
    }

    if (!response.ok) {
      throw new Error(`Gemini API Response Error: ${response.status}`);
    }

    const json = await response.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let cleanJsonText = rawText.trim();
    if (cleanJsonText.startsWith('```json')) {
      cleanJsonText = cleanJsonText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanJsonText.startsWith('```')) {
      cleanJsonText = cleanJsonText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const extracted = extractJsonString(cleanJsonText);
    const parsedArray = extracted ? JSON.parse(extracted) : null;
    if (parsedArray && Array.isArray(parsedArray)) {
      parsedArray.forEach(item => {
        if (item && item.name) {
          const matchKey = Object.keys(result).find(k => k.toLowerCase() === item.name.toLowerCase()) || item.name;

          const cleanCitation = (str: string) => {
            if (!str) return '';
            return str
              .replace(/\[cite:[^\]]*\]/g, '') // Removes [cite: 1, 2, ...]
              .replace(/\[\d+[^\]]*\]/g, '')   // Removes [10], [2 previous], etc.
              .replace(/\s+/g, ' ')            // Collapses multiple spaces
              .trim();
          };

          result[matchKey] = {
            rating: cleanCitation(item.rating) || result[matchKey].rating,
            menu: cleanCitation(item.menu) || result[matchKey].menu,
            price: cleanCitation(item.price) || result[matchKey].price,
            business_hours: cleanCitation(item.business_hours) || result[matchKey].business_hours || '정보 없음',
            description: cleanCitation(item.description) || result[matchKey].description
          };
        }
      });
    }
  } catch (err) {
    console.warn('Gemini batch place details fetch error:', err);
  }

  return result;
};

interface ScheduleGridProps {
  meetingDate: string;
  participants: Participant[];
  currentParticipantId: string;
  onSaveSchedule: (schedule: ScheduleAvailability) => void;
  isConfirmed?: boolean;
  confirmedSlot?: string;
  onConfirmSchedule?: (slot: string) => void;
  // Global Mode props
  isGlobal?: boolean;
  activeRooms?: Room[];
  onSelectRoom?: (room: Room) => void;
  onUpdateRoom?: () => void;
  // Coordination Mode props
  isCoordination?: boolean;
  myProfile?: Profile | null;
  follows?: Follow[];
  onCoordinationConfirm?: (
    title: string,
    startDate: string,
    selectedFriends: Profile[],
    locationName?: string,
    latitude?: number,
    longitude?: number
  ) => void;
  roomExpiresAt?: string;
  onViewProfile?: (profileId: string) => void;
  onRefreshFollows?: () => void;
  onSwipeBackBlockChange?: (blocked: boolean) => void;
  onRetryCoordination?: (roomId: string) => void;
  roomId?: string;
  roomOwner?: string;
  currentProfileId?: string;
  hideSummaryCard?: boolean;
}

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00'
];

/**
 * 시간표 격자 치수.
 *
 * ⚠️ 스타일과 **드래그 좌표 계산이 같은 값을 써야 합니다.** 예전에는 두 곳에
 *    `60` 과 `80` 이 각각 하드코딩돼 있어서, 한쪽만 바꾸면 손가락 위치와 칠해지는
 *    칸이 어긋납니다(조용히 틀리므로 눈에 잘 안 띕니다).
 */
const TIMETABLE_ROW_HEIGHT = 40;
const TIMETABLE_CELL_WIDTH = 80;
const TIMETABLE_TIME_COL_WIDTH = 60;
const TIMETABLE_HEADER_HEIGHT = 38;

const screenWidth = Dimensions.get('window').width;
const CALENDAR_WIDTH = screenWidth - 32;
const INNER_CAL_WIDTH = CALENDAR_WIDTH;

interface CalendarEvent {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  slots: string[];
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  meetingDate,
  participants,
  currentParticipantId,
  onSaveSchedule,
  isConfirmed = false,
  confirmedSlot = '',
  onConfirmSchedule,
  isGlobal = false,
  activeRooms = [],
  onSelectRoom,
  onUpdateRoom,
  isCoordination = false,
  myProfile = null,
  follows = [],
  onCoordinationConfirm,
  roomExpiresAt,
  onViewProfile,
  onRefreshFollows,
  onSwipeBackBlockChange,
  onRetryCoordination,
  roomId = '',
  roomOwner = '',
  currentProfileId = '',
  hideSummaryCard = false
}) => {
  const [activeTab, setActiveTab] = useState<'my' | 'group' | 'calendar'>(isGlobal ? 'calendar' : 'my');
  const isWeeklySettings = !isCoordination && !isGlobal && participants.length === 0 && !roomExpiresAt;

  // Calendar Sync states
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [calendarAccount, setCalendarAccount] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);

  // Device calendar에서 앱으로 이벤트 가져오기
  const loadDeviceCalendarEvents = async () => {
    try {
      const { status } = await expoCalendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') return;

      const calendars = await expoCalendar.getCalendarsAsync(expoCalendar.EntityTypes.EVENT);
      if (calendars.length === 0) return;

      // 지난 1개월부터 향후 3개월까지
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 1);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);

      const events = await expoCalendar.getEventsAsync(
        calendars.map(c => c.id),
        baseDate,
        endDate
      );

      // Device calendar 이벤트를 앱 형식으로 변환
      const convertedEvents: CalendarEvent[] = [];

      for (const event of events) {
        // '[내 일정]'으로 시작하는 이벤트는 앱에서 생성한 것이므로 제외
        if (event.title && event.title.startsWith('[내 일정]')) continue;
        // '[밀챗]'으로 시작하는 이벤트는 약속 확정 이벤트이므로 제외
        if (event.title && event.title.startsWith('[밀챗]')) continue;

        const startDate = new Date(event.startDate);
        const dateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

        const startHour = String(startDate.getHours()).padStart(2, '0');
        const startMinute = String(startDate.getMinutes()).padStart(2, '0');
        const startTimeStr = `${startHour}:${startMinute}`;

        // 해당 시간대의 모든 슬롯을 마크
        const slots: string[] = [];
        const endDate = new Date(event.endDate);

        let currentTime = new Date(startDate);
        while (currentTime < endDate) {
          const hour = String(currentTime.getHours()).padStart(2, '0');
          const minute = String(currentTime.getMinutes()).padStart(2, '0');
          slots.push(`${hour}:${minute}`);
          currentTime.setMinutes(currentTime.getMinutes() + 30);
        }

        convertedEvents.push({
          title: event.title || '일정',
          date: dateStr,
          startTime: startTimeStr,
          endTime: `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`,
          slots
        });
      }

      setCalendarEvents(convertedEvents);
      setLastSyncTime(Date.now());
    } catch (err) {
      console.warn('Error loading device calendar events:', err);
    }
  };

  // Device calendar에 앱 이벤트 추가
  const syncCalendarWithDevice = async (updatedEvents: CalendarEvent[]) => {
    try {
      const { status } = await expoCalendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') return;

      const calendars = await expoCalendar.getCalendarsAsync(expoCalendar.EntityTypes.EVENT);
      if (calendars.length === 0) return;

      const defaultCalendarId = calendars[0].id;

      // 기존 이벤트 중 '[내 일정]'으로 시작하는 것들은 모두 삭제
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - 1);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);

      const existingEvents = await expoCalendar.getEventsAsync([defaultCalendarId], baseDate, endDate);
      const myEvents = existingEvents.filter(e => e.title && e.title.startsWith('[내 일정]'));

      for (const event of myEvents) {
        try {
          await expoCalendar.deleteEventAsync(event.id);
        } catch (err) {
          console.warn('Failed to delete old event:', err);
        }
      }

      // 새로운 이벤트들을 추가
      for (const event of updatedEvents) {
        try {
          const [year, month, day] = event.date.split('-').map(Number);

          // startTime과 endTime이 있으면 사용, 없으면 하루 종일
          let startDate, endDate;
          if (event.startTime && event.endTime) {
            const [startHour, startMin] = event.startTime.split(':').map(Number);
            const [endHour, endMin] = event.endTime.split(':').map(Number);
            startDate = new Date(year, month - 1, day, startHour, startMin, 0);
            endDate = new Date(year, month - 1, day, endHour, endMin, 0);
          } else {
            startDate = new Date(year, month - 1, day, 0, 0, 0);
            endDate = new Date(year, month - 1, day, 23, 59, 59);
          }

          await expoCalendar.createEventAsync(defaultCalendarId, {
            title: `[내 일정] ${event.title || '시간표'}`,
            startDate,
            endDate,
            allDay: !event.startTime,
            notes: event.slots ? event.slots.join(', ') : '',
            timeZone: 'Asia/Seoul'
          });
        } catch (err) {
          console.warn('Failed to add event:', err);
        }
      }
    } catch (err) {
      console.warn('Calendar sync error:', err);
    }
  };

  // Friend Coordination selection states
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [coordinationRoomTitle, setCoordinationRoomTitle] = useState('');
  const [confirmingCoordination, setConfirmingCoordination] = useState(false);
  const [duration, setDuration] = useState(1);
  const [selectedHotplace, setSelectedHotplace] = useState<any | null>(null);
  const [coordinationRoomLocation, setCoordinationRoomLocation] = useState('');
  const [showChangeTimeModal, setShowChangeTimeModal] = useState(false);
  const [changeTimeDate, setChangeTimeDate] = useState('');
  const [changeTimeHour, setChangeTimeHour] = useState('19');
  const [changeTimeMinute, setChangeTimeMinute] = useState('30');
  const [roomLatitude, setRoomLatitude] = useState<number | null>(null);
  const [roomLongitude, setRoomLongitude] = useState<number | null>(null);
  const [showLocationMapModal, setShowLocationMapModal] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.5665,
    longitude: 126.9780,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [friendsWhoMarkedMeBest, setFriendsWhoMarkedMeBest] = useState<string[]>([]);

  // Search & add friend states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [addFriendName, setAddFriendName] = useState('');
  const [addFriendTag, setAddFriendTag] = useState('');
  const [addFriendLoading, setAddFriendLoading] = useState(false);

  // Date selection states (Single selection only)
  // 날짜 선택 모드. 현재는 단일 선택만 지원합니다.
  // 'range'(2일 이상 기간 선택) 기능은 미구현 상태로, 값을 바꾸는 코드가 없습니다.
  const selectMode = 'single';
  const [weatherForecast, setWeatherForecast] = useState<Record<string, { code: number; icon: string }>>({});

  useEffect(() => {
    if (showChangeTimeModal && confirmedSlot) {
      const dateParts = confirmedSlot.split(' ');
      if (dateParts.length >= 3) {
        const timePart = dateParts[dateParts.length - 1];
        const datePart = dateParts.slice(0, dateParts.length - 1).join(' ');
        setChangeTimeDate(datePart);
        const timeSubParts = timePart.split(':');
        if (timeSubParts.length === 2) {
          setChangeTimeHour(timeSubParts[0]);
          setChangeTimeMinute(timeSubParts[1]);
        }
      } else {
        setChangeTimeDate(confirmedSlot);
      }
    } else if (showChangeTimeModal) {
      const formattedDefaultDate = new Date(meetingDate).toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      });
      setChangeTimeDate(formattedDefaultDate);
    }
  }, [showChangeTimeModal, confirmedSlot, meetingDate]);

  // Device calendar 동기화 - 주기적으로 확인
  useEffect(() => {
    // 초기 로드
    loadDeviceCalendarEvents();

    // 30초마다 동기화
    const syncInterval = setInterval(() => {
      loadDeviceCalendarEvents();
    }, 30000);

    return () => clearInterval(syncInterval);
  }, []);

  // activeRooms 변경 감지 - 확정된 약속 업데이트
  useEffect(() => {
    // activeRooms가 변경되면 컴포넌트가 자동으로 재렌더링됨
    // 이는 isBusySlot 계산을 다시 하게 함
  }, [activeRooms]);

  useEffect(() => {
    setDuration(1);

    const loadWeather = async () => {
      const lat = myProfile?.start_latitude || 37.5665;
      const lng = myProfile?.start_longitude || 126.9780;
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode&timezone=Asia%2FSeoul&forecast_days=16`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.daily && data.daily.time && data.daily.weathercode) {
          const mapping: Record<string, { code: number; icon: string }> = {};

          // 1. Populate real 16 days weather
          data.daily.time.forEach((dateStr: string, index: number) => {
            const code = data.daily.weathercode[index];
            let icon = '☀️';
            if ([1, 2, 3].includes(code)) icon = '🌤️';
            else if ([45, 48].includes(code)) icon = '🌫️';
            else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) icon = '☔';
            else if ([71, 73, 75, 77, 85, 86].includes(code)) icon = '❄️';
            else if ([95, 96, 99].includes(code)) icon = '⛈️';
            mapping[dateStr] = { code, icon };
          });

          setWeatherForecast(mapping);
        }
      } catch (err) {
        console.error('Error fetching weather forecast:', err);
      }
    };
    loadWeather();
  }, [myProfile?.start_latitude, myProfile?.start_longitude]);

  // Calendar Sliding states
  const [selectedDate, setSelectedDate] = useState<string>(meetingDate || new Date().toISOString().split('T')[0]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<{ date: string; time: string } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(1); // 0: Prev, 1: Current, 2: Next, 3: Next-Next
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [gridWidth, setGridWidth] = useState(CALENDAR_WIDTH - 32);

  // Ad monetization states for AI hotplace recommendations
  const [isAdUnlocked, setIsAdUnlocked] = useState(false);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adSecondsLeft, setAdSecondsLeft] = useState(5);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAdPlaying && adSecondsLeft > 0) {
      timer = setInterval(() => {
        setAdSecondsLeft(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAdPlaying, adSecondsLeft]);

  const handleStartAd = () => {
    setAdSecondsLeft(5);
    setIsAdPlaying(true);
    // Start fetching AI details in the background immediately while the ad is playing!
    if (closestHubName) {
      loadAIDetailsForHub(closestHubName, false);
    }
  };

  const [closestHubName, setClosestHubName] = useState<string>('');
  const [loadingAIDetails, setLoadingAIDetails] = useState(false);

  const handleFinishAd = () => {
    setIsAdPlaying(false);
    setIsAdUnlocked(true);
    Alert.alert('🔓 잠금해제 완료', '광고 시청이 완료되어 메이트 맞춤형 AI 상세 취향 분석 코멘트가 오픈되었습니다! 🎉');
  };

  const loadAIDetailsForHub = async (hubName: string, shouldUnlockUI = true) => {
    const places = kakaoPlaces[hubName] || [];
    if (places.length === 0) {
      if (shouldUnlockUI) setIsAdUnlocked(true);
      return;
    }

    // Check if we already have AI details loaded
    if (places.every(p => p.hasAIDetails)) {
      if (shouldUnlockUI) setIsAdUnlocked(true);
      return;
    }

    setLoadingAIDetails(true);
    if (shouldUnlockUI) setIsAdUnlocked(true);

    try {
      const activeLocs = getActiveHeatmapParticipants();
      const memberNames = activeLocs.map(p => {
        const likes = p.personal_data?.likes || [];
        return `${p.name} (선호 음식: ${likes.join(', ') || '없음'})`;
      });

      console.log(`Bobyak: [Background Unlock AI] Fetching Gemini details for ${places.length} places in ${hubName}...`);
      const batchDetailsMap = await fetchBatchPlaceDetailsWithGemini(
        places.map(p => ({ name: p.name, category: p.category })),
        hubName,
        memberNames
      );

      setKakaoPlaces(prev => {
        const currentPlaces = prev[hubName] || [];
        const updated = currentPlaces.map(p => {
          const details = batchDetailsMap[p.name];
          if (details) {
            return {
              ...p,
              description: details.description,
              rating: details.rating,
              menu: details.menu,
              price: details.price,
              business_hours: details.business_hours || p.business_hours,
              hasAIDetails: true
            };
          }
          return p;
        });
        return {
          ...prev,
          [hubName]: updated
        };
      });
    } catch (err) {
      console.warn('Error loading AI details on unlock:', err);
    } finally {
      setLoadingAIDetails(false);
    }
  };

  // Kakao places cache state
  const [kakaoPlaces, setKakaoPlaces] = useState<Record<string, any[]>>({});
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const loadingHubsRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const activeLocs = getActiveHeatmapParticipants();
    if (activeLocs.length < 1) return;

    let totalLat = 0;
    let totalLng = 0;
    let validCount = 0;

    // 출발지를 설정하지 않은 참여자는 중심점 계산에서 제외합니다.
    // 예전에는 서울시청(37.5665, 126.9780)으로 대체했는데, 부산 모임에서
    // 미설정 참여자 한 명만 있어도 중심점이 수백 km 북쪽으로 끌려갔습니다.
    activeLocs.forEach(p => {
      if (typeof p.start_latitude !== 'number' || typeof p.start_longitude !== 'number') return;
      totalLat += p.start_latitude;
      totalLng += p.start_longitude;
      validCount++;
    });

    if (validCount === 0) return;

    const avgLat = totalLat / validCount;
    const avgLng = totalLng / validCount;

    // Define some major Seoul & Busan hubs to find the closest one
    const hubs = [
      { name: '강남역', latitude: 37.4979, longitude: 127.0276 },
      { name: '홍대입구역', latitude: 37.5569, longitude: 126.9239 },
      { name: '사당역', latitude: 37.4765, longitude: 126.9816 },
      { name: '왕십리역', latitude: 37.5619, longitude: 127.0385 },
      { name: '서울역', latitude: 37.5547, longitude: 126.9706 },
      { name: '혜화역', latitude: 37.5822, longitude: 127.0018 },
      { name: '건대입구역', latitude: 37.5404, longitude: 127.0692 },
      { name: '신도림역', latitude: 37.5088, longitude: 126.8912 },
      { name: '서면역', latitude: 35.1585, longitude: 129.0595 },
      { name: '부산역', latitude: 35.1150, longitude: 129.0422 },
      { name: '센텀시티역', latitude: 35.1689, longitude: 129.1315 },
      { name: '해운대역', latitude: 35.1622, longitude: 129.1585 }
    ];

    let closestHub = hubs[0];
    let minDistance = 999999;

    hubs.forEach(h => {
      const dist = Math.sqrt(Math.pow(h.latitude - avgLat, 2) + Math.pow(h.longitude - avgLng, 2));
      if (dist < minDistance) {
        minDistance = dist;
        closestHub = h;
      }
    });

    // Determine Cafe vs Bar based on participants' alcohol preference
    let drinkPreferenceCount = 0;
    let noDrinkCount = 0;
    activeLocs.forEach(p => {
      const liquors = p.personal_data?.alcoholLiquor || [];
      if (liquors.length > 0) {
        drinkPreferenceCount++;
      } else {
        noDrinkCount++;
      }
    });
    const recommendType = drinkPreferenceCount > noDrinkCount ? '술집' : '카페';

    const allLikes: string[] = [];
    activeLocs.forEach(p => {
      const likes = p.personal_data?.likes || [];
      likes.forEach((l: string) => {
        if (!allLikes.includes(l) && l !== '카페' && l !== '술집') allLikes.push(l);
      });
    });

    const matchedCategories = [
      ...(allLikes.length > 0 ? allLikes.slice(0, 2) : ['한식', '일식']),
      recommendType
    ];

    // Set closest hub name in state
    setClosestHubName(closestHub.name);

    // Check if we already have cache for this hub
    if (kakaoPlaces[closestHub.name]) return;
    if (loadingHubsRef.current[closestHub.name]) return;

    const loadPlaces = async () => {
      loadingHubsRef.current[closestHub.name] = true;
      console.log('Bobyak: [loadPlaces] Start fetching places for closest hub:', closestHub.name, 'Categories:', matchedCategories);
      setLoadingPlaces(true);
      try {
        const results: any[] = [];

        for (const cat of matchedCategories) {
          const query = `${closestHub.name} ${cat}`;
          console.log(`Bobyak: [loadPlaces] Querying Kakao for: "${query}"`);
          const places = await fetchKakaoPlaces(query, closestHub.latitude, closestHub.longitude);
          if (places && places.length > 0) {
            const p = places[0];
            const fallback = getPlaceDetailsByCategory(cat, p.place_name);
            results.push({
              category: cat,
              name: p.place_name,
              basicInfo: `${p.road_address_name || p.address_name} (약 ${parseInt(p.distance || '0').toLocaleString()}m)`,
              description: `메이트들이 선호하는 인기 매장`,
              rating: fallback.rating,
              menu: fallback.menu,
              price: fallback.price,
              business_hours: fallback.business_hours,
              hasAIDetails: false // Mark that AI details are not loaded yet
            });
          }
        }

        console.log(`Bobyak: [loadPlaces] Successfully loaded ${results.length} venues from Kakao API.`);
        setKakaoPlaces(prev => ({
          ...prev,
          [closestHub.name]: results
        }));
      } catch (err) {
        console.error('Error fetching places:', err);
      } finally {
        setLoadingPlaces(false);
      }
    };

    loadPlaces();
  }, [selectedFriendIds.join(','), myProfile?.start_latitude, myProfile?.start_longitude, closestHubName]);

  // Calendar Note states
  interface CalendarNote {
    id: string;
    profile_id: string;
    date: string;
    title: string;
    content: string;
    visibility: 'public' | 'best' | 'private';
    created_at: string;
    profiles?: {
      name: string;
      avatar_color: string;
      avatar_url?: string;
    };
    color?: string;
    time?: string;
    end_time?: string;
    // 여러 날에 걸친 메모의 기간 (insert/update 시 함께 저장됨, 1941~1951행)
    start_date?: string;
    end_date?: string;
    calendar_event_id?: string;
  }

  const [notes, setNotes] = useState<CalendarNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteVisibility, setNoteVisibility] = useState<'public' | 'best' | 'private'>('public');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [noteColor, setNoteColor] = useState<string>('#3b82f6');
  const [noteDuration, setNoteDuration] = useState<number>(1);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [isCalSyncSwitchEnabled, setIsCalSyncSwitchEnabled] = useState(false);
  const gridRef = useRef<View>(null);
  const gridLayoutRef = useRef<{ pageX: number; pageY: number; width: number; height: number }>({ pageX: 0, pageY: 0, width: 0, height: 0 });

  // Map mySchedule[date] to initialSlots (24 booleans, true = free/available)
  const getInitialSlotsForDate = (date: string): boolean[] => {
    const available = mySchedule[date] || [];
    const slots = Array(24).fill(false); // default all to busy (false)

    for (let hour = 0; hour < 24; hour++) {
      const slot00 = `${String(hour).padStart(2, '0')}:00`;
      const slot30 = `${String(hour).padStart(2, '0')}:30`;

      if (available.includes(slot00) || available.includes(slot30)) {
        slots[hour] = true; // free/available
      }
    }
    return slots;
  };

  const handleSaveCalendarModal = async (date: string, hourlySlots: boolean[]) => {
    const available: string[] = [];

    for (let hour = 0; hour < 24; hour++) {
      const slot00 = `${String(hour).padStart(2, '0')}:00`;
      const slot30 = `${String(hour).padStart(2, '0')}:30`;

      if (hourlySlots[hour]) { // free (dragged)
        available.push(slot00);
        available.push(slot30);
      }
    }

    setMySchedule(prev => {
      const updated = { ...prev };
      updated[date] = available;
      onSaveSchedule(updated);
      return updated;
    });

    // Device calendar과 동기화
    if (available.length > 0) {
      const isBusy = available.length < 48; // 48 = 24시간 * 2 (30분 단위)
      if (isBusy) {
        // 바쁜 시간을 device calendar에 추가
        const busySlots: string[] = [];
        for (let hour = 0; hour < 24; hour++) {
          if (!hourlySlots[hour]) {
            busySlots.push(`${String(hour).padStart(2, '0')}:00`);
            busySlots.push(`${String(hour).padStart(2, '0')}:30`);
          }
        }

        if (busySlots.length > 0) {
          const event: CalendarEvent = {
            title: '바쁜 시간',
            date,
            startTime: busySlots[0],
            endTime: busySlots[busySlots.length - 1],
            slots: busySlots
          };

          const updatedEvents = [...calendarEvents];
          const existingIndex = updatedEvents.findIndex(e => e.date === date && e.title === '바쁜 시간');
          if (existingIndex >= 0) {
            updatedEvents[existingIndex] = event;
          } else {
            updatedEvents.push(event);
          }

          setCalendarEvents(updatedEvents);
          await syncCalendarWithDevice(updatedEvents);
        }
      }
    }

    setShowCalendarModal(false);
  };

  const getBusyTimeChipsForDate = (date: string) => {
    const myProfileId = isCoordination ? myProfile?.id : currentParticipant?.profile_id;
    const availableSlots = mySchedule[date] || [];
    const busySlots: string[] = [];

    TIME_SLOTS.forEach(time => {
      const isLocalBusy = calendarEvents.some(e => e.date === date && e.slots.includes(time));
      const isNoteBusy = myProfileId ? isParticipantBusyAt(myProfileId, date, time) : false;
      const isNotAvailable = !availableSlots.includes(time);

      if (isLocalBusy || isNoteBusy || isNotAvailable) {
        busySlots.push(time);
      }
    });

    if (busySlots.length === 0) return [];

    const slotsInMinutes = busySlots.map(time => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    }).sort((a, b) => a - b);

    const grouped: string[] = [];
    let start = slotsInMinutes[0];
    let prev = slotsInMinutes[0];

    for (let i = 1; i < slotsInMinutes.length; i++) {
      const curr = slotsInMinutes[i];
      if (curr === prev + 30) {
        prev = curr;
      } else {
        const startStr = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
        const end = prev + 30;
        const endStr = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
        grouped.push(`${startStr} ~ ${endStr}`);
        start = curr;
        prev = curr;
      }
    }
    const startStr = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
    const end = prev + 30;
    const endStr = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
    grouped.push(`${startStr} ~ ${endStr}`);

    return grouped;
  };

  useEffect(() => {
    const loadSyncSwitch = async () => {
      const val = await storage.getItem('@meety_calendar_sync_enabled');
      setIsCalSyncSwitchEnabled(val === 'true');
    };
    loadSyncSwitch();
  }, []);

  const handleToggleCalSyncSwitch = async (value: boolean) => {
    setIsCalSyncSwitchEnabled(value);
    await storage.setItem('@meety_calendar_sync_enabled', value ? 'true' : 'false');
    if (value) {
      await syncNativeCalendar();
    } else {
      await handleDisconnectCalendar();
    }
  };

  // Time setting states for notes
  const [noteTimeEnabled, setNoteTimeEnabled] = useState(false);
  const [noteTimeAmPm, setNoteTimeAmPm] = useState<'오전' | '오후'>('오후');
  const [noteTimeHour, setNoteTimeHour] = useState('12');
  const [noteTimeMinute, setNoteTimeMinute] = useState('00');
  const [noteEndTimeAmPm, setNoteEndTimeAmPm] = useState<'오전' | '오후'>('오후');
  const [noteEndTimeHour, setNoteEndTimeHour] = useState('01');
  const [noteEndTimeMinute, setNoteEndTimeMinute] = useState('00');
  const [activeTimeField, setActiveTimeField] = useState<'start' | 'end'>('start');
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadCalendarNotes();

      if (isCalendarConnected) {
        const { status } = await expoCalendar.getCalendarPermissionsAsync();
        if (status === 'granted') {
          await syncNativeCalendar();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const isDragging = useRef(false);
  const dragMode = useRef<'select' | 'deselect' | null>(null);
  const lastIndex = useRef<number | null>(null);

  const getMeetingDateDisplay = (room: Room) => {
    if (!room.meeting_date || !room.expires_at) return '';
    try {
      const diffTime = new Date(room.expires_at).getTime() - new Date(room.meeting_date).getTime();
      const diffDays = Math.round(diffTime / (24 * 60 * 60 * 1000));
      const duration = diffDays - 1;
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

  // Generate months to display up to next-next month
  const getMonthsList = () => {
    const base = meetingDate ? new Date(meetingDate) : new Date();
    const months = [];
    for (let i = -1; i <= 4; i++) { // Let user view up to 4 months later to easily cover next-next month
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(), // 0-indexed
        label: `${d.getFullYear()}년 ${d.getMonth() + 1}월`
      });
    }
    return months;
  };

  const monthsList = getMonthsList();

  // Generate dates up to the end of the next-next month
  const isOneDay = !isCoordination && !isGlobal && roomExpiresAt && (() => {
    if (!meetingDate || !roomExpiresAt) return true;
    const start = new Date(meetingDate).getTime();
    const expires = new Date(roomExpiresAt).getTime();
    const diffDays = Math.round((expires - start) / (24 * 60 * 60 * 1000));
    return diffDays <= 3;
  })();

  const getGridDates = () => {
    const base = meetingDate
      ? new Date(meetingDate.includes('T') ? meetingDate : `${meetingDate}T00:00:00`)
      : new Date();

    if (isOneDay) {
      const yyyy = base.getFullYear();
      const mm = (base.getMonth() + 1).toString().padStart(2, '0');
      const dd = base.getDate().toString().padStart(2, '0');
      return [`${yyyy}-${mm}-${dd}`];
    }

    // Check if we are in Tab 3 Settings "7-day schedule input mode"
    if (isWeeklySettings) {
      const dates = [];
      let cur = new Date(base.getFullYear(), base.getMonth(), base.getDate());
      for (let i = 0; i < 7; i++) {
        const yyyy = cur.getFullYear();
        const mm = (cur.getMonth() + 1).toString().padStart(2, '0');
        const dd = cur.getDate().toString().padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
        cur.setDate(cur.getDate() + 1);
      }
      return dates;
    }

    // Calculate the last day of the next-next month (e.g. if June, next-next month is August, last day is Aug 31)
    const targetEndDate = new Date(base.getFullYear(), base.getMonth() + 3, 0);

    const dates = [];
    let cur = new Date(base.getFullYear(), base.getMonth(), base.getDate());

    // Safety limit to prevent infinite loops (max 120 days)
    let limit = 0;
    while (cur <= targetEndDate && limit < 120) {
      const yyyy = cur.getFullYear();
      const mm = (cur.getMonth() + 1).toString().padStart(2, '0');
      const dd = cur.getDate().toString().padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      cur.setDate(cur.getDate() + 1);
      limit++;
    }
    return dates;
  };

  const gridDates = getGridDates();

  const currentParticipant = participants.find(p => p.id === currentParticipantId);
  const initialSchedule = isCoordination
    ? (myProfile?.schedule || {})
    : (currentParticipant?.schedule || {});
  const [mySchedule, setMySchedule] = useState<ScheduleAvailability>(initialSchedule);

  // Scroll to current month on mount
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: INNER_CAL_WIDTH * 1, animated: false });
    }, 150);
  }, []);

  // Sync loaded schedule
  useEffect(() => {
    if (isCoordination) {
      if (myProfile?.schedule) {
        setMySchedule(myProfile.schedule);
      }
    } else {
      if (currentParticipant?.schedule) {
        setMySchedule(currentParticipant.schedule);
      }
    }
  }, [currentParticipant?.schedule, myProfile?.schedule]);

  // Load cached calendar events state
  useEffect(() => {
    const loadCache = async () => {
      const storageKeyId = 'global';
      const cachedConnected = await storage.getItem(`bobyak_cal_conn_${storageKeyId}`) === 'true';
      const cachedAccount = await storage.getItem(`bobyak_cal_acct_${storageKeyId}`);

      // Storage 이전 이벤트 데이터 삭제
      await storage.removeItem(`bobyak_cal_events_${storageKeyId}`);

      if (cachedConnected && cachedAccount) {
        setIsCalendarConnected(true);
        setCalendarAccount(cachedAccount);
      }
      setCalendarEvents([]); // 항상 빈 배열로 초기화
    };
    loadCache();
  }, [currentParticipantId, isCoordination]);

  // Auto-sync calendar if permission already granted
  useEffect(() => {
    const checkPermissionAndSync = async () => {
      try {
        const { status } = await expoCalendar.getCalendarPermissionsAsync();
        if (status === 'granted') {
          await syncNativeCalendar();
        }
      } catch (err) {
        console.log('Error checking calendar permission:', err);
      }
    };
    checkPermissionAndSync();
  }, [currentParticipantId, meetingDate, isCoordination]);

  // Automatically block out calendar busy slots whenever calendarEvents changes
  useEffect(() => {
    if (calendarEvents.length === 0) return;

    setMySchedule(prev => {
      const updated = { ...prev };
      let changed = false;
      calendarEvents.forEach(event => {
        const currentAvailable = updated[event.date] || [...TIME_SLOTS];
        const originalLength = currentAvailable.length;
        const filtered = currentAvailable.filter(slot => !event.slots.includes(slot));
        if (filtered.length !== originalLength || !updated[event.date]) {
          updated[event.date] = filtered;
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [calendarEvents]);

  // Fetch native device calendar (For the 3 months range)
  const syncNativeCalendar = async () => {
    const add30Minutes = (timeStr: string): string => {
      const [h, min] = timeStr.split(':').map(Number);
      const m = min + 30;
      const hour = h + Math.floor(m / 60);
      const minutes = m % 60;
      return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    try {
      setSyncing(true);
      const { status } = await expoCalendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        setSyncing(false);
        Alert.alert('권한 필요', '캘린더 접근 권한이 거부되었습니다. 설정에서 권한을 허용해 주세요.');
        return;
      }

      const calendars = await expoCalendar.getCalendarsAsync(expoCalendar.EntityTypes.EVENT);
      const calendarIds = calendars.map(cal => cal.id);

      // 3 months range
      const base = meetingDate ? new Date(meetingDate) : new Date();
      const startDate = new Date(base.getFullYear(), base.getMonth() - 1, 1);
      const endDate = new Date(base.getFullYear(), base.getMonth() + 3, 0, 23, 59, 59);

      const events = await expoCalendar.getEventsAsync(calendarIds, startDate, endDate);

      // Collect all dates in this 3-month range (local timezone)
      const getLocalDateString = (d: Date): string => {
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const allDates: string[] = [];
      let tempDate = new Date(startDate);
      while (tempDate <= endDate) {
        allDates.push(getLocalDateString(tempDate));
        tempDate.setDate(tempDate.getDate() + 1);
      }

      const parsedEvents: CalendarEvent[] = [];
      events.forEach(evt => {
        const eventStart = new Date(evt.startDate);
        const eventEnd = new Date(evt.endDate);
        const title = evt.title || '개인 일정';

        allDates.forEach(date => {
          const slotsForThisDay: string[] = [];

          TIME_SLOTS.forEach(time => {
            const [y, m, d] = date.split('-').map(Number);
            const [h, min] = time.split(':').map(Number);
            const slotStart = new Date(y, m - 1, d, h, min, 0);
            const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

            if (eventStart < slotEnd && slotStart < eventEnd) {
              slotsForThisDay.push(time);
            }
          });

          if (slotsForThisDay.length > 0) {
            parsedEvents.push({
              title,
              date,
              startTime: slotsForThisDay[0],
              endTime: add30Minutes(slotsForThisDay[slotsForThisDay.length - 1]),
              slots: slotsForThisDay
            });
          }
        });
      });

      setCalendarEvents(parsedEvents);
      setIsCalendarConnected(true);
      setCalendarAccount('기기 시스템 캘린더');

      const storageKeyId = 'global';
      await storage.setItem(`bobyak_cal_conn_${storageKeyId}`, 'true');
      await storage.setItem(`bobyak_cal_acct_${storageKeyId}`, '기기 시스템 캘린더');
      await storage.setItem(`bobyak_cal_events_${storageKeyId}`, JSON.stringify(parsedEvents));

      // 4. Sync updates/deletes from native calendar back to calendar_notes database table!
      let databaseChanged = false;

      const currentParticipant = participants.find(p => p.id === currentParticipantId);
      const myProfileId = isCoordination ? myProfile?.id : currentParticipant?.profile_id;
      let currentNotes: CalendarNote[] = [];
      if (myProfileId) {
        const { data: dbNotes } = await supabase
          .from('calendar_notes')
          .select('*')
          .eq('profile_id', myProfileId);
        currentNotes = dbNotes || [];
      }

      for (const note of currentNotes) {
        if (!note.calendar_event_id) continue;

        // Try to find matching event in native fetched events
        const nativeEvt = events.find(evt => evt.id === note.calendar_event_id);

        if (nativeEvt) {
          // Check if properties have changed
          const nativeStartDateObj = new Date(nativeEvt.startDate);
          const nativeEndDateObj = new Date(nativeEvt.endDate);
          const nativeDateStr = getLocalDateString(nativeStartDateObj);

          const nativeStartTimeStr = `${String(nativeStartDateObj.getHours()).padStart(2, '0')}:${String(nativeStartDateObj.getMinutes()).padStart(2, '0')}`;
          const nativeEndTimeStr = `${String(nativeEndDateObj.getHours()).padStart(2, '0')}:${String(nativeEndDateObj.getMinutes()).padStart(2, '0')}`;

          const titleChanged = note.title !== nativeEvt.title;
          const dateChanged = note.date !== nativeDateStr;
          const timeChanged = note.time !== nativeStartTimeStr || note.end_time !== nativeEndTimeStr;
          const contentChanged = nativeEvt.notes && note.content !== nativeEvt.notes;

          if (titleChanged || dateChanged || timeChanged || contentChanged) {
            console.log(`Bobyak: [Native Sync] Updating note ${note.id} due to native calendar edits...`);
            const { error: updateError } = await supabase
              .from('calendar_notes')
              .update({
                title: nativeEvt.title || '개인 일정',
                content: nativeEvt.notes || note.content,
                date: nativeDateStr,
                time: nativeStartTimeStr,
                end_time: nativeEndTimeStr
              })
              .eq('id', note.id);

            if (!updateError) {
              databaseChanged = true;
            } else {
              console.error('Error syncing note update from native calendar:', updateError);
            }
          }
        } else {
          // Only delete if the note date falls within the fetched 3-month range!
          const noteDateObj = new Date(note.date);
          if (noteDateObj >= startDate && noteDateObj <= endDate) {
            console.log(`Bobyak: [Native Sync] Deleting note ${note.id} because it was removed from native calendar...`);
            const { error: deleteError } = await supabase
              .from('calendar_notes')
              .delete()
              .eq('id', note.id);

            if (!deleteError) {
              databaseChanged = true;
            } else {
              console.error('Error syncing note deletion from native calendar:', deleteError);
            }
          }
        }
      }

      if (databaseChanged) {
        await loadCalendarNotes();
      }

    } catch (err: any) {
      console.error(err);
      Alert.alert('오류', `캘린더 일정을 가져오는 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleLoadDemoEvents = async () => {
    setSyncing(true);
    setTimeout(async () => {
      const events: CalendarEvent[] = [];
      setCalendarEvents(events);
      setIsCalendarConnected(true);
      setCalendarAccount('시뮬레이션_기기일정.ics');

      const storageKeyId = 'global';
      await storage.setItem(`bobyak_cal_conn_${storageKeyId}`, 'true');
      await storage.setItem(`bobyak_cal_acct_${storageKeyId}`, '시뮬레이션_기기일정.ics');
      await storage.setItem(`bobyak_cal_events_${storageKeyId}`, JSON.stringify(events));

      setSyncing(false);
    }, 800);
  };

  const handleDisconnectCalendar = async () => {
    setIsCalendarConnected(false);
    setCalendarAccount(null);
    setCalendarEvents([]);
    const storageKeyId = 'global';
    await storage.removeItem(`bobyak_cal_conn_${storageKeyId}`);
    await storage.removeItem(`bobyak_cal_acct_${storageKeyId}`);
    await storage.removeItem(`bobyak_cal_events_${storageKeyId}`);
  };

  // Helper to dynamically resolve start/end date for a note
  const getNoteRange = (note: CalendarNote, allNotes: CalendarNote[]) => {
    const startDate = note.start_date;
    const endDate = note.end_date;
    if (startDate && endDate) {
      return { startDate, endDate };
    }
    // Dynamic grouping for legacy/unpopulated notes that form a contiguous series of the same event
    const sameSeries = allNotes.filter(n =>
      n.profile_id === note.profile_id &&
      n.title === note.title &&
      n.content === note.content
    );
    if (sameSeries.length > 1) {
      const dates = sameSeries.map(n => n.date).sort();
      return {
        startDate: dates[0],
        endDate: dates[dates.length - 1]
      };
    }
    return {
      startDate: note.date,
      endDate: note.date
    };
  };

  const loadCalendarNotes = async () => {
    const currentParticipant = participants.find(p => p.id === currentParticipantId);
    const myProfileId = isCoordination ? myProfile?.id : currentParticipant?.profile_id;
    if (!myProfileId) return;

    try {
      setLoadingNotes(true);

      // Friends who marked me best friends
      const { data: inverseFollows } = await supabase
        .from('follows')
        .select('follower_id, role')
        .eq('following_id', myProfileId);

      const markedBestIds = inverseFollows
        ?.filter(f => f.role === 'leader')
        ?.map(f => f.follower_id) || [];
      setFriendsWhoMarkedMeBest(markedBestIds);
      const currentFriendsWhoMarkedMeBest = markedBestIds;

      let targetIds: string[] = [];
      if (isCoordination) {
        // Friend IDs that I follow
        const friendIds = (follows || []).map(f => f.following_id);
        targetIds = [myProfileId, ...friendIds];
      } else {
        // Room mode: Fetch notes for all participants in the room
        targetIds = participants.map(p => p.profile_id).filter(Boolean) as string[];
        if (!targetIds.includes(myProfileId)) {
          targetIds.push(myProfileId);
        }
      }

      if (targetIds.length === 0) {
        setNotes([]);
        return;
      }

      const { data, error } = await supabase
        .from('calendar_notes')
        .select('*, profiles(name, avatar_color)')
        .in('profile_id', targetIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter notes by visibility
      const filtered = (data || []).filter((note: any) => {
        if (note.profile_id === myProfileId) return true;
        if (note.visibility === 'public') return true;
        if (note.visibility === 'best') {
          return currentFriendsWhoMarkedMeBest.includes(note.profile_id);
        }
        return false;
      });

      setNotes(filtered as CalendarNote[]);
    } catch (err) {
      console.error('Error loading calendar notes:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const isParticipantBusyAt = (profileId: string, date: string, time: string): boolean => {
    // 1. Check notes in calendar_notes
    const isBusyInNotes = notes.some(note => {
      if (note.profile_id !== profileId) return false;

      const range = getNoteRange(note, notes);
      if (date < range.startDate || date > range.endDate) return false;

      if (note.time) {
        if (note.end_time) {
          return time >= note.time && time < note.end_time;
        } else {
          return time === note.time;
        }
      }
      return false;
    });

    if (isBusyInNotes) return true;

    // 2. Check confirmed bobyak rooms in activeRooms
    if (activeRooms && activeRooms.length > 0) {
      for (const room of activeRooms) {
        if (!room.is_confirmed || !room.confirmed_slot) continue;

        // 범위 약속 확인
        if (room.confirmed_slot.includes('~')) {
          // Multi-day range (e.g., "2026-06-28 ~ 2026-06-30 (3일간)")
          const parts = room.confirmed_slot.split('~');
          if (parts.length === 2) {
            const startStr = parts[0].trim();
            const endStr = parts[1].trim().split(' ')[0]; // Extract YYYY-MM-DD
            if (date >= startStr && date <= endStr) {
              return true; // 범위 내의 모든 시간이 바쁨
            }
          }
        } else {
          // 단일 날짜 약속
          if (room.meeting_date === date) {
            // 시간 확인
            const timeMatch = room.confirmed_slot.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
              const slotHour = parseInt(timeMatch[1]);
              const slotMinute = parseInt(timeMatch[2]);
              const [timeHour, timeMinute] = time.split(':').map(Number);

              // 약속 시간부터 1시간(연속된 30분 슬롯 2개)을 바쁨으로 표시합니다.
              // 예전에는 "같은 시(時)면 분과 무관하게 바쁨" + "다음 시는 분이
              // 있을 때만" 이었는데, :30 에 시작하는 약속에서는 시작 30분 전
              // (예: 19:30 약속인데 19:00 도 바쁨으로 표시)까지 잘못 막혔습니다.
              const apptMinutes = slotHour * 60 + slotMinute;
              const slotMinutes = timeHour * 60 + timeMinute;
              if (slotMinutes === apptMinutes || slotMinutes === apptMinutes + 30) return true;
            }
          }
        }
      }
    }

    return false;
  };

  const formatNoteTimeRange = (note: CalendarNote) => {
    if (!note.time) return '';

    const parsedStart = convert24hToAmPm(note.time);
    const startStr = `${parsedStart.ampm} ${parseInt(parsedStart.hour, 10)}:${parsedStart.minute}`;

    // Check if it's a multi-day note using getNoteRange
    const range = getNoteRange(note, notes);
    const isMultiDay = range.startDate !== range.endDate;

    if (isMultiDay && range.startDate && range.endDate) {
      const [, startM, startD] = range.startDate.split('-');
      const [, endM, endD] = range.endDate.split('-');
      const startMD = `${parseInt(startM, 10)}/${parseInt(startD, 10)}일`;
      const endMD = `${parseInt(endM, 10)}/${parseInt(endD, 10)}일`;

      if (note.end_time) {
        const parsedEnd = convert24hToAmPm(note.end_time);
        const endStr = `${parsedEnd.ampm} ${parseInt(parsedEnd.hour, 10)}:${parsedEnd.minute}`;
        return `⏰ ${startMD} ${startStr} ~ ${endMD} ${endStr}`;
      }
      return `⏰ ${startMD} ${startStr}`;
    } else {
      if (note.end_time) {
        const parsedEnd = convert24hToAmPm(note.end_time);
        const endStr = `${parsedEnd.ampm} ${parseInt(parsedEnd.hour, 10)}:${parsedEnd.minute}`;
        return `⏰ ${startStr} ~ ${endStr}`;
      }
      return `⏰ ${startStr}`;
    }
  };

  const convert24hToAmPm = (time24: string) => {
    const [hoursStr, minutesStr] = time24.split(':');
    const hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return {
      ampm: ampm as '오전' | '오후',
      hour: displayHours.toString().padStart(2, '0'),
      minute: minutesStr
    };
  };

  const convertAmPmTo24h = (ampm: '오전' | '오후', hourStr: string, minuteStr: string) => {
    let hours = parseInt(hourStr, 10);
    if (ampm === '오후' && hours < 12) {
      hours += 12;
    } else if (ampm === '오전' && hours === 12) {
      hours = 0;
    }
    return `${hours.toString().padStart(2, '0')}:${minuteStr}`;
  };

  const handleSaveNote = async () => {
    const currentParticipant = participants.find(p => p.id === currentParticipantId);
    const myId = isCoordination ? myProfile?.id : currentParticipant?.profile_id;
    if (!myId) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }
    if (!noteTitle.trim()) {
      Alert.alert('알림', '약속 제목을 입력해 주세요.');
      return;
    }

    try {
      setSavingNote(true);

      const finalTime = noteTimeEnabled ? convertAmPmTo24h(noteTimeAmPm, noteTimeHour, noteTimeMinute) : null;
      const finalEndTime = noteTimeEnabled ? convertAmPmTo24h(noteEndTimeAmPm, noteEndTimeHour, noteEndTimeMinute) : null;

      if (editingRoomId) {
        // 밀챗 약속 메모 저장
        const { error } = await supabase
          .from('rooms')
          .update({
            memo: noteContent.trim(),
            memo_visibility: noteVisibility,
            memo_author_id: myId
          })
          .eq('id', editingRoomId);

        if (error) throw error;

        // Device calendar의 기존 약속 이벤트에 메모 추가
        try {
          const editingRoom = activeRooms?.find(r => r.id === editingRoomId);
          const { status } = await expoCalendar.requestCalendarPermissionsAsync();
          if (status === 'granted' && editingRoom?.code) {
            const calendars = await expoCalendar.getCalendarsAsync(expoCalendar.EntityTypes.EVENT);
            const primaryCal = calendars.find(cal => cal.isPrimary) || calendars.find(cal => cal.allowsModifications) || calendars[0];
            if (primaryCal) {
              const defaultCalendarId = primaryCal.id;

              // confirmed_slot에서 날짜 범위 추출
              let startOfDay = new Date();
              let endOfDay = new Date();
              if (editingRoom?.confirmed_slot) {
                if (editingRoom.confirmed_slot.includes('~')) {
                  // 범위 약속
                  const dateMatch = editingRoom.confirmed_slot.match(/(\d{4})-(\d{2})-(\d{2})/);
                  if (dateMatch) {
                    const [year, month, day] = [parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3])];
                    startOfDay = new Date(year, month, day);
                    endOfDay = new Date(year, month, day + 10);
                  }
                } else {
                  // 단일 날짜
                  const dateMatch = editingRoom.confirmed_slot.match(/(\d{4})-(\d{2})-(\d{2})/);
                  if (dateMatch) {
                    const [year, month, day] = [parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3])];
                    startOfDay = new Date(year, month, day);
                    endOfDay = new Date(year, month, day + 1);
                  }
                }
              }

              // Room ID로 이벤트 찾기 (prevent conflicts with multiple rooms on same day)
              const allEvents = await expoCalendar.getEventsAsync([defaultCalendarId], startOfDay, endOfDay);
              const roomEvent = allEvents.find(e =>
                e.notes && e.notes.includes(`ID:${editingRoom.id}`)
              );

              if (roomEvent?.id) {
                // 기존 notes에서 메모 부분 유지하고 새 메모 추가
                const existingNotes = roomEvent.notes || '';
                const memoContent = `메모: ${noteContent.trim()}`;
                const updatedNotes = existingNotes.includes('메모:')
                  ? existingNotes.replace(/메모:.*$/m, memoContent)
                  : `${existingNotes}\n${memoContent}`;

                await expoCalendar.updateEventAsync(roomEvent.id, {
                  notes: updatedNotes
                });
              }
            }
          }
        } catch (calError) {
          console.warn('Failed to update calendar event notes:', calError);
        }

        Alert.alert('완료', '밀챗 약속 메모가 저장되었습니다.');
        if (onUpdateRoom) {
          onUpdateRoom();
        }
      } else if (editingNoteId) {
        const originalNote = notes.find(n => n.id === editingNoteId);
        const startDateStr = originalNote?.start_date || selectedDate;
        const endDateStr = originalNote?.end_date || selectedDate;

        let updatedEventId = originalNote?.calendar_event_id || null;

        try {
          const { status } = await expoCalendar.requestCalendarPermissionsAsync();
          if (status === 'granted') {
            const calendars = await expoCalendar.getCalendarsAsync(expoCalendar.EntityTypes.EVENT);
            const primaryCal = calendars.find(cal => cal.isPrimary) || calendars.find(cal => cal.allowsModifications) || calendars[0];
            if (primaryCal) {
              const defaultCalendarId = primaryCal.id;

              let startDateVal: Date;
              let endDateVal: Date;
              let isAllDay = false;

              let durationDays = 1;
              if (originalNote?.start_date && originalNote?.end_date) {
                const diffTime = new Date(originalNote.end_date).getTime() - new Date(originalNote.start_date).getTime();
                durationDays = Math.round(diffTime / (24 * 60 * 60 * 1000)) + 1;
              }

              const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);

              if (noteTimeEnabled && finalTime) {
                const [startHour, startMinute] = finalTime.split(':').map(Number);
                startDateVal = new Date(startYear, startMonth - 1, startDay, startHour, startMinute, 0);

                if (finalEndTime) {
                  const [endHour, endMinute] = finalEndTime.split(':').map(Number);
                  const endDay = new Date(startDateVal.getTime() + (durationDays - 1) * 24 * 60 * 60 * 1000);
                  endDateVal = new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate(), endHour, endMinute, 0);
                } else {
                  endDateVal = new Date(startDateVal.getTime() + 60 * 60 * 1000);
                }
              } else {
                startDateVal = new Date(startYear, startMonth - 1, startDay, 9, 0, 0);
                endDateVal = new Date(startYear, startMonth - 1, startDay + durationDays - 1, 10, 0, 0);
                isAllDay = false;
              }

              if (updatedEventId) {
                try {
                  await expoCalendar.updateEventAsync(updatedEventId, {
                    title: `[메모] ${noteTitle.trim()}`,
                    startDate: startDateVal,
                    endDate: endDateVal,
                    allDay: isAllDay,
                    notes: noteContent.trim()
                  });
                } catch (updateErr) {
                  updatedEventId = await expoCalendar.createEventAsync(defaultCalendarId, {
                    title: `[메모] ${noteTitle.trim()}`,
                    startDate: startDateVal,
                    endDate: endDateVal,
                    allDay: isAllDay,
                    notes: noteContent.trim()
                  });
                }
              } else {
                updatedEventId = await expoCalendar.createEventAsync(defaultCalendarId, {
                  title: `[메모] ${noteTitle.trim()}`,
                  startDate: startDateVal,
                  endDate: endDateVal,
                  allDay: isAllDay,
                  notes: noteContent.trim()
                });
              }
            }
          }
        } catch (calError) {
          console.error('Error updating note on device calendar:', calError);
        }

        let updateQuery = supabase
          .from('calendar_notes')
          .update({
            title: noteTitle.trim(),
            content: noteContent.trim(),
            visibility: noteVisibility,
            color: noteColor,
            time: finalTime,
            end_time: finalEndTime,
            start_date: startDateStr,
            end_date: endDateStr,
            calendar_event_id: updatedEventId
          });

        if (originalNote?.calendar_event_id) {
          updateQuery = updateQuery.eq('calendar_event_id', originalNote.calendar_event_id);
        } else {
          updateQuery = updateQuery.eq('id', editingNoteId);
        }

        const { error } = await updateQuery;
        if (error) throw error;
        Alert.alert('완료', '메모가 수정되었습니다.');
      } else {
        // 신규 추가
        const start = new Date(selectedDate);
        const end = new Date(start.getTime() + (noteDuration - 1) * 24 * 60 * 60 * 1000);
        const startDateStr = selectedDate;
        const endDateStr = end.toISOString().split('T')[0];

        let nativeEventId: string | null = null;
        // 시간이 설정되어 있을 때만 device calendar에 저장
        if (noteTimeEnabled && finalTime) {
          try {
            const { status } = await expoCalendar.requestCalendarPermissionsAsync();
            if (status === 'granted') {
              const calendars = await expoCalendar.getCalendarsAsync(expoCalendar.EntityTypes.EVENT);
              const primaryCal = calendars.find(cal => cal.isPrimary) || calendars.find(cal => cal.allowsModifications) || calendars[0];
              if (primaryCal) {
                const defaultCalendarId = primaryCal.id;

                let startDateVal: Date;
                let endDateVal: Date;

                const [startYear, startMonth, startDay] = selectedDate.split('-').map(Number);
                const [startHour, startMinute] = finalTime.split(':').map(Number);
                startDateVal = new Date(startYear, startMonth - 1, startDay, startHour, startMinute, 0);

                if (finalEndTime) {
                  const [endHour, endMinute] = finalEndTime.split(':').map(Number);
                  const endDay = new Date(startDateVal.getTime() + (noteDuration - 1) * 24 * 60 * 60 * 1000);
                  endDateVal = new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate(), endHour, endMinute, 0);
                } else {
                  endDateVal = new Date(startDateVal.getTime() + 60 * 60 * 1000);
                }

                nativeEventId = await expoCalendar.createEventAsync(defaultCalendarId, {
                  title: `[메모] ${noteTitle.trim()}`,
                  startDate: startDateVal,
                  endDate: endDateVal,
                  allDay: false,
                  notes: noteContent.trim()
                });
              }
            }
          } catch (calError) {
            console.error('Error adding note to device calendar:', calError);
          }
        }

        try {
          const inserts = [];
          for (let i = 0; i < noteDuration; i++) {
            const cur = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
            const dateStr = cur.toISOString().split('T')[0];
            inserts.push({
              profile_id: myId,
              date: dateStr,
              title: noteTitle.trim(),
              content: noteContent.trim(),
              visibility: noteVisibility,
              color: noteColor,
              time: finalTime,
              end_time: finalEndTime,
              start_date: startDateStr,
              end_date: endDateStr,
              calendar_event_id: nativeEventId
            });
          }
          const { error } = await supabase
            .from('calendar_notes')
            .insert(inserts);

          if (error) throw error;
          Alert.alert('완료', '약속 메모가 등록되었습니다.');
        } catch (dbError) {
          if (nativeEventId) {
            try {
              await expoCalendar.deleteEventAsync(nativeEventId);
            } catch (delErr) {
              console.error('Failed to rollback native calendar event:', delErr);
            }
          }
          throw dbError;
        }
      }

      // If time setting is enabled, update mySchedule to remove these slots (marked as busy)
      if (noteTimeEnabled && finalTime) {
        const updatedSchedule = { ...mySchedule };
        const start = new Date(selectedDate);
        const durationDays = editingNoteId ? 1 : noteDuration;

        for (let i = 0; i < durationDays; i++) {
          const cur = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
          const dateStr = cur.toISOString().split('T')[0];

          if (updatedSchedule[dateStr]) {
            const blockedSlots = TIME_SLOTS.filter(t => {
              if (finalEndTime) {
                return t >= finalTime && t <= finalEndTime;
              }
              return t === finalTime;
            });
            updatedSchedule[dateStr] = updatedSchedule[dateStr].filter(t => !blockedSlots.includes(t));
          }
        }

        setMySchedule(updatedSchedule);
        onSaveSchedule(updatedSchedule);
      }

      setNoteTitle('');
      setNoteContent('');
      setNoteVisibility('public');
      setEditingNoteId(null);
      setEditingRoomId(null);
      setNoteColor('#3b82f6');
      setNoteDuration(1);
      setNoteTimeEnabled(false);
      setNoteTimeAmPm('오후');
      setNoteTimeHour('12');
      setNoteTimeMinute('00');
      setNoteEndTimeAmPm('오후');
      setNoteEndTimeHour('01');
      setNoteEndTimeMinute('00');
      setShowNoteForm(false);
      await loadCalendarNotes();

      const { status } = await expoCalendar.getCalendarPermissionsAsync();
      if (status === 'granted') {
        await syncNativeCalendar();
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('오류', '약속 메모 저장 실패');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const originalNote = notes.find(n => n.id === noteId);

    Alert.alert('메모 삭제', '이 약속 메모를 정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            if (originalNote?.calendar_event_id) {
              try {
                const { status } = await expoCalendar.requestCalendarPermissionsAsync();
                if (status === 'granted') {
                  await expoCalendar.deleteEventAsync(originalNote.calendar_event_id);
                }
              } catch (calError) {
                console.log('Error deleting note from device calendar:', calError);
              }
            }

            let deleteQuery = supabase.from('calendar_notes').delete();
            if (originalNote?.calendar_event_id) {
              deleteQuery = deleteQuery.eq('calendar_event_id', originalNote.calendar_event_id);
            } else {
              deleteQuery = deleteQuery.eq('id', noteId);
            }

            const { error } = await deleteQuery;
            if (error) throw error;
            Alert.alert('완료', '약속 메모가 삭제되었습니다.');
            await loadCalendarNotes();

            const { status } = await expoCalendar.getCalendarPermissionsAsync();
            if (status === 'granted') {
              await syncNativeCalendar();
            }
          } catch (err) {
            console.error(err);
            Alert.alert('오류', '삭제 실패');
          }
        }
      }
    ]);
  };

  useEffect(() => {
    const currentParticipant = participants.find(p => p.id === currentParticipantId);
    const myProfileId = isCoordination ? myProfile?.id : currentParticipant?.profile_id;
    if (myProfileId || (participants && participants.length > 0)) {
      loadCalendarNotes();
    }
  }, [selectedDate, myProfile?.id, currentParticipantId, participants, (follows || []).length]);

  const toggleCell = (date: string, time: string) => {
    if (isConfirmed || isGlobal) return;

    const currentParticipant = participants.find(p => p.id === currentParticipantId);
    const myProfileId = isCoordination ? myProfile?.id : currentParticipant?.profile_id;
    const isBusySlot = calendarEvents.some(e => e.date === date && e.slots.includes(time)) ||
      (myProfileId ? isParticipantBusyAt(myProfileId, date, time) : false);
    if (isBusySlot) return;

    const updated = { ...mySchedule };
    if (!updated[date]) {
      updated[date] = [];
    }

    if (updated[date].includes(time)) {
      updated[date] = updated[date].filter(t => t !== time);
    } else {
      updated[date] = [...updated[date], time];
    }
    setMySchedule(updated);
  };

  const handleDragStart = (e: any) => {
    const isLocalCoordinationEditable = !isConfirmed && activeTab === 'my' && !isCoordination;
    if (!isLocalCoordinationEditable) return;

    isDragging.current = true;
    setScrollEnabled(false);

    // Measure grid absolute offset for accurate cell calculation
    gridRef.current?.measure((x, y, width, height, pageX, pageY) => {
      gridLayoutRef.current = { pageX, pageY, width, height };

      const touchX = e.nativeEvent.pageX - pageX;
      const touchY = e.nativeEvent.pageY - pageY;

      // gridRef 는 이제 **날짜 칸만** 감쌉니다. 시간 축은 스크롤 밖의 별도
      // 열로 빠졌으므로 예전처럼 60 을 빼면 한 칸씩 밀립니다.
      const colIndex = Math.floor(touchX / TIMETABLE_CELL_WIDTH);
      const rowIndex = Math.floor(touchY / TIMETABLE_ROW_HEIGHT);

      if (colIndex < 0 || colIndex >= gridDates.length || rowIndex < 0 || rowIndex >= TIME_SLOTS.length) return;

      const date = gridDates[colIndex];
      const time = TIME_SLOTS[rowIndex];

      const isLocalBusy = calendarEvents.some(evt => evt.date === date && evt.slots.includes(time));
      if (isLocalBusy) return;

      const isSelected = (isConfirmed ? currentParticipant?.schedule?.[date] : mySchedule[date])?.includes(time);
      const newMode = isSelected ? 'deselect' : 'select';
      dragMode.current = newMode;
      lastIndex.current = rowIndex * gridDates.length + colIndex;

      setMySchedule(prev => {
        const updated = { ...prev };
        if (!updated[date]) {
          updated[date] = [];
        }
        if (newMode === 'select') {
          if (!updated[date].includes(time)) {
            updated[date] = [...updated[date], time];
          }
        } else {
          updated[date] = updated[date].filter(t => t !== time);
        }
        return updated;
      });
    });
  };

  const handleDragMove = (e: any) => {
    if (!isDragging.current || !dragMode.current) return;

    const { pageX, pageY } = e.nativeEvent;
    const { pageX: gridPageX, pageY: gridPageY } = gridLayoutRef.current;

    const touchX = pageX - gridPageX;
    const touchY = pageY - gridPageY;

    const colIndex = Math.floor(touchX / TIMETABLE_CELL_WIDTH);
    const rowIndex = Math.floor(touchY / TIMETABLE_ROW_HEIGHT);

    if (colIndex < 0 || colIndex >= gridDates.length || rowIndex < 0 || rowIndex >= TIME_SLOTS.length) return;

    const currentIndex = rowIndex * gridDates.length + colIndex;
    if (currentIndex !== lastIndex.current) {
      const date = gridDates[colIndex];
      const time = TIME_SLOTS[rowIndex];

      const isLocalBusy = calendarEvents.some(evt => evt.date === date && evt.slots.includes(time));
      if (isLocalBusy) return;

      lastIndex.current = currentIndex;

      setMySchedule(prev => {
        const updated = { ...prev };
        if (!updated[date]) {
          updated[date] = [];
        }

        const isCurrentlySelected = updated[date].includes(time);
        if (dragMode.current === 'select' && !isCurrentlySelected) {
          updated[date] = [...updated[date], time];
        } else if (dragMode.current === 'deselect' && isCurrentlySelected) {
          updated[date] = updated[date].filter(t => t !== time);
        }
        return updated;
      });
    }
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    dragMode.current = null;
    lastIndex.current = null;
    setScrollEnabled(true);
  };

  const handleSave = () => {
    const currentParticipant = participants.find(p => p.id === currentParticipantId);
    const myProfileId = isCoordination ? myProfile?.id : currentParticipant?.profile_id;
    const cleanedSchedule = { ...mySchedule };
    Object.keys(cleanedSchedule).forEach(date => {
      if (cleanedSchedule[date]) {
        cleanedSchedule[date] = cleanedSchedule[date].filter(time => {
          const isLocalBusy = calendarEvents.some(e => e.date === date && e.slots.includes(time));
          const isBusy = isLocalBusy || (myProfileId ? isParticipantBusyAt(myProfileId, date, time) : false);
          return !isBusy;
        });
      }
    });
    onSaveSchedule(cleanedSchedule);
  };

  // Build the list of active participants for heatmap rendering
  const getActiveHeatmapParticipants = (): Participant[] => {
    if (!isCoordination) return participants;

    const activeList: Participant[] = [];
    if (myProfile) {
      activeList.push({
        id: myProfile.id,
        room_id: '',
        name: myProfile.name,
        avatar_color: myProfile.avatar_color,
        personal_data: myProfile.personal_data,
        schedule: mySchedule,
        created_at: '',
        start_location_name: myProfile.start_location_name,
        start_latitude: myProfile.start_latitude,
        start_longitude: myProfile.start_longitude
      });
    }

    follows.forEach(follow => {
      const friendProfile = follow.profiles;
      if (friendProfile && selectedFriendIds.includes(friendProfile.id)) {
        activeList.push({
          id: friendProfile.id,
          room_id: '',
          name: friendProfile.name,
          avatar_color: friendProfile.avatar_color,
          personal_data: friendProfile.personal_data,
          schedule: friendProfile.schedule || {},
          created_at: '',
          start_location_name: friendProfile.start_location_name,
          start_latitude: friendProfile.start_latitude,
          start_longitude: friendProfile.start_longitude
        });
      }
    });

    return activeList;
  };

  const activeHeatmapParticipants = getActiveHeatmapParticipants();

  // Travel time buffer calculator
  const isTravelingAt = (p: any, date: string, time: string): boolean => {
    const travelMins = p.personal_data?.travelTime || 0;
    if (travelMins === 0) return false;

    const sched = (p.id === myProfile?.id && isCoordination) ? mySchedule : p.schedule;
    if (!sched || !sched[date] || sched[date].length === 0) return false;

    // If already busy, no need to calculate travel buffer
    if (!sched[date].includes(time)) return false;

    const [h, m] = time.split(':').map(Number);
    const slotMins = h * 60 + m;

    // Check if any slot within travelMins before/after is busy/empty
    for (let offset = -travelMins; offset <= travelMins; offset += 30) {
      if (offset === 0) continue;
      const targetMins = slotMins + offset;
      if (targetMins < 0 || targetMins >= 1440) return true; // Day boundary is busy

      const targetH = Math.floor(targetMins / 60).toString().padStart(2, '0');
      const targetM = (targetMins % 60).toString().padStart(2, '0');
      const targetTimeStr = `${targetH}:${targetM}`;

      if (!sched[date].includes(targetTimeStr)) {
        return true;
      }
    }
    return false;
  };

  // Availability count on a specific date (any slots on that day)
  const getDateAvailabilityCount = (date: string) => {
    return activeHeatmapParticipants.filter(p => {
      const sched = (p.id === myProfile?.id && isCoordination) ? mySchedule : p.schedule;
      return !sched || sched[date] === undefined || sched[date].length > 0;
    }).length;
  };

  const getSlotAvailabilityCount = (date: string, time: string) => {
    return activeHeatmapParticipants.filter(p => {
      // If participant has a calendar note at this date/time, they are busy (unavailable)
      if (isParticipantBusyAt(p.profile_id || p.id, date, time)) {
        return false;
      }
      // If participant is traveling, they are unavailable
      if (isTravelingAt(p, date, time)) {
        return false;
      }
      if (isCoordination) {
        if (p.id === myProfile?.id) {
          return isSlotFree(mySchedule[date], time);
        }
        return isSlotFree(p.schedule?.[date], time);
      } else {
        if (p.id === currentParticipantId && activeTab === 'my') {
          return isSlotFree(mySchedule[date], time);
        }
        return isSlotFree(p.schedule?.[date], time);
      }
    }).length;
  };

  const getSlotAvailableNames = (date: string, time: string) => {
    return activeHeatmapParticipants
      .filter(p => {
        // If participant has a calendar note at this date/time, they are busy (unavailable)
        if (isParticipantBusyAt(p.profile_id || p.id, date, time)) {
          return false;
        }
        if (isTravelingAt(p, date, time)) {
          return false;
        }
        if (isCoordination) {
          if (p.id === myProfile?.id) {
            return isSlotFree(mySchedule[date], time);
          }
          return isSlotFree(p.schedule?.[date], time);
        } else {
          if (p.id === currentParticipantId && activeTab === 'my') {
            return isSlotFree(mySchedule[date], time);
          }
          return isSlotFree(p.schedule?.[date], time);
        }
      })
      .map(p => p.name);
  };

  // Recommendations: Scan the currently selected date to recommend best times
  const getAIRecommendations = () => {
    if (activeHeatmapParticipants.length === 0) return [];

    const scores: { date: string; time: string; count: number; ratio: number; names: string[] }[] = [];
    const date = selectedDate;

    TIME_SLOTS.forEach(time => {
      const count = getSlotAvailabilityCount(date, time);
      if (count > 0) {
        scores.push({
          date,
          time,
          count,
          ratio: count / activeHeatmapParticipants.length,
          names: getSlotAvailableNames(date, time),
        });
      }
    });

    return scores
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.time.localeCompare(b.time);
      })
      .slice(0, 5);
  };

  const getMidPointRecommendation = () => {
    const activeLocs = getActiveHeatmapParticipants();
    if (activeLocs.length === 0) return null;

    let totalLat = 0;
    let totalLng = 0;
    let validCount = 0;

    // 출발지 미설정 참여자는 중심점 계산에서 제외합니다(위 히트맵 계산과 동일한 이유).
    activeLocs.forEach(p => {
      if (typeof p.start_latitude !== 'number' || typeof p.start_longitude !== 'number') return;
      totalLat += p.start_latitude;
      totalLng += p.start_longitude;
      validCount++;
    });

    if (validCount === 0) return null;

    const avgLat = totalLat / validCount;
    const avgLng = totalLng / validCount;

    // Define some major Seoul & Busan hubs to find the closest one
    const hubs = [
      // Seoul Hubs
      { name: '강남역', latitude: 37.4979, longitude: 127.0276 },
      { name: '홍대입구역', latitude: 37.5569, longitude: 126.9239 },
      { name: '사당역', latitude: 37.4765, longitude: 126.9816 },
      { name: '왕십리역', latitude: 37.5619, longitude: 127.0385 },
      { name: '서울역', latitude: 37.5547, longitude: 126.9706 },
      { name: '혜화역', latitude: 37.5822, longitude: 127.0018 },
      { name: '건대입구역', latitude: 37.5404, longitude: 127.0692 },
      { name: '신도림역', latitude: 37.5088, longitude: 126.8912 },
      // Busan Hubs
      { name: '서면역', latitude: 35.1585, longitude: 129.0595 },
      { name: '부산역', latitude: 35.1150, longitude: 129.0422 },
      { name: '센텀시티역', latitude: 35.1689, longitude: 129.1315 },
      { name: '해운대역', latitude: 35.1622, longitude: 129.1585 }
    ];

    let closestHub = hubs[0];
    let minDistance = 999999;

    hubs.forEach(h => {
      const dist = Math.sqrt(Math.pow(h.latitude - avgLat, 2) + Math.pow(h.longitude - avgLng, 2));
      if (dist < minDistance) {
        minDistance = dist;
        closestHub = h;
      }
    });

    // 출발지 좌표가 없으면 이동 시간·요금을 계산할 근거가 없으므로 목록에서 제외합니다.
    // (서울시청으로 대체하면 부산 참여자에게 320km/17만원 같은 값이 표시됐습니다.)
    const travelList = activeLocs.filter(p =>
      typeof p.start_latitude === 'number' && typeof p.start_longitude === 'number'
    ).map(p => {
      const pLat = p.start_latitude as number;
      const pLng = p.start_longitude as number;

      const latDiffKm = (pLat - closestHub.latitude) * 111;
      const lngDiffKm = (pLng - closestHub.longitude) * 88;
      const distKm = Math.sqrt(Math.pow(latDiffKm, 2) + Math.pow(lngDiffKm, 2));

      const transitMin = Math.max(5, Math.round(distKm * 3.5 + 8));
      const taxiMin = Math.max(3, Math.round(distKm * 2.2 + 4));
      const walkMin = Math.max(1, Math.round(distKm * 15));
      const fare = Math.round(3800 + distKm * 1200);

      return {
        name: p.name,
        startName: p.start_location_name || '미설정 위치',
        distKm: distKm.toFixed(1),
        transitMin,
        taxiMin,
        walkMin,
        fare
      };
    });

    // Determine Cafe vs Bar based on participants' alcohol preference
    let drinkPreferenceCount = 0;
    let noDrinkCount = 0;
    activeLocs.forEach(p => {
      const liquors = p.personal_data?.alcoholLiquor || [];
      if (liquors.length > 0) {
        drinkPreferenceCount++;
      } else {
        noDrinkCount++;
      }
    });
    const recommendType = drinkPreferenceCount > noDrinkCount ? '술집' : '카페';

    const allLikes: string[] = [];
    activeLocs.forEach(p => {
      const likes = p.personal_data?.likes || [];
      likes.forEach((l: string) => {
        if (!allLikes.includes(l) && l !== '카페' && l !== '술집') allLikes.push(l);
      });
    });

    const matchedCategories = [
      ...(allLikes.length > 0 ? allLikes.slice(0, 2) : ['한식', '일식']),
      recommendType
    ];

    // 카카오에서 받아온 실제 장소만 씁니다.
    //
    // 예전에는 캐시가 비면 지어낸 장소로 채웠습니다 — '블루보틀커피 서면역점'
    // 같은 실존 브랜드명에 '서울특별시 강남구 역삼동 200' 같은 지어낸 주소,
    // 그리고 이름 첫 글자로 계산한 별점이 붙었습니다. 사용자는 이걸 실제
    // 정보로 받아들입니다. 없으면 안 보여주는 편이 낫습니다.
    const cached = kakaoPlaces[closestHub.name];
    const hotplaces = (cached && cached.length > 0) ? cached : [];

    return {
      hubName: closestHub.name,
      travelList,
      hotplaces
    };
  };

  // 단일 날짜 추천 - 아무 일정도 없는 날 우선 및 날씨 고려
  const getAISingleDayRecommendations = () => {
    const activeList = getActiveHeatmapParticipants();
    if (activeList.length === 0) return [];

    const currentMonth = monthsList[currentMonthIndex];
    if (!currentMonth) return [];

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    const totalDays = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate();
    const candidateDates: string[] = [];
    for (let i = 1; i <= totalDays; i++) {
      const mm = (currentMonth.month + 1).toString().padStart(2, '0');
      const dd = i.toString().padStart(2, '0');
      const dateStr = `${currentMonth.year}-${mm}-${dd}`;
      if (dateStr < todayStr) continue; // Exclude past dates
      candidateDates.push(dateStr);
    }

    // 1단계: 아무 일정도 없는 날들 (완전히 자유로운 날)
    const fullyFreeDays: { date: string; availableCount: number; ratio: number; freeParticipants: string[] }[] = [];
    // 2단계: 일정이 있는 날 (일정 없는 시간이 많은 순)
    const partiallyFreeDays: { date: string; availableCount: number; ratio: number; freeParticipants: string[]; freeSlots: number }[] = [];

    candidateDates.forEach(date => {
      const freeParticipants: string[] = [];
      let totalFreeSlots = 0;

      activeList.forEach(p => {
        const sched = (p.id === myProfile?.id && isCoordination) ? mySchedule : p.schedule;
        if (sched && sched[date]) {
          const actualFreeSlots = sched[date].filter(time => !isParticipantBusyAt(p.profile_id || p.id, date, time) && !isTravelingAt(p, date, time));
          if (actualFreeSlots.length > 0) {
            freeParticipants.push(p.name);
            totalFreeSlots += actualFreeSlots.length;
          }
        }
      });

      const result = {
        date,
        availableCount: freeParticipants.length,
        ratio: freeParticipants.length / activeList.length,
        freeParticipants
      };

      if (freeParticipants.length === activeList.length) {
        fullyFreeDays.push(result);
      } else if (freeParticipants.length > 0) {
        partiallyFreeDays.push({ ...result, freeSlots: totalFreeSlots });
      }
    });

    // 정렬: 기상 조건 악화(비/뇌우)인 경우 순위 감점
    const sortWithWeather = (arr: any[], isPartial = false) => {
      return arr.sort((a, b) => {
        const wA = weatherForecast[a.date];
        const wB = weatherForecast[b.date];
        const isRainyA = wA && ['☔', '⛈️'].includes(wA.icon);
        const isRainyB = wB && ['☔', '⛈️'].includes(wB.icon);

        if (isRainyA && !isRainyB) return 1;
        if (!isRainyA && isRainyB) return -1;

        if (isPartial) {
          if (b.freeSlots !== a.freeSlots) return b.freeSlots - a.freeSlots;
        }
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
    };

    const sorted = [
      ...sortWithWeather(fullyFreeDays),
      ...sortWithWeather(partiallyFreeDays, true)
    ];

    return sorted.slice(0, 5);
  };

  // 기간 선택 추천 - 모든 인원이 일정이 있는 연속된 날짜
  const getAIDurationRecommendations = () => {
    const activeList = getActiveHeatmapParticipants();
    console.log('🔍 Duration Rec - Active participants:', activeList.map(p => ({ name: p.name, id: p.id })));

    if (activeList.length === 0) {
      console.log('⚠️ No active participants selected');
      return [];
    }

    const currentMonth = monthsList[currentMonthIndex];
    if (!currentMonth) return [];

    const totalDays = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate();
    const candidateDates: string[] = [];
    for (let i = 1; i <= totalDays; i++) {
      const mm = (currentMonth.month + 1).toString().padStart(2, '0');
      const dd = i.toString().padStart(2, '0');
      candidateDates.push(`${currentMonth.year}-${mm}-${dd}`);
    }

    // 각 날짜에 대해 모든 인원이 일정이 없는지 확인 (모두 완전히 자유로운 날)
    const isFullDay = (date: string) => {
      const result = activeList.every(p => {
        const sched = (p.id === myProfile?.id && isCoordination) ? mySchedule : p.schedule;
        // schedule이 없거나 해당 날짜 일정이 없으면 true (자유로운 상태)
        return !sched || !sched[date] || sched[date].length === 0;
      });
      return result;
    };

    console.log('📅 Checking dates:', candidateDates.slice(0, 10));

    // 연속된 완전히 자유로운 날짜 구간 찾기
    const durations: { startDate: string; endDate: string; duration: number; startIndex: number }[] = [];
    let currentStart: string | null = null;
    let startIndex = 0;

    candidateDates.forEach((date, idx) => {
      const isFull = isFullDay(date);
      if (idx < 10) console.log(`  ${date}: ${isFull ? '✅' : '❌'}`);

      if (isFull) {
        if (!currentStart) {
          currentStart = date;
          startIndex = idx;
        }
      } else {
        if (currentStart) {
          const endDate = candidateDates[idx - 1];
          const duration = idx - startIndex;
          if (duration >= 2) { // 2일 이상만 추천
            durations.push({ startDate: currentStart, endDate, duration, startIndex });
            console.log(`✨ Found duration: ${currentStart} ~ ${endDate} (${duration}일)`);
          }
          currentStart = null;
        }
      }
    });

    // 마지막 연속 구간 처리
    if (currentStart) {
      const duration = candidateDates.length - startIndex;
      if (duration >= 2) {
        durations.push({
          startDate: currentStart,
          endDate: candidateDates[candidateDates.length - 1],
          duration,
          startIndex
        });
        console.log(`✨ Found duration (last): ${currentStart} ~ ${candidateDates[candidateDates.length - 1]} (${duration}일)`);
      }
    }

    console.log('📊 Total durations found:', durations.length);

    // 정렬: 기간 길수록 먼저, 같으면 더 앞 날짜 먼저
    return durations
      .sort((a, b) => {
        if (b.duration !== a.duration) return b.duration - a.duration;
        return a.startIndex - b.startIndex;
      })
      .slice(0, 5);
  };

  const dateRecommendations = getAISingleDayRecommendations();

  const recommendations = getAIRecommendations();
  const topRecommendedSlot = recommendations[0];

  const handleConfirm = () => {
    if (isCoordination) {
      if (selectedFriendIds.length === 0) {
        Alert.alert('알림', '먼저 함께 조율할 친구를 선택해 주세요.');
        return;
      }

      setShowCreateRoomModal(true);
    } else {
      if (!onConfirmSchedule || !topRecommendedSlot) return;
      const formattedDate = new Date(topRecommendedSlot.date).toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      });
      onConfirmSchedule(`${formattedDate} ${topRecommendedSlot.time}`);
    }
  };

  const handleCreateRoomFromCoordination = async () => {
    if (!coordinationRoomTitle.trim()) {
      Alert.alert('알림', '방 제목을 입력해 주세요.');
      return;
    }
    if (!onCoordinationConfirm) return;

    try {
      setConfirmingCoordination(true);
      const selectedFriendsProfiles = follows
        .filter(f => f.profiles && selectedFriendIds.includes(f.profiles.id))
        .map(f => f.profiles as Profile);

      const finalStartDate = selectedDate;

      // Calculate optimal hub if location is empty
      let finalLocation = coordinationRoomLocation.trim();
      let finalLat = roomLatitude;
      let finalLng = roomLongitude;

      if (!finalLocation) {
        // Calculate optimal hub based on participants' start locations
        let totalLat = 0;
        let totalLng = 0;
        let validCount = 0;

        if (myProfile?.start_latitude && myProfile?.start_longitude) {
          totalLat += myProfile.start_latitude;
          totalLng += myProfile.start_longitude;
          validCount++;
        }

        selectedFriendsProfiles.forEach(p => {
          if (p.start_latitude && p.start_longitude) {
            totalLat += p.start_latitude;
            totalLng += p.start_longitude;
            validCount++;
          }
        });

        if (validCount > 0) {
          const avgLat = totalLat / validCount;
          const avgLng = totalLng / validCount;

          const hubs = [
            { name: '강남역', latitude: 37.4979, longitude: 127.0276 },
            { name: '홍대입구역', latitude: 37.5569, longitude: 126.9239 },
            { name: '사당역', latitude: 37.4765, longitude: 126.9816 },
            { name: '왕십리역', latitude: 37.5619, longitude: 127.0385 },
            { name: '서울역', latitude: 37.5547, longitude: 126.9706 },
            { name: '혜화역', latitude: 37.5822, longitude: 127.0018 },
            { name: '건대입구역', latitude: 37.5404, longitude: 127.0692 },
            { name: '신도림역', latitude: 37.5088, longitude: 126.8912 },
            { name: '서면역', latitude: 35.1585, longitude: 129.0595 },
            { name: '부산역', latitude: 35.1150, longitude: 129.0422 },
            { name: '센텀시티역', latitude: 35.1689, longitude: 129.1315 },
            { name: '해운대역', latitude: 35.1622, longitude: 129.1585 }
          ];

          let closestHub = hubs[0];
          let minDistance = 999999;

          hubs.forEach(h => {
            const dist = Math.sqrt(Math.pow(h.latitude - avgLat, 2) + Math.pow(h.longitude - avgLng, 2));
            if (dist < minDistance) {
              minDistance = dist;
              closestHub = h;
            }
          });

          finalLocation = `${closestHub.name} (추천 최적 위치)`;
          finalLat = closestHub.latitude;
          finalLng = closestHub.longitude;
        }
        // validCount === 0: 아무도 출발지 좌표가 없습니다. 예전에는 여기서
        // '서울역 (기본 설정)' + 실제 좌표로 대체했는데, 부산 등 다른 지역
        // 모임에도 서울역이 찍혀 나갔습니다. 라운드 AI 의 원칙과 같습니다 —
        // 틀린 좌표보다 없는 좌표가 낫습니다. finalLocation/finalLat/finalLng 를
        // 비워 두면 방은 위치 미정으로 만들어집니다.
      }

      await onCoordinationConfirm(
        coordinationRoomTitle.trim(),
        finalStartDate,
        selectedFriendsProfiles,
        finalLocation,
        finalLat || undefined,
        finalLng || undefined
      );

      setShowCreateRoomModal(false);
      setCoordinationRoomTitle('');
      setCoordinationRoomLocation('');
      setRoomLatitude(null);
      setRoomLongitude(null);
      setSelectedHotplace(null);
      setDuration(1);
    } catch (err) {
      console.error(err);
      Alert.alert('오류', '방 생성 중 오류가 발생했습니다.');
    } finally {
      setConfirmingCoordination(false);
    }
  };

  const toggleSelectFriend = (friendId: string) => {
    if (selectedFriendIds.includes(friendId)) {
      setSelectedFriendIds(selectedFriendIds.filter(id => id !== friendId));
    } else {
      setSelectedFriendIds([...selectedFriendIds, friendId]);
    }
  };

  const handleFollowFriend = async () => {
    if (!myProfile?.id) {
      Alert.alert('알림', '사용자 정보를 찾을 수 없습니다.');
      return;
    }
    if (!addFriendName.trim() || !addFriendTag.trim()) {
      Alert.alert('알림', '친구 이름과 태그를 모두 입력해 주세요. (예: 영희 / 123)');
      return;
    }

    if (addFriendName.trim() === myProfile.name && addFriendTag.trim() === myProfile.tag) {
      Alert.alert('알림', '자기 자신은 팔로우할 수 없습니다.');
      return;
    }

    try {
      setAddFriendLoading(true);
      const { data: profiles, error: pError } = await supabase
        // 남의 프로필은 profiles_public 뷰로 읽습니다.
        .from('profiles_public')
        .select('*')
        .eq('name', addFriendName.trim())
        .eq('tag', addFriendTag.trim());

      if (pError) throw pError;

      if (!profiles || profiles.length === 0) {
        Alert.alert('찾을 수 없음', '해당 이름과 태그를 가진 메이트를 찾을 수 없습니다.');
        return;
      }

      const friend = profiles[0] as Profile;

      if (follows.some(f => f.following_id === friend.id)) {
        Alert.alert('알림', '이미 팔로우한 친구입니다.');
        return;
      }

      const { error: fError } = await supabase
        .from('follows')
        .insert([{
          follower_id: myProfile.id,
          following_id: friend.id,
          role: 'mate'
        }]);

      if (fError) throw fError;

      setAddFriendName('');
      setAddFriendTag('');
      setShowAddFriendModal(false);
      Alert.alert('완료', `${friend.name}님을 메이트로 추가했습니다!`);
      if (onRefreshFollows) {
        onRefreshFollows();
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('오류', '메이트 추가 중 오류가 발생했습니다.');
    } finally {
      setAddFriendLoading(false);
    }
  };

  const onScrollEnd = (e: any) => {
    const xOffset = e.nativeEvent.contentOffset.x;
    const index = Math.round(xOffset / INNER_CAL_WIDTH);
    setCurrentMonthIndex(index);
  };

  const handlePrevMonth = () => {
    if (currentMonthIndex > 0) {
      scrollViewRef.current?.scrollTo({ x: INNER_CAL_WIDTH * (currentMonthIndex - 1), animated: true });
      setCurrentMonthIndex(currentMonthIndex - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex < monthsList.length - 1) {
      scrollViewRef.current?.scrollTo({ x: INNER_CAL_WIDTH * (currentMonthIndex + 1), animated: true });
      setCurrentMonthIndex(currentMonthIndex + 1);
    }
  };

  const handleDatePress = (dateStr: string, matchedRoom: any, isTargetMeeting: boolean) => {
    setSelectedDate(dateStr);
    if (!isCoordination && isTargetMeeting && onSelectRoom && isGlobal) {
      onSelectRoom(matchedRoom);
    }
  };

  const getRoomsForDate = (dateStr: string) => {
    if (!activeRooms || activeRooms.length === 0) return [];

    return activeRooms.filter(room => {
      if (!room.is_confirmed) return false;
      if (!room.confirmed_slot) return false;

      // If it's a range
      if (room.confirmed_slot.includes('~')) {
        const parts = room.confirmed_slot.split('~');
        if (parts.length === 2) {
          const startStr = parts[0].trim();
          const endStr = parts[1].trim().split(' ')[0]; // Extract YYYY-MM-DD
          return dateStr >= startStr && dateStr <= endStr;
        }
      } else {
        // Single day confirmed slot
        return room.meeting_date === dateStr;
      }

      return false;
    });
  };

  // 약속 시간대를 locked 슬롯으로 표시
  const getLockedSlotsForDate = (dateStr: string): boolean[] => {
    const locked = Array(24).fill(false);
    const confirmedRooms = getRoomsForDate(dateStr);

    if (!confirmedRooms || confirmedRooms.length === 0) return locked;

    for (const room of confirmedRooms) {
      const slot = room.confirmed_slot;
      if (!slot) continue;

      if (slot.includes('~')) {
        // Multi-day range - lock entire day
        return Array(24).fill(true);
      } else {
        // Single time slot - extract hour and lock for 1 hour
        const timeMatch = slot.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          const hour = parseInt(timeMatch[1]);
          locked[hour] = true;
          if (hour + 1 < 24) {
            locked[hour + 1] = true;
          }
        }
      }
    }

    return locked;
  };

  // Render a specific month grid
  const renderMonthGrid = (year: number, month: number) => {
    const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startDayOffset = new Date(year, month, 1).getDay();

    const calendarCells = [];
    for (let i = 0; i < startDayOffset; i++) {
      calendarCells.push(<View key={`empty-${i}`} style={styles.calendarCellEmpty} />);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const matchedRooms = getRoomsForDate(dateStr);
      const isTargetMeeting = matchedRooms.length > 0;
      const confirmedRoom = matchedRooms.length > 0 ? matchedRooms[0] : null;
      const dayNotes = notes.filter(n => n.date === dateStr);

      const isSelected = selectedDate === dateStr;

      // Check if there's any device calendar events on this day (filter out duplicates synced from this app)
      const dayEvents = calendarEvents.filter(e =>
        e.date === dateStr &&
        !e.title.startsWith('[메모]') &&
        !e.title.startsWith('[밀챗]') &&
        !e.title.startsWith('[밀챗 대기]')
      );

      // Calculate availability count for heatmap intensity
      const availCount = getDateAvailabilityCount(dateStr);
      const totalParts = activeHeatmapParticipants.length;
      const intensity = totalParts > 0 ? availCount / totalParts : 0;

      let cellBgColor = THEME.surface;
      let isConfirmedDay = false;
      if (isConfirmed && confirmedSlot) {
        isConfirmedDay = confirmedSlot.includes(`${month + 1}월 ${day}일`);
      }

      if (confirmedRoom) {
        cellBgColor = (confirmedRoom.color || THEME.primary) + '1f'; // 12% opacity
      } else if (isConfirmedDay) {
        cellBgColor = 'rgba(35, 164, 85, 0.25)'; // Highlight confirmed day in brand green
      } else if (intensity > 0 && activeTab !== 'calendar' && !isGlobal) {
        // Sky Blue intensity heatmap to balance colors
        cellBgColor = `rgba(0, 163, 255, ${0.08 + intensity * 0.4})`;
      }

      const dayOfWeekIndex = (startDayOffset + day - 1) % 7;
      const isSunday = dayOfWeekIndex === 0;
      const isSaturday = dayOfWeekIndex === 6;

      calendarCells.push(
        <TouchableOpacity
          key={`day-${day}`}
          onPress={() => {
            handleDatePress(dateStr, confirmedRoom, isTargetMeeting);
          }}
          style={[
            styles.calendarCell,
            isSelected && styles.calendarCellSelected,
            isTargetMeeting && styles.calendarCellTarget,
            { backgroundColor: cellBgColor }
          ]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 2 }}>
            <Text style={[
              styles.calendarCellDay,
              isSunday && { color: THEME.danger },
              isSaturday && { color: '#3b82f6' },
              isTargetMeeting && { color: THEME.primary, fontWeight: 'bold' },
              isSelected && { color: '#FFFFFF', backgroundColor: THEME.primary, borderRadius: 10, paddingHorizontal: 4, overflow: 'hidden' }
            ]}>
              {day}
            </Text>
            {weatherForecast[dateStr] && (
              <Text style={{ fontSize: 9 }}>{weatherForecast[dateStr].icon}</Text>
            )}
          </View>

          {/* Figma `일정 조율`(309:1077) 은 셀 안에 제목을 넣지 않고 점만 찍는다.
              상세(제목·시간)는 달력 아래 "그날 일정" 목록에서 보여 준다. */}
          <View style={styles.calendarEventsIndicator}>
            {dayEvents.length > 0 && (
              <View style={[styles.calendarDayDot, { backgroundColor: THEME.textTertiary }]} />
            )}
            {dayNotes.length > 0 && (
              <View style={[styles.calendarDayDot, { backgroundColor: dayNotes[0].color || THEME.primary }]} />
            )}
            {isTargetMeeting && (
              <View
                style={[styles.calendarDayDot, { backgroundColor: confirmedRoom?.color || THEME.primary }]}
              />
            )}
          </View>
        </TouchableOpacity>
      );
    }

    // Pad the end of the cells array so it forms complete weeks (multiples of 7)
    const totalCells = startDayOffset + totalDays;
    const remainder = totalCells % 7;
    const padCount = remainder === 0 ? 0 : 7 - remainder;
    for (let i = 0; i < padCount; i++) {
      calendarCells.push(<View key={`empty-end-${i}`} style={styles.calendarCellEmpty} />);
    }

    // Chunk the cells into rows of 7
    const weeks = [];
    for (let i = 0; i < calendarCells.length; i += 7) {
      weeks.push(calendarCells.slice(i, i + 7));
    }

    return (
      <View key={`${year}-${month}`} style={{ width: INNER_CAL_WIDTH, paddingHorizontal: 4 }}>
        {/* Days of week */}
        <View style={styles.calendarDaysRow}>
          {daysOfWeek.map(d => (
            <Text
              key={d}
              style={[
                styles.calendarDayHeader,
                d === '일' ? { color: THEME.danger } : d === '토' ? { color: '#3b82f6' } : { color: THEME.textMuted }
              ]}
            >
              {d}
            </Text>
          ))}
        </View>

        {/* Month grid */}
        <View style={styles.calendarGrid}>
          {weeks.map((week, idx) => (
            <View key={`week-${idx}`} style={styles.calendarWeekRow}>
              {week}
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Render Calendar Notes Section for coordination mode date checking and note-taking
  const renderCalendarNotesSection = () => {
    const dayNotes = notes.filter(n => n.date === selectedDate);
    const dayEvents = calendarEvents.filter(e =>
      e.date === selectedDate &&
      !e.title.startsWith('[메모]') &&
      !e.title.startsWith('[밀챗]') &&
      !e.title.startsWith('[밀챗 대기]')
    );
    const currentParticipant = participants.find(p => p.id === currentParticipantId);
    const myId = isCoordination ? myProfile?.id : currentParticipant?.profile_id;
    const confirmedRooms = getRoomsForDate(selectedDate);

    return (
      <View style={styles.notesContainerCard}>
        <View style={styles.notesHeader}>
          <CalendarIcon size={16} color={THEME.primary} />
          <Text style={styles.notesTitle}>{selectedDate} 약속 메모</Text>
        </View>

        {/* 1. Memo List */}
        <View style={{ marginVertical: 8 }}>
          {confirmedRooms.map((confirmedRoom) => {
            const isMemoVisible = (() => {
              if (!confirmedRoom.memo) return false;
              const visibility = confirmedRoom.memo_visibility || 'public';
              if (visibility === 'public') return true;
              if (!myId) return false;
              if (confirmedRoom.memo_author_id === myId) return true;
              if (visibility === 'private') return false;
              if (visibility === 'best') {
                return !!confirmedRoom.memo_author_id
                  && friendsWhoMarkedMeBest.includes(confirmedRoom.memo_author_id);
              }
              return true;
            })();

            return (
              <View
                key={confirmedRoom.id}
                style={{
                  backgroundColor: (confirmedRoom.color || THEME.primary) + '15',
                  borderColor: confirmedRoom.color || THEME.primary,
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 12,
                  gap: 6
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>📌</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: THEME.text }}>
                      확정 약속: {confirmedRoom.title}
                    </Text>
                    <Text style={{ fontSize: 11, color: THEME.textMuted, marginTop: 2 }}>
                      일정: {confirmedRoom.confirmed_slot || confirmedRoom.meeting_date}
                    </Text>
                  </View>
                </View>
                {isMemoVisible ? (
                  <View style={{ marginTop: 4, padding: 8, backgroundColor: 'white', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' }}>
                    <Text style={{ fontSize: 12, color: THEME.text }}>{confirmedRoom.memo}</Text>
                    {confirmedRoom.memo_visibility && confirmedRoom.memo_visibility !== 'public' && (
                      <Text style={{ fontSize: 9, color: THEME.textMuted, marginTop: 4 }}>
                        {confirmedRoom.memo_visibility === 'best' ? '⭐ 친한친구 공개' : '🔒 나만보기'}
                      </Text>
                    )}
                  </View>
                ) : confirmedRoom.memo ? (
                  <View style={{ marginTop: 4, padding: 8, backgroundColor: 'white', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', borderStyle: 'dashed' }}>
                    <Text style={{ fontSize: 11, color: THEME.textMuted, fontStyle: 'italic' }}>🔒 비공개 메모입니다.</Text>
                  </View>
                ) : (
                  <View style={{ marginTop: 4, padding: 8, backgroundColor: 'white', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', borderStyle: 'dashed' }}>
                    <Text style={{ fontSize: 11, color: THEME.textMuted, fontStyle: 'italic' }}>등록된 메모가 없습니다.</Text>
                  </View>
                )}
                {myId && (
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      onPress={() => {
                        setEditingRoomId(confirmedRoom.id);
                        setEditingNoteId(null);
                        setNoteTitle(`[밀챗 메모] ${confirmedRoom.title}`);
                        setNoteContent(confirmedRoom.memo || '');
                        setNoteVisibility(confirmedRoom.memo_visibility || 'public');
                        setShowNoteForm(true);
                      }}
                    >
                      <Text style={{ fontSize: 11, color: THEME.primary, fontWeight: 'bold' }}>✍️ 메모 수정하기</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          {/* 1.5. Device Calendar Events */}
          {dayEvents.length > 0 && (
            <View style={{ gap: 8, marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: THEME.textMuted }}>📅 연동된 기기 일정</Text>
              {dayEvents.map((evt, idx) => (
                <View
                  key={`dev-evt-${idx}`}
                  style={{
                    backgroundColor: THEME.surfaceDarker,
                    borderColor: THEME.border,
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.text }}>
                      {evt.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} color={THEME.textMuted} />
                      <Text style={{ fontSize: 10, color: THEME.textMuted }}>
                        {evt.startTime} ~ {evt.endTime}
                      </Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ fontSize: 9, color: THEME.textMuted }}>기기 일정</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {loadingNotes ? (
            <ActivityIndicator size="small" color={THEME.primary} style={{ paddingVertical: 10 }} />
          ) : dayNotes.length > 0 ? (
            dayNotes.map(note => {
              const isMine = note.profile_id === myId;
              const formattedTime = new Date(note.created_at).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <View
                  key={note.id}
                  style={styles.noteItemCard}
                >
                  <View style={styles.noteItemHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.avatarBubbleMini, { backgroundColor: note.profiles?.avatar_color || THEME.primary, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }]}>
                        {note.profiles?.avatar_url ? (
                          <Image source={{ uri: note.profiles.avatar_url }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                        ) : (
                          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>
                            {note.profiles?.name ? note.profiles.name[0] : '?'}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.noteAuthor}>{note.profiles?.name || '알수없음'}</Text>
                      <Text style={styles.noteTime}>{formattedTime}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {/* Publicity scope tag */}
                      <Text style={styles.visibilityLabel}>
                        {note.visibility === 'public' ? '👥 전체' : note.visibility === 'best' ? '⭐ 친한친구' : '🔒 나만보기'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                    <Text style={styles.noteItemTitle}>{note.title}</Text>
                    {note.time && (
                      <View style={{ backgroundColor: 'rgba(77, 182, 226, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Clock size={10} color={THEME.accent} />
                        <Text style={{ fontSize: 10, color: THEME.accent, fontWeight: 'bold' }}>
                          {formatNoteTimeRange(note).replace('⏰ ', '')}
                        </Text>
                      </View>
                    )}
                  </View>
                  {note.content ? <Text style={styles.noteItemContent}>{note.content}</Text> : null}

                  {isMine && (
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#EEE7E8' }}>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        onPress={() => {
                          startEditNote(note);
                          setShowNoteForm(true);
                        }}
                      >
                        <Pencil size={11} color={THEME.primary} />
                        <Text style={{ fontSize: 11, color: THEME.primary, fontWeight: 'bold' }}>수정하기</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        onPress={() => handleDeleteNote(note.id)}
                      >
                        <Trash2 size={11} color={THEME.danger} />
                        <Text style={{ fontSize: 11, color: THEME.danger, fontWeight: 'bold' }}>삭제하기</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            confirmedRooms.length === 0 && dayEvents.length === 0 && (
              <Text style={styles.noNotesText}>이 날짜에 등록된 약속 메모가 없습니다.</Text>
            )
          )}
        </View>

        {/* 새 약속 메모 등록 button */}
        {myId && !showNoteForm && (
          <TouchableOpacity
            style={styles.addNoteBtn}
            onPress={() => {
              setEditingNoteId(null);
              setEditingRoomId(null);
              setNoteTitle('');
              setNoteContent('');
              setShowNoteForm(true);
            }}
          >
            <Text style={styles.addNoteBtnText}>📝 새 약속 메모 등록</Text>
          </TouchableOpacity>
        )}

        {/* 2. Memo Write/Edit Form */}
        {myId && showNoteForm && (
          <View style={styles.noteFormCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.noteFormHeading}>
                {editingRoomId
                  ? '📌 밀챗 약속 메모 수정'
                  : editingNoteId
                    ? '✍️ 약속 메모 수정'
                    : '📝 새 약속 메모 등록'}
              </Text>
              <TouchableOpacity onPress={() => setShowNoteForm(false)}>
                <X size={18} color={THEME.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.noteInput, editingRoomId && { backgroundColor: THEME.surfaceDarker }]}
              value={noteTitle}
              onChangeText={setNoteTitle}
              placeholder="약속 제목 (예: 팀플 회의, 저녁 약속)"
              placeholderTextColor={THEME.textMuted}
              editable={!editingRoomId}
            />
            <TextInput
              style={[styles.noteInput, { height: 60, textAlignVertical: 'top' }]}
              value={noteContent}
              onChangeText={setNoteContent}
              placeholder="세세한 메모 내용 입력..."
              placeholderTextColor={THEME.textMuted}
              multiline
            />

            {/* Note Duration Selector */}
            {!editingNoteId && !editingRoomId && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.textMuted }}>약속 기간 설정</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity
                    style={{ backgroundColor: THEME.surfaceDarker, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, minWidth: 28, alignItems: 'center' }}
                    onPress={() => setNoteDuration(prev => Math.max(1, prev - 1))}
                  >
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: THEME.text }}>-</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: THEME.text }}>{noteDuration}일간</Text>
                  <TouchableOpacity
                    style={{ backgroundColor: THEME.surfaceDarker, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, minWidth: 28, alignItems: 'center' }}
                    onPress={() => setNoteDuration(prev => Math.min(30, prev + 1))}
                  >
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: THEME.text }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Note Time Selector */}
            {!editingRoomId && (
              <View style={{ marginBottom: 12, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.textMuted }}>약속 시간 설정</Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: noteTimeEnabled ? THEME.primary : THEME.surfaceDarker,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                    }}
                    onPress={() => setNoteTimeEnabled(prev => !prev)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: noteTimeEnabled ? 'white' : THEME.textMuted }}>
                      {noteTimeEnabled ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {noteTimeEnabled && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    {/* Start Time Select */}
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: THEME.surfaceDarker,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 10,
                      }}
                      onPress={() => {
                        setActiveTimeField('start');
                        setShowTimePickerModal(true);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} color={THEME.primary} />
                        <Text style={{ fontSize: 11, color: THEME.textMuted }}>시작</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.text }}>
                        {noteTimeAmPm} {parseInt(noteTimeHour, 10)}:{noteTimeMinute}
                      </Text>
                    </TouchableOpacity>

                    {/* End Time Select */}
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: THEME.surfaceDarker,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 10,
                      }}
                      onPress={() => {
                        setActiveTimeField('end');
                        setShowTimePickerModal(true);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} color={THEME.primary} />
                        <Text style={{ fontSize: 11, color: THEME.textMuted }}>종료</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.text }}>
                        {noteEndTimeAmPm} {parseInt(noteEndTimeHour, 10)}:{noteEndTimeMinute}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Note Color Selector */}
            {!editingRoomId && (
              <View style={{ marginBottom: 12, marginTop: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.textMuted, marginBottom: 8 }}>메모 색상 선택</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {PALETTE_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: c,
                        borderWidth: noteColor === c ? 2 : 0,
                        borderColor: THEME.text,
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                      onPress={() => setNoteColor(c)}
                    >
                      {noteColor === c && (
                        <Check size={12} color="white" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Publicity choice */}
            <View style={styles.visibilitySelectRow}>
              <Text style={{ fontSize: 11, color: THEME.textMuted, marginRight: 8 }}>공개 범위:</Text>
              {(['public', 'best', 'private'] as const).map(v => (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.visibilitySelectBtn,
                    noteVisibility === v && styles.visibilitySelectBtnActive
                  ]}
                  onPress={() => setNoteVisibility(v)}
                >
                  <Text style={[
                    styles.visibilitySelectBtnText,
                    noteVisibility === v && styles.visibilitySelectBtnTextActive
                  ]}>
                    {v === 'public' ? '👥 전체' : v === 'best' ? '⭐ 친한친구' : '🔒 나만보기'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {(editingNoteId || editingRoomId) && (
                <TouchableOpacity
                  style={[styles.noteFormBtn, { backgroundColor: THEME.surfaceDarker, flex: 0.8 }]}
                  onPress={() => {
                    setEditingNoteId(null);
                    setEditingRoomId(null);
                    setNoteTitle('');
                    setNoteContent('');
                    setNoteVisibility('public');
                    setNoteColor('#3b82f6');
                    setNoteDuration(1);
                    setNoteTimeEnabled(false);
                    setNoteTimeAmPm('오후');
                    setNoteTimeHour('12');
                    setNoteTimeMinute('00');
                  }}
                >
                  <Text style={{ color: THEME.text, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>취소</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.noteFormBtn, { backgroundColor: THEME.primary, flex: 1.2 }]}
                onPress={handleSaveNote}
                disabled={savingNote}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                  {(editingNoteId || editingRoomId) ? '수정 완료' : '메모 저장'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!myId && (
          <Text style={styles.noNotesText}>프로필 작성을 완료하셔야 약속 메모를 등록하실 수 있습니다.</Text>
        )}
      </View>
    );
  };

  const startEditNote = (note: CalendarNote) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteVisibility(note.visibility);
    setNoteColor(note.color || '#3b82f6');
    if (note.time) {
      setNoteTimeEnabled(true);
      const parsedStart = convert24hToAmPm(note.time);
      setNoteTimeAmPm(parsedStart.ampm);
      setNoteTimeHour(parsedStart.hour);
      setNoteTimeMinute(parsedStart.minute);

      if (note.end_time) {
        const parsedEnd = convert24hToAmPm(note.end_time);
        setNoteEndTimeAmPm(parsedEnd.ampm);
        setNoteEndTimeHour(parsedEnd.hour);
        setNoteEndTimeMinute(parsedEnd.minute);
      } else {
        // Fallback: start + 1 hour
        let startHr = parseInt(parsedStart.hour, 10);
        let startAmPm = parsedStart.ampm;
        let endHr = startHr + 1;
        if (endHr > 12) {
          endHr = endHr - 12;
          startAmPm = startAmPm === '오전' ? '오후' : '오전';
        }
        setNoteEndTimeAmPm(startAmPm);
        setNoteEndTimeHour(endHr.toString().padStart(2, '0'));
        setNoteEndTimeMinute(parsedStart.minute);
      }
    } else {
      setNoteTimeEnabled(false);
      setNoteTimeAmPm('오후');
      setNoteTimeHour('12');
      setNoteTimeMinute('00');
      setNoteEndTimeAmPm('오후');
      setNoteEndTimeHour('01');
      setNoteEndTimeMinute('00');
    }
  };

  // Render Time Slot Selector as a 7-day Timetable Grid
  const renderTimeSlotSelector = () => {
    return (
      <View style={styles.timeSelectorCard}>
        <View style={styles.timeSelectorHeader}>
          <Clock size={16} color={THEME.primary} />
          <Text style={styles.timeSelectorTitle}>
            {isOneDay ? '약속 당일 시간표 조율' : '7일간 시간표 조율'}
          </Text>
        </View>

        <Text style={styles.timeSelectorSubtitle}>
          {activeTab === 'my'
            ? '시간표 칸을 클릭하여 내가 가능한 시간대를 모두 선택해 주세요.'
            : '메이트들이 가능한 시간대를 실시간 히트맵으로 한눈에 확인합니다.'}
        </Text>

        {/* 격자는 두 부분으로 나뉩니다.
            ①  왼쪽 시간 축 — 가로 스크롤 **바깥**에 있어 항상 보입니다.
            ②  오른쪽 날짜 열 — 이쪽만 가로로 스크롤됩니다.

            예전에는 시간 축이 스크롤 안에 함께 들어 있어서, 오른쪽으로 밀면
            시간 축도 같이 사라졌습니다. 4일차부터는 지금 몇 시를 칠하는지
            모르는 채로 누르게 됐습니다. */}
        <View style={styles.timetableOuter}>
          {/* ① 고정 시간 축 */}
          <View style={styles.timetableFixedColumn}>
            <View style={styles.timetableHeaderRow}>
              <View style={styles.timeLabelHeaderCell} />
            </View>
            <View style={styles.timetableGrid}>
              {TIME_SLOTS.map((time, idx) => (
                <View key={time} style={styles.timetableRow}>
                  <View style={[styles.timeLabelCell, { position: 'relative' }]}>
                    <Text style={[styles.timeLabelText, {
                      position: 'absolute',
                      top: -8,
                      left: 0,
                      right: 0,
                      textAlign: 'center',
                    }]}>
                      {time}
                    </Text>
                    {idx === TIME_SLOTS.length - 1 && (
                      <Text style={[styles.timeLabelText, {
                        position: 'absolute',
                        bottom: -8,
                        left: 0,
                        right: 0,
                        textAlign: 'center',
                      }]}>
                        22:30
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* ② 가로로 스크롤되는 날짜 열 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            onTouchStart={() => onSwipeBackBlockChange?.(true)}
            onTouchEnd={() => onSwipeBackBlockChange?.(false)}
            onTouchCancel={() => onSwipeBackBlockChange?.(false)}
          >
            <View>
            {/* Header Row */}
            <View style={styles.timetableHeaderRow}>
              {gridDates.map(date => {
                const d = new Date(date);
                const dayStr = d.toLocaleDateString('ko-KR', { weekday: 'short' });
                const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
                return (
                  <View key={date} style={styles.dayHeaderCell}>
                    <Text style={styles.dayHeaderDate}>{dateStr}</Text>
                    <Text style={[styles.dayHeaderDay, d.getDay() === 0 ? { color: THEME.danger } : d.getDay() === 6 ? { color: '#3b82f6' } : null]}>
                      ({dayStr})
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Rows */}
            <View
              ref={gridRef}
              style={styles.timetableGrid}
              onStartShouldSetResponder={() => !isConfirmed && activeTab === 'my' && !isCoordination}
              onMoveShouldSetResponder={() => !isConfirmed && activeTab === 'my' && !isCoordination}
              onResponderGrant={handleDragStart}
              onResponderMove={handleDragMove}
              onResponderRelease={handleDragEnd}
              onResponderTerminate={handleDragEnd}
            >
              {TIME_SLOTS.map((time) => (
                <View key={time} style={styles.timetableRow}>
                  {/* Day Cells */}
                  {gridDates.map((date) => {
                    const currentParticipant = participants.find(p => p.id === currentParticipantId);
                    const myProfileId = isCoordination ? myProfile?.id : currentParticipant?.profile_id;
                    const isLocalBusy = calendarEvents.some(e => e.date === date && e.slots.includes(time));
                    const isBusySlot = isLocalBusy || (myProfileId ? isParticipantBusyAt(myProfileId, date, time) : false);

                    const myProfileObj = isCoordination ? myProfile : (currentParticipant ? { id: currentParticipantId, personal_data: currentParticipant.personal_data, schedule: currentParticipant.schedule } : null);
                    const isTravelSlot = myProfileObj ? isTravelingAt(myProfileObj, date, time) : false;
                    const count = getSlotAvailabilityCount(date, time);

                    if (activeTab === 'my') {
                      const isSelected = (isConfirmed ? currentParticipant?.schedule?.[date] : mySchedule[date])?.includes(time);
                      return (
                        <TouchableOpacity
                          key={date}
                          disabled={isConfirmed || isBusySlot || isTravelSlot}
                          onPress={() => toggleCell(date, time)}
                          style={[
                            styles.timetableCell,
                            isSelected && !isBusySlot && !isTravelSlot && styles.timetableCellSelected,
                            isBusySlot && styles.timetableCellBusy,
                            isTravelSlot && { backgroundColor: 'rgba(77, 182, 226, 0.22)', borderColor: '#4DB6E2', borderWidth: 1 }
                          ]}
                        >
                          {isBusySlot && <Text style={styles.busyText}>바쁨</Text>}
                          {isTravelSlot && <Text style={{ fontSize: 9, color: '#4DB6E2', fontWeight: 'bold', textAlign: 'center' }}>🚗 이동</Text>}
                        </TouchableOpacity>
                      );
                    } else {
                      // Group / Coordination Heatmap display
                      const total = activeHeatmapParticipants.length;
                      const intensity = total > 0 ? count / total : 0;
                      const cellBg = intensity > 0
                        ? `rgba(0, 163, 255, ${0.1 + intensity * 0.7})`
                        : THEME.background;

                      return (
                        <View
                          key={date}
                          style={[styles.timetableCell, { backgroundColor: cellBg }]}
                        >
                          {count > 0 && (
                            <Text style={[styles.heatmapCountText, intensity > 0.5 && { color: '#FFFFFF', fontWeight: 'bold' }]}>
                              {count}명
                            </Text>
                          )}
                        </View>
                      );
                    }
                  })}
                </View>
              ))}
            </View>
            </View>
          </ScrollView>
        </View>

        {!isConfirmed && activeTab === 'my' && (
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>내 일정 저장하기</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, isWeeklySettings && { padding: 0 }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      scrollEnabled={scrollEnabled}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />
      }
    >
      {/* Mock AD Banner */}
      <View style={styles.adBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.adTitle}>배달의민족 10% 쿠폰 증정 🎁</Text>
          <Text style={styles.adDesc}>첫 정산 요청 생성 시 배민원 3천원 할인쿠폰 증정!</Text>
        </View>
        <Text style={{ fontSize: 24 }}>🍗</Text>
      </View>

      {/* Calendar Sync Toggle Switch */}
      {!isConfirmed && (
        <View style={styles.calSyncToggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.calSyncToggleTitle}>📅 캘린더 자동 연동</Text>
            <Text style={styles.calSyncToggleDesc}>기기 시스템 캘린더 일정을 실시간 반영합니다.</Text>
          </View>
          <Switch
            value={isCalSyncSwitchEnabled}
            onValueChange={handleToggleCalSyncSwitch}
            trackColor={{ false: '#767577', true: THEME.primary }}
            thumbColor={isCalSyncSwitchEnabled ? '#FFFFFF' : '#f4f3f4'}
          />
        </View>
      )}

      {/* Confirmed meeting banner */}
      {isConfirmed && !isGlobal && !isCoordination && (
        <View style={styles.confirmBanner}>
          <CheckCircle size={32} color={THEME.primary} style={{ alignSelf: 'center', marginBottom: 8 }} />
          <Text style={styles.confirmTitle}>약속 시간 확정 완료!</Text>
          <Text style={styles.confirmSlot}>{confirmedSlot}</Text>
          {roomOwner === currentProfileId && (
            <View style={{ gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: THEME.primary }]}
                onPress={() => {
                  setShowChangeTimeModal(true);
                }}
              >
                <Text style={styles.confirmButtonText}>⏰ 약속 시간 변경하기</Text>
              </TouchableOpacity>
              
              {onRetryCoordination && roomId && (
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: '#64748b' }]}
                  onPress={() => {
                    if (onRetryCoordination) {
                      onRetryCoordination(roomId);
                    }
                  }}
                >
                  <Text style={styles.confirmButtonText}>🔄 다시 투표하기 (초기화)</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Friend Checklist Section in Coordination Mode */}
      {isCoordination && (
        <View style={styles.coordinationFriendBox}>
          {/* Header Row with search & add-friend controls */}
          <View style={styles.coordinationHeaderRow}>
            <Text style={styles.coordinationTitle}>
              <Users size={16} color={THEME.primary} /> 함께 약속을 조율할 메이트 선택
            </Text>
            <View style={styles.coordinationActionRow}>
              <TouchableOpacity onPress={() => setIsSearchVisible(!isSearchVisible)} style={styles.iconActionBtn}>
                <Search size={14} color={THEME.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowAddFriendModal(true)} style={[styles.iconActionBtn, { marginLeft: 8 }]}>
                <Plus size={14} color={THEME.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Collapsible search field */}
          {isSearchVisible && (
            <TextInput
              style={styles.friendSearchInput}
              placeholder="이름으로 친구 검색..."
              placeholderTextColor={THEME.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalFriendsScroll}>
            {/* 1. "Me" Card */}
            {myProfile && (
              <TouchableOpacity
                key={myProfile.id}
                style={[
                  styles.friendSelectCard,
                  styles.friendSelectCardActive,
                  { borderColor: THEME.primary }
                ]}
                onPress={() => {
                  if (onViewProfile) onViewProfile(myProfile.id);
                }}
              >
                <View style={[styles.avatarBubble, { backgroundColor: myProfile.avatar_color || '#BFDBFE', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }]}>
                  {myProfile.avatar_url ? (
                    <Image source={{ uri: myProfile.avatar_url }} style={{ width: '100%', height: '100%', position: 'absolute', resizeMode: 'cover' }} />
                  ) : (
                    <Text style={{ fontSize: 14 }}>
                      {myProfile.personal_data?.profileEmoji || '🦁'}
                    </Text>
                  )}
                  <View style={{ backgroundColor: 'rgba(0,0,0,0.3)', position: 'absolute', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                    <Check size={12} color="white" />
                  </View>
                </View>
                <Text style={styles.friendSelectName} numberOfLines={1}>{myProfile.name} (나)</Text>
                <Text style={styles.friendRoleText}>내 프로필</Text>
              </TouchableOpacity>
            )}

            {/* 2. Friend Cards */}
            {follows
              .filter(follow => {
                if (!searchQuery.trim()) return true;
                const friend = follow.profiles;
                return friend && friend.name.toLowerCase().includes(searchQuery.toLowerCase());
              })
              .map(follow => {
                const friend = follow.profiles;
                if (!friend) return null;
                const isSelected = selectedFriendIds.includes(friend.id);
                return (
                  <View key={friend.id} style={{ position: 'relative' }}>
                    <TouchableOpacity
                      style={[
                        styles.friendSelectCard,
                        isSelected && styles.friendSelectCardActive
                      ]}
                      onPress={() => {
                        if (onViewProfile) onViewProfile(friend.id);
                      }}
                    >
                      <View style={[styles.avatarBubble, { backgroundColor: friend.avatar_color, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }]}>
                        {friend.avatar_url ? (
                          <Image source={{ uri: friend.avatar_url }} style={{ width: '100%', height: '100%', position: 'absolute', resizeMode: 'cover' }} />
                        ) : (
                          <Text style={{ fontSize: 14 }}>
                            {friend.personal_data?.profileEmoji || '👤'}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.friendSelectName} numberOfLines={1}>{friend.name}</Text>
                      <Text style={styles.friendRoleText}>
                        {follow.role === 'leader' ? '⭐ 친한 친구' : '👤 메이트'}
                      </Text>
                    </TouchableOpacity>

                    {/* Checkbox overlay badge on the top right */}
                    <TouchableOpacity
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        backgroundColor: isSelected ? THEME.primary : 'white',
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        borderWidth: 1.5,
                        borderColor: isSelected ? THEME.primary : '#CBD5E1',
                        justifyContent: 'center',
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 1,
                        elevation: 2
                      }}
                      onPress={() => toggleSelectFriend(friend.id)}
                    >
                      {isSelected && <Check size={8} color="white" />}
                    </TouchableOpacity>
                  </View>
                );
              })}
          </ScrollView>
        </View>
      )}

      {/* Header & Tabs */}
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>
          <CalendarIcon size={16} color={THEME.primary} />
          {isGlobal
            ? ' 내 개인 달력'
            : isWeeklySettings
              ? ' 일정 입력 중'
              : isCoordination
                ? ' 실시간 캘린더 조율'
                : ` 일정 조율 ${!isConfirmed ? '(조율 중)' : ''}`}
        </Text>

        {!isConfirmed && !isGlobal && !isCoordination && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'my' && styles.tabActive]}
              onPress={() => setActiveTab('my')}
            >
              <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>내 일정</Text>
            </TouchableOpacity>
            {participants.length > 0 && (
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'group' && styles.tabActive]}
                onPress={() => setActiveTab('group')}
              >
                <Text style={[styles.tabText, activeTab === 'group' && styles.tabTextActive]}>모두의 시간</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'calendar' && styles.tabActive]}
              onPress={() => setActiveTab('calendar')}
            >
              <Text style={[styles.tabText, activeTab === 'calendar' && styles.tabTextActive]}>연동</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Calendar Tab View - Sync details */}
      {activeTab === 'calendar' && !isCoordination && (
        <View style={styles.syncCard}>
          {isCalendarConnected ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.syncCardTitle}>📅 기기 일정 연동 완료 ✅</Text>
              <Text style={styles.syncCardDesc}>
                연동 출처: {calendarAccount} ({calendarEvents.length}개 일정 자동 반영됨)
              </Text>
              <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnectCalendar}>
                <Text style={styles.disconnectBtnText}>연동 해제</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.syncCardTitle}>내 스마트폰 캘린더 연동</Text>
              <Text style={styles.syncCardDesc}>
                기기에 저장된 일정(삼성/Apple 캘린더)을 가져와서 바쁜 일정을 그리드에서 자동 제외합니다.
              </Text>

              <TouchableOpacity
                style={styles.syncButton}
                onPress={syncNativeCalendar}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.syncButtonText}>기기 캘린더 일정 불러오기</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.demoButton} onPress={handleLoadDemoEvents}>
                <Text style={styles.demoButtonText}>시뮬레이션용 가상 일정 불러오기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Monthly Grid Calendar Box */}
      <View style={styles.calendarBox}>

        {/* Month selector controls */}
        <View style={styles.calendarHeaderRow}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowBtn}>
            <ChevronLeft size={20} color={currentMonthIndex > 0 ? THEME.text : THEME.textMuted} />
          </TouchableOpacity>

          <Text style={styles.calendarMonthText}>
            {monthsList[currentMonthIndex]?.label}
          </Text>

          <TouchableOpacity onPress={handleNextMonth} style={styles.arrowBtn}>
            <ChevronRight size={20} color={currentMonthIndex < monthsList.length - 1 ? THEME.text : THEME.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sliding ScrollView containing 3 month grids */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          scrollEventThrottle={16}
          style={{ width: INNER_CAL_WIDTH }}
          onTouchStart={() => onSwipeBackBlockChange?.(true)}
          onTouchEnd={() => onSwipeBackBlockChange?.(false)}
          onTouchCancel={() => onSwipeBackBlockChange?.(false)}
        >
          {monthsList.map(m => renderMonthGrid(m.year, m.month))}
        </ScrollView>
      </View>

      {/* Selected Date Summary Card */}
      {!hideSummaryCard && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryDateText}>📅 {selectedDate} 일정 요약</Text>
            {!isConfirmed && activeTab === 'my' && (
              <TouchableOpacity
                style={styles.editTimeBtn}
                onPress={() => setShowCalendarModal(true)}
              >
                <Text style={styles.editTimeBtnText}>시간 수정</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.busyChipsContainer}>
            {getBusyTimeChipsForDate(selectedDate).length > 0 ? (
              getBusyTimeChipsForDate(selectedDate).map((chip, idx) => (
                <View key={idx} style={styles.busyChip}>
                  <Text style={styles.busyChipText}>{chip}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noBusyText}>바쁜 일정이 없습니다. (자유로움)</Text>
            )}
          </View>
        </View>
      )}

      {/* CalendarModal for detail hourly slot drawing */}
      {showCalendarModal && (
        <CalendarModal
          visible={true}
          dateString={selectedDate}
          initialSlots={getInitialSlotsForDate(selectedDate)}
          lockedSlots={getLockedSlotsForDate(selectedDate)}
          onClose={() => setShowCalendarModal(false)}
          onSave={(slots) => handleSaveCalendarModal(selectedDate, slots)}
        />
      )}

      {/* Simulation Video Ad Modal */}
      <Modal
        visible={isAdPlaying}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsAdPlaying(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.95)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 24, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 }}>

            <View style={{ backgroundColor: 'rgba(35, 164, 85, 0.1)', padding: 12, borderRadius: 50, marginBottom: 16 }}>
              <Sparkles size={32} color={THEME.primary} />
            </View>

            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 }}>
              약속 모임 솔루션 “밀챗 프리미엄” 🎁
            </Text>
            <Text style={{ fontSize: 11, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 16 }}>
              친구들과의 최적 조율 시간과 중간 장소를 계산하여 가장 스마트한 모임을 예약하세요!
            </Text>

            {/* Video Placeholder Box */}
            <View style={{ width: '100%', height: 160, backgroundColor: '#0f172a', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>📺 광고 영상 재생 중...</Text>
              <ActivityIndicator size="small" color={THEME.primary} />
              <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 12 }}>
                (가상의 비디오 광고가 시뮬레이션되고 있습니다)
              </Text>
            </View>

            {adSecondsLeft > 0 ? (
              <View style={{ backgroundColor: '#f1f5f9', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, width: '100%', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: '#475569', fontWeight: 'bold' }}>
                  광고 종료까지 {adSecondsLeft}초 남음 ⏳
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={{ backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 8, width: '100%', alignItems: 'center' }}
                onPress={handleFinishAd}
              >
                <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>
                  광고 완료! AI 코멘트 열기 🔓
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Selected date action panel */}
      {activeTab !== 'calendar' && (
        isCoordination ? renderCalendarNotesSection() : renderTimeSlotSelector()
      )}

      {/* AI Recommendations */}
      {!isConfirmed && (
        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>
            <Sparkles size={16} color={THEME.primary} /> {isCoordination ? 'AI 추천 약속 날짜 (일정이 없는 날)' : 'AI 추천 약속 시간'}
          </Text>

          {isCoordination ? (
            <View>
              {dateRecommendations.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 11, color: THEME.textMuted, marginBottom: 4 }}>
                    {monthsList[currentMonthIndex]?.label} - 추천 일정 TOP 5 (최대)
                  </Text>
                  {/* 단일 날짜 모드 */}
                  {dateRecommendations.map((rec: any, idx) => {
                    const formattedDate = new Date(rec.date).toLocaleDateString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                    });
                    const isSelected = selectedDate === rec.date;
                    const isFree = rec.availableCount === activeHeatmapParticipants.length;
                    const weather = weatherForecast[rec.date];
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.recItem, isSelected && { borderColor: THEME.primary, borderWidth: 1.5 }]}
                        onPress={() => setSelectedDate(rec.date)}
                      >
                        <Text style={styles.recRank}>{idx + 1}위</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.recDateText}>
                            {formattedDate} {weather ? `(${weather.icon})` : ''}
                            {isFree && ' ✨'}
                          </Text>
                          <Text style={styles.recMetaText}>
                            {isFree
                              ? `모두가 자유로운 날 🎉`
                              : `가능 메이트: ${rec.freeParticipants.join(', ')} (${rec.availableCount}/${activeHeatmapParticipants.length}명 가능)`}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                    <Text style={styles.confirmBtnText}>
                      {`${new Date(selectedDate).toLocaleDateString('ko-KR', {
                        month: 'long',
                        day: 'numeric',
                      })}로 약속 방 개설하기 🚀`}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.aiNoRecs}>
                  {/*
                    selectMode가 'single' 고정이라 range 분기는 도달 불가여서 제거했습니다.
                    기간 선택 기능을 되살릴 때 아래 문구를 함께 복원하세요:
                    `${monthsList[currentMonthIndex]?.label}에는 모두가 함께 2일 이상 자유로운 기간이 없습니다.`
                  */}
                  {activeHeatmapParticipants.length === 0
                    ? '함께 조율할 메이트를 선택해 주세요.'
                    : `${monthsList[currentMonthIndex]?.label}에는 모두가 함께 가능한 날이 없습니다.`}
                </Text>
              )}
            </View>
          ) : (
            recommendations.length > 0 ? (
              <View style={{ gap: 8 }}>
                {recommendations.map((rec, idx) => {
                  // 로케일 인자에 'short'가 들어가 있어 기기 기본 로케일로 떨어졌고,
                  // 다른 화면은 한글인데 여기만 'Sat, Jul 25'처럼 영어로 나왔습니다.
                  const formattedDate = new Date(rec.date).toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    weekday: 'short',
                  });
                  const isBest = idx === 0;
                  const isSelected = selectedRecommendation?.date === rec.date && selectedRecommendation?.time === rec.time;

                  const weather = weatherForecast[rec.date];
                  return (
                    <TouchableOpacity
                      key={`${rec.date}-${rec.time}`}
                      style={[styles.recItem, isBest && styles.recItemBest, isSelected && { borderColor: THEME.primary, borderWidth: 2 }]}
                      onPress={() => {
                        setSelectedRecommendation({ date: rec.date, time: rec.time });
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recDateText}>
                          {formattedDate} {weather ? `(${weather.icon})` : ''} {rec.time}
                        </Text>
                        <Text style={styles.recMetaText}>
                          가능 메이트: {rec.names.join(', ')} ({rec.count}/{activeHeatmapParticipants.length}명)
                        </Text>
                      </View>
                      {isBest && <Text style={styles.badgeBest}>Best</Text>}
                    </TouchableOpacity>
                  );
                })}

                {roomOwner === currentProfileId ? (
                  <TouchableOpacity
                    style={[styles.confirmBtn, !selectedRecommendation && { opacity: 0.5 }]}
                    onPress={() => {
                      if (selectedRecommendation && onConfirmSchedule) {
                        const formattedDateStr = new Date(selectedRecommendation.date).toLocaleDateString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        });
                        onConfirmSchedule(`${formattedDateStr} ${selectedRecommendation.time}`);
                      }
                    }}
                    disabled={!selectedRecommendation}
                  >
                    <Text style={styles.confirmBtnText}>
                      {selectedRecommendation ? `${selectedRecommendation.time} 시간으로 약속 확정하기 🥳` : '시간을 선택해주세요'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.confirmBtn, { backgroundColor: '#94a3b8', opacity: 0.8 }]}>
                    <Text style={styles.confirmBtnText}>
                      🔒 방장만 일정을 확정할 수 있습니다
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.aiNoRecs}>참여자들의 일정을 입력하면 AI가 매칭을 도와드립니다.</Text>
            )
          )}


        </View>
      )}

      {/* AI Recommended Meeting Place & Travel Times */}
      {!isConfirmed && isCoordination && activeHeatmapParticipants.length >= 2 && (
        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>
            <Sparkles size={16} color={THEME.primary} /> AI 중간 약속 장소 및 소요 시간 추천
          </Text>

          {(() => {
            const rec = getMidPointRecommendation();
            if (!rec) {
              return (
                <Text style={styles.aiNoRecs}>
                  참여 메이트들의 기본 출발 위치가 프로필에 등록되면 최적 중간 장소와 이동 정보를 계산합니다.
                </Text>
              );
            }

            return (
              <View>
                <Text style={{ fontSize: 11, color: THEME.textMuted, marginBottom: 10 }}>
                  참여자들의 출발 좌표 중심점에 가장 인접한 주요 환승 허브역을 매칭했습니다.
                </Text>

                <View style={styles.midPointResultBox}>
                  <Text style={styles.midPointResultText}>
                    📍 최적 중간 지점: <Text style={{ color: THEME.primary, fontWeight: 'bold' }}>{rec.hubName}</Text>
                  </Text>
                </View>

                <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.text, marginTop: 14, marginBottom: 6 }}>
                  🚗 메이트별 소요 시간 (편도 기준)
                </Text>

                {rec.travelList.map((travel, idx) => (
                  <View key={idx} style={styles.travelItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: THEME.text, fontWeight: '600' }}>
                        {travel.name} <Text style={{ fontSize: 10, color: THEME.textMuted }}>({travel.startName} 출발)</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: THEME.textMuted, marginTop: 2 }}>
                        직선거리: {travel.distKm}km
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 11, color: '#334155', fontWeight: 'bold' }}>
                        🚌 대중교통: {travel.transitMin}분
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        🚖 택시: {travel.taxiMin}분 (약 {travel.fare.toLocaleString()}원)
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        🚶 도보: {travel.walkMin}분
                      </Text>
                    </View>
                  </View>
                ))}

                <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME.text, marginTop: 16, marginBottom: 8 }}>
                  ✨ AI 맞춤형 핫플레이스 추천
                </Text>

                <View style={{ gap: 8 }}>
                  {rec.hotplaces.map((place, idx) => {
                    const isSelected = selectedHotplace?.name === place.name;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.hotplaceItemCard,
                          isSelected && {
                            borderColor: THEME.primary,
                            borderWidth: 1.5,
                            backgroundColor: THEME.badgeBg
                          }
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedHotplace(null);
                            setCoordinationRoomLocation('');
                          } else {
                            setSelectedHotplace(place);
                            setCoordinationRoomLocation(place.name);
                          }
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {isSelected && <Check size={14} color={THEME.primary} />}
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1e293b' }}>{place.name}</Text>
                          </View>
                          {!isAdUnlocked && (
                            <View style={styles.categoryBadge}>
                              <Text style={styles.categoryBadgeText}>{place.category}</Text>
                            </View>
                          )}
                        </View>

                        {isAdUnlocked ? (
                          <View style={{ marginTop: 2 }}>
                            {loadingAIDetails ? (
                              <View style={{ paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <ActivityIndicator size="small" color={THEME.primary} />
                                <Text style={{ fontSize: 11, color: '#64748b' }}>
                                  🤖 제미나이 AI가 구글 실시간 검색으로 맛집 정보 수집 중...
                                </Text>
                              </View>
                            ) : (
                              <>
                                {/* 평점은 출처가 있을 때만 표시합니다.
                                    Gemini 가 실제로 조회한 값이 없으면 rating 이
                                    비어 있고, 그때는 분류만 보여줍니다. */}
                                <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                                  {place.category}
                                  {place.rating ? ` · ${parseReviewsCount(place.rating)}` : ''}
                                </Text>
                                {!place.hasAIDetails && (
                                  <Text style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>
                                    아래 메뉴·가격은 업종 평균이며 이 매장의 실제 정보가 아닙니다.
                                  </Text>
                                )}
                                <Text style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                                  🍴 <Text style={{ fontWeight: '600' }}>대표 메뉴:</Text> {place.menu}
                                </Text>
                                <Text style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                                  💵 <Text style={{ fontWeight: '600' }}>평균 가격대:</Text> {place.price}
                                </Text>
                                <Text style={{ fontSize: 11, color: '#475569', marginTop: 2, marginBottom: 6 }}>
                                  🕒 <Text style={{ fontWeight: '600' }}>영업시간:</Text> {place.business_hours || '정보 없음'}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                  <Text style={{ fontSize: 11, color: '#334155', fontWeight: '500' }}>
                                    {place.description}
                                  </Text>
                                  <View style={{
                                    backgroundColor: '#e2e8f0',
                                    paddingHorizontal: 6,
                                    paddingVertical: 1.5,
                                    borderRadius: 10,
                                  }}>
                                    <Text style={{ fontSize: 9, color: '#475569', fontWeight: '600' }}>AI 요약 ⓘ</Text>
                                  </View>
                                </View>
                              </>
                            )}
                          </View>
                        ) : (
                          <View style={{ marginTop: 4 }}>
                            <Text style={{ fontSize: 10.5, color: '#64748b', lineHeight: 14 }}>
                              {place.basicInfo}
                            </Text>
                            <Text style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' }}>
                              🔒 대표 메뉴, 평점, 가격대, AI 매칭 코멘트는 광고 시청 시 모두 잠금해제됩니다.
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {!isAdUnlocked && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: THEME.primary,
                      borderRadius: 8,
                      paddingVertical: 10,
                      alignItems: 'center',
                      marginTop: 12,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6
                    }}
                    onPress={handleStartAd}
                  >
                    <Sparkles size={13} color="white" />
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                      📺 광고 시청하고 AI 맞춤형 분석 코멘트 열기
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}
        </View>
      )}

      {/* Room lists below calendar in global mode */}
      {isGlobal && (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>
            <Clock size={14} color={THEME.textMuted} /> 예정된 약속 목록
          </Text>
          {activeRooms.length > 0 ? (
            activeRooms.map(room => (
              <TouchableOpacity
                key={room.id}
                onPress={() => onSelectRoom && onSelectRoom(room)}
                style={styles.roomCard}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.roomCardTitle}>{room.title}</Text>
                  <Text style={styles.roomCardMeta}>
                    일시: {getMeetingDateDisplay(room)} | 코드: {room.code}
                  </Text>
                </View>
                <Text style={styles.roomCardArrow}>입장 ➜</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noRoomsText}>예정된 약속이 없습니다. [일정 조율]에서 개설해 보세요.</Text>
          )}
        </View>
      )}

      {/* Modal to create room in Coordination Mode */}
      <Modal
        visible={showCreateRoomModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateRoomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { marginBottom: 120, width: '90%', maxWidth: 400, borderRadius: 16 }]}>
            <Text style={styles.modalTitle}>새 밀챗 방 만들기 🚀</Text>

            <View style={styles.coordinationMetaInfo}>
              <Text style={styles.metaLabel}>약속 시작일</Text>
              {/*
                예전에는 이 자리가 TouchableOpacity 로, 누르면
                coordinationStartDate 를 selectedDate 와 null 사이로 토글했다.
                그런데 두 값 모두 `coordinationStartDate || selectedDate` 로
                읽혀 표시·저장 결과가 항상 selectedDate 로 같았다 — 눌러도
                아무 것도 안 바뀌는 죽은 컨트롤이었다(AE-4 와 같은 부류).
                시작일은 이 모달을 열기 전에 달력에서 이미 골랐으므로, 여기서는
                고른 값을 그대로 보여주기만 한다.
              */}
              <View style={{ gap: 10, marginTop: 8 }}>
                <View style={styles.dateSelectInput}>
                  <Text style={styles.dateSelectValue}>
                    {new Date(selectedDate).toLocaleDateString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>모임 이름 (방 제목)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="예: 삼겹살 번개 모임 🐷"
                placeholderTextColor={THEME.textMuted}
                value={coordinationRoomTitle}
                onChangeText={setCoordinationRoomTitle}
              />
            </View>

            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>약속 장소 (선택)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="예: 강남역 삼겹살집 🐷 (선택 시 자동 입력됨)"
                placeholderTextColor={THEME.textMuted}
                value={coordinationRoomLocation}
                onChangeText={setCoordinationRoomLocation}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: THEME.avatarBg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 6,
                  paddingVertical: 8,
                  alignItems: 'center',
                  marginTop: 6
                }}
                onPress={() => {
                  const defaultLat = roomLatitude || 37.5665;
                  const defaultLng = roomLongitude || 126.9780;
                  setMapRegion({
                    latitude: defaultLat,
                    longitude: defaultLng,
                    latitudeDelta: 0.0092,
                    longitudeDelta: 0.0042,
                  });
                  setShowLocationMapModal(true);
                }}
              >
                <Text style={{ fontSize: 11, color: THEME.primary, fontWeight: 'bold' }}>🗺️ 지도에서 위치 선택</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowCreateRoomModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={handleCreateRoomFromCoordination}
                disabled={confirmingCoordination}
              >
                {confirmingCoordination ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalBtnSubmitText}>방 개설 완료 🎉</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal to add friend in Coordination Mode */}
      <Modal
        visible={showAddFriendModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddFriendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '90%', maxWidth: 400, borderRadius: 16 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.modalTitle}>친구 추가 (메이트 추가) 👤</Text>
              <TouchableOpacity onPress={() => setShowAddFriendModal(false)} style={{ padding: 4 }}>
                <X size={20} color={THEME.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 16 }}>
              친구의 닉네임과 고유 태그(숫자 3자리)를 입력해 주세요. (예: 철희 / 123)
            </Text>

            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>친구 이름</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="예: 철희"
                placeholderTextColor={THEME.textMuted}
                value={addFriendName}
                onChangeText={setAddFriendName}
              />
            </View>

            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>태그 (숫자 3자리)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="예: 123"
                placeholderTextColor={THEME.textMuted}
                value={addFriendTag}
                onChangeText={setAddFriendTag}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowAddFriendModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={handleFollowFriend}
                disabled={addFriendLoading}
              >
                {addFriendLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalBtnSubmitText}>메이트 등록 ➜</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. Time Picker Modal with Dials */}
      <Modal
        visible={showTimePickerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimePickerModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: THEME.border,
              width: '80%',
              padding: 20,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: THEME.text, marginBottom: 15 }}>
              {activeTimeField === 'start' ? '약속 시작 시간 설정 (다이얼)' : '약속 종료 시간 설정 (다이얼)'}
            </Text>

            <View style={{ flexDirection: 'row', gap: 15, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              {/* AM / PM Wheel */}
              <WheelSpinner
                data={AMPM_DATA}
                selectedValue={activeTimeField === 'start' ? noteTimeAmPm : noteEndTimeAmPm}
                onValueChange={(val) => activeTimeField === 'start' ? setNoteTimeAmPm(val as '오전' | '오후') : setNoteEndTimeAmPm(val as '오전' | '오후')}
              />

              <Text style={{ fontSize: 16, fontWeight: 'bold', color: THEME.textMuted }}>:</Text>

              {/* Hour Wheel */}
              <WheelSpinner
                data={HOUR_DATA}
                selectedValue={activeTimeField === 'start' ? noteTimeHour : noteEndTimeHour}
                onValueChange={(val) => activeTimeField === 'start' ? setNoteTimeHour(val) : setNoteEndTimeHour(val)}
              />

              <Text style={{ fontSize: 16, fontWeight: 'bold', color: THEME.textMuted }}>:</Text>

              {/* Minute Wheel */}
              <WheelSpinner
                data={MINUTE_DATA}
                selectedValue={activeTimeField === 'start' ? noteTimeMinute : noteEndTimeMinute}
                onValueChange={(val) => activeTimeField === 'start' ? setNoteTimeMinute(val) : setNoteEndTimeMinute(val)}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: THEME.surfaceDarker,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: THEME.border,
                }}
                onPress={() => setShowTimePickerModal(false)}
              >
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: THEME.text }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: THEME.primary,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={() => setShowTimePickerModal(false)}
              >
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: 'white' }}>선택 완료</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
              // 안드로이드에서는 최초 마운트 시 `region` 만으로는 카메라가
              // 적용되지 않고 (0, 0) 부근(기니만)에서 시작하는 경우가
              // 있었다(실기기 확인). 이 <Modal> 은 열려 있지 않을 때도
              // MapView 를 계속 마운트한 채로 두므로, 처음 열렸을 때 지도가
              // 엉뚱한 곳(적도·본초자오선 교차점)에서 시작해 서울로 이동한
              // 적이 있는지조차 알아채기 어려웠다. `initialRegion` 을 같이
              // 줘서 최초 카메라 위치를 보장한다.
              initialRegion={mapRegion}
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
                setRoomLatitude(mapRegion.latitude);
                setRoomLongitude(mapRegion.longitude);
                setShowLocationMapModal(false);
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: 'white' }}>이 위치로 설정</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Host-only Change Confirmed Time Modal */}
      {showChangeTimeModal && (
        <Modal
          visible={true}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowChangeTimeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: '90%', maxWidth: 400, borderRadius: 16 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={styles.modalTitle}>⏰ 약속 시간 변경 (방장 전용)</Text>
                <TouchableOpacity onPress={() => setShowChangeTimeModal(false)} style={{ padding: 4 }}>
                  <X size={20} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 16 }}>
                새로운 약속 요일과 시간을 설정해 주세요. 확정 완료 시 멤버들에게 실시간 알림이 전송됩니다.
              </Text>

              <View style={styles.modalFormGroup}>
                <Text style={styles.modalLabel}>요일/날짜 지정</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="예: 6월 28일 (일)"
                  placeholderTextColor={THEME.textMuted}
                  value={changeTimeDate}
                  onChangeText={setChangeTimeDate}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>시 (Hour)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="예: 19"
                    placeholderTextColor={THEME.textMuted}
                    value={changeTimeHour}
                    onChangeText={setChangeTimeHour}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>분 (Minute)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="예: 30"
                    placeholderTextColor={THEME.textMuted}
                    value={changeTimeMinute}
                    onChangeText={setChangeTimeMinute}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setShowChangeTimeModal(false)}
                >
                  <Text style={styles.modalBtnCancelText}>취소</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSubmit]}
                  onPress={() => {
                    if (!changeTimeDate.trim()) {
                      Alert.alert('알림', '요일/날짜를 입력해 주세요.');
                      return;
                    }
                    if (!changeTimeHour.trim() || !changeTimeMinute.trim()) {
                      Alert.alert('알림', '시간을 입력해 주세요.');
                      return;
                    }
                    const hourNum = parseInt(changeTimeHour, 10);
                    const minNum = parseInt(changeTimeMinute, 10);
                    if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
                      Alert.alert('알림', '시는 0부터 23 사이의 값이어야 합니다.');
                      return;
                    }
                    if (isNaN(minNum) || minNum < 0 || minNum > 59) {
                      Alert.alert('알림', '분은 0부터 59 사이의 값이어야 합니다.');
                      return;
                    }

                    const formattedHour = changeTimeHour.padStart(2, '0');
                    const formattedMin = changeTimeMinute.padStart(2, '0');
                    const newSlot = `${changeTimeDate.trim()} ${formattedHour}:${formattedMin}`;

                    if (onConfirmSchedule) {
                      onConfirmSchedule(newSlot);
                    }
                    setShowChangeTimeModal(false);
                  }}
                >
                  <Text style={styles.modalBtnSubmitText}>변경 완료 ➜</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

const AMPM_DATA = ['오전', '오후'];
const HOUR_DATA = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const MINUTE_DATA = ['00', '30'];

interface WheelSpinnerProps {
  data: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
}

const WheelSpinner: React.FC<WheelSpinnerProps> = ({ data, selectedValue, onValueChange }) => {
  const itemHeight = 32;
  const visibleItems = 5;
  // Pad the data with 2 blank items at the start and end
  const paddedData = ['', '', ...data, '', ''];
  const flatListRef = useRef<FlatList>(null);

  // When selectedValue changes, scroll to the index
  useEffect(() => {
    const index = data.indexOf(selectedValue);
    if (index !== -1 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: index * itemHeight,
          animated: false,
        });
      }, 50);
    }
  }, [selectedValue, data]);

  const onMomentumScrollEnd = (event: any) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    const index = Math.round(yOffset / itemHeight);
    const newValue = data[index];
    if (newValue !== undefined && newValue !== selectedValue) {
      onValueChange(newValue);
    }
  };

  return (
    <View style={{ height: itemHeight * visibleItems, width: 70, overflow: 'hidden' }}>
      {/* Target area highlighting lines */}
      <View
        style={{
          position: 'absolute',
          top: itemHeight * 2,
          left: 0,
          right: 0,
          height: itemHeight,
          borderColor: THEME.primary,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
        }}
      />
      <FlatList
        ref={flatListRef}
        data={paddedData}
        keyExtractor={(_, index) => index.toString()}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        })}
        renderItem={({ item }) => (
          <View style={{ height: itemHeight, justifyContent: 'center', alignItems: 'center' }}>
            <Text
              style={{
                fontSize: item === selectedValue ? 15 : 12,
                fontWeight: item === selectedValue ? 'bold' : 'normal',
                color: item === selectedValue ? THEME.text : THEME.textMuted,
              }}
            >
              {item}
            </Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  /** Figma 달력 셀의 일정 표시 — 제목 대신 점 하나 */
  calendarDayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  selectionModeContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.surfaceDarker,
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
    alignSelf: 'center',
    width: '100%',
    justifyContent: 'space-between'
  },
  selectionModeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center'
  },
  selectionModeBtnActive: {
    backgroundColor: THEME.primary
  },
  selectionModeBtnText: {
    fontSize: 12,
    color: THEME.textMuted,
    fontWeight: '500'
  },
  selectionModeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  container: {
    flex: 1,
    backgroundColor: THEME.background,
    padding: 16
  },
  adBanner: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  adTitle: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold'
  },
  adDesc: {
    color: THEME.textMuted,
    fontSize: 10,
    marginTop: 2
  },
  confirmBanner: {
    backgroundColor: THEME.badgeBg,
    borderWidth: 1,
    borderColor: THEME.primary,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16
  },
  confirmTitle: {
    color: THEME.text,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4
  },
  confirmSlot: {
    color: THEME.primary,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  confirmButton: {
    backgroundColor: THEME.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text,
    flex: 1
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.surfaceDarker,
    padding: 2,
    borderRadius: 8
  },
  tabButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  tabActive: {
    backgroundColor: THEME.primary
  },
  tabText: {
    fontSize: 11,
    color: THEME.textMuted
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  syncCard: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16
  },
  syncCardTitle: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6
  },
  syncCardDesc: {
    color: THEME.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12
  },
  syncButton: {
    backgroundColor: THEME.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center'
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  demoButton: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.border
  },
  demoButtonText: {
    color: THEME.primary,
    fontSize: 11
  },
  disconnectBtn: {
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6
  },
  disconnectBtnText: {
    color: THEME.danger,
    fontSize: 11
  },
  calendarBox: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 0,
    marginBottom: 16,
    alignItems: 'center'
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 12,
    marginBottom: 12
  },
  calendarMonthText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text
  },
  arrowBtn: {
    padding: 4
  },
  calendarDaysRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    paddingBottom: 6,
    marginBottom: 6
  },
  calendarDayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 'bold'
  },
  calendarGrid: {
    flexDirection: 'column'
  },
  calendarWeekRow: {
    flexDirection: 'row',
    width: '100%'
  },
  calendarCellEmpty: {
    flex: 1,
    height: 44
  },
  calendarCell: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center'
  },
  calendarCellSelected: {
    borderWidth: 1.5,
    borderColor: THEME.primary,
    borderRadius: 6
  },
  calendarCellInRange: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.primary,
    backgroundColor: 'rgba(0, 163, 255, 0.12)'
  },
  calendarCellTarget: {
    backgroundColor: THEME.badgeBg,
    borderWidth: 1,
    borderColor: THEME.primary,
    borderRadius: 6
  },
  calendarCellDay: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.text
  },
  calendarEventsIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
    marginTop: 2
  },
  eventDot: {
    backgroundColor: '#8b5cf6',
    borderRadius: 2,
    paddingHorizontal: 3,
    paddingVertical: 1
  },
  eventDotText: {
    color: 'white',
    fontSize: 7,
    textAlign: 'center',
    fontWeight: 'bold'
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 10
  },
  roomCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
    shadowColor: '#323333',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  roomCardTitle: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold'
  },
  roomCardMeta: {
    color: THEME.textMuted,
    fontSize: 10,
    marginTop: 2
  },
  roomCardArrow: {
    color: THEME.primary,
    fontSize: 12,
    fontWeight: 'bold'
  },
  noRoomsText: {
    color: THEME.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 16
  },

  // Time selector styles
  timeSelectorCard: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  timeSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6
  },
  timeSelectorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text
  },
  timeSelectorSubtitle: {
    fontSize: 11,
    color: THEME.textMuted,
    marginBottom: 14
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  timeSlotCell: {
    width: '30%',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.background,
    alignItems: 'center',
    justifyContent: 'center'
  },
  timeSlotCellSelected: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary
  },
  timeSlotCellBusy: {
    backgroundColor: THEME.surfaceDarker,
    borderColor: THEME.border,
    opacity: 0.5
  },
  timeSlotText: {
    fontSize: 12,
    color: THEME.text,
    fontWeight: '500'
  },
  timeSlotTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  timeSlotTextBusy: {
    color: THEME.textMuted,
    textDecorationLine: 'line-through'
  },
  timeSlotCellGroup: {
    width: '47%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: 'center'
  },
  groupSlotCount: {
    fontSize: 9,
    color: THEME.textMuted,
    marginTop: 2
  },
  groupSlotCountEmpty: {
    fontSize: 9,
    color: THEME.textMuted,
    marginTop: 2,
    fontStyle: 'italic'
  },
  saveBtn: {
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold'
  },

  // AI Recommendation Card
  aiCard: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  aiTitle: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  recItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.background
  },
  recRank: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.primary,
    marginRight: 10,
    minWidth: 25,
  },
  recItemBest: {
    backgroundColor: THEME.badgeBg,
    borderColor: THEME.primary
  },
  recDateText: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold'
  },
  recMetaText: {
    color: THEME.textMuted,
    fontSize: 10,
    marginTop: 2
  },
  badgeBest: {
    backgroundColor: THEME.primary,
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4
  },
  confirmBtn: {
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold'
  },
  aiNoRecs: {
    color: THEME.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 8
  },
  roadmapCard: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#323333',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  roadmapTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  roadmapSubtitle: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 12,
    lineHeight: 16,
  },
  roadmapRow: {
    gap: 10,
  },
  roadmapItem: {
    backgroundColor: '#FAFAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  roadmapItemBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.primary,
    backgroundColor: THEME.badgeBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  roadmapItemTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  roadmapItemDesc: {
    fontSize: 10.5,
    color: '#8E8E93',
    lineHeight: 15,
  },
  reviewBadge: {
    backgroundColor: '#FF6B8B15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reviewBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FF6B8B',
  },

  // Coordination Friends selection
  coordinationFriendBox: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16
  },
  coordinationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  coordinationTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.text,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  coordinationActionRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.avatarBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border
  },
  friendSearchInput: {
    height: 36,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    backgroundColor: THEME.background,
    color: THEME.text,
    paddingHorizontal: 12,
    fontSize: 12,
    marginBottom: 12
  },
  horizontalFriendsScroll: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4
  },
  friendSelectCard: {
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    width: 80,
    gap: 4
  },
  friendSelectCardActive: {
    borderColor: THEME.primary,
    backgroundColor: THEME.badgeBg
  },
  avatarBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.primary
  },
  friendSelectName: {
    color: THEME.text,
    fontSize: 11,
    fontWeight: 'bold'
  },
  friendRoleText: {
    color: THEME.textMuted,
    fontSize: 9
  },
  noFollowsText: {
    color: THEME.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 12
  },
  calSyncBadgeBtn: {
    backgroundColor: THEME.badgeBg,
    borderColor: THEME.primary,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  calSyncBadgeText: {
    color: THEME.primary,
    fontSize: 10,
    fontWeight: 'bold'
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: THEME.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border
  },
  durationSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.surface,
  },
  durationSelectBtnActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  durationSelectText: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.text,
  },
  durationSelectTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
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
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border
  },
  modalBtnCancelText: {
    color: THEME.textMuted,
    fontSize: 13,
    fontWeight: 'bold'
  },
  modalBtnSubmit: {
    backgroundColor: THEME.primary
  },
  modalBtnSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold'
  },
  coordinationMetaInfo: {
    backgroundColor: THEME.badgeBg,
    borderWidth: 1,
    borderColor: THEME.primary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14
  },
  dateSelectInput: {
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  dateSelectValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.primary
  },
  dateSelectBtn: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center'
  },
  dateSelectBtnActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary
  },
  dateSelectBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.text
  },
  dateSelectBtnTextActive: {
    color: 'white'
  },
  metaLabel: {
    color: THEME.textMuted,
    fontSize: 10,
    fontWeight: 'bold'
  },
  metaValue: {
    color: THEME.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2
  },
  metaSub: {
    color: THEME.textMuted,
    fontSize: 10,
    marginTop: 4
  },
  // 격자 전체를 감싸는 테두리 상자. 안에서 왼쪽 시간 축과 오른쪽 날짜 열이
  // 가로로 나란히 놓이고, **오른쪽만** 스크롤된다.
  timetableOuter: {
    flexDirection: 'row',
    marginVertical: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    backgroundColor: THEME.surface,
    overflow: 'hidden',
  },
  timetableFixedColumn: {
    flexDirection: 'column',
  },
  timetableHeaderRow: {
    flexDirection: 'row',
    height: TIMETABLE_HEADER_HEIGHT,
    alignItems: 'flex-end',
    borderBottomWidth: 2,
    borderBottomColor: THEME.border,
    paddingBottom: 6,
  },
  timeLabelHeaderCell: {
    width: TIMETABLE_TIME_COL_WIDTH,
  },
  dayHeaderCell: {
    width: TIMETABLE_CELL_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeaderDate: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.text,
  },
  dayHeaderDay: {
    fontSize: 10,
    color: THEME.textMuted,
    marginTop: 2,
  },
  timetableGrid: {
    flexDirection: 'column',
  },
  timetableRow: {
    flexDirection: 'row',
    height: TIMETABLE_ROW_HEIGHT,
    alignItems: 'center',
  },
  timeLabelCell: {
    width: TIMETABLE_TIME_COL_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: THEME.border,
    height: '100%',
  },
  timeLabelText: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: 'bold',
  },
  timetableCell: {
    width: TIMETABLE_CELL_WIDTH,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: THEME.border,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.background,
  },
  timetableCellSelected: {
    backgroundColor: THEME.primary,
  },
  timetableCellBusy: {
    backgroundColor: THEME.surfaceDarker,
    opacity: 0.4,
  },
  busyText: {
    fontSize: 9,
    color: THEME.textMuted,
    textDecorationLine: 'line-through',
  },
  heatmapCountText: {
    fontSize: 10,
    color: THEME.primary,
  },
  notesContainerCard: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginBottom: 16
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE7E8',
    paddingBottom: 8,
    marginBottom: 8
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#323333'
  },
  noteItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEE7E8',
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    shadowColor: '#323333',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  noteItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  avatarBubbleMini: {
    width: 24,
    height: 24,
    borderRadius: 12
  },
  noteAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#323333'
  },
  noteTime: {
    fontSize: 11,
    color: '#8E8C93'
  },
  visibilityLabel: {
    fontSize: 10,
    color: THEME.primary,
    backgroundColor: THEME.badgeBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontWeight: '600'
  },
  noteItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#323333',
    marginBottom: 2
  },
  noteItemContent: {
    fontSize: 14,
    color: '#323333',
    lineHeight: 18,
    marginTop: 4
  },
  noNotesText: {
    fontSize: 12,
    color: '#8E8C93',
    textAlign: 'center',
    paddingVertical: 16
  },
  addNoteBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    shadowColor: '#323333',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  addNoteBtnText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '700'
  },
  noteFormCard: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: 12
  },
  noteFormHeading: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 8
  },
  noteInput: {
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 6,
    color: THEME.text,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    marginBottom: 8
  },
  visibilitySelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6
  },
  visibilitySelectBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.background
  },
  visibilitySelectBtnActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary
  },
  visibilitySelectBtnText: {
    fontSize: 9,
    color: THEME.textMuted,
    fontWeight: '500'
  },
  visibilitySelectBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  noteFormBtn: {
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  calSyncToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  calSyncToggleTitle: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold'
  },
  calSyncToggleDesc: {
    color: THEME.textMuted,
    fontSize: 10,
    marginTop: 2
  },
  summaryCard: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  summaryDateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text
  },
  editTimeBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  editTimeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  busyChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  busyChip: {
    backgroundColor: THEME.surfaceDarker,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  busyChipText: {
    fontSize: 11,
    color: THEME.textMuted
  },
  noBusyText: {
    fontSize: 12,
    color: THEME.textMuted,
    fontStyle: 'italic'
  },
  midPointResultBox: {
    backgroundColor: 'rgba(124, 92, 255, 0.08)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.2)',
    alignItems: 'center',
    marginVertical: 4
  },
  midPointResultText: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: '#334155'
  },
  travelItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  hotplaceItemCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2
  },
  categoryBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  categoryBadgeText: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: 'bold'
  }
});
