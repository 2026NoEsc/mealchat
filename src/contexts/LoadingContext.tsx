import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

interface LoadingContextType {
  loading: boolean;
  savingNote: boolean;
  loadingRoomInfo: boolean;
  isSearchingFriends: boolean;
  setLoading: (loading: boolean) => void;
  setSavingNote: (saving: boolean) => void;
  setLoadingRoomInfo: (loading: boolean) => void;
  setIsSearchingFriends: (searching: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [loadingRoomInfo, setLoadingRoomInfo] = useState(false);
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);

  const value = useMemo<LoadingContextType>(() => ({
    loading,
    savingNote,
    loadingRoomInfo,
    isSearchingFriends,
    setLoading,
    setSavingNote,
    setLoadingRoomInfo,
    setIsSearchingFriends,
  }), [loading, savingNote, loadingRoomInfo, isSearchingFriends]);

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};
