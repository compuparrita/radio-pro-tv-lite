import React, { useState } from 'react';
import { Search, Star, Radio, Menu } from 'lucide-react';
import { useRadio } from '../context/RadioContext';
import { Station } from '../types';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { SidebarInfo } from './SidebarInfo';

const StationItem = React.memo<{
    station: Station;
    currentStationId?: string;
    favorites: string[];
    playStation: (s: Station) => void;
    toggleFavorite: (id: string) => void;
    isDraggable: boolean;
}>(({ station, currentStationId, favorites, playStation, toggleFavorite, isDraggable }) => {
    const isFavorite = favorites.includes(station.id);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: station.id, disabled: !isDraggable });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 2 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    const isSelected = currentStationId === station.id;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-2 px-2.5 py-2.5 border-b border-[var(--dark-border)] transition-all group
                ${isSelected
                    ? 'bg-[var(--primary-color)]/25 border-l-4 border-l-[var(--primary-color)] shadow-[inset_0_0_24px_rgba(0,0,0,0.2)] ring-1 ring-inset ring-[var(--primary-color)]/20'
                    : 'border-l-4 border-l-transparent hover:bg-white/5 hover:border-l-[var(--primary-color)]/40'
                }
                ${isDragging ? 'shadow-2xl opacity-60' : ''}`}
        >
            <div onClick={() => playStation(station)} className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer" style={{ touchAction: 'manipulation' }}>
                <img
                    src={station.logo || 'https://picsum.photos/seed/radio-streaming-pro/150/150.jpg'}
                    alt={station.name}
                    className={`w-11 h-11 rounded-full object-contain bg-white/5 flex-shrink-0 transition-all ${
                        isSelected
                            ? 'border-[2.5px] border-[var(--primary-color)] shadow-[0_0_10px_var(--primary-color)] ring-2 ring-[var(--primary-color)]/30 scale-105'
                            : 'border border-white/10'
                    }`}
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://picsum.photos/seed/radio-streaming-pro/150/150.jpg" }}
                />
                <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-[13px] truncate flex items-center gap-1.5 leading-tight ${isSelected ? 'text-[var(--primary-color)] font-bold' : ''}`}>
                        {station.name}
                        {station.iframeUrl && (
                            <span className="text-[8px] bg-[var(--primary-color)]/20 text-[var(--primary-color)] px-1 py-0.5 rounded uppercase font-black tracking-widest flex-shrink-0">If</span>
                        )}
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate leading-tight">{station.country}</p>
                </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(station.id);
                    }}
                    className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                    aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                >
                    <Star
                        size={16}
                        className={isFavorite ? "text-[var(--warning-color)] fill-[var(--warning-color)]" : "text-[var(--text-secondary)] opacity-50 group-hover:opacity-100"}
                    />
                </button>
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary-color)] shadow-[0_0_8px_var(--primary-color)] animate-pulse flex-shrink-0"></div>}

                {isDraggable && (
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-1 text-[var(--text-secondary)]/40 hover:text-[var(--text-secondary)] transition-colors"
                        style={{ touchAction: 'none' }}
                        title="Arrastrar para reordenar"
                    >
                        <Menu size={13} />
                    </div>
                )}
            </div>
        </div>
    );
});

