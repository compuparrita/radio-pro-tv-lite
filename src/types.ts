export interface Station {
    id: string;
    name: string;
    url: string;
    logo: string;
    country: string;
}

export interface RadioContextType {
    stations: Station[];
    currentStation: Station | null;
    isPlaying: boolean;
    volume: number;
    favorites: string[];
    recentStations: Station[];
    isLoading: boolean;
    error: string | null;
    playStation: (station: Station) => void;
    togglePlay: () => void;
    setVolume: (volume: number) => void;
    toggleFavorite: (stationId: string) => void;
    addStation: (station: Station) => void;
    removeStation: (stationId: string) => void;
    updateStation: (station: Station) => void;
    nextStation: () => void;
    prevStation: () => void;
}
