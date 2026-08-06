import type { Room, Participant, AIRecommendation, PlaceRecommendation } from './types';
import {
  ALLERGY_PRESETS,
  HEALTH_PRESETS,
  normalizeAllergies,
  normalizeHealthIssues,
} from './personalDataUtils';

// Gemini API Key - 환경 변수에서 읽음
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const KAKAO_REST_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY || '';

async function fetchNearbyKakaoPlaces(
  keyword: string,
  lat: number,
  lng: number
): Promise<PlaceRecommendation[]> {
  if (!KAKAO_REST_API_KEY) {
    return [];
  }

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}&x=${lng}&y=${lat}&radius=2000&sort=accuracy`,
      {
        headers: {
          Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
        },
      }
    );
    if (!response.ok) {
      // 키가 틀리거나 콘솔에서 카카오맵이 꺼져 있으면 401/403이 옵니다.
      // 예전에는 조용히 빈 배열로 떨어져서 목 데이터와 구분이 안 됐습니다.
      console.warn(
        `[Kakao] 장소 검색 실패 (HTTP ${response.status}). ` +
          `키 종류(REST API 키)와 콘솔의 카카오맵 활성화 여부를 확인하세요.`,
        await response.text()
      );
      return [];
    }
    const data = await response.json();
    if (data.documents && Array.isArray(data.documents)) {
      return data.documents.map((doc: any) => ({
        name: doc.place_name,
        type: keyword === '카페' ? '카페' : '술집',
        reason: doc.category_name ? doc.category_name.split(' > ').pop() || '추천 장소' : '추천 장소',
        // 카카오 로컬은 영업시간·메뉴·가격을 제공하지 않습니다.
        // '정보 없음' 같은 자리표시자도 넣지 않습니다 — 화면에 한 줄 더
        // 늘어날 뿐 알려주는 게 없습니다. 비워 두면 해당 항목이 아예 안 뜹니다.
        description: doc.road_address_name || doc.address_name || '상세 주소 정보가 없습니다.',
        // 카카오는 x=경도, y=위도를 문자열로 반환합니다.
        latitude: doc.y ? parseFloat(doc.y) : undefined,
        longitude: doc.x ? parseFloat(doc.x) : undefined
      }));
    }
  } catch (err) {
    console.warn('Error fetching places from Kakao API:', err);
  }
  return [];
}

async function fetchCoordsByKakaoSearch(keyword: string): Promise<{ latitude: number, longitude: number } | null> {
  if (!KAKAO_REST_API_KEY || !keyword) return null;
  try {
    const response = await fetch(
      // 카카오의 개수 파라미터는 limit 이 아니라 size 입니다.
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}&size=1`,
      {
        headers: {
          Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
        },
      }
    );
    if (!response.ok) {
      console.warn(
        `[Kakao] 좌표 조회 실패 (HTTP ${response.status}) keyword=${keyword}`,
        await response.text()
      );
      return null;
    }
    const data = await response.json();
    if (data.documents && data.documents.length > 0) {
      return {
        latitude: parseFloat(data.documents[0].y),
        longitude: parseFloat(data.documents[0].x)
      };
    }
  } catch (err) {
    console.warn('Error fetching coords from Kakao API:', err);
  }
  return null;
}

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00'
];

