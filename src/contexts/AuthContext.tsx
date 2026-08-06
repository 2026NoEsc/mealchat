import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { Profile, Follow } from '../lib/types';

/**
 * 로그인 사용자와 프로필.
 *
 * ⚠️ 예전에는 여기에 loadProfile() / logout() 구현이 들어 있었는데,
 *    App.tsx 의 실제 구현과 내용이 달랐습니다. Context 쪽 버전에는
 *    PGRST116(행 없음) 처리도, authLoading 관리도 없어서 그대로 갈아끼우면
 *    조용히 동작이 바뀝니다. 소비자가 없어 한 번도 실행된 적 없는 코드였습니다.
 *    잘못된 구현을 남겨두면 다음 사람이 그걸 쓰게 되므로 제거했습니다.
 *    프로필 로딩은 App.tsx 의 loadProfileForUser 가 담당하며, 이전할 때
 *    그 구현을 그대로 옮겨 옵니다.
 */
interface AuthContextType {
  user: any | null;
  globalProfile: Profile | null;
  myFollows: Follow[];
  authLoading: boolean;
  setUser: React.Dispatch<React.SetStateAction<any | null>>;
  setGlobalProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  setMyFollows: React.Dispatch<React.SetStateAction<Follow[]>>;
  setAuthLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [globalProfile, setGlobalProfile] = useState<Profile | null>(null);
  const [myFollows, setMyFollows] = useState<Follow[]>([]);
  const [authLoading, setAuthLoading] = useState(true);

  const value = useMemo<AuthContextType>(() => ({
    user,
    globalProfile,
    myFollows,
    authLoading,
    setUser,
    setGlobalProfile,
    setMyFollows,
    setAuthLoading,
  }), [user, globalProfile, myFollows, authLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
