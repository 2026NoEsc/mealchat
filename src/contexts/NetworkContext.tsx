import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

interface NetworkContextType {
  isOnline: boolean;
  networkError: string | null;
  setIsOnline: (online: boolean) => void;
  setNetworkError: (error: string | null) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const value = useMemo<NetworkContextType>(() => ({
    isOnline,
    networkError,
    setIsOnline,
    setNetworkError,
  }), [isOnline, networkError]);

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
};
