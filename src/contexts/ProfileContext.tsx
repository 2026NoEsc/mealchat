import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { Profile } from '../lib/types';

interface ProfileContextType {
  selectedProfileId: string | null;
  selectedProfile: Profile | null;
  showProfileModal: boolean;
  searchFriendQuery: string;
  searchFriendResults: Profile[];
  recommendedFriends: Profile[];
  lastMessageSender: string | null;
  setSelectedProfileId: (id: string | null) => void;
  setSelectedProfile: (profile: Profile | null) => void;
  setShowProfileModal: (show: boolean) => void;
  setSearchFriendQuery: (query: string) => void;
  setSearchFriendResults: (results: Profile[]) => void;
  setRecommendedFriends: (friends: Profile[]) => void;
  setLastMessageSender: (sender: string | null) => void;
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
