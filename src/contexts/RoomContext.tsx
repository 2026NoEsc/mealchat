import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { Room, Participant, Message } from '../lib/types';

/**
 * 방 목록 / 현재 열려 있는 방의 상태.
 *
 * timeLeft(만료 카운트다운)는 여기 두지 않았습니다. 1초마다 바뀌어서
 * 이 Context 의 value 를 매초 무효화하고, 구독하는 컴포넌트를 전부
 * 리렌더시키기 때문입니다. RoomTimerContext 로 분리했습니다.
 */
interface RoomContextType {
  roomList: Room[];
  currentRoom: Room | null;
  participants: Participant[];
  /** 현재 방에서의 내 참여자 행 */
  currentParticipant: Participant | null;
  roomMessages: Message[];
  newMessageText: string;
  /** 방 안 하단 시트에 무엇을 띄울지 (null이면 닫힘) */
  roomOverlay: 'schedule' | 'dutch' | null;
  /** 방 안 서브 탭 */
  roomSubTab: 'schedule' | 'menu' | 'baemin' | 'dutch';
  showEmoticonPicker: boolean;
  roomsLoading: boolean;
  participantsLoading: boolean;
  setRoomList: React.Dispatch<React.SetStateAction<Room[]>>;
  setCurrentRoom: React.Dispatch<React.SetStateAction<Room | null>>;
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  setCurrentParticipant: React.Dispatch<React.SetStateAction<Participant | null>>;
  setRoomMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setNewMessageText: React.Dispatch<React.SetStateAction<string>>;
  setRoomOverlay: React.Dispatch<React.SetStateAction<'schedule' | 'dutch' | null>>;
  setRoomSubTab: React.Dispatch<React.SetStateAction<'schedule' | 'menu' | 'baemin' | 'dutch'>>;
  setShowEmoticonPicker: React.Dispatch<React.SetStateAction<boolean>>;
  setRoomsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setParticipantsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const RoomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [roomList, setRoomList] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [roomMessages, setRoomMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [roomOverlay, setRoomOverlay] = useState<'schedule' | 'dutch' | null>(null);
  const [roomSubTab, setRoomSubTab] = useState<'schedule' | 'menu' | 'baemin' | 'dutch'>('schedule');
  const [showEmoticonPicker, setShowEmoticonPicker] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  const value = useMemo<RoomContextType>(() => ({
    roomList,
    currentRoom,
    participants,
    currentParticipant,
    roomMessages,
    newMessageText,
    roomOverlay,
    roomSubTab,
    showEmoticonPicker,
    roomsLoading,
    participantsLoading,
    setRoomList,
    setCurrentRoom,
    setParticipants,
    setCurrentParticipant,
    setRoomMessages,
    setNewMessageText,
    setRoomOverlay,
    setRoomSubTab,
    setShowEmoticonPicker,
    setRoomsLoading,
    setParticipantsLoading,
  }), [
    roomList, currentRoom, participants, currentParticipant, roomMessages,
    newMessageText, roomOverlay, roomSubTab, showEmoticonPicker,
    roomsLoading, participantsLoading
  ]);

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRoom must be used within RoomProvider');
  }
  return context;
};
