import React, { createContext, useContext, useState, useEffect } from 'react';
import { Station, RadioContextType } from '../types';

const RadioContext = createContext<RadioContextType | undefined>(undefined);

export const useRadio = () => {
    const context = useContext(RadioContext);
    if (!context) {
        throw new Error('useRadio must be used within a RadioProvider');
    }
    return context;
};

export const RadioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [stations, setStations] = useState<Station[]>([]);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Bootstrap stations
    useEffect(() => {
        const initStations = async () => {
            const saved = localStorage.getItem('radioStations');
            const CURRENT_MIGRATION_VERSION = 15;
            const savedVersion = parseInt(localStorage.getItem('migrationVersion') || '0');

            if (saved) {
                try {
                    let currentStations = JSON.parse(saved);

                    // --- MIGRATION LOGIC (ONLY IF NEEDED FOR EXISTING USERS) ---
                    if (savedVersion < CURRENT_MIGRATION_VERSION) {
                        console.log(`[RadioContext] Applying migration v${CURRENT_MIGRATION_VERSION}`);
                        // Apply any specific migration rules if necessary
                        // For now, we'll just update the version
                        localStorage.setItem('migrationVersion', CURRENT_MIGRATION_VERSION.toString());
                    }

                    setStations(currentStations);
                } catch (e) {
                    console.error('Failed to parse saved stations', e);
                    await fetchDefaultStations();
                }
            } else {
                await fetchDefaultStations();
                localStorage.setItem('migrationVersion', CURRENT_MIGRATION_VERSION.toString());
            }
            setIsInitialLoad(false);
        };

        const fetchDefaultStations = async () => {
            try {
                const response = await fetch('/stations.json', {
                    headers: {
                        'ngrok-skip-browser-warning': 'true'
                    }
                });
                if (!response.ok) throw new Error('Failed to fetch stations.json');
                const data = await response.json();
                setStations(data);
                localStorage.setItem('radioStations', JSON.stringify(data));
            } catch (error) {
                console.error('Error fetching default stations:', error);
                // Fallback to empty array or some basic error handling
                setStations([]);
            }
        };

        initStations();
    }, []);

    const [currentStation, setCurrentStation] = useState<Station | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Initialize activeTab and selectedCategory from localStorage
    const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'tv'>(() => {
        const saved = localStorage.getItem('activeTab');
        return (saved as 'all' | 'favorites' | 'tv') || 'all';
    });

    const [selectedCategory, setSelectedCategory] = useState(() => {
        return localStorage.getItem('selectedCategory') || 'Todas';
    });

    const radioCategories = ['Noticias', 'Música', 'Deportes', 'Religión', 'Cultura', 'Relax', 'Otros'];
    const tvCategories = ['Noticias', 'Música tv', 'Cine & Series', 'Documentales', 'Infantil', 'Deportes', 'Relax', 'Otros'];

    const categories = activeTab === 'tv' ? tvCategories : radioCategories;

    // Save activeTab and selectedCategory to localStorage
    useEffect(() => {
        localStorage.setItem('activeTab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        localStorage.setItem('selectedCategory', selectedCategory);
    }, [selectedCategory]);

    // Initialize volume from localStorage
    const [volume, setVolume] = useState(() => {
        const saved = localStorage.getItem('volume');
        return saved ? parseFloat(saved) : 0.7;
    });

    // Initialize favorites from localStorage
    const [favorites, setFavorites] = useState<string[]>(() => {
        const saved = localStorage.getItem('favorites');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse favorites', e);
            }
        }
        return [];
    });

    const [isLoading] = useState(false);
    const [error] = useState<string | null>(null);

    // Initial setup effect (run once after stations are loaded)
    useEffect(() => {
        if (isInitialLoad || stations.length === 0) return;

        const isInitialized = localStorage.getItem('radioInitialized');

        if (!isInitialized) {
            localStorage.setItem('radioInitialized', 'true');
            // Default station logic if not initialized
            const defaultStation = stations.find(s => s.name === 'DJX Discomovil Radio live') || stations[0];
            setCurrentStation(defaultStation);
        } else {
            // Recover last station
            const lastStationId = localStorage.getItem('lastStationId');
            if (lastStationId) {
                const lastStation = stations.find(s => s.id === lastStationId);
                if (lastStation) {
                    setCurrentStation(lastStation);
                }
            } else {
                // Fallback if no last station
                const defaultStation = stations.find(s => s.name === 'DJX Discomovil Radio live') || stations[0];
                setCurrentStation(defaultStation);
            }
        }
    }, [stations, isInitialLoad]);

    // Robustness: Handle station deletion if they were current
    useEffect(() => {
        if (!isInitialLoad && stations.length > 0 && currentStation) {
            // Ignore temporary YouTube stations from chat
            if (currentStation.id.startsWith('yt-')) return;

            const stillExists = stations.find(s => s.id === currentStation.id);
            if (!stillExists) {
                // Current station was deleted, fallback to first available or default
                const fallback = stations.find(s => s.name === 'DJX Discomovil Radio live') || stations[0];
                setCurrentStation(fallback);
                localStorage.setItem('lastStationId', fallback.id);
            }
        }
        // If stations were cleared (length 0), we wait for initial load or manual reload
    }, [stations, currentStation, isInitialLoad]);

    // Robustness: Validate selectedCategory when activeTab changes
    useEffect(() => {
        if (!isInitialLoad) {
            const currentCategories = activeTab === 'tv' ? tvCategories : radioCategories;
            if (selectedCategory !== 'Todas' && !currentCategories.includes(selectedCategory)) {
                setSelectedCategory('Todas');
            }
        }
    }, [activeTab, isInitialLoad]);

    // Save to localStorage
    useEffect(() => {
        if (!isInitialLoad && stations.length > 0) {
            localStorage.setItem('radioStations', JSON.stringify(stations));
        }
    }, [stations, isInitialLoad]);

    // Save favorites to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('favorites', JSON.stringify(favorites));
        } catch (e) {
            console.error('Failed to save favorites', e);
        }
    }, [favorites]);

    // Save volume to localStorage (Debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                localStorage.setItem('volume', volume.toString());
            } catch (e) {
                console.error('Failed to save volume', e);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [volume]);

    const playStation = (station: Station) => {
        setCurrentStation(station);
        setIsPlaying(true);
        localStorage.setItem('lastStationId', station.id);
    };

    const togglePlay = () => setIsPlaying(!isPlaying);

    const toggleFavorite = (stationId: string) => {
        setFavorites(prev => prev.includes(stationId)
            ? prev.filter(id => id !== stationId)
            : [...prev, stationId]
        );
    };

    const addStation = (station: Station) => setStations(prev => [...prev, station]);
    const removeStation = (stationId: string) => setStations(prev => prev.filter(s => s.id !== stationId));
    const updateStation = (updatedStation: Station) => setStations(prev => prev.map(s => s.id === updatedStation.id ? updatedStation : s));

    const nextStation = () => {
        if (!currentStation) return;
        const index = stations.findIndex(s => s.id === currentStation.id);
        const nextIndex = (index + 1) % stations.length;
        playStation(stations[nextIndex]);
    };

    const prevStation = () => {
        if (!currentStation) return;
        const index = stations.findIndex(s => s.id === currentStation.id);
        const prevIndex = (index - 1 + stations.length) % stations.length;
        playStation(stations[prevIndex]);
    };

    const importStations = (importedStations: Station[]) => {
        setStations(prev => {
            const newStations = [...prev];
            importedStations.forEach(s => {
                if (s.name && (s.url || s.iframeUrl)) {
                    newStations.push({
                        ...s,
                        id: Date.now().toString() + Math.random(),
                        type: s.type || 'audio'
                    });
                }
            });
            return newStations;
        });
    };

    const reorderStations = (reorderedStations: Station[]) => {
        setStations(reorderedStations);
    };

    const contextValue = React.useMemo(() => ({
        stations,
        currentStation,
        isPlaying,
        volume,
        favorites,
        isLoading,
        error,
        playStation,
        togglePlay,
        setVolume,
        toggleFavorite,
        addStation,
        removeStation,
        updateStation,
        reorderStations,
        nextStation,
        prevStation,
        setCurrentStation,
        importStations,
        activeTab,
        setActiveTab,
        selectedCategory,
        setSelectedCategory,
        categories,
        radioCategories,
        tvCategories
    }), [stations, currentStation, isPlaying, volume, favorites, isLoading, error, activeTab, selectedCategory, radioCategories, tvCategories, categories]);

    return (
        <RadioContext.Provider value={contextValue}>
            {children}
        </RadioContext.Provider>
    );
};
