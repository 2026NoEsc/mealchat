import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { Room, Participant, Message, RoomSummary } from '../lib/types';

/**
 * 방 안에서 채팅 위에 열리는 하단 패널.
 * Figma `채팅/*` 패널 4종에 맞춰 menu·members 를 더했다.
 */
export type RoomOverlay = 'schedule' | 'menu' | 'dutch' | 'members' | null;

/**
 * 방 목록 / 현재 열려 있는 방의 상태.
 *
 * timeLeft(만료 카운트다운)는 여기 두지 않았습니다. 1초마다 바뀌어서
 * 이 Context 의 value 를 매초 무효화하고, 구독하는 컴포넌트를 전부
 * 리렌더시키기 때문입니다. RoomTimerContext 로 분리했습니다.
 */
interface RoomContextType {
  roomList: Room[];
  /** 방 id → 카드용 요약(멤버 아바타 / 마지막 메시지). 방 목록과 함께 채워진다 */
  roomSummaries: Record<string, RoomSummary>;
  currentRoom: Room | null;
  participants: Participant[];
  /** 현재 방에서의 내 참여자 행 */
  currentParticipant: Participant | null;
  roomMessages: Message[];
  newMessageText: string;
  /** 방 안 하단 시트에 무엇을 띄울지 (null이면 닫힘) */
  roomOverlay: RoomOverlay;
  /** 방 안 서브 탭 */
  roomSubTab: 'schedule' | 'menu' | 'baemin' | 'dutch';
  showEmoticonPicker: boolean;
  roomsLoading: boolean;
  participantsLoading: boolean;
  setRoomList: React.Dispatch<React.SetStateAction<Room[]>>;
  setRoomSummaries: React.Dispatch<React.SetStateAction<Record<string, RoomSummary>>>;
  setCurrentRoom: React.Dispatch<React.SetStateAction<Room | null>>;
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  setCurrentParticipant: React.Dispatch<React.SetStateAction<Participant | null>>;
  setRoomMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setNewMessageText: React.Dispatch<React.SetStateAction<string>>;
  setRoomOverlay: React.Dispatch<React.SetStateAction<RoomOverlay>>;
  setRoomSubTab: React.Dispatch<React.SetStateAction<'schedule' | 'menu' | 'baemin' | 'dutch'>>;
  setShowEmoticonPicker: React.Dispatch<React.SetStateAction<boolean>>;
  setRoomsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setParticipantsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const RoomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [roomList, setRoomList] = useState<Room[]>([]);
  const [roomSummaries, setRoomSummaries] = useState<Record<string, RoomSummary>>({});
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [roomMessages, setRoomMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [roomOverlay, setRoomOverlay] = useState<RoomOverlay>(null);
  const [roomSubTab, setRoomSubTab] = useState<'schedule' | 'menu' | 'baemin' | 'dutch'>('schedule');
  const [showEmoticonPicker, setShowEmoticonPicker] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  const value = useMemo<RoomContextType>(() => ({
    roomList,
    roomSummaries,
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
    setRoomSummaries,
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
    roomList, roomSummaries, currentRoom, participants, currentParticipant, roomMessages,
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
