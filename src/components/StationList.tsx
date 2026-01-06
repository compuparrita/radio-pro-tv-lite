import React, { useState } from 'react';
import { Search, Star, History, Radio } from 'lucide-react';
import { useRadio } from '../context/RadioContext';
import { Station } from '../types';

import { SidebarInfo } from './SidebarInfo';

export const StationList: React.FC = () => {
    const { stations, currentStation, playStation, favorites, recentStations, toggleFavorite } = useRadio();
    const [filter, setFilter] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'recent'>('all');

    const filteredStations = stations.filter(s =>
        s.name.toLowerCase().includes(filter.toLowerCase()) ||
        s.country.toLowerCase().includes(filter.toLowerCase())
    );

    const displayStations = activeTab === 'all'
        ? filteredStations
        : activeTab === 'favorites'
            ? stations.filter(s => favorites.includes(s.id))
            : recentStations;

    const StationItem = ({ station }: { station: Station }) => {
        const isFavorite = favorites.includes(station.id);

        return (
            <div
                className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border border-transparent hover:bg-white/10 hover:border-[var(--primary-color)] hover:translate-x-1 ${currentStation?.id === station.id ? 'bg-white/10 border-[var(--primary-color)]' : ''}`}
            >
                <div onClick={() => playStation(station)} className="flex items-center gap-4 flex-1 min-w-0">
                    <img
                        src={station.logo}
                        alt={station.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-[var(--primary-color)]"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://picsum.photos/seed/radio/50/50" }}
                    />
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{station.name}</h4>
                        <p className="text-xs text-[var(--text-secondary)] truncate">{station.country}</p>
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
                    {currentStation?.id === station.id && <div className="w-2 h-2 rounded-full bg-[var(--success-color)] animate-pulse"></div>}
                </div>
            </div>
        );
    };

    return (
        <div className="glass h-full flex flex-col lg:overflow-hidden min-h-[500px] lg:min-h-[800px] lg:max-h-[calc(100vh-140px)] rounded-none p-4">
            <SidebarInfo />
            <div className="border-t border-white/10 pt-4">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Radio size={20} className="text-[var(--primary-color)]" />
                    Emisoras
                </h3>

                {/* Search */}
                <div className="relative mb-4">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input
                        type="text"
                        placeholder="Buscar emisora..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full bg-[var(--dark-surface)] border border-[var(--dark-border)] rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-[var(--primary-color)] transition-colors"
                    />
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'all' ? 'bg-[var(--primary-color)] text-white' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                        Todas
                    </button>
                    <button
                        onClick={() => setActiveTab('favorites')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${activeTab === 'favorites' ? 'bg-[var(--primary-color)] text-white' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                        <Star size={14} /> Favs
                    </button>
                    <button
                        onClick={() => setActiveTab('recent')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${activeTab === 'recent' ? 'bg-[var(--primary-color)] text-white' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                        <History size={14} /> Recientes
                    </button>
                </div>
            </div>

            <div className="flex-1 lg:overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {displayStations.length > 0 ? (
                    displayStations.map(station => (
                        <StationItem key={station.id} station={station} />
                    ))
                ) : (
                    <div className="text-center py-8 opacity-60">
                        <p>No se encontraron emisoras</p>
                    </div>
                )}
            </div>
        </div>
    );
};
