import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../lib/types';

interface AuthContextType {
  user: any | null;
  globalProfile: Profile | null;
  myFollows: any[];
  authLoading: boolean;
  setUser: (user: any) => void;
  setGlobalProfile: (profile: Profile | null) => void;
  setMyFollows: (follows: any[]) => void;
  setAuthLoading: (loading: boolean) => void;
  loadProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [globalProfile, setGlobalProfile] = useState<Profile | null>(null);
  const [myFollows, setMyFollows] = useState<any[]>([]);
  const [authLoading, setAuthLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setGlobalProfile(profileData);
      }

      const { data: followsData } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id);

      setMyFollows(followsData || []);
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  }, [user?.id]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setGlobalProfile(null);
      setMyFollows([]);
    } catch (err) {
      console.error('Error logging out:', err);
    }
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    globalProfile,
    myFollows,
    authLoading,
    setUser,
    setGlobalProfile,
    setMyFollows,
    setAuthLoading,
    loadProfile,
    logout,
  }), [user, globalProfile, myFollows, authLoading, loadProfile, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
