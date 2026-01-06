import React, { useState, useRef, useEffect } from 'react';
import { useRadio } from '../context/RadioContext';
import { Station } from '../types';
import { ChevronDown } from 'lucide-react';

export const StationSelector: React.FC = () => {
    const { stations, currentStation, playStation } = useRadio();
    const [isOpen, setIsOpen] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to selected station in mobile view
    useEffect(() => {
        if (currentStation && scrollContainerRef.current) {
            const selectedChip = scrollContainerRef.current.querySelector(`[data-station-id="${currentStation.id}"]`);
            if (selectedChip) {
                selectedChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [currentStation]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChipClick = (station: Station) => {
        playStation(station);
    };

    const handleStationSelect = (station: Station) => {
        playStation(station);
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className="relative w-full">
            {/* Mobile: Horizontal scrollable chips */}
            <div
                ref={scrollContainerRef}
                className="md:hidden overflow-x-auto flex gap-2 px-4 py-3 bg-[var(--dark-bg)] scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {stations.map(station => (
                    <button
                        key={station.id}
                        data-station-id={station.id}
                        onClick={() => handleChipClick(station)}
                        className={`
                            px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium 
                            transition-all flex-shrink-0 border
                            ${currentStation?.id === station.id
                                ? 'bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] border-transparent text-white shadow-lg scale-105'
                                : 'bg-[var(--dark-surface)] border-[var(--dark-border)] hover:border-[var(--primary-color)]'
                            }
                        `}
                    >
                        {station.name}
                    </button>
                ))}
            </div>

            {/* Desktop: Custom Transparent Dropdown */}
            <div className="hidden md:block w-full">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-2 px-3 border border-white/5 rounded-lg bg-black/10 backdrop-blur-md text-[var(--text-primary)] text-sm transition-all hover:bg-black/20 focus:outline-none"
                >
                    <span className="truncate">{currentStation?.name || 'Seleccionar Emisora'}</span>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 max-h-64 overflow-y-auto rounded-lg border border-white/5 bg-black/30 backdrop-blur-xl shadow-2xl z-50 custom-scrollbar animate-slide-in-top">
                        {stations.map(station => (
                            <button
                                key={station.id}
                                onClick={() => handleStationSelect(station)}
                                className={`w-full text-left p-2 px-3 text-sm transition-colors hover:bg-white/10 ${currentStation?.id === station.id ? 'bg-[var(--primary-color)]/20 text-[var(--primary-color)] font-medium' : 'text-white/80'}`}
                            >
                                {station.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                @keyframes slide-in-top {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-in-top {
                    animation: slide-in-top 0.2s ease-out;
                }
            `}</style>
        </div>
    );
};
