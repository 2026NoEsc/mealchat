import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

/**
 * 방 만료까지 남은 시간 표시 문자열. **1초마다 바뀝니다.**
 *
 * RoomContext 에 두지 않고 따로 뺀 이유:
 * Context 는 value 객체가 새로 만들어질 때마다 그 Context 를 구독하는 컴포넌트를
 * 전부 리렌더합니다. timeLeft 를 RoomContext 에 두면 매초 value 가 새로 만들어져
 * useRoom() 을 쓰는 모든 컴포넌트가 — 카운트다운을 화면에 그리지 않는 것까지 —
 * 초당 한 번씩 리렌더됩니다. AppContent 하나만 구독할 때는 차이가 없지만,
 * 컴포넌트를 쪼갠 뒤에는 그대로 비용이 됩니다.
 *
 * 값을 갱신하는 setInterval 은 AppContent 에 남겨 두었습니다.
 * 만료 시 handleExitRoom() / fetchRooms() 를 함께 호출해야 해서
 * 순수한 표시용 훅으로 떼어낼 수 없습니다.
 */
interface RoomTimerContextType {
  timeLeft: string;
  setTimeLeft: React.Dispatch<React.SetStateAction<string>>;
}

const RoomTimerContext = createContext<RoomTimerContextType | undefined>(undefined);

export const RoomTimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [timeLeft, setTimeLeft] = useState('');

  const value = useMemo<RoomTimerContextType>(() => ({
    timeLeft,
    setTimeLeft,
  }), [timeLeft]);

  return <RoomTimerContext.Provider value={value}>{children}</RoomTimerContext.Provider>;
};

export const useRoomTimer = () => {
  const context = useContext(RoomTimerContext);
  if (context === undefined) {
    throw new Error('useRoomTimer must be used within RoomTimerProvider');
  }
  return context;
};
