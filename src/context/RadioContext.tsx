import React, { createContext, useContext, useState, useEffect } from 'react';
import { Station, RadioContextType } from '../types';
import {
    fetchStationsFromCloud,
    saveStationToCloud,
    deleteStationFromCloud,
    updateStationsOrderInCloud,
    subscribeToStationsChanges,
    getCurrentUserId,
    fetchUserFavoritesFromCloud,
    saveFavoriteToCloud,
    removeFavoriteFromCloud,
    subscribeToUserFavorites
} from '../services/supabase';

const RadioContext = createContext<RadioContextType | undefined>(undefined);

export const useRadio = () => {
    const context = useContext(RadioContext);
    if (!context) {
        throw new Error('useRadio must be used within a RadioProvider');
    }
    return context;
};

export const RADIO_CATEGORIES = ['Noticias', 'Música', 'Deportes', 'Religión', 'Cultura', 'Relax', 'Otros'];
export const TV_CATEGORIES = ['Noticias', 'Música tv', 'Cine & Series', 'Documentales', 'Infantil', 'Deportes', 'Relax', 'Otros'];

export const RadioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [stations, setStations] = useState<Station[]>([]);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Bootstrap stations: Estrategia Híbrida (Caché local instantáneo 0ms + Sincronización en segundo plano con Supabase)
    useEffect(() => {
        let isMounted = true;

        const initStations = async () => {
            const saved = localStorage.getItem('radioStations');

            // 1. Cargar de inmediato desde la caché local si existe (arranque a 0 segundos)
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setStations(parsed);
                        setIsInitialLoad(false);
                    }
                } catch (e) {
                    console.error('Error al leer caché local de radioStations:', e);
                }
            }

            // 2. Consultar catálogo maestro en la nube de Supabase
            try {
                const cloudStations = await fetchStationsFromCloud();
                if (isMounted && cloudStations && cloudStations.length > 0) {
                    setStations(cloudStations);
                    localStorage.setItem('radioStations', JSON.stringify(cloudStations));
                }
            } catch (error) {
                console.warn('[RadioContext] Sin conexión a Supabase, usando respaldo local o stations.json:', error);
                if (!saved) {
                    await fetchDefaultStations();
                }
            } finally {
                if (isMounted) {
                    setIsInitialLoad(false);
                }
            }
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
                if (isMounted) {
                    setStations(data);
                    localStorage.setItem('radioStations', JSON.stringify(data));
                }
            } catch (error) {
                console.error('Error fetching fallback stations:', error);
                if (isMounted) setStations([]);
            }
        };

        initStations();

        // 3. Suscripción en tiempo real: Si se agrega/edita una emisora en Supabase, se actualiza automáticamente
        const unsubscribe = subscribeToStationsChanges(async () => {
            try {
                const updatedStations = await fetchStationsFromCloud();
                if (isMounted && updatedStations && updatedStations.length > 0) {
                    setStations(updatedStations);
                    localStorage.setItem('radioStations', JSON.stringify(updatedStations));
                }
            } catch (err) {
                console.error('Error al sincronizar cambio en tiempo real:', err);
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
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

    const categories = activeTab === 'tv' ? TV_CATEGORIES : RADIO_CATEGORIES;

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

    const [authUserId, setAuthUserId] = useState<string>(() => getCurrentUserId());

    // Escuchar cambios de identidad en tiempo real (al identificarse en el chat)
    useEffect(() => {
        const handleIdentityChange = () => {
            const newId = getCurrentUserId();
            setAuthUserId(newId);
        };

        window.addEventListener('user-identity-changed', handleIdentityChange);
        window.addEventListener('storage', handleIdentityChange);

        return () => {
            window.removeEventListener('user-identity-changed', handleIdentityChange);
            window.removeEventListener('storage', handleIdentityChange);
        };
    }, []);

    // Sincronización de favoritos con Supabase (Nube)
    useEffect(() => {
        let isMounted = true;
        const userId = authUserId;

        const syncFavorites = async () => {
            try {
                const cloudFavorites = await fetchUserFavoritesFromCloud(userId);
                if (!isMounted) return;

                if (cloudFavorites && cloudFavorites.length > 0) {
                    setFavorites(prev => {
                        const merged = Array.from(new Set([...prev, ...cloudFavorites]));
                        localStorage.setItem('favorites', JSON.stringify(merged));
                        return merged;
                    });
                } else {
                    // Si en la nube no hay nada pero en local sí, respaldarlos en Supabase
                    const saved = localStorage.getItem('favorites');
                    if (saved) {
                        try {
                            const parsed: string[] = JSON.parse(saved);
                            for (const favId of parsed) {
                                saveFavoriteToCloud(userId, favId);
                            }
                        } catch (e) {}
                    }
                }
            } catch (err) {
                console.warn('[RadioContext] Fallo al sincronizar favoritos de la nube:', err);
            }
        };

        syncFavorites();

        // Suscripción a cambios de favoritos en tiempo real para este usuario
        const unsubscribe = subscribeToUserFavorites(userId, async () => {
            try {
                const fresh = await fetchUserFavoritesFromCloud(userId);
                if (isMounted && fresh) {
                    setFavorites(fresh);
                    localStorage.setItem('favorites', JSON.stringify(fresh));
                }
            } catch (e) {}
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [authUserId]);

    const [isLoading] = useState(false);
    const [error] = useState<string | null>(null);

    // Initial setup effect (run once after stations are loaded)
    useEffect(() => {
        if (isInitialLoad || stations.length === 0) return;

        const defaultStation = stations.find(s => s.name === 'DJX Discomovil Radio live') || stations[0];

        // 1. Si el usuario ya tenía una emisora previamente seleccionada, mantenerla al recargar
        const lastStationId = localStorage.getItem('lastStationId');
        if (lastStationId) {
            const savedStation = stations.find(s => s.id === lastStationId);
            if (savedStation) {
                setCurrentStation(savedStation);
                return;
            }
        }

        // 2. Si no ha seleccionado nada o tras un reset/borrado, sintonizar la predeterminada
        setCurrentStation(defaultStation);
    }, [stations, isInitialLoad]);

    // Robustness: Handle station deletion if they were current
    useEffect(() => {
        if (!isInitialLoad && stations.length > 0 && currentStation) {
            // Ignore temporary YouTube stations from chat/search
            if (currentStation.id.startsWith('yt-')) return;

            const stillExists = stations.find(s => s.id === currentStation.id);
            if (!stillExists) {
                const fallback = stations.find(s => s.name === 'DJX Discomovil Radio live') || stations[0];
                setCurrentStation(fallback);
                localStorage.setItem('lastStationId', fallback.id);
            }
        }
    }, [stations, currentStation, isInitialLoad]);

    // Robustness: Validate selectedCategory when activeTab changes
    useEffect(() => {
        if (!isInitialLoad) {
            const currentCategories = activeTab === 'tv' ? TV_CATEGORIES : RADIO_CATEGORIES;
            if (selectedCategory !== 'Todas' && !currentCategories.includes(selectedCategory)) {
                setSelectedCategory('Todas');
            }
        }
    }, [activeTab, isInitialLoad, selectedCategory]);

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
        if (!station) return;
        setCurrentStation(station);
        setIsPlaying(true);
        if (!station.id.startsWith('yt-')) {
            localStorage.setItem('lastStationId', station.id);
        }
    };

    const togglePlay = () => setIsPlaying(prev => !prev);

    const toggleFavorite = (stationId: string) => {
        const userId = getCurrentUserId();
        setFavorites(prev => {
            const isFav = prev.includes(stationId);
            const updated = isFav
                ? prev.filter(id => id !== stationId)
                : [...prev, stationId];

            localStorage.setItem('favorites', JSON.stringify(updated));

            // Sincronizar en la nube con Supabase
            if (isFav) {
                removeFavoriteFromCloud(userId, stationId);
            } else {
                saveFavoriteToCloud(userId, stationId);
            }

            return updated;
        });
    };

    const addStation = (station: Station) => {
        setStations(prev => {
            const updated = [...prev, station];
            saveStationToCloud(station, updated.length - 1);
            return updated;
        });
    };

    const removeStation = (stationId: string) => {
        setStations(prev => {
            const updated = prev.filter(s => s.id !== stationId);
            deleteStationFromCloud(stationId);
            return updated;
        });
    };

    const updateStation = (updatedStation: Station) => {
        setStations(prev => {
            const updated = prev.map(s => s.id === updatedStation.id ? updatedStation : s);
            const index = updated.findIndex(s => s.id === updatedStation.id);
            saveStationToCloud(updatedStation, index >= 0 ? index : 0);
            return updated;
        });
    };

    // Get the currently relevant list of stations based on activeTab and selectedCategory
    const getNavigableStations = (): Station[] => {
        if (stations.length === 0) return [];
        let list = stations;
        if (activeTab === 'all') {
            list = stations.filter(s => s.type === 'audio');
        } else if (activeTab === 'tv') {
            list = stations.filter(s => s.type === 'video');
        } else if (activeTab === 'favorites') {
            list = stations.filter(s => favorites.includes(s.id));
        }

        if (selectedCategory !== 'Todas') {
            const filteredByCategory = list.filter(s => s.category === selectedCategory);
            if (filteredByCategory.length > 0) return filteredByCategory;
        }

        return list.length > 0 ? list : stations;
    };

    const nextStation = () => {
        const navStations = getNavigableStations();
        if (navStations.length === 0) return;

        if (!currentStation) {
            playStation(navStations[0]);
            return;
        }

        const index = navStations.findIndex(s => s.id === currentStation.id);
        if (index === -1) {
            playStation(navStations[0]);
        } else {
            const nextIndex = (index + 1) % navStations.length;
            playStation(navStations[nextIndex]);
        }
    };

    const prevStation = () => {
        const navStations = getNavigableStations();
        if (navStations.length === 0) return;

        if (!currentStation) {
            playStation(navStations[navStations.length - 1]);
            return;
        }

        const index = navStations.findIndex(s => s.id === currentStation.id);
        if (index === -1) {
            playStation(navStations[navStations.length - 1]);
        } else {
            const prevIndex = (index - 1 + navStations.length) % navStations.length;
            playStation(navStations[prevIndex]);
        }
    };

    const importStations = (importedStations: Station[]) => {
        setStations(prev => {
            const newStations = [...prev];
            importedStations.forEach(s => {
                if (s.name && (s.url || s.iframeUrl || s.embedCanal)) {
                    newStations.push({
                        ...s,
                        id: s.id && !prev.some(p => p.id === s.id) ? s.id : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                        type: s.type || 'audio'
                    });
                }
            });
            return newStations;
        });
    };

    const reorderStations = (reorderedStations: Station[]) => {
        setStations(reorderedStations);
        updateStationsOrderInCloud(reorderedStations);
    };

    const contextValue = React.useMemo(() => ({
        stations,
        currentStation,
        isPlaying,
        setIsPlaying,
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
        radioCategories: RADIO_CATEGORIES,
        tvCategories: TV_CATEGORIES
    }), [stations, currentStation, isPlaying, volume, favorites, isLoading, error, activeTab, selectedCategory, categories]);

    return (
        <RadioContext.Provider value={contextValue}>
            {children}
        </RadioContext.Provider>
    );
};
