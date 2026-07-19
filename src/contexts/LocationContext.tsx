import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

interface LocationContextType {
  selectedLocation: { lat: number; lng: number; name: string } | null;
  locationQuery: string;
  locationResults: any[];
  isLoadingLocation: boolean;
  setSelectedLocation: (location: { lat: number; lng: number; name: string } | null) => void;
  setLocationQuery: (query: string) => void;
  setLocationResults: (results: any[]) => void;
  setIsLoadingLocation: (loading: boolean) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const value = useMemo<LocationContextType>(() => ({
    selectedLocation,
    locationQuery,
    locationResults,
    isLoadingLocation,
    setSelectedLocation,
    setLocationQuery,
    setLocationResults,
    setIsLoadingLocation,
  }), [selectedLocation, locationQuery, locationResults, isLoadingLocation]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return context;
};
