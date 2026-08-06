import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

/**
 * 화면 전역에서 쓰는 로딩 플래그.
 *
 * savingNote / loadingRoomInfo 는 제거했습니다.
 * savingNote 는 ScheduleGrid 가 자기 안에서 들고 있는 폼 상태이고,
 * loadingRoomInfo 는 App.tsx 어디에도 대응하는 상태가 없었습니다.
 */
interface LoadingContextType {
  loading: boolean;
  isSearchingFriends: boolean;
  /** 당겨서 새로고침 중 여부 */
  refreshing: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSearchingFriends: React.Dispatch<React.SetStateAction<boolean>>;
  setRefreshing: React.Dispatch<React.SetStateAction<boolean>>;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const value = useMemo<LoadingContextType>(() => ({
    loading,
    isSearchingFriends,
    refreshing,
    setLoading,
    setIsSearchingFriends,
    setRefreshing,
  }), [loading, isSearchingFriends, refreshing]);

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};
