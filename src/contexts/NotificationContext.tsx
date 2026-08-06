import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { AppNotification } from '../lib/types';

/**
 * 앱 내 알림 목록과 배지 상태.
 *
 * unpaidBillNotifications / messageNotifications 는 제거했습니다.
 * App.tsx 는 알림을 종류별로 나눠 담지 않고 appNotifications 하나로 관리하며,
 * 미납·메시지 구분은 조회 시점에 필터로 처리합니다.
 */
interface NotificationContextType {
  appNotifications: AppNotification[];
  /** 알림 아이콘에 붙는 안 읽음 표시 */
  showNotificationsRedDot: boolean;
  setAppNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  setShowNotificationsRedDot: React.Dispatch<React.SetStateAction<boolean>>;
  addNotification: (notif: AppNotification) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [showNotificationsRedDot, setShowNotificationsRedDot] = useState(false);

  const addNotification = (notif: AppNotification) => {
    setAppNotifications(prev => [...prev, notif]);
  };

  const removeNotification = (id: string) => {
    setAppNotifications(prev => prev.filter(n => n.id !== id));
  };

  const value = useMemo<NotificationContextType>(() => ({
    appNotifications,
    showNotificationsRedDot,
    setAppNotifications,
    setShowNotificationsRedDot,
    addNotification,
    removeNotification,
  }), [appNotifications, showNotificationsRedDot]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