// Helper to format time in Korean
export function formatTimeKorean(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? '오후' : '오전';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${ampm} ${displayHours}시${minutes > 0 ? ` ${minutes}분` : ''}`;
}

// Helper to format date in Korean
export function formatDateKorean(dateStr: string): string {
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const dayName = days[d.getDay()];
  return `${month}월 ${date}일 ${dayName}`;
}

// Haversine distance helper
export function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Simulated weather forecast based on date & location
function getSimulatedWeather(dateStr: string, lat: number, lon: number) {
  // Deterministic seed based on date string and coords
  const seed = (dateStr.split('-').map(Number).reduce((a, b) => a + b, 0) + Math.floor(lat + lon)) % 100;

  if (seed < 15) {
    return { status: '비 ☔', pop: 80, rating: 30 };
  } else if (seed < 30) {
    return { status: '흐림 ☁️', pop: 30, rating: 80 };
  } else {
    return { status: '맑음 ☀️', pop: 10, rating: 100 };
  }
}

/**
 * 추천 기준이 될 좌표를 정합니다.
 * 1) 방에 확정된 좌표가 있으면 그것을 씁니다.
 * 2) 없으면 출발지를 등록한 참여자들의 평균(중심점)을 씁니다.
 * 3) 아무도 출발지가 없으면 서울시청으로 폴백합니다.
 */
export function resolveMeetingCenter(
  room: Room,
  participants: Participant[]
): { lat: number; lon: number } {
  if (typeof room.latitude === 'number' && typeof room.longitude === 'number') {
    return { lat: room.latitude, lon: room.longitude };
  }

  let totalLat = 0;
  let totalLon = 0;
  let count = 0;

  participants.forEach(p => {
    if (typeof p.start_latitude === 'number' && typeof p.start_longitude === 'number') {
      totalLat += p.start_latitude;
      totalLon += p.start_longitude;
      count++;
    }
  });

  if (count === 0) return { lat: 37.5665, lon: 126.9780 };

  return { lat: totalLat / count, lon: totalLon / count };
}

// Simulated travel time calculation
export function calculateAverageTravelTime(
  meetingLat: number,
  meetingLon: number,
  participants: Participant[]
): number {
  let totalTime = 0;
  let count = 0;

  participants.forEach(p => {
    // Check participant's departure location coords
    const lat = p.start_latitude;
    const lon = p.start_longitude;

    if (lat && lon) {
      const dist = getHaversineDistance(lat, lon, meetingLat, meetingLon);
      // Estimate travel time at 30km/h average public transit speed + 10 mins buffer
      const travelTimeMins = Math.round(dist * 2.0 + 10);
      totalTime += travelTimeMins;
      count++;
    }
  });

  if (count === 0) {
    // Default fallback if no coordinates are set: simulate realistic average (e.g. 25 mins)
    const seed = Math.floor(meetingLat + meetingLon) % 20;
    return 20 + seed;
  }

  return Math.round(totalTime / count);
}

export function extractJsonString(text: string): string | null {
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
}

interface GeminiAPIResult {
  aiReason: string;
  recommendedPlace?: PlaceRecommendation;
}

/**
 * 이전에 이 함수가 만들어낸 이름("○○ 근처 투썸플레이스")이 rooms.location_name에
 * 저장된 뒤 다시 입력으로 들어오면 "○○ 근처 투썸플레이스 근처 투썸플레이스"처럼
 * 무한히 길어집니다. 확정할 때마다 한 마디씩 늘어나던 원인이라 첫 '근처'에서 자릅니다.
 */
export function stripGeneratedSuffix(locationName: string): string {
  const idx = locationName.indexOf(' 근처 ');
  return idx > 0 ? locationName.slice(0, idx) : locationName;
}

function getFallbackPlaceRecommendation(
  locationName: string,
  type: '카페' | '술집',
  center?: { lat: number; lon: number }
): PlaceRecommendation {
  const normalized = stripGeneratedSuffix(locationName) || '강남역';
  // 목 데이터에는 실제 좌표가 없으므로, 추천 검색의 기준점(참여자 중심 또는 방 좌표)을
  // 대신 실어 보냅니다. 이게 없으면 약속 확정 시 rooms.latitude/longitude가 null로 남습니다.
  const coords = center ? { latitude: center.lat, longitude: center.lon } : {};

  // 영업시간은 두지 않습니다. 확인할 출처가 없어 지어낸 값이 되고,
  // 실존 상호에 붙으면 사용자가 그대로 믿습니다.
  const cafeList: Record<string, { name: string; reason: string }> = {
    '강남역': {
      name: '알베르 (Alver)',
      reason: '대화 나누기 좋은 넓은 야외 테라스 카페'
    },
    '홍대입구역': {
      name: '테라로사 홍대점',
      reason: '감각적인 벽돌 분위기의 스페셜티 커피 전문점'
    },
    '사당역': {
      name: '생각이나서 사당점',
      reason: '사당역 골목길의 대화하기 좋은 감성 카페'
    },
    '신촌역': {
      name: '독수리다방',
      reason: '신촌 전망이 좋은 유서 깊은 아늑한 북카페'
    },
    '서울역': {
      name: '아티제 서울스퀘어점',
      reason: '넓고 접근성이 훌륭한 비즈니스 모임 카페'
    }
  };

  const barList: Record<string, { name: string; reason: string }> = {
    '강남역': {
      name: '금별맥주 강남역점',
      reason: '가성비 안주와 살얼음 맥주가 있는 레트로 술집'
    },
    '홍대입구역': {
      name: '역전할머니맥주 홍대점',
      reason: '젊고 시원한 얼음잔 생맥주와 먹태/떡볶이 조합'
    },
    '사당역': {
      name: '바이젠하우스 사당점',
      reason: '수제 맥주와 피자를 쾌적하게 즐기는 펍'
    },
    '신촌역': {
      name: '금별맥주 신촌점',
      reason: '앤티크한 분위기와 퓨전 한식 안주가 맛있는 술집'
    },
    '서울역': {
      name: '서울역 그릴앤펍',
      reason: '바비큐 플래터와 생맥주가 맛있는 넓은 펍'
    }
  };

  const matchedKey = Object.keys(type === '카페' ? cafeList : barList).find(key => 
    normalized.includes(key)
  );

  if (matchedKey) {
    const item = type === '카페' ? cafeList[matchedKey] : barList[matchedKey];
    // 영업시간·메뉴·가격은 싣지 않습니다.
    // 이 목록의 상호는 실존 매장이라, 지어낸 영업시간을 붙이면 사용자가
    // 그대로 믿고 헛걸음합니다. 확인할 방법이 없으면 표시하지 않습니다.
    return {
      name: item.name,
      type,
      reason: item.reason,
      description: type === '카페'
        ? '약속 메이트들과 대화하며 편안히 쉬어가기 좋은 장소입니다.'
        : '시원한 생맥주와 맛있는 안주로 약속 자리를 빛내줄 인기 매장입니다.',
      ...coords
    };
  }

  if (type === '카페') {
    return {
      name: `${normalized} 근처 투썸플레이스`,
      type: '카페',
      reason: `${normalized} 근처 대화하기 좋은 인기 카페`,
      description: `선택하신 약속 장소인 ${normalized} 주변에 위치하여 접근성이 편리하고 쾌적한 프랜차이즈 매장입니다.`,
      ...coords
    };
  } else {
    return {
      name: `${normalized} 근처 금별맥주`,
      type: '술집',
      reason: `${normalized} 근처 안주가 맛있는 인기 술집`,
      description: `선택하신 약속 장소인 ${normalized} 인근의 인기 핫플레이스로, 시원한 살얼음 생맥주와 앤티크 분위기를 부담 없이 즐기기 좋은 장소입니다.`,
      ...coords
    };
  }
}

/** id → 이모지를 뗀 한글 라벨. 프롬프트에는 사람이 읽는 말로 넣습니다. */
const ALLERGY_LABEL = new Map(
  ALLERGY_PRESETS.map(p => [p.id, p.label.replace(/[^가-힣a-zA-Z]/g, '').trim()])
);
const HEALTH_LABEL = new Map(
  HEALTH_PRESETS.map(p => [p.id, p.label.replace(/[^가-힣a-zA-Z]/g, '').trim()])
);

/**
 * 참석자들의 알레르기·지병·기피 음식을 하나의 문장으로 모읍니다.
 *
 * 왜 필요한가
 *   프로필은 알레르기를 수집하고 프로필 화면에 표시까지 하는데,
 *   **AI 추천은 `alcoholLiquor` 하나만 읽고 있었습니다.** 즉 갑각류
 *   알레르기가 있는 사람이 있어도 추천 장소와 대표 메뉴에 전혀 반영되지
 *   않았습니다. 식사 약속 앱에서 이건 안전에 맞닿은 공백입니다.
 *
 *   합칠 때 이름을 두 벌 다 봅니다. 저장은 `allergyFoods`/`chronicDiseases`
 *   로 하는데, 화면 일부는 `allergies`/`health_issues` 로 읽는 이름 불일치가
 *   남아 있습니다(types.ts 참조). 둘 다 받아야 빠지지 않습니다.
 */
export function buildDietaryConstraintText(participants: Participant[]): string {
  const allergies = new Set<string>();
  const healths = new Set<string>();
  const dislikes = new Set<string>();

  participants.forEach(p => {
    const pd = p.personal_data;
    if (!pd) return;
    normalizeAllergies(pd.allergyFoods ?? pd.allergies)
      .forEach(id => allergies.add(ALLERGY_LABEL.get(id) ?? id));
    normalizeHealthIssues(pd.chronicDiseases ?? pd.health_issues)
      .forEach(id => healths.add(HEALTH_LABEL.get(id) ?? id));
    (pd.customDislikedFoods ?? pd.dislikes ?? []).forEach(v => {
      if (typeof v !== 'string') return;
      const t = v.trim();
      if (t) dislikes.add(t);
    });
  });

  const parts: string[] = [];
  if (allergies.size) parts.push(`알레르기 ${[...allergies].join('·')}`);
  if (healths.size) parts.push(`지병/식단 ${[...healths].join('·')}`);
  if (dislikes.size) parts.push(`기피 ${[...dislikes].join('·')}`);
  return parts.join(' / ');
}

// Call real Gemini API if API Key is configured
async function generateAIReasonWithGemini(
  apiKey: string,
  date: string,
  time: string,
  attendanceCount: number,
  totalParticipants: number,
  weatherStatus: string,
  precip: number,
  avgTravelTime: number,
  locationName: string,
  recommendType: '카페' | '술집',
  preferenceText: string,
  kakaoPlaces: PlaceRecommendation[],
  dietaryText: string
): Promise<GeminiAPIResult | null> {
  if (!apiKey) return null;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `너는 밀챗(MealChat) 앱의 AI 일정 추천 어시스턴트이자 핫플레이스 추천 전문가야. 아래 데이터를 바탕으로 추천 일시의 장점을 표현한 아주 짧은 한 줄 요약(ai_reason)과, 모임 참석자의 주종/음료 선호 성향을 고려한 인근 추천 장소 정보(recommended_place)를 반드시 아래와 같은 속성을 가진 JSON 객체 형식으로 생성해 줘. 마크다운 기호 없이 오직 순수한 JSON 문자열로만 응답해야 해:

[데이터]
- 추천 일시: ${formatDateKorean(date)} ${formatTimeKorean(time)}
- 참석자 상황: 전체 ${totalParticipants}명 중 ${attendanceCount}명 참석 가능
- 날씨 상황: ${weatherStatus} (강수확률 ${precip}%)
- 이동 편의성: 평균 약 ${avgTravelTime}분 소요
- 약속 장소: ${locationName}
- 참석자 선호 성향: ${preferenceText}
- 참석자 식이 제약: ${dietaryText || '없음'}
- 주변 실제 장소 후보 (카카오 API 결과): ${kakaoPlaces.length > 0 ? JSON.stringify(kakaoPlaces.slice(0, 5).map(kp => ({ name: kp.name, category: kp.reason, address: kp.description }))) : '정보 없음'}

[반드시 지킬 제약]
${dietaryText
  ? `- 참석자 중 "${dietaryText}" 에 해당하는 사람이 있어. 추천 매장과 "menu" 에 이 재료가 주재료인 메뉴를 넣지 마.
- 피할 수 없으면 그 매장을 고르지 말고 다른 후보를 골라.
- 단, 알레르기 정보를 "reason" 이나 "description" 에 그대로 적지는 마. 개인 정보야.`
  : '- 특별한 식이 제약은 없어.'}

[출력 JSON 필드]
1. "ai_reason": 이 추천 일시의 장점을 요약한 아주 짧고 명확한 한 줄 슬로건 (15자 내외, 최대 20자, 마침표 및 수식어는 다 빼고 직설적으로 작성. 예: '모두 모이기 편리한 화창한 오후').
2. "recommended_place": 제공된 "주변 실제 장소 후보" 리스트 중에서 가장 적합한 1곳을 골라 아래 상세 속성을 작성해줘 (제공된 리스트가 "정보 없음"이 아니라면 반드시 리스트에 있는 실제 매장명(name)을 사용하고, "정보 없음"인 경우에만 네 지식을 기반으로 주변의 실제 있는 대표 카페/술집 1곳을 골라 작성해줘. 해당 매장의 분위기만 작성해줘):
   - "name": 선택한 매장 이름
   - "type": "카페" 또는 "술집"
   - "reason": 이 장소를 추천하는 이유 (존댓말이나 마침표 없이 15자 내외의 아주 짧고 직관적인 슬로건으로 작성. 예: '대화 나누기 좋은 넓은 카페', '시원한 살얼음 생맥주 맛집')
   - "business_hours": 해당 매장의 실제 혹은 현실적인 영업시간 정보 (브레이크타임/정기휴무일을 포함하여 15자 내외로 매우 짧게 요약. 예: '10:00 ~ 22:00 (Break 15~17시)', '17:00 ~ 03:00')
   - "menu": 매장 대표 메뉴 2~3개 (예: '아인슈페너, 딸기타르트')
   - "price": 해당 매장의 대표 메뉴 혹은 평균 가격대 (예: '아메리카노 4,500원')
   - "description": 이 장소의 분위기나 매칭 장점을 설명하는 짧은 한 줄 AI 요약문 (25자 내외, 예: '모임에 적합한 넓은 테이블과 대화하기 좋은 편안한 분위기의 스페이스')`
            }]
          }]
        })
      }
    );
    // 403(API 미활성화)이나 429를 그냥 넘기면 candidates 가 없어 null 로 떨어지고,
    // 호출부는 이것을 "Gemini 가 마땅한 답을 못 냈다"와 구분하지 못합니다.
    // 키 문제 때문에 상세 정보가 통째로 목 데이터인 상황이 화면상 안 보이던 원인입니다.
    if (!response.ok) {
      console.warn(
        `[Gemini] 호출 실패 (HTTP ${response.status}). ` +
          `Cloud Console 에서 generativelanguage.googleapis.com 사용 설정 여부를 확인하세요.`,
        await response.text()
      );
      return null;
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) return null;

    let cleanJson = generatedText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const extracted = extractJsonString(cleanJson);
    const parsed = extracted ? JSON.parse(extracted) : null;
    if (!parsed) return null;

    return {
      aiReason: parsed.ai_reason || '',
      recommendedPlace: parsed.recommended_place ? {
        name: parsed.recommended_place.name,
        type: parsed.recommended_place.type === '술집' ? '술집' : '카페',
        reason: parsed.recommended_place.reason,
        business_hours: parsed.recommended_place.business_hours,
        menu: parsed.recommended_place.menu || '',
        price: parsed.recommended_place.price || '',
        description: parsed.recommended_place.description || ''
      } : undefined
    };
  } catch (err) {
    console.error('Error calling or parsing Gemini API:', err);
    return null;
  }
}

export async function calculateAIRecommendations(
  room: Room,
  participants: Participant[]
): Promise<AIRecommendation[]> {
  if (!room.meeting_date) return [];

  // Determine candidate dates
  const candidateDates: string[] = [];
  const start = new Date(room.meeting_date);

  // If it's a 1-day room, only evaluate meeting_date
  let durationDays = 1;
  if (room.expires_at) {
    const expires = new Date(room.expires_at);
    const diffDays = Math.round((expires.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    // If it's a travel room of 2+ days, durationDays is diffDays - 2
    durationDays = Math.max(1, diffDays - 2);
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

  for (let i = 0; i < durationDays; i++) {
    const cur = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const yyyy = cur.getFullYear();
    const mm = (cur.getMonth() + 1).toString().padStart(2, '0');
    const dd = cur.getDate().toString().padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    if (dateStr < todayStr) continue; // Exclude past dates
    candidateDates.push(dateStr);
  }

  // 방에 확정 좌표가 없으면 참여자 출발지의 중심점을 씁니다.
  // 예전에는 서울시청으로 고정 폴백해서, 부산 모임인데 서울 장소를 추천했습니다.
  const { lat: roomLat, lon: roomLon } = resolveMeetingCenter(room, participants);

  // Calculate average travel time
  const avgTravelTime = calculateAverageTravelTime(roomLat, roomLon, participants);
  // Travel mobility rating (0 to 100)
  const mobilityRating = Math.max(10, 100 - (Math.min(Math.max(avgTravelTime - 15, 0), 75) / 75) * 90);

  const candidates: {
    date: string;
    time: string;
    score: number;
    attendanceCount: number;
    weatherStatus: string;
    precip: number;
  }[] = [];

  // Evaluate each date/time slot combination
  candidateDates.forEach(date => {
    const weather = getSimulatedWeather(date, roomLat, roomLon);
    const d = new Date(date);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

    TIME_SLOTS.forEach(time => {
      // 1. Attendance Rate Score (Max 50 points)
      let availableCount = 0;
      participants.forEach(p => {
        const schedule = p.schedule || {};
        if (schedule[date]?.includes(time)) {
          availableCount++;
        }
      });

      const totalParticipants = participants.length || 1;
      const attendanceRate = availableCount / totalParticipants;
      const attendanceScore = attendanceRate * 50;

      // 2. Weather Score (Max 20 points)
      const weatherScore = weather.rating * 0.20;

      // 3. Mobility Score (Max 20 points)
      const mobilityScore = mobilityRating * 0.20;

      // 4. Preferred Time Slot / Weekend Alignment (Max 10 points)
      const [hours] = time.split(':').map(Number);
      let preferredScore = 3; // base score

      const isLunchTime = hours >= 12 && hours < 14;
      const isDinnerTime = hours >= 18 && hours < 21;

      if (isWeekend) {
        if (isLunchTime || isDinnerTime) {
          preferredScore = 10;
        } else {
          preferredScore = 7;
        }
      } else {
        if (isDinnerTime) {
          preferredScore = 10;
        } else if (isLunchTime) {
          preferredScore = 6;
        }
      }

      const finalScore = Math.round(attendanceScore + weatherScore + mobilityScore + preferredScore);

      candidates.push({
        date,
        time,
        score: finalScore,
        attendanceCount: availableCount,
        weatherStatus: weather.status,
        precip: weather.pop
      });
    });
  });

  // Sort candidates by score descending, then by attendance count descending
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.attendanceCount - a.attendanceCount;
  });

  // Determine preference: Cafe vs Bar based on participants' alcohol preference
  let drinkPreferenceCount = 0;
  let noDrinkCount = 0;
  participants.forEach(p => {
    const liquors = p.personal_data?.alcoholLiquor || [];
    if (liquors.length > 0) {
      drinkPreferenceCount++;
    } else {
      noDrinkCount++;
    }
  });
  const recommendType: '카페' | '술집' = drinkPreferenceCount > noDrinkCount ? '술집' : '카페';
  // 알레르기·지병·기피는 참여자 전원 것을 합칩니다. 한 명이라도 못 먹으면
  // 그 자리는 실패이므로, 다수결이 아니라 합집합이 맞습니다.
  const dietaryText = buildDietaryConstraintText(participants);

  const preferenceText = recommendType === '술집'
    ? '술을 선호하는 참여자가 많아 술집/이자카야/펍 선호'
    : '술을 선호하지 않거나 카페 선호';

  // 방 이름이 없을 때 '강남역'으로 가정하지 않습니다.
  // 부산 모임에서도 서울 장소가 추천되던 원인이었습니다.
  const locationName = room.location_name || '';
  let lat = room.latitude;
  let lng = room.longitude;

  if (!lat || !lng) {
    // 1. Try Kakao API search to resolve coordinates of locationName
    const resolvedCoords = locationName ? await fetchCoordsByKakaoSearch(locationName) : null;
    if (resolvedCoords) {
      lat = resolvedCoords.latitude;
      lng = resolvedCoords.longitude;
    } else {
      // 2. Try default hubs match
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
      const matchedHub = locationName ? hubs.find(h => locationName.includes(h.name)) : undefined;
      if (matchedHub) {
        lat = matchedHub.latitude;
        lng = matchedHub.longitude;
      } else {
        // 3. 참여자 출발지 중심점 (모두 미설정이면 서울시청)
        const center = resolveMeetingCenter(room, participants);
        lat = center.lat;
        lng = center.lon;
      }
    }
  }

  const searchKeyword = recommendType === '술집' ? '술집' : '카페';
  const kakaoPlaces = await fetchNearbyKakaoPlaces(searchKeyword, lat, lng);

  // Return Top 3 recommendations
  const top3 = await Promise.all(
    candidates.slice(0, 3).map(async (cand, index) => {
      const totalParts = participants.length;

      let aiReason = '';
      let recommendedPlace: PlaceRecommendation | undefined = undefined;

      if (GEMINI_API_KEY) {
        const geminiResult = await generateAIReasonWithGemini(
          GEMINI_API_KEY,
          cand.date,
          cand.time,
          cand.attendanceCount,
          totalParts,
          cand.weatherStatus,
          cand.precip,
          avgTravelTime,
          locationName,
          recommendType,
          preferenceText,
          kakaoPlaces,
          dietaryText
        );
        if (geminiResult) {
          aiReason = geminiResult.aiReason;
          recommendedPlace = geminiResult.recommendedPlace;
        }
      }

      // Fallback to rule-based explanation if key is missing or call failed
      if (!aiReason) {
        const isRainy = cand.precip > 50;
        const isFastTravel = avgTravelTime < 35;
        const allAttend = cand.attendanceCount === totalParts;
        const [hours] = cand.time.split(':').map(Number);
        const timePeriod = hours >= 17 ? '저녁' : hours >= 11 && hours < 15 ? '점심' : '시간대';

        if (isRainy) {
          aiReason = allAttend ? `비 오는 날 다 함께 모이는 ${timePeriod}` : `운치 있는 날 실내 ${timePeriod}`;
        } else if (allAttend && isFastTravel) {
          aiReason = `모두 모이기 편리한 황금 ${timePeriod}`;
        } else if (allAttend) {
          aiReason = `전원 참석이 가능한 ${timePeriod}`;
        } else if (isFastTravel) {
          aiReason = `이동이 용이하고 쾌적한 ${timePeriod}`;
        } else {
          aiReason = `모임 조율에 추천하는 ${timePeriod}`;
        }
      }

      if (!recommendedPlace) {
        if (kakaoPlaces && kakaoPlaces.length > index) {
          const kp = kakaoPlaces[index];
          // Gemini 가 없을 때의 경로. 카카오가 주는 것(이름·분류·주소·좌표)만
          // 싣고, 영업시간·메뉴·가격은 **비워 둡니다.**
          //
          // 예전에는 여기서 '09:00 ~ 22:00', '아메리카노 4,500원' 같은 값을
          // 지어내 넣었습니다. 이름과 주소는 카카오에서 온 진짜 값이라
          // 사용자는 영업시간·가격도 진짜라고 믿게 됩니다. 없는 정보를
          // 사실처럼 보여주느니 안 보여주는 편이 낫습니다.
          recommendedPlace = {
            name: kp.name,
            type: kp.type,
            reason: kp.reason,
            description: kp.description,
            latitude: kp.latitude,
            longitude: kp.longitude
          };
        } else {
          recommendedPlace = getFallbackPlaceRecommendation(locationName, recommendType, {
            lat,
            lon: lng
          });
        }
      }

      // Gemini는 좌표를 돌려주지 않으므로, 이름으로 카카오 결과와 다시 맞춰
      // 위경도를 채워 넣습니다. 이름이 안 맞으면 같은 순위의 카카오 장소를 씁니다.
      // (이 값이 비면 약속 확정 시 rooms.latitude/longitude가 null로 남습니다.)
      if (recommendedPlace.latitude == null || recommendedPlace.longitude == null) {
        const source =
          kakaoPlaces?.find(
            kp =>
              kp.latitude != null &&
              kp.longitude != null &&
              (recommendedPlace!.name.includes(kp.name) || kp.name.includes(recommendedPlace!.name))
          ) ?? kakaoPlaces?.[index];

        if (source?.latitude != null && source?.longitude != null) {
          recommendedPlace = {
            ...recommendedPlace,
            latitude: source.latitude,
            longitude: source.longitude
          };
        }
      }

      return {
        rank: index + 1,
        score: cand.score,
        date: cand.date,
        time: cand.time,
        attendance_count: cand.attendanceCount,
        total_participants: totalParts,
        weather_status: cand.weatherStatus,
        precipitation_probability: cand.precip,
        average_travel_time: avgTravelTime,
        ai_reason: aiReason,
        recommended_place: recommendedPlace
      };
    })
  );

  return top3;
}
