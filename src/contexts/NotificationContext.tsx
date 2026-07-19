import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { AppNotification } from '../lib/types';

interface NotificationContextType {
  appNotifications: AppNotification[];
  unpaidBillNotifications: AppNotification[];
  messageNotifications: AppNotification[];
  setAppNotifications: (notifs: AppNotification[]) => void;
  setUnpaidBillNotifications: (notifs: AppNotification[]) => void;
  setMessageNotifications: (notifs: AppNotification[]) => void;
  addNotification: (notif: AppNotification) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [unpaidBillNotifications, setUnpaidBillNotifications] = useState<AppNotification[]>([]);
  const [messageNotifications, setMessageNotifications] = useState<AppNotification[]>([]);

  const addNotification = (notif: AppNotification) => {
    setAppNotifications(prev => [...prev, notif]);
  };

  const removeNotification = (id: string) => {
    setAppNotifications(prev => prev.filter(n => n.id !== id));
  };

  const value = useMemo<NotificationContextType>(() => ({
    appNotifications,
    unpaidBillNotifications,
    messageNotifications,
    setAppNotifications,
    setUnpaidBillNotifications,
    setMessageNotifications,
    addNotification,
    removeNotification,
  }), [appNotifications, unpaidBillNotifications, messageNotifications]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
