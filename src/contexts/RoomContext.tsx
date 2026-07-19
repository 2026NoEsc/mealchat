import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { Room, Participant, Message } from '../lib/types';

interface RoomContextType {
  roomList: Room[];
  currentRoom: Room | null;
  participants: Participant[];
  roomMessages: Message[];
  newMessageText: string;
  roomOverlay: 'schedule' | 'dutch' | null;
  setRoomList: (rooms: Room[]) => void;
  setCurrentRoom: (room: Room | null) => void;
  setParticipants: (participants: Participant[]) => void;
  setRoomMessages: (messages: Message[]) => void;
  setNewMessageText: (text: string) => void;
  setRoomOverlay: (overlay: 'schedule' | 'dutch' | null) => void;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const RoomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [roomList, setRoomList] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roomMessages, setRoomMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [roomOverlay, setRoomOverlay] = useState<'schedule' | 'dutch' | null>(null);

  const value = useMemo<RoomContextType>(() => ({
    roomList,
    currentRoom,
    participants,
    roomMessages,
    newMessageText,
    roomOverlay,
    setRoomList,
    setCurrentRoom,
    setParticipants,
    setRoomMessages,
    setNewMessageText,
    setRoomOverlay,
  }), [roomList, currentRoom, participants, roomMessages, newMessageText, roomOverlay]);

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRoom must be used within RoomProvider');
  }
  return context;
};
