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

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 p-2.5 rounded-none transition-all border border-transparent hover:bg-white/10 ${currentStationId === station.id ? 'bg-white/10 border-[var(--primary-color)]' : ''} ${isDragging ? 'shadow-2xl' : ''}`}
        >
            <div onClick={() => playStation(station)} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" style={{ touchAction: 'manipulation' }}>
                <img
                    src={station.logo || 'https://picsum.photos/seed/radio-streaming-pro/150/150.jpg'}
                    alt={station.name}
                    className="w-12 h-12 rounded-full object-contain border-2 border-[var(--primary-color)] p-0.5 bg-white/5 shadow-lg"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://picsum.photos/seed/radio-streaming-pro/150/150.jpg" }}
                />
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate flex items-center gap-2">
                        {station.name}
                        {station.iframeUrl && (
                            <span className="text-[8px] bg-[var(--primary-color)]/20 text-[var(--primary-color)] px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Iframe</span>
                        )}
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate font-medium">{station.country}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(station.id);
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                >
                    <Star
                        size={18}
                        className={isFavorite ? "text-[var(--warning-color)] fill-[var(--warning-color)]" : "text-[var(--text-secondary)]"}
                    />
                </button>
                {currentStationId === station.id && <div className="w-2.5 h-2.5 rounded-full bg-[#009dff] shadow-[0_0_8px_#009dff] animate-pulse"></div>}

                {isDraggable && (
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-1 text-[var(--text-secondary)] hover:text-white transition-colors border-l border-white/5"
                        style={{ touchAction: 'none' }}
                        title="Arrastrar para reordenar"
                    >
                        <Menu size={16} />
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

    const searchYouTube = async (query: string) => {
        if (!query.trim()) return;
        setIsSearchingYt(true);
        setShowYtResults(true);

        // Codificamos la query una sola vez para las fuentes base
        const q = encodeURIComponent(query);
        const sources = [
            `https://pipedapi.kavin.rocks/search?q=${q}&filter=videos`,
            `https://invidious.projectsegfau.lt/api/v1/search?q=${q}`,
            `https://invidious.flokinet.to/api/v1/search?q=${q}`,
            `https://inv.vern.cc/api/v1/search?q=${q}`,
            `https://pipedapi.lunar.icu/search?q=${q}&filter=videos`
        ];

        const proxies = [
            (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
            (u: string) => `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(u)}`
        ];

        const fetchFromSource = async (source: string, proxyFn?: (u: string) => string) => {
            try {
                const url = proxyFn ? proxyFn(source) : source;
                const res = await fetch(url, {
                    signal: AbortSignal.timeout(10000),
                    credentials: 'omit', // Evita enviar cookies innecesarias que pueden causar 400
                    headers: {
                        'ngrok-skip-browser-warning': 'true'
                    }
                }).catch(() => null);

                if (!res || !res.ok) throw new Error(`HTTP ${res?.status || 'fail'}`);

                const data = await res.json();
                const items = data.items || (Array.isArray(data) ? data : null);

                if (items && items.length > 0) {
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
                }
                throw new Error('Empty results');
            } catch (e) {
                throw e; // Relanzar para Promise.any
            }
        };

        try {
            const promises: Promise<any[]>[] = [];
            for (const source of sources) {
                // Carrera: directo + proxies
                promises.push(fetchFromSource(source));
                for (const proxy of proxies) {
                    promises.push(fetchFromSource(source, proxy));
                }
            }

            const results = await Promise.any(promises);
            setYtResults(results);
        } catch (error) {
            console.warn('YouTube search sweep finished - check if results found');
            if (ytResults.length === 0) setYtResults([]);
        } finally {
            setIsSearchingYt(false);
        }
    };

    const handleYtClick = (video: any) => {
        const tempStation: Station = {
            id: `yt-${video.videoId || Date.now()}`,
            name: video.title,
            url: video.url,
            iframeUrl: `https://www.youtube.com/embed/${video.videoId}`,
            logo: video.thumbnail,
            country: 'YouTube',
            type: 'video',
            category: 'Otros'
        };
        playStation(tempStation);
        // User wants the list to stay open: Removed setShowYtResults(false);
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
            const oldIndex = stations.findIndex((s) => s.id === active.id);
            const newIndex = stations.findIndex((s) => s.id === over.id);

            const newStations = arrayMove(stations, oldIndex, newIndex);
            reorderStations(newStations);
        }
    };

    // Reordering is only allowed in 'all' or 'tv' tabs and when no filter/category is applied
    const isReorderAllowed = (activeTab === 'all' || activeTab === 'tv') && filter === '' && selectedCategory === 'Todas';

    return (
        <div className="glass flex flex-col rounded-none p-3">
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
                        <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
                            {isSearchingYt ? (
                                <div className="p-4 text-center text-xs opacity-60 animate-pulse">Buscando...</div>
                            ) : ytResults.length > 0 ? (
                                ytResults.map((video, idx) => {
                                    const isActiveYt = currentStation?.id === `yt-${video.videoId}`;
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
                                                <img src={video.thumbnail} className="w-20 aspect-video object-cover rounded shadow-lg" alt="" />
                                                {isActiveYt && (
                                                    <div className="absolute inset-0 bg-[var(--primary-color)]/20 flex items-center justify-center rounded">
                                                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className={`text-xs font-bold truncate leading-snug ${isActiveYt ? 'text-[var(--primary-color)]' : 'text-white/95'}`}>
                                                    {video.title}
                                                </h4>
                                                <p className="text-[10px] text-white/50 mt-1 truncate font-medium">{video.uploaderName} • {video.shortBylineText}</p>
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

            <div className="flex-1 p-2 space-y-2">
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
                                Algunos videos tienen restricciones de derechos de autor (como LatinAutor - UMPG) que bloquean su reproducción en apps externas.
                                <br />
                                <span className="opacity-80 italic italic">Nuestra app no los puede mostrar aquí, pero siempre puedes verlos en YouTube.</span>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};
