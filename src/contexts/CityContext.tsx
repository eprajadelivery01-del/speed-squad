import React, { createContext, useContext, useState, useEffect } from "react";

interface CityCoords {
  name: string;
  lat: number;
  lng: number;
}

interface CityContextType {
  selectedCity: string | null;
  selectedCityCoords: CityCoords | null;
  setCity: (cityName: string | null) => void;
}

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "Cuiabá": { lat: -15.5989, lng: -56.0974 },
  "Várzea Grande": { lat: -15.65, lng: -56.1333 },
  "Diamantino": { lat: -14.4087, lng: -56.4462 },
  "Tangará da Serra": { lat: -14.6231, lng: -57.4851 },
  "Rondonópolis": { lat: -16.4674, lng: -54.6318 },
  "Sinop": { lat: -11.864, lng: -55.509 },
  "Sorriso": { lat: -12.5442, lng: -55.7231 },
  "Lucas do Rio Verde": { lat: -13.06, lng: -55.91 },
  "Nova Mutum": { lat: -13.83, lng: -56.08 },
};

const CITY_STORAGE_KEY = "epj_selected_city_v2";

const CityContext = createContext<CityContextType | undefined>(undefined);

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CITY_STORAGE_KEY);
    if (stored) setSelectedCity(stored);
  }, []);

  const setCity = (cityName: string | null) => {
    setSelectedCity(cityName);
    if (cityName) {
      localStorage.setItem(CITY_STORAGE_KEY, cityName);
    } else {
      localStorage.removeItem(CITY_STORAGE_KEY);
    }
  };

  const selectedCityCoords = selectedCity && CITY_COORDS[selectedCity] 
    ? { name: selectedCity, ...CITY_COORDS[selectedCity] } 
    : null;

  return (
    <CityContext.Provider value={{ selectedCity, selectedCityCoords, setCity }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const context = useContext(CityContext);
  if (context === undefined) {
    throw new Error("useCity must be used within a CityProvider");
  }
  return context;
}
