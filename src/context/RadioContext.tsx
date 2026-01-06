import React, { createContext, useContext, useState, useEffect } from 'react';
import { Station, RadioContextType } from '../types';
import { DEFAULT_STATIONS } from '../data/defaultStations';

const RadioContext = createContext<RadioContextType | undefined>(undefined);

export const useRadio = () => {
    const context = useContext(RadioContext);
    if (!context) {
        throw new Error('useRadio must be used within a RadioProvider');
    }
    return context;
};

export const RadioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Initialize stations from localStorage or use defaults
    const [stations, setStations] = useState<Station[]>(() => {
        const saved = localStorage.getItem('radioStations');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse stations', e);
            }
        }
        return DEFAULT_STATIONS;
    });

    const [currentStation, setCurrentStation] = useState<Station | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

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

    const [recentStations, setRecentStations] = useState<Station[]>([]);
    const [isLoading] = useState(false);
    const [error] = useState<string | null>(null);

    // Initial setup effect (run once)
    useEffect(() => {
        const isInitialized = localStorage.getItem('radioInitialized');

        if (!isInitialized) {
            localStorage.setItem('radioInitialized', 'true');
            // Default station logic if not initialized
            const defaultStation = DEFAULT_STATIONS.find(s => s.name === 'DJX Discomovil Radio live') || DEFAULT_STATIONS[0];
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
    }, [stations]);

    // Save to localStorage
    useEffect(() => {
        localStorage.setItem('radioStations', JSON.stringify(stations));
    }, [stations]);

    // Save favorites to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('favorites', JSON.stringify(favorites));
        } catch (e) {
            console.error('Failed to save favorites', e);
        }
    }, [favorites]);

    // Save volume to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('volume', volume.toString());
        } catch (e) {
            console.error('Failed to save volume', e);
        }
    }, [volume]);

    const playStation = (station: Station) => {
        setCurrentStation(station);
        setIsPlaying(true);

        // Guardar última emisora escuchada
        localStorage.setItem('lastStationId', station.id);

        // Add to recent
        setRecentStations(prev => {
            const filtered = prev.filter(s => s.id !== station.id);
            return [station, ...filtered].slice(0, 10);
        });
    };

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const toggleFavorite = (stationId: string) => {
        setFavorites(prev => {
            return prev.includes(stationId)
                ? prev.filter(id => id !== stationId)
                : [...prev, stationId];
        });
    };

    const addStation = (station: Station) => {
        setStations(prev => [...prev, station]);
    };

    const removeStation = (stationId: string) => {
        setStations(prev => prev.filter(s => s.id !== stationId));
    };

    const updateStation = (updatedStation: Station) => {
        setStations(prev => prev.map(s => s.id === updatedStation.id ? updatedStation : s));
    };

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

    return (
        <RadioContext.Provider value={{
            stations,
            currentStation,
            isPlaying,
            volume,
            favorites,
            recentStations,
            isLoading,
            error,
            playStation,
            togglePlay,
            setVolume,
            toggleFavorite,
            addStation,
            removeStation,
            updateStation,
            nextStation,
            prevStation
        }}>
            {children}
        </RadioContext.Provider>
    );
};
