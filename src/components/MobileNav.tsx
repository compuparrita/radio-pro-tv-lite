import React from 'react';
import { SkipBack, Play, Pause, SkipForward, MessageCircle, Palette } from 'lucide-react';
import { useRadio } from '../context/RadioContext';
import { useChat } from '../context/ChatContext';

interface MobileNavProps {
    onChatClick: () => void;
    onThemeClick: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onChatClick, onThemeClick }) => {
    const { isPlaying, togglePlay, nextStation, prevStation } = useRadio();
    const { unreadCount } = useChat();

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--dark-surface)] border-t border-[var(--dark-border)]">
            <div className="flex items-center justify-between py-3 px-2">
                {/* Theme Toggle - Left Side */}
                <button
                    onClick={onThemeClick}
                    className="flex flex-col items-center justify-center gap-1 min-w-[50px] active:opacity-50 transition-opacity ml-2"
                    title="Cambiar tema"
                >
                    <Palette size={20} className="text-gray-400" strokeWidth={1.5} />
                    <span className="text-[9px] text-gray-400">Tema</span>
                </button>

                {/* Playback Controls - Centered */}
                <div className="flex items-center justify-center gap-6 flex-1">
                    {/* Previous Station */}
                    <button
                        onClick={prevStation}
                        className="flex flex-col items-center justify-center gap-1 active:opacity-50 transition-opacity"
                        title="Anterior"
                    >
                        <SkipBack size={20} className="text-gray-400" strokeWidth={1.5} />
                        <span className="text-[10px] text-gray-400">Anterior</span>
                    </button>

                    {/* Play/Pause */}
                    <button
                        onClick={togglePlay}
                        className="flex flex-col items-center justify-center gap-1 active:opacity-50 transition-opacity"
                        title={isPlaying ? 'Pausar' : 'Reproducir'}
                    >
                        {isPlaying ? (
                            <Pause size={22} className="text-[var(--primary-color)]" strokeWidth={1.5} />
                        ) : (
                            <Play size={22} className="text-[var(--primary-color)]" strokeWidth={1.5} />
                        )}
                        <span className="text-[10px] text-[var(--primary-color)]">
                            {isPlaying ? 'Pausar' : 'Play'}
                        </span>
                    </button>

                    {/* Next Station */}
                    <button
                        onClick={nextStation}
                        className="flex flex-col items-center justify-center gap-1 active:opacity-50 transition-opacity"
                        title="Siguiente"
                    >
                        <SkipForward size={20} className="text-gray-400" strokeWidth={1.5} />
                        <span className="text-[10px] text-gray-400">Siguiente</span>
                    </button>
                </div>

                {/* Chat Button - Right Side */}
                <button
                    onClick={onChatClick}
                    className="relative flex flex-col items-center justify-center gap-1 min-w-[50px] active:opacity-50 transition-opacity mr-2"
                    title="Chat"
                >
                    <MessageCircle size={20} className="text-gray-400" strokeWidth={1.5} />
                    <span className="text-[10px] text-gray-400">Chat</span>
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-3 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                            {unreadCount > 99 ? '99' : unreadCount}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
};
