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
}

export interface PrivacySettings {
  birthdate: 'public' | 'best' | 'private';
  gender: 'public' | 'best' | 'private';
  bank_account: 'public' | 'best' | 'private';
}

export interface ScheduleAvailability {
  // Key is date string (YYYY-MM-DD), value is array of time slot strings
  [date: string]: string[];
}

export interface PlaceRecommendation {
  name: string;
  type: '카페' | '술집';
  reason: string;
  business_hours: string;
  menu?: string;
  price?: string;
  description?: string;
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
  push_token?: string;
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
