import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { Profile } from '../lib/types';

/**
 * 내 메이트(팔로우) 검색과 프로필 상세 모달의 상태.
 */
interface ProfileContextType {
  selectedProfileId: string | null;
  selectedProfile: Profile | null;
  showProfileModal: boolean;
  searchFriendQuery: string;
  searchFriendResults: Profile[];
  recommendedFriends: Profile[];
  lastMessageSender: string | null;
  setSelectedProfileId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  setShowProfileModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSearchFriendQuery: React.Dispatch<React.SetStateAction<string>>;
  setSearchFriendResults: React.Dispatch<React.SetStateAction<Profile[]>>;
  setRecommendedFriends: React.Dispatch<React.SetStateAction<Profile[]>>;
  setLastMessageSender: React.Dispatch<React.SetStateAction<string | null>>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchFriendQuery, setSearchFriendQuery] = useState('');
  const [searchFriendResults, setSearchFriendResults] = useState<Profile[]>([]);
  const [recommendedFriends, setRecommendedFriends] = useState<Profile[]>([]);
  const [lastMessageSender, setLastMessageSender] = useState<string | null>(null);

  const value = useMemo<ProfileContextType>(() => ({
    selectedProfileId,
    selectedProfile,
    showProfileModal,
    searchFriendQuery,
    searchFriendResults,
    recommendedFriends,
    lastMessageSender,
    setSelectedProfileId,
    setSelectedProfile,
    setShowProfileModal,
    setSearchFriendQuery,
    setSearchFriendResults,
    setRecommendedFriends,
    setLastMessageSender,
  }), [selectedProfileId, selectedProfile, showProfileModal, searchFriendQuery, searchFriendResults, recommendedFriends, lastMessageSender]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return context;
};