export const StationList: React.FC = () => {
    const { stations, currentStation, playStation, favorites, toggleFavorite, activeTab, setActiveTab, reorderStations, selectedCategory, setSelectedCategory, radioCategories, tvCategories } = useRadio();
    const [filter, setFilter] = useState('');
    const [activeMobileMenu, setActiveMobileMenu] = useState<'all' | 'tv' | null>(null);
    const [ytResults, setYtResults] = useState<any[]>([]);
    const [isSearchingYt, setIsSearchingYt] = useState(false);
    const [showYtResults, setShowYtResults] = useState(false);

    const handleYtClick = (video: any) => {
        const vId = video.videoId || video.id;
        const thumb = typeof video.thumbnail === 'string' ? video.thumbnail : (video.thumbnail?.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${vId}/mqdefault.jpg`);
        const videoUrl = video.url || `https://www.youtube.com/watch?v=${vId}`;

        const tempStation: Station = {
            id: `yt-${vId || Date.now()}`,
            name: typeof video.title === 'string' ? video.title : 'YouTube Video',
            url: videoUrl,
            iframeUrl: `https://www.youtube.com/embed/${vId}`,
            logo: thumb,
            country: 'YouTube',
            type: 'video',
            category: 'Otros'
        };
        playStation(tempStation);
    };

    const fetchWithRetry = async (url: string, proxyType: 'none' | 'allorigins' | 'codetabs' = 'none') => {
        let finalUrl = url;
        const q = encodeURIComponent(url);
        if (proxyType === 'allorigins') finalUrl = `https://api.allorigins.win/get?url=${q}`;
        if (proxyType === 'codetabs') finalUrl = `https://api.codetabs.com/v1/proxy?quest=${q}`;
        
        try {
            const response = await fetch(finalUrl, { signal: AbortSignal.timeout(7000) });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            let data = await response.json();
            if (data && data.contents) {
                try { data = JSON.parse(data.contents); } 
                catch { throw new Error('Proxy parse error'); }
            }

            if (data && (data.error || data.Error)) throw new Error('Proxy internal error');

            const items = data.items || (Array.isArray(data) ? data : null);
            if (!items || items.length === 0) throw new Error('No items');

            return items.map((vid: any) => {
                const vId = vid.videoId || (vid.url ? vid.url.split('v=')[1]?.split('&')[0] : null);
                return {
                    title: vid.title,
                    videoId: vId,
                    url: vid.url || (vId ? `https://www.youtube.com/watch?v=${vId}` : ''),
                    thumbnail: vid.thumbnail || (vid.videoThumbnails ? vid.videoThumbnails[0]?.url : null) || (vId ? `https://img.youtube.com/vi/${vId}/mqdefault.jpg` : ''),
                    uploaderName: vid.uploaderName || vid.author || 'YouTube',
                    shortBylineText: vid.shortBylineText || vid.publishedText || ''
                };
            }).filter((v: any) => v.videoId && v.title);
        } catch (e) {
            throw e;
        }
    };

    const searchYouTube = async (query: string) => {
        if (!query.trim()) return;
        setIsSearchingYt(true);
        setShowYtResults(true);

        const q = encodeURIComponent(query);

        try {
            // Fase 1: Try local backend (highly reliable, no CORS issues)
            const baseUrl = import.meta.env.PROD ? '' : (import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:3001`);
            const beRes = await fetch(`${baseUrl}/api/yt-search?q=${q}`, { signal: AbortSignal.timeout(10000) });
            if (beRes.ok) {
                const data = await beRes.json();
                if (data && data.length > 0) {
                    setYtResults(data);
                    setIsSearchingYt(false);
                    return;
                }
            }
        } catch (e) {
            console.warn('Backend search failed, falling back to Invidious...', e);
        }
        const primarySources = [
            `https://invidious.privacydev.net/api/v1/search?q=${q}`,
            `https://invidious.drgns.space/api/v1/search?q=${q}`,
            `https://iv.melmac.space/api/v1/search?q=${q}`,
            `https://invidious.incogniweb.net/api/v1/search?q=${q}`
        ];

        const secondarySources = [
            `https://yt.artemislena.eu/api/v1/search?q=${q}`,
            `https://iv.ggtyler.dev/api/v1/search?q=${q}`,
            `https://yewtu.be/api/v1/search?q=${q}`,
            `https://pipedapi.kavin.rocks/search?q=${q}&filter=videos`
        ].sort(() => 0.5 - Math.random());

        try {
            // Fase 1: Directo (CORS)
            for (const source of primarySources) {
                try {
                    const res = await fetchWithRetry(source, 'none');
                    if (res?.length) {
                        setYtResults(res);
                        setIsSearchingYt(false);
                        return;
                    }
                } catch { continue; }
            }

            // Fase 2: Proxies (Staggered)
            const backupSources = [...primarySources, ...secondarySources].slice(0, 4);
            for (const source of backupSources) {
                try {
                    const res = await Promise.any([
                        fetchWithRetry(source, 'codetabs'),
                        fetchWithRetry(source, 'allorigins')
                    ]);
                    if (res?.length) {
                        setYtResults(res);
                        setIsSearchingYt(false);
                        return;
                    }
                } catch { continue; }
            }
            throw new Error('All trials failed');
        } catch (error) {
            console.warn('YouTube search unavailable');
            setYtResults([]);
        } finally {
            setIsSearchingYt(false);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const filteredStations = stations.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(filter.toLowerCase()) ||
            s.country.toLowerCase().includes(filter.toLowerCase());
        const matchesCategory = selectedCategory === 'Todas' || s.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const displayStations = activeTab === 'all'
        ? filteredStations.filter(s => s.type === 'audio')
        : activeTab === 'favorites'
            ? filteredStations.filter(s => favorites.includes(s.id))
            : filteredStations.filter(s => s.type === 'video');

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldDisplayIndex = displayStations.findIndex(s => s.id === active.id);
            const newDisplayIndex = displayStations.findIndex(s => s.id === over.id);

            if (oldDisplayIndex !== -1 && newDisplayIndex !== -1) {
                const reorderedDisplay = arrayMove(displayStations, oldDisplayIndex, newDisplayIndex);
                
                // If viewing a tab ('all' = audio, 'tv' = video), reorder only that category within global stations
                if (activeTab === 'all' || activeTab === 'tv') {
                    const targetType = activeTab === 'all' ? 'audio' : 'video';
                    let displayIdx = 0;
                    const newGlobalStations = stations.map(s => {
                        if (s.type === targetType) {
                            const nextItem = reorderedDisplay[displayIdx++];
                            return nextItem || s;
                        }
                        return s;
                    });
                    reorderStations(newGlobalStations);
                } else {
                    const oldIndex = stations.findIndex((s) => s.id === active.id);
                    const newIndex = stations.findIndex((s) => s.id === over.id);
                    if (oldIndex !== -1 && newIndex !== -1) {
                        reorderStations(arrayMove(stations, oldIndex, newIndex));
                    }
                }
            }
        }
    };

    // Reordering is allowed in 'all' or 'tv' tabs and when no filter/category is applied
    const isReorderAllowed = (activeTab === 'all' || activeTab === 'tv') && filter === '' && selectedCategory === 'Todas';

    return (
        <div className="glass flex flex-col rounded-none p-1">
            <SidebarInfo />
            <div className="border-t border-white/10 pt-4">

                {/* Search */}
                <div className="relative mb-2">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input
                        type="text"
                        placeholder="Emisoras o en YouTube..."
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value);
                            if (!e.target.value) {
                                setShowYtResults(false);
                                setYtResults([]);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && filter.trim()) {
                                searchYouTube(filter);
                            }
                        }}
                        className="w-full bg-[var(--dark-surface)] border border-[var(--dark-border)] rounded-none py-3 pl-10 pr-24 focus:outline-none focus:border-[var(--primary-color)] transition-colors text-sm"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1.5">
                        <button
                            onClick={() => searchYouTube(filter)}
                            className="p-1 px-2.5 bg-red-600 hover:bg-red-700 text-white text-[12px] transition-colors flex items-center justify-center gap-1 active:scale-95 shadow-lg"
                            title="Buscar en YouTube (Interno)"
                        >
                            YT
                        </button>
                        <button
                            onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(filter)}`, '_blank')}
                            className="p-1 px-3.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] transition-colors active:scale-95 shadow-lg flex items-center justify-center"
                            title="Buscar en Google"
                        >
                            G
                        </button>
                    </div>
                </div>

                {/* YouTube Results Overlay */}
                {showYtResults && (
                    <div className="mb-4 bg-black/40 border border-white/10 rounded-none overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex justify-between items-center bg-white/5 px-3 py-1.5 border-b border-white/10">
                            <span className="text-[10px] font-bold tracking-wider flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                                <span className="text-blue-500">Resultados de</span>
                                <span className="text-red-600">YouTube</span>
                            </span>
                            <button
                                onClick={() => {
                                    setShowYtResults(false);
                                    setYtResults([]);
                                    setFilter(''); // Clear input as requested
                                }}
                                className="text-[10px] opacity-60 hover:opacity-100 uppercase font-bold"
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className="max-h-[300px] lg:max-h-[450px] overflow-y-auto scrollbar-thin mobile-panel-content" style={{ maxHeight: 'var(--mobile-panel-max-height, 300px)' }}>
                            {isSearchingYt ? (
                                <div className="p-4 text-center text-xs opacity-60 animate-pulse">Buscando...</div>
                            ) : ytResults.length > 0 ? (
                                ytResults.map((video, idx) => {
                                    const vId = video.videoId || video.id;
                                    const isActiveYt = currentStation?.id === `yt-${vId}`;
                                    const thumb = typeof video.thumbnail === 'string'
                                        ? video.thumbnail
                                        : (video.thumbnail?.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${vId}/mqdefault.jpg`);
                                    const uploader = typeof video.uploaderName === 'string'
                                        ? video.uploaderName
                                        : (video.channelTitle || video.shortBylineText?.runs?.[0]?.text || 'YouTube');
                                    const byline = typeof video.shortBylineText === 'string'
                                        ? video.shortBylineText
                                        : (video.length?.simpleText || '');

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => handleYtClick(video)}
                                            className={`flex items-center gap-3 p-2 cursor-pointer border-b border-white/5 last:border-0 transition-all ${isActiveYt
                                                ? 'bg-[var(--primary-color)]/20 border-l-2 border-l-[var(--primary-color)] shadow-[inset_0_0_20px_rgba(var(--primary-rgb),0.1)]'
                                                : 'hover:bg-white/10'
                                                }`}
                                        >
                                            <div className="relative">
                                                <img src={thumb} className="w-20 aspect-video object-cover rounded shadow-lg" alt="" />
                                                {isActiveYt && (
                                                    <div className="absolute inset-0 bg-[var(--primary-color)]/20 flex items-center justify-center rounded">
                                                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className={`text-xs font-bold truncate leading-snug ${isActiveYt ? 'text-[var(--primary-color)]' : 'text-white/95'}`}>
                                                     {typeof video.title === 'string' ? video.title : 'Video de YouTube'}
                                                </h4>
                                                <p className="text-[10px] text-white/50 mt-1 truncate font-medium">
                                                    {uploader}{byline ? ` • ${byline}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-4 text-center text-xs opacity-60">No se encontraron resultados</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tabs - Mobile Only */}
                <div className="lg:hidden mb-4">
                    <div className="flex gap-1">
                        {/* Radios Tab with Menu */}
                        <div className="relative flex-1">
                            <div className="flex shadow-lg">
                                <button
                                    onClick={() => {
                                        setActiveTab('all');
                                        setSelectedCategory('Todas');
                                        setActiveMobileMenu(null);
                                    }}
                                    className={`flex-1 py-2.5 px-2 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 border-r border-white/5 ${activeTab === 'all' && selectedCategory === 'Todas' ? 'bg-[var(--primary-color)] text-white' : 'bg-white/5 text-[var(--text-secondary)]'}`}
                                >
                                    <Radio size={14} />
                                    <span className="truncate">{activeTab === 'all' && selectedCategory !== 'Todas' ? selectedCategory : 'Radios'}</span>
                                </button>
                                <button
                                    onClick={() => setActiveMobileMenu(activeMobileMenu === 'all' ? null : 'all')}
                                    className={`px-3 bg-white/5 border-l border-white/10 flex items-center justify-center transition-colors ${activeMobileMenu === 'all' ? 'text-[var(--primary-color)]' : 'text-white/40'}`}
                                >
                                    <Menu size={14} />
                                </button>
                            </div>

                            {activeMobileMenu === 'all' && (
                                <div className="absolute top-full left-0 w-full mt-1 bg-[var(--dark-surface)] border border-white/10 shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                                    {radioCategories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => {
                                                setActiveTab('all');
                                                setSelectedCategory(cat);
                                                setActiveMobileMenu(null);
                                            }}
                                            className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b border-white/5 last:border-0 ${selectedCategory === cat && activeTab === 'all' ? 'text-[var(--primary-color)] bg-white/5' : 'text-[var(--text-secondary)]'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                setActiveTab('favorites');
                                setSelectedCategory('Todas');
                                setActiveMobileMenu(null);
                            }}
                            className={`flex-1 py-2.5 px-2 rounded-none text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-lg ${activeTab === 'favorites' ? 'bg-[var(--primary-color)] text-white' : 'bg-white/5 text-[var(--text-secondary)]'}`}
                        >
                            <Star size={14} className={activeTab === 'favorites' ? 'fill-[#f59e0b] text-[#f59e0b]' : 'text-[#f59e0b]'} />
                            Favs
                        </button>

                        {/* TV Tab with Menu */}
                        <div className="relative flex-1">
                            <div className="flex shadow-lg">
                                <button
                                    onClick={() => {
                                        setActiveTab('tv');
                                        setSelectedCategory('Todas');
                                        setActiveMobileMenu(null);
                                    }}
                                    className={`flex-1 py-2.5 px-2 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 border-r border-white/5 ${activeTab === 'tv' && selectedCategory === 'Todas' ? 'bg-[var(--primary-color)] text-white' : 'bg-white/5 text-[var(--text-secondary)]'}`}
                                >
                                    <span className="truncate">{activeTab === 'tv' && selectedCategory !== 'Todas' ? selectedCategory : 'TV'}</span>
                                </button>
                                <button
                                    onClick={() => setActiveMobileMenu(activeMobileMenu === 'tv' ? null : 'tv')}
                                    className={`px-3 bg-white/5 border-l border-white/10 flex items-center justify-center transition-colors ${activeMobileMenu === 'tv' ? 'text-[var(--primary-color)]' : 'text-white/40'}`}
                                >
                                    <Menu size={14} />
                                </button>
                            </div>

                            {activeMobileMenu === 'tv' && (
                                <div className="absolute top-full left-0 w-full mt-1 bg-[var(--dark-surface)] border border-white/10 shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                                    {tvCategories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => {
                                                setActiveTab('tv');
                                                setSelectedCategory(cat);
                                                setActiveMobileMenu(null);
                                            }}
                                            className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b border-white/5 last:border-0 ${selectedCategory === cat && activeTab === 'tv' ? 'text-[var(--primary-color)] bg-white/5' : 'text-[var(--text-secondary)]'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div >

            <div className="flex-1 p-0 overflow-y-auto station-scroll">
                <div className="station-list-body">
                {displayStations.length > 0 ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={displayStations.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {displayStations.map(station => (
                                <StationItem
                                    key={station.id}
                                    station={station}
                                    currentStationId={currentStation?.id}
                                    favorites={favorites}
                                    playStation={playStation}
                                    toggleFavorite={toggleFavorite}
                                    isDraggable={isReorderAllowed}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                ) : null}
                {displayStations.length === 0 && (
                    <div className="p-8 text-center text-[var(--text-secondary)] bg-white/5 border border-dashed border-white/10">
                        <p className="text-sm font-medium">Sin resultados locales...</p>
                        <p className="text-[10px] mt-1 opacity-60 italic">Prueba usando el botón YT para buscar en YouTube</p>

                        <div className="mt-4 pt-4 border-t border-white/5 flex flex-col items-center gap-2">
                            <p className="text-[10px] leading-relaxed text-red-400/80">
                                <span className="font-bold flex items-center justify-center gap-1 mb-1">
                                    <span className="text-xs">⚠️</span> Video no disponible
                                </span>
                                Algunos videos tienen restricciones de derechos de autor (como LatinAutor - UMPG) que bloquean su reproducción en apps externas como esta.
                                <br />
                                <span className="opacity-80 italic italic">Nuestra app no los puede mostrar aquí, pero siempre puedes verlos en YouTube.</span>
                            </p>
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div >
    );
};
