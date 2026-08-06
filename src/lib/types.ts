export interface PersonalData {
  // Sketch inputs
  birthdate?: string;
  gender?: string;
  bank_account?: string; // Required in sketch
  bio?: string;

  // New fields from feat/chat-n-vote
  hasCompletedProfilePhotoTutorial?: boolean;
  hasCompletedLocationTutorial?: boolean;
  hasCompletedFoodTasteTutorial?: boolean;
  foodTasteScores?: {
    meatScore: number;
    seafoodScore: number;
    spicyScore: number;
    greasyScore: number;
    cleanScore: number;
  };
  preferredFoods?: string[];
  preferred_location?: string;

  // Customizer fields
  profileEmoji?: string;
  profileBgColor?: string;
  travelTime?: number;

  // ── 취향 게임(ProfileSetup)이 수집하고 저장하는 필드 ──
  // 예전에는 onSave() payload 에서 빠져 저장되지 않았고, 그 탓에 AI 장소
  // 추천이 늘 '카페'로 고정되어 있었습니다. 지금은 게임 저장·프로필 저장
  // 양쪽 payload 에 모두 들어갑니다. 상세는 docs/UI/10-취향-매칭-게임.md 참조.
  alcoholLiquor?: string[];        // 선호 주종 (AI 술집/카페 판정에 사용)
  allergyFoods?: string[];         // 식품 알레르기 (AI 추천 식이 제약에 사용)
  chronicDiseases?: string[];      // 건강상 지병 (AI 추천 식이 제약에 사용)
  customDislikedFoods?: string[];  // 못 먹는 음식 기피

  // ── 위 4개와 같은 개념을 다른 이름으로 읽는 소비처들 ──
  // ⚠️ writer 가 없어 항상 undefined 입니다. 이름 통일이 아직 안 됐습니다
  //    (docs/UI/README.md 이슈 #3). 그래서 읽는 쪽은 두 이름을 모두 봐야
  //    합니다 — aiRecommender 의 buildDietaryConstraintText 가 그 예입니다.
  allergies?: string[];            // ↔ allergyFoods
  health_issues?: string[];        // ↔ chronicDiseases
  likes?: string[];                // ↔ preferredFoods
  dislikes?: string[];             // ↔ customDislikedFoods
}

export type PrivacyLevel = 'public' | 'best' | 'private';

export interface PrivacySettings {
  birthdate: PrivacyLevel;
  gender: PrivacyLevel;
  bank_account: PrivacyLevel;

  // 아래 4개는 프로필 열람 화면(App.tsx:4151~4172)이 isFieldVisible()로 조회하지만,
  // 설정의 '정보 공개 범위' 섹션(ProfileSetup.tsx:2074~)에는 토글 UI가 없습니다.
  // 값이 없으면 isFieldVisible()이 공개로 간주합니다(App.tsx:2231).
  allergies?: PrivacyLevel;
  likes?: PrivacyLevel;
  dislikes?: PrivacyLevel;
  health_issues?: PrivacyLevel;
}

export interface ScheduleAvailability {
  // Key is date string (YYYY-MM-DD), value is array of time slot strings
  [date: string]: string[];
}

export interface PlaceRecommendation {
  name: string;
  type: '카페' | '술집';
  reason: string;
  // 아래 셋은 **출처가 있을 때만** 채웁니다.
  // 카카오 로컬은 영업시간·메뉴·가격을 주지 않습니다. Gemini 가 없으면
  // 알 방법이 없으므로 비워 두고, 화면에서도 표시하지 않습니다.
  // 예전에는 여기에 지어낸 값을 넣어서, 카카오에서 온 실제 상호명 옆에
  // 없는 영업시간과 가격이 사실처럼 표시됐습니다.
  business_hours?: string;
  menu?: string;
  price?: string;
  description?: string;
  // 카카오 로컬 API 응답의 x(경도) / y(위도).
  // 이 필드가 없어서 AI 추천 장소로 확정할 때 Room.latitude/longitude가
  // 채워지지 않았고, 방 상세에 '(위도: undefined, 경도: undefined)'가 노출됐습니다.
  latitude?: number;
  longitude?: number;
}

export interface AIRecommendation {
  rank: number;
  score: number;
  date: string;
  time: string;
  attendance_count: number;
  total_participants: number;
  weather_status: string;
  precipitation_probability: number;
  average_travel_time: number;
  ai_reason: string;
  recommended_place?: PlaceRecommendation;
}

export interface Room {
  id: string;
  code: string;
  title: string;
  meeting_date: string;
  expires_at: string;
  owner_id: string; // 방장 ID
  voting_items?: any[];
  is_confirmed?: boolean;
  confirmed_slot?: string;
  created_at: string;
  color?: string;
  memo?: string;
  // 확정 약속 메모의 공개 범위와 작성자 (ScheduleGrid.tsx:1721, 3135~3197)
  memo_visibility?: 'public' | 'best' | 'private';
  memo_author_id?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  ai_recommendations?: AIRecommendation[];
}

export interface Participant {
  id: string;
  room_id: string;
  profile_id?: string;
  name: string;
  avatar_color: string;
  personal_data: PersonalData;
  schedule: ScheduleAvailability;
  voted_items?: string[];
  avatar_url?: string;
  created_at: string;
  start_location_name?: string;
  start_latitude?: number;
  start_longitude?: number;
}

export interface DutchPayBill {
  id: string;
  room_id?: string;
  creator_id?: string;
  title: string;
  total_amount: number;
  split_count: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  created_at: string;
  dutch_pay_members?: DutchPayMember[];
}

export interface DutchPayMember {
  id: string;
  bill_id: string;
  profile_id: string;
  name: string;
  is_completed: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  name: string;
  tag: string;
  avatar_color: string;
  personal_data: PersonalData;
  schedule: ScheduleAvailability;
  avatar_url?: string;
  privacy_settings?: PrivacySettings;
  // push_token 은 여기 없습니다. profiles 는 모든 로그인 사용자에게 전체가
  // 보이는 테이블이라(profiles_select using true), 토큰만 있으면 임의 알림을
  // 보낼 수 있는 Expo 푸시 토큰을 두면 안 됩니다.
  // 본인만 읽을 수 있는 push_tokens 테이블로 분리했습니다.
  created_at: string;
  start_location_name?: string;
  start_latitude?: number;
  start_longitude?: number;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  role: 'leader' | 'mate';
  created_at: string;
  profiles?: Profile;
}

export interface AppNotification {
  id: string;
  room_id: string;
  title: string;
  message: string;
  bank_name: string;
  account_number: string;
  amount: number;
  created_at: string;
  /** null 이면 방 전원 대상(기존 동작). 값이 있으면 그 프로필들만 대상(독촉 알림 등) */
  target_profile_ids?: string[] | null;
}export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  sender_color: string;
  message: string;
  created_at: string;
}

export interface RoomNote {
  id: string;
  room_id: string;
  profile_id: string;
  content: string;
  visibility: 'private' | 'public' | 'best';
  created_at: string;
  profile_name?: string;
  profile_avatar_url?: string;
  profile_avatar_color?: string;
}
