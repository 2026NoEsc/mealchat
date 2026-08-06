import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

/**
 * 방 생성 / 초대 코드 입장 흐름의 상태.
 *
 * 예전에는 invitedProfiles·generatedCode·joinCode·showCodeInput·codeErrorMessage를
 * 들고 있었으나, App.tsx에 같은 이름의 상태가 하나도 없어 한 번도 쓰이지
 * 않았습니다. 실제 화면이 쓰는 이름으로 맞췄습니다.
 */
interface RoomCreationContextType {
  /** 3단계 생성 모달의 현재 단계 (1~3) */
  currentCreateStep: number;
  newRoomTitle: string;
  newRoomDate: string;
  /** 함께 초대할 메이트의 profile_id 목록 */
  createRoomSelectedFriends: string[];
  /** 초대 코드 6자리 입력값 */
  joinRoomCode: string;
  setCurrentCreateStep: React.Dispatch<React.SetStateAction<number>>;
  setNewRoomTitle: React.Dispatch<React.SetStateAction<string>>;
  setNewRoomDate: React.Dispatch<React.SetStateAction<string>>;
  setCreateRoomSelectedFriends: React.Dispatch<React.SetStateAction<string[]>>;
  setJoinRoomCode: React.Dispatch<React.SetStateAction<string>>;
}

const RoomCreationContext = createContext<RoomCreationContextType | undefined>(undefined);

export const RoomCreationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentCreateStep, setCurrentCreateStep] = useState(1);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomDate, setNewRoomDate] = useState('');
  const [createRoomSelectedFriends, setCreateRoomSelectedFriends] = useState<string[]>([]);
  const [joinRoomCode, setJoinRoomCode] = useState('');

  const value = useMemo<RoomCreationContextType>(() => ({
    currentCreateStep,
    newRoomTitle,
    newRoomDate,
    createRoomSelectedFriends,
    joinRoomCode,
    setCurrentCreateStep,
    setNewRoomTitle,
    setNewRoomDate,
    setCreateRoomSelectedFriends,
    setJoinRoomCode,
  }), [currentCreateStep, newRoomTitle, newRoomDate, createRoomSelectedFriends, joinRoomCode]);

  return <RoomCreationContext.Provider value={value}>{children}</RoomCreationContext.Provider>;
};

export const useRoomCreation = () => {
  const context = useContext(RoomCreationContext);
  if (context === undefined) {
    throw new Error('useRoomCreation must be used within RoomCreationProvider');
  }
  return context;
};
