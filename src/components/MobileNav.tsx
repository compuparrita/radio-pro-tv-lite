import React, { useState, useEffect, useRef } from 'react';
import { SkipBack, Play, Pause, SkipForward, MessageCircle, Palette, Film } from 'lucide-react';
import { useRadio } from '../context/RadioContext';
import { useChat } from '../context/ChatContext';
import { useWatchParty } from '../context/WatchPartyContext';

interface MobileNavProps {
    onChatClick: () => void;
    onThemeClick: () => void;
    onWatchPartyClick?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onChatClick, onThemeClick, onWatchPartyClick }) => {
    const { isPlaying, togglePlay, nextStation, prevStation } = useRadio();
    const { unreadCount, onlineListeners, connectionStatus } = useChat();
    const { room } = useWatchParty();

    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Always visible near top of page
            if (currentScrollY < 60) {
                setIsVisible(true);
            } else if (currentScrollY > lastScrollY.current + 10) {
                // Scrolling down -> hide smoothly
                setIsVisible(false);
            } else if (currentScrollY < lastScrollY.current - 10) {
                // Scrolling up -> show immediately
                setIsVisible(true);
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--dark-surface)] border-t border-[var(--dark-border)] transition-transform duration-300 ease-in-out ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="flex items-center justify-between py-2.5 px-3">
                {/* Theme Toggle - Left Side */}
                <button
                    onClick={onThemeClick}
                    className="flex flex-col items-center justify-center gap-1 min-w-[38px] active:opacity-50 transition-opacity"
                    title="Cambiar tema"
                >
                    <Palette size={19} className="text-gray-400" strokeWidth={1.5} />
                    <span className="text-[9px] text-gray-400">Tema</span>
                </button>

                {/* WatchParty Cine Button */}
                <button
                    onClick={onWatchPartyClick}
                    className="relative flex flex-col items-center justify-center gap-1 min-w-[38px] active:opacity-50 transition-opacity"
                    title="Cine Compartido"
                >
                    <div className="relative">
                        <Film size={19} className={room ? 'text-cyan-400' : 'text-gray-400'} strokeWidth={1.75} />
                        {room && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        )}
                    </div>
                    <span className={`text-[9px] font-medium ${room ? 'text-cyan-300 font-bold' : 'text-gray-400'}`}>
                        {room ? 'Sala' : 'Cine'}
                    </span>
                </button>

                {/* Playback Controls - Centered */}
                <div className="flex items-center justify-center gap-4 sm:gap-6 flex-1 px-1">
                    {/* Previous Station */}
                    <button
                        onClick={prevStation}
                        className="flex flex-col items-center justify-center gap-1 active:opacity-50 transition-opacity"
                        title="Anterior"
                    >
                        <SkipBack size={19} className="text-gray-400" strokeWidth={1.5} />
                        <span className="text-[9px] text-gray-400">Anterior</span>
                    </button>

                    {/* Play/Pause */}
                    <button
                        onClick={togglePlay}
                        className="flex flex-col items-center justify-center gap-1 active:opacity-50 transition-opacity"
                        title={isPlaying ? 'Pausar' : 'Reproducir'}
                    >
                        {isPlaying ? (
                            <Pause size={22} className="text-[var(--primary-color)]" strokeWidth={1.75} />
                        ) : (
                            <Play size={22} className="text-[var(--primary-color)]" strokeWidth={1.75} />
                        )}
                        <span className="text-[9px] font-bold text-[var(--primary-color)]">
                            {isPlaying ? 'Pausa' : 'Play'}
                        </span>
                    </button>

                    {/* Next Station */}
                    <button
                        onClick={nextStation}
                        className="flex flex-col items-center justify-center gap-1 active:opacity-50 transition-opacity"
                        title="Siguiente"
                    >
                        <SkipForward size={19} className="text-gray-400" strokeWidth={1.5} />
                        <span className="text-[9px] text-gray-400">Siguiente</span>
                    </button>
                </div>

                {/* Chat Button - Right Side */}
                <button
                    onClick={onChatClick}
                    className="relative flex flex-col items-center justify-center gap-1 min-w-[42px] active:opacity-50 transition-opacity"
                    title="Chat"
                >
                    <div className="relative">
                        <MessageCircle size={19} className="text-gray-300" strokeWidth={1.75} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center shadow">
                                {unreadCount > 99 ? '99' : unreadCount}
                            </span>
                        )}
                    </div>
                    <span className="flex items-center gap-1 text-[9px] font-medium text-gray-300 leading-none">
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                            connectionStatus === 'connected'
                                ? 'bg-emerald-400 animate-pulse'
                                : connectionStatus === 'connecting'
                                    ? 'bg-yellow-400 animate-pulse'
                                    : 'bg-red-400'
                        }`} />
                        <span>{connectionStatus === 'connected' ? onlineListeners : 0}</span>
                    </span>
                </button>
            </div>
        </div>
    );
};
