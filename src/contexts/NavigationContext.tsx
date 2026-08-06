import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

interface NavigationContextType {
  activeTab: 'schedule' | 'addons';
  showCreateModal: boolean;
  showNotifications: boolean;
  showRoomInfoModal: boolean;
  showSettingsModal: boolean;
  isSettingsGameActive: boolean;
  isSwipeBackBlocked: boolean;
  /** 방 밖에서 여는 전체 N빵 정산 대장 */
  showGlobalDutchPay: boolean;
  setActiveTab: (tab: 'schedule' | 'addons') => void;
  setShowCreateModal: (show: boolean) => void;
  setShowNotifications: (show: boolean) => void;
  setShowRoomInfoModal: (show: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
  setIsSettingsGameActive: (active: boolean) => void;
  setIsSwipeBackBlocked: (blocked: boolean) => void;
  setShowGlobalDutchPay: React.Dispatch<React.SetStateAction<boolean>>;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'addons'>('schedule');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoomInfoModal, setShowRoomInfoModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSettingsGameActive, setIsSettingsGameActive] = useState(false);
  const [isSwipeBackBlocked, setIsSwipeBackBlocked] = useState(false);
  const [showGlobalDutchPay, setShowGlobalDutchPay] = useState(false);

  const value = useMemo<NavigationContextType>(() => ({
    activeTab,
    showCreateModal,
    showNotifications,
    showRoomInfoModal,
    showSettingsModal,
    isSettingsGameActive,
    isSwipeBackBlocked,
    showGlobalDutchPay,
    setActiveTab,
    setShowCreateModal,
    setShowNotifications,
    setShowRoomInfoModal,
    setShowSettingsModal,
    setIsSettingsGameActive,
    setIsSwipeBackBlocked,
    setShowGlobalDutchPay,
  }), [activeTab, showCreateModal, showNotifications, showRoomInfoModal, showSettingsModal, isSettingsGameActive, isSwipeBackBlocked, showGlobalDutchPay]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};
