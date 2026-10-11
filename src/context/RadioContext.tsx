import React, { createContext, useContext, useState, useEffect } from 'react';
import { Station, RadioContextType } from '../types';
import {
    fetchStationsFromCloud,
    saveStationToCloud,
    deleteStationFromCloud,
    updateStationsOrderInCloud,
    subscribeToStationsChanges,
    mapStationFromCloudRow,
    getCurrentUserId,
    fetchUserFavoritesFromCloud,
    saveFavoriteToCloud,
    removeFavoriteFromCloud,
    subscribeToUserFavorites
} from '../services/supabase';
import type { StationRealtimeChange, StationRealtimeStatus } from '../services/supabase';

const RadioContext = createContext<RadioContextType | undefined>(undefined);

let canChangeMedia = true;

function getStationChangeCaller(event?: unknown): string {
    const currentTarget = (event as { currentTarget?: HTMLElement } | undefined)?.currentTarget;
    const buttonTitle = currentTarget?.getAttribute('title') ?? '';
    if (buttonTitle === 'Siguiente' || buttonTitle === 'Anterior') return 'MobileNav';
    if (buttonTitle.includes('Flecha')) return 'Player';

    const stack = new Error().stack ?? '';
    if (stack.includes('StationList')) return 'StationList';
    if (stack.includes('MobileNav')) return 'MobileNav';
    if (stack.includes('Player')) return 'Player';
    if (stack.includes('useTVRemote')) return 'useTVRemote';
    if (stack.includes('nextStation')) return 'nextStation';
    if (stack.includes('prevStation')) return 'prevStation';
    return 'unknown';
}

export const setRadioMediaChangeAllowed = (allowed: boolean) => {
    canChangeMedia = allowed;
};

export const useRadio = () => {
    const context = useContext(RadioContext);
    if (!context) {
        throw new Error('useRadio must be used within a RadioProvider');
    }
    return context;
};

export const RADIO_CATEGORIES = ['Noticias', 'Música', 'Deportes', 'Religión', 'Cultura', 'Relax', 'Otros'];
export const TV_CATEGORIES = ['Noticias', 'Música tv', 'Cine & Series', 'Documentales', 'Infantil', 'Deportes', 'Relax', 'Otros'];

const STATIONS_CACHE_KEY = 'radioStations';
const STATIONS_CACHED_AT_KEY = 'radioStations_cachedAt';
const STATIONS_REALTIME_DEBOUNCE_MS = 1500; // Coalescing de 1.5s para eventos Realtime consecutivos
let stationsReadInFlight: Promise<Station[]> | null = null;

const fetchStationsSnapshot = () => {
    if (!stationsReadInFlight) {
        stationsReadInFlight = fetchStationsFromCloud().finally(() => {
            stationsReadInFlight = null;
        });
    }
    return stationsReadInFlight;
};

