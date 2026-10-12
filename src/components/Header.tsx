import React, { useState } from 'react';
import { Radio, MessageCircle, User, Menu, Search } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useWatchParty } from '../context/WatchPartyContext';
import WatchPartyModal from './WatchPartyModal';
import { PanelShell } from './panels/PanelShell';

interface HeaderProps {
    onChatClick: () => void;
    onWatchPartyClick?: () => void;
    onProfileClick?: () => void;
    onGlobalMenuClick: () => void;
    isGlobalMenuOpen: boolean;
    isGlobalMenuDisabled: boolean;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    onYouTubeSearch: () => void;
    onGoogleSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onChatClick, onWatchPartyClick, onProfileClick, onGlobalMenuClick, isGlobalMenuOpen, isGlobalMenuDisabled, searchQuery, onSearchChange, onYouTubeSearch, onGoogleSearch }) => {
    const { unreadCount, onlineListeners, connectionStatus } = useChat();
    const { room } = useWatchParty();
    const [isWatchPartyOpen, setIsWatchPartyOpen] = useState(false);
    const primaryActionClass = 'btn btn-primary btn-sm text-white';
    return (
        <header className="w-full z-[100] lg:bg-[var(--dark-bg)]/95 lg:backdrop-blur-md border-b border-white/5 py-4 lg:py-3 transition-colors duration-300">
            <div className="max-w-[1700px] mx-auto flex flex-col items-center lg:flex-row lg:justify-between lg:items-center px-[10px] gap-4">
                {/* Logo & Title */}
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        aria-expanded={isGlobalMenuOpen}
                        aria-label={isGlobalMenuOpen ? 'Cerrar menú global' : 'Abrir menú global'}
                        className="btn btn-secondary btn-sm relative -left-[13px] lg:left-0"
                        disabled={isGlobalMenuDisabled}
                        onClick={onGlobalMenuClick}
                        title={isGlobalMenuDisabled ? 'Cierra el panel actual para abrir el menú' : 'Menú global'}
                        type="button"
                    >
                        <Menu aria-hidden="true" size={20} />
                    </button>
                    <h1 className="text-2xl md:text-3xl lg:text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-color)] via-[var(--secondary-color)] to-[var(--accent-color)]">
                        <span className="flex items-center gap-2">
                            <Radio size={28} className="shrink-0 text-[var(--primary-color)]" />
                            <span className="reading-text">TV Radio <span className="text-[var(--text-primary)]">Streaming Pro</span></span>
                        </span>
                       {/* <span className="block pl-9 text-[10px] font-semibold tracking-normal text-[var(--text-secondary)]">TV en vivo • Radio • YouTube • Cine compartido</span> */}
                    </h1>
                </div>
                {/* Global Search */}
                <div className="relative w-full min-w-0 max-w-xl lg:w-auto lg:min-w-[180px] lg:flex-1 lg:mx-4">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input type="text" placeholder="Emisoras o en YouTube..." value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim()) onYouTubeSearch(); }}
                        className="w-full min-w-0 bg-[var(--dark-surface)] border border-[var(--dark-border)] rounded-none py-2.5 pl-10 pr-20 focus:outline-none focus:border-[var(--primary-color)] transition-colors text-sm" />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-1">
                        <button onClick={onYouTubeSearch} className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs transition-colors" title="Buscar en YouTube (Interno)">YT</button>
                        <button onClick={onGoogleSearch} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs transition-colors" title="Buscar en Google">G</button>
                    </div>
                </div>

                {/* Actions Section - Desktop Only */}
                <div className="hidden lg:flex items-center gap-4 shrink-0">
                    {/* Chat Button */}
                    <button
                        onClick={onChatClick}
                        className={`${primaryActionClass} relative`}
                        title="Chatear online"
                    >
                        <MessageCircle size={18} />
                        <span className="tracking-wider reading-text">Chat</span>
                        {/* Online count pill */}
                        <span className="flex items-center gap-1 bg-black/25 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
                            <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                                connectionStatus === 'connected'
                                    ? 'bg-green-400 animate-pulse'
                                    : connectionStatus === 'connecting'
                                        ? 'bg-yellow-400 animate-pulse'
                                        : 'bg-red-400'
                            }`} />
                            {connectionStatus === 'connected' ? onlineListeners : 0}
                        </span>
                        {/* Unread messages badge */}
                        {unreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black rounded-full min-w-[20px] h-[20px] px-1 flex items-center justify-center shadow-lg border-2 border-[var(--dark-bg)]">
                                {unreadCount > 99 ? '99' : unreadCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => {
                            if (onWatchPartyClick) {
                                onWatchPartyClick();
                            } else {
                                setIsWatchPartyOpen(true);
                            }
                        }}
                        className={primaryActionClass}
                        type="button"
                    >
                        <span className="tracking-wider reading-text">{room ? '🎞 Sala' : '🎬 Cine'}</span>
                    </button>
					<button
                    onClick={() => onProfileClick?.()}
                    className={primaryActionClass}
                    title="Administrar perfil local"
                    type="button"
                >
                    <User size={16} />
                    <span className="tracking-wider reading-text">Perfil</span>
                </button>
                </div>
            </div>
            {!onWatchPartyClick && (
                <WatchPartyModal
                    isOpen={isWatchPartyOpen}
                    onClose={() => setIsWatchPartyOpen(false)}
                    PanelShellComponent={PanelShell}
                />
            )}
        </header>
    );
};
