export interface Station {
    id: string;
    name: string;
    url: string;
    logo: string;
    country: string;
    type: 'audio' | 'video';
    iframeUrl?: string;
    useProxy?: boolean;
    category?: string;
    embedCanal?: string; // Canal embed para token automático: 'natgeo', 'tnt', 'history'...
}


export interface RadioContextType {
    stations: Station[];
    currentStation: Station | null;
    isPlaying: boolean;
    volume: number;
    favorites: string[];
    isLoading: boolean;
    error: string | null;
    playStation: (station: Station) => void;
    setCurrentStation: (station: Station | null) => void;
    togglePlay: () => void;
    setVolume: (volume: number) => void;
    toggleFavorite: (stationId: string) => void;
    addStation: (station: Station) => void;
    removeStation: (stationId: string) => void;
    updateStation: (station: Station) => void;
    reorderStations: (stations: Station[]) => void;
    nextStation: () => void;
    prevStation: () => void;
    importStations: (stations: Station[]) => void;
    activeTab: 'all' | 'favorites' | 'tv';
    setActiveTab: (tab: 'all' | 'favorites' | 'tv') => void;
    selectedCategory: string;
    setSelectedCategory: (category: string) => void;
    categories: string[];
    radioCategories: string[];
    tvCategories: string[];
}