const readStationsCache = (): Station[] | null => {
    if (typeof window === 'undefined') return null;
    try {
        const saved = localStorage.getItem(STATIONS_CACHE_KEY);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

const hasRowField = (row: Record<string, unknown>, field: string) =>
    Object.prototype.hasOwnProperty.call(row, field);

const hasCompleteStationRow = (row: Record<string, unknown>) =>
    ['id', 'name', 'url', 'logo', 'country', 'type', 'iframe_url', 'use_proxy', 'category', 'embed_canal', 'position']
        .every((field) => hasRowField(row, field));

const sameStation = (a: Station, b: Station) =>
    a.id === b.id
    && a.name === b.name
    && a.url === b.url
    && a.logo === b.logo
    && a.country === b.country
    && a.type === b.type
    && (a.iframeUrl ?? '') === (b.iframeUrl ?? '')
    && Boolean(a.useProxy) === Boolean(b.useProxy)
    && (a.category ?? 'Otros') === (b.category ?? 'Otros')
    && (a.embedCanal ?? '') === (b.embedCanal ?? '')
    && a.watchPartyCapabilities === b.watchPartyCapabilities;

const sameStationList = (a: Station[], b: Station[]) =>
    a.length === b.length && a.every((station, index) => sameStation(station, b[index]));

// Returns null when the event is incomplete enough that applying it could corrupt the catalog.
const applyStationRealtimeChange = (stations: Station[], change: StationRealtimeChange): Station[] | null => {
    if (change.eventType === 'DELETE') {
        const id = change.old?.id;
        if (typeof id !== 'string' || !id) return null;
        const next = stations.filter((station) => station.id !== id);
        return next.length === stations.length ? stations : next;
    }

    if (change.eventType !== 'INSERT' && change.eventType !== 'UPDATE') return null;

    const row = change.new;
    if (!row || typeof row.id !== 'string' || !row.id) return null;
    if (hasRowField(row, 'type') && row.type !== 'audio' && row.type !== 'video') return null;
    const existingIndex = stations.findIndex((station) => station.id === row.id);
    const existing = existingIndex >= 0 ? stations[existingIndex] : undefined;
    const rowFields = ['name', 'url', 'logo', 'country', 'type', 'iframe_url', 'use_proxy', 'category', 'embed_canal'];

    if (change.eventType === 'INSERT' && !hasCompleteStationRow(row)) return null;
    if (!existing && !hasCompleteStationRow(row)) return null;
    if (existing && (!hasRowField(row, 'position') || !rowFields.some((field) => hasRowField(row, field)))) {
        return null;
    }

    const station = mapStationFromCloudRow(row, existing);
    if (!station.id) return null;
    const next = stations.slice();

    if (existingIndex >= 0) {
        next[existingIndex] = station;
    } else {
        next.push(station);
    }

    if (hasRowField(row, 'position')) {
        const position = row.position;
        if (typeof position !== 'number' || !Number.isInteger(position) || position < 0) return null;
        const currentIndex = next.findIndex((item) => item.id === station.id);
        const [positionedStation] = next.splice(currentIndex, 1);
        next.splice(Math.min(position, next.length), 0, positionedStation);
    }

    return sameStationList(stations, next) ? stations : next;
};

export const RadioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [stations, setStations] = useState<Station[]>(() => {
        return readStationsCache() ?? [];
    });
    const stationsRef = React.useRef(stations);
    const stationsMutationVersionRef = React.useRef(0);
    const successfulRemoteSyncVersionRef = React.useRef(0);
    const pendingStationWritesRef = React.useRef<Promise<void>>(Promise.resolve());
    const [isInitialLoad, setIsInitialLoad] = useState(() => {
        return readStationsCache() === null;
    });

    const commitStations = (next: Station[], options: { syncedAt?: number; mutation?: boolean; persist?: boolean } = {}) => {
        const current = stationsRef.current;
        const changed = !sameStationList(current, next);

        if (changed) {
            stationsRef.current = next;
            if (options.mutation) stationsMutationVersionRef.current += 1;
            setStations(next);
        }

        if (options.persist === false) return;
        if (!changed && options.syncedAt === undefined) return;

        try {
            localStorage.setItem(STATIONS_CACHE_KEY, JSON.stringify(changed ? next : current));
            if (options.syncedAt !== undefined) {
                localStorage.setItem(STATIONS_CACHED_AT_KEY, options.syncedAt.toString());
            }
        } catch (error) {
            console.warn('[RadioContext] No se pudo actualizar la caché local de emisoras:', error);
        }
    };

    const trackStationWrite = (write: Promise<boolean>) => {
        const settledWrite = write.then(() => undefined, () => undefined);
        pendingStationWritesRef.current = Promise.all([pendingStationWritesRef.current, settledWrite])
            .then(() => undefined);
    };

    // Bootstrap stations: Estrategia Cache-First (Caché local inmediato + Sync condicional + Coalescing Realtime)
    useEffect(() => {
        let isMounted = true;
        let realtimeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
        let remoteSyncInFlight: Promise<'synced' | 'failed' | 'superseded'> | null = null;
        let followupSyncRequested = false;
        let hasConfirmedSubscription = false;
        let interruptedBeforeSubscribe = false;
        let subscriptionInterrupted = false;

        const requestFullReconciliation = (): Promise<'synced' | 'failed' | 'superseded'> => {
            if (realtimeDebounceTimer) {
                clearTimeout(realtimeDebounceTimer);
                realtimeDebounceTimer = null;
            }
            if (remoteSyncInFlight) {
                followupSyncRequested = true;
                return remoteSyncInFlight;
            }

            const readAndCommitSnapshot = async (): Promise<'synced' | 'failed' | 'superseded'> => {
                const mutationVersionAtStart = stationsMutationVersionRef.current;
                try {
                    const cloudStations = await fetchStationsSnapshot();
                    if (!isMounted) return 'failed';
                    if (mutationVersionAtStart !== stationsMutationVersionRef.current) {
                        followupSyncRequested = true;
                        return 'superseded';
                    }

                    const currentStations = stationsRef.current;
                    const reconciledStations = cloudStations.map((cloudStation) => {
                        const current = currentStations.find((station) => station.id === cloudStation.id);
                        return current ? { ...current, ...cloudStation } : cloudStation;
                    });
                    commitStations(reconciledStations, { syncedAt: Date.now() });
                    successfulRemoteSyncVersionRef.current += 1;
                    return 'synced';
                } catch (error) {
                    console.warn('[RadioContext] No se pudo reconciliar el catálogo con Supabase; se conserva la caché local:', error);
                    return 'failed';
                }
            };

            const waitForStationWrites = async () => {
                while (true) {
                    const pendingWrites = pendingStationWritesRef.current;
                    await pendingWrites;
                    if (pendingWrites === pendingStationWritesRef.current) return;
                }
            };

            let request: Promise<'synced' | 'failed' | 'superseded'>;
            request = (async () => {
                let result = await readAndCommitSnapshot();
                while (followupSyncRequested && isMounted) {
                    followupSyncRequested = false;
                    await waitForStationWrites();
                    // A read started after all pending writes covers any requests received while waiting.
                    followupSyncRequested = false;
                    result = await readAndCommitSnapshot();
                }
                return result;
            })().finally(() => {
                if (remoteSyncInFlight === request) remoteSyncInFlight = null;
            });

            remoteSyncInFlight = request;
            return request;
        };

        const scheduleFullReconciliation = () => {
            if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
            realtimeDebounceTimer = setTimeout(() => {
                realtimeDebounceTimer = null;
                void requestFullReconciliation();
            }, STATIONS_REALTIME_DEBOUNCE_MS);
        };

        const handleRealtimeChange = (change: StationRealtimeChange) => {
            if (!isMounted) return;
            stationsMutationVersionRef.current += 1;
            const updatedStations = applyStationRealtimeChange(stationsRef.current, change);

            if (updatedStations === null) {
                if (remoteSyncInFlight) followupSyncRequested = true;
                else scheduleFullReconciliation();
                return;
            }

            commitStations(updatedStations);
        };

        const handleRealtimeStatus = (status: StationRealtimeStatus, error?: Error) => {
            if (!isMounted) return;

            if (status === 'SUBSCRIBED') {
                const recovered = hasConfirmedSubscription
                    ? subscriptionInterrupted
                    : interruptedBeforeSubscribe;
                hasConfirmedSubscription = true;
                subscriptionInterrupted = false;
                interruptedBeforeSubscribe = false;
                if (recovered) void requestFullReconciliation();
                return;
            }

            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                if (hasConfirmedSubscription) subscriptionInterrupted = true;
                else interruptedBeforeSubscribe = true;
                if (error) console.warn(`[RadioContext Realtime] Canal ${status}:`, error);
            }
        };

        const fetchDefaultStations = async () => {
            const mutationVersionAtStart = stationsMutationVersionRef.current;
            const remoteSyncVersionAtStart = successfulRemoteSyncVersionRef.current;
            try {
                const response = await fetch('/stations.json', {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                if (!response.ok) throw new Error('Failed to fetch stations.json');
                const data = await response.json();
                if (!Array.isArray(data)) throw new Error('Invalid stations.json catalog');
                if (isMounted
                    && mutationVersionAtStart === stationsMutationVersionRef.current
                    && remoteSyncVersionAtStart === successfulRemoteSyncVersionRef.current
                    && successfulRemoteSyncVersionRef.current === 0
                    && !remoteSyncInFlight) {
                    commitStations(data, { persist: false });
                }
            } catch (error) {
                console.error('Error fetching fallback stations:', error);
                // Keep the existing state and cache intact if even the static fallback fails.
            }
        };

        const initStations = async () => {
            const cachedStations = readStationsCache();

            if (cachedStations !== null) {
                commitStations(cachedStations);
                setIsInitialLoad(false);
            }

            const syncResult = await requestFullReconciliation();
            if (syncResult === 'failed' && cachedStations === null && isMounted) {
                await fetchDefaultStations();
            }

            if (isMounted) setIsInitialLoad(false);
        };

        const unsubscribe = subscribeToStationsChanges(handleRealtimeChange, handleRealtimeStatus);
        void initStations();

        return () => {
            isMounted = false;
            if (realtimeDebounceTimer) {
                clearTimeout(realtimeDebounceTimer);
            }
            unsubscribe();
        };
    }, []);


    const [currentStation, setCurrentStation] = useState<Station | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const playStation = (station: Station, startPlayback = true, caller?: string) => {
        const callerName = caller ?? getStationChangeCaller();
        console.log(
            `[playStation] station=${station?.name ?? station?.id ?? 'unknown'} canChangeMedia=${canChangeMedia} role=${canChangeMedia ? 'host-or-outside' : 'guest'} caller=${callerName}`
        );
        if (!canChangeMedia) return;
        if (!station) return;
        setCurrentStation(station);
        if (startPlayback) setIsPlaying(true);
        if (!station.id.startsWith('yt-')) {
            localStorage.setItem('lastStationId', station.id);
        }
    };

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
                console.info('[Bootstrap] restoreStation', {
                    stationId: savedStation.id,
                    stationName: savedStation.name,
                });
                playStation(savedStation, false);
                return;
            }
        }

        // 2. Si no ha seleccionado nada o tras un reset/borrado, sintonizar la predeterminada
        playStation(defaultStation, false);
    }, [stations, isInitialLoad]);

    // Robustness: Handle station deletion if they were current
    useEffect(() => {
        if (!isInitialLoad && stations.length > 0 && currentStation) {
            // Ignore temporary YouTube stations from chat/search
            if (currentStation.id.startsWith('yt-')) return;

            const stillExists = stations.find(s => s.id === currentStation.id);
            if (!stillExists) {
                const fallback = stations.find(s => s.name === 'DJX Discomovil Radio live') || stations[0];
                playStation(fallback, false);
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
        const updated = [...stationsRef.current, station];
        commitStations(updated, { mutation: true });
        trackStationWrite(saveStationToCloud(station, updated.length - 1));
    };

    const removeStation = (stationId: string) => {
        const updated = stationsRef.current.filter((station) => station.id !== stationId);
        commitStations(updated, { mutation: true });
        trackStationWrite(deleteStationFromCloud(stationId));
    };

    const updateStation = (updatedStation: Station) => {
        const current = stationsRef.current;
        const updated = current.map((station) => station.id === updatedStation.id ? updatedStation : station);
        const index = updated.findIndex((station) => station.id === updatedStation.id);
        commitStations(updated, { mutation: true });
        trackStationWrite(saveStationToCloud(updatedStation, index >= 0 ? index : 0));
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

    const nextStation = (event?: unknown) => {
        const caller = getStationChangeCaller(event);
        const navStations = getNavigableStations();
        if (navStations.length === 0) return;

        if (!currentStation) {
            playStation(navStations[0], true, caller);
            return;
        }

        const index = navStations.findIndex(s => s.id === currentStation.id);
        if (index === -1) {
            playStation(navStations[0], true, caller);
        } else {
            const nextIndex = (index + 1) % navStations.length;
            playStation(navStations[nextIndex], true, caller);
        }
    };

    const prevStation = (event?: unknown) => {
        const caller = getStationChangeCaller(event);
        const navStations = getNavigableStations();
        if (navStations.length === 0) return;

        if (!currentStation) {
            playStation(navStations[navStations.length - 1], true, caller);
            return;
        }

        const index = navStations.findIndex(s => s.id === currentStation.id);
        if (index === -1) {
            playStation(navStations[navStations.length - 1], true, caller);
        } else {
            const prevIndex = (index - 1 + navStations.length) % navStations.length;
            playStation(navStations[prevIndex], true, caller);
        }
    };

    const importStations = (importedStations: Station[]) => {
        const previous = stationsRef.current;
        const newStations = [...previous];
        importedStations.forEach((station) => {
            if (station.name && (station.url || station.iframeUrl || station.embedCanal)) {
                newStations.push({
                    ...station,
                    id: station.id && !previous.some((existing) => existing.id === station.id)
                        ? station.id
                        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    type: station.type || 'audio'
                });
            }
        });
        commitStations(newStations, { mutation: true });
    };

    const reorderStations = (reorderedStations: Station[]) => {
        commitStations(reorderedStations, { mutation: true });
        trackStationWrite(updateStationsOrderInCloud(reorderedStations));
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
