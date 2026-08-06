import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

/** react-native-maps 의 Region 과 같은 모양 */
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/**
 * 방 상세에서 제목·장소를 인라인 편집할 때의 상태.
 *
 * newRoomTitle 은 제거했습니다. 이름이 비슷해 여기 섞여 있었지만
 * 실제로는 '방 생성' 모달의 입력값이라 RoomCreationContext 소관입니다.
 */
interface RoomEditingContextType {
  isEditingRoomTitle: boolean;
  editingRoomTitle: string;
  isEditingRoomLocation: boolean;
  editingRoomLocationName: string;
  editingRoomLatitude: number;
  editingRoomLongitude: number;
  showLocationMapModal: boolean;
  mapRegion: MapRegion;
  locationSearchResults: any[];
  showLocationResults: boolean;
  setIsEditingRoomTitle: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingRoomTitle: React.Dispatch<React.SetStateAction<string>>;
  setIsEditingRoomLocation: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingRoomLocationName: React.Dispatch<React.SetStateAction<string>>;
  setEditingRoomLatitude: React.Dispatch<React.SetStateAction<number>>;
  setEditingRoomLongitude: React.Dispatch<React.SetStateAction<number>>;
  setShowLocationMapModal: React.Dispatch<React.SetStateAction<boolean>>;
  setMapRegion: React.Dispatch<React.SetStateAction<MapRegion>>;
  setLocationSearchResults: React.Dispatch<React.SetStateAction<any[]>>;
  setShowLocationResults: React.Dispatch<React.SetStateAction<boolean>>;
}

const RoomEditingContext = createContext<RoomEditingContextType | undefined>(undefined);

export const RoomEditingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isEditingRoomTitle, setIsEditingRoomTitle] = useState(false);
  const [editingRoomTitle, setEditingRoomTitle] = useState('');
  const [isEditingRoomLocation, setIsEditingRoomLocation] = useState(false);
  const [editingRoomLocationName, setEditingRoomLocationName] = useState('');
  const [editingRoomLatitude, setEditingRoomLatitude] = useState(37.5665);
  const [editingRoomLongitude, setEditingRoomLongitude] = useState(126.9780);
  const [showLocationMapModal, setShowLocationMapModal] = useState(false);
  const [mapRegion, setMapRegion] = useState<MapRegion>({
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
    setIsEditingRoomLocation,
    setEditingRoomLocationName,
    setEditingRoomLatitude,
    setEditingRoomLongitude,
    setShowLocationMapModal,
    setMapRegion,
    setLocationSearchResults,
    setShowLocationResults,
  }), [isEditingRoomTitle, editingRoomTitle, isEditingRoomLocation, editingRoomLocationName, editingRoomLatitude, editingRoomLongitude, showLocationMapModal, mapRegion, locationSearchResults, showLocationResults]);

  return <RoomEditingContext.Provider value={value}>{children}</RoomEditingContext.Provider>;
};

export const useRoomEditing = () => {
  const context = useContext(RoomEditingContext);
  if (context === undefined) {
    throw new Error('useRoomEditing must be used within RoomEditingProvider');
  }
  return context;
};
