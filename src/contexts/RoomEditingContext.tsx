import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

interface RoomEditingContextType {
  isEditingRoomTitle: boolean;
  editingRoomTitle: string;
  newRoomTitle: string;
  isEditingRoomLocation: boolean;
  editingRoomLocationName: string;
  editingRoomLatitude: number;
  editingRoomLongitude: number;
  showLocationMapModal: boolean;
  mapRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  locationSearchResults: any[];
  showLocationResults: boolean;
  setIsEditingRoomTitle: (editing: boolean) => void;
  setEditingRoomTitle: (title: string) => void;
  setNewRoomTitle: (title: string) => void;
  setIsEditingRoomLocation: (editing: boolean) => void;
  setEditingRoomLocationName: (name: string) => void;
  setEditingRoomLatitude: (lat: number) => void;
  setEditingRoomLongitude: (lng: number) => void;
  setShowLocationMapModal: (show: boolean) => void;
  setMapRegion: (region: any) => void;
  setLocationSearchResults: (results: any[]) => void;
  setShowLocationResults: (show: boolean) => void;
}

const RoomEditingContext = createContext<RoomEditingContextType | undefined>(undefined);

export const RoomEditingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isEditingRoomTitle, setIsEditingRoomTitle] = useState(false);
  const [editingRoomTitle, setEditingRoomTitle] = useState('');
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [isEditingRoomLocation, setIsEditingRoomLocation] = useState(false);
  const [editingRoomLocationName, setEditingRoomLocationName] = useState('');
  const [editingRoomLatitude, setEditingRoomLatitude] = useState(37.5665);
  const [editingRoomLongitude, setEditingRoomLongitude] = useState(126.9780);
  const [showLocationMapModal, setShowLocationMapModal] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.5665,
    longitude: 126.9780,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [locationSearchResults, setLocationSearchResults] = useState<any[]>([]);
  const [showLocationResults, setShowLocationResults] = useState(false);

  const value = useMemo<RoomEditingContextType>(() => ({
    isEditingRoomTitle,
    editingRoomTitle,
    newRoomTitle,
    isEditingRoomLocation,
    editingRoomLocationName,
    editingRoomLatitude,
    editingRoomLongitude,
    showLocationMapModal,
    mapRegion,
    locationSearchResults,
    showLocationResults,
    setIsEditingRoomTitle,
    setEditingRoomTitle,
    setNewRoomTitle,
    setIsEditingRoomLocation,
    setEditingRoomLocationName,
    setEditingRoomLatitude,
    setEditingRoomLongitude,
    setShowLocationMapModal,
    setMapRegion,
    setLocationSearchResults,
    setShowLocationResults,
  }), [isEditingRoomTitle, editingRoomTitle, newRoomTitle, isEditingRoomLocation, editingRoomLocationName, editingRoomLatitude, editingRoomLongitude, showLocationMapModal, mapRegion, locationSearchResults, showLocationResults]);

  return <RoomEditingContext.Provider value={value}>{children}</RoomEditingContext.Provider>;
};

export const useRoomEditing = () => {
  const context = useContext(RoomEditingContext);
  if (context === undefined) {
    throw new Error('useRoomEditing must be used within RoomEditingProvider');
  }
  return context;
};
