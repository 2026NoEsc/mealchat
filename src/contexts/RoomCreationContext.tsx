import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { Participant } from '../lib/types';

interface RoomCreationContextType {
  invitedProfiles: Participant[];
  newRoomTitle: string;
  generatedCode: string;
  joinCode: string;
  showCodeInput: boolean;
  codeErrorMessage: string;
  setInvitedProfiles: (profiles: Participant[]) => void;
  setNewRoomTitle: (title: string) => void;
  setGeneratedCode: (code: string) => void;
  setJoinCode: (code: string) => void;
  setShowCodeInput: (show: boolean) => void;
  setCodeErrorMessage: (message: string) => void;
  addInvitedProfile: (profile: Participant) => void;
  removeInvitedProfile: (profileId: string) => void;
}

const RoomCreationContext = createContext<RoomCreationContextType | undefined>(undefined);

export const RoomCreationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [invitedProfiles, setInvitedProfiles] = useState<Participant[]>([]);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeErrorMessage, setCodeErrorMessage] = useState('');

  const addInvitedProfile = (profile: Participant) => {
    setInvitedProfiles(prev => {
      if (!prev.find(p => p.id === profile.id)) {
        return [...prev, profile];
      }
      return prev;
    });
  };

  const removeInvitedProfile = (profileId: string) => {
    setInvitedProfiles(prev => prev.filter(p => p.id !== profileId));
  };

  const value = useMemo<RoomCreationContextType>(() => ({
    invitedProfiles,
    newRoomTitle,
    generatedCode,
    joinCode,
    showCodeInput,
    codeErrorMessage,
    setInvitedProfiles,
    setNewRoomTitle,
    setGeneratedCode,
    setJoinCode,
    setShowCodeInput,
    setCodeErrorMessage,
    addInvitedProfile,
    removeInvitedProfile,
  }), [invitedProfiles, newRoomTitle, generatedCode, joinCode, showCodeInput, codeErrorMessage]);

  return <RoomCreationContext.Provider value={value}>{children}</RoomCreationContext.Provider>;
};

export const useRoomCreation = () => {
  const context = useContext(RoomCreationContext);
  if (context === undefined) {
    throw new Error('useRoomCreation must be used within RoomCreationProvider');
  }
  return context;
};
