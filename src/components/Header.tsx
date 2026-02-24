import React from 'react';
import { Radio, Moon, Sun, Zap, MessageCircle, Antenna, Star, Monitor, ChevronDown } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useRadio } from '../context/RadioContext';

interface HeaderProps {
    theme: 'dark' | 'light' | 'youth';
    onThemeClick: () => void;
    onChatClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, onThemeClick, onChatClick }) => {
    const { unreadCount } = useChat();
    const { activeTab, setActiveTab, radioCategories, tvCategories, selectedCategory, setSelectedCategory } = useRadio();
    const [activeMenu, setActiveMenu] = React.useState<'radios' | 'tv' | null>(null);
    const closeTimeoutRef = React.useRef<number | null>(null);
    const enterTimeoutRef = React.useRef<number | null>(null);

    const handleMouseEnter = (menu: 'radios' | 'tv') => {
        // Clear any pending close or enter timeouts
        if (closeTimeoutRef.current) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        if (enterTimeoutRef.current) {
            window.clearTimeout(enterTimeoutRef.current);
        }

        // Set a delay for opening the menu
        enterTimeoutRef.current = window.setTimeout(() => {
            const targetTab = menu === 'radios' ? 'all' : 'tv';
            if (activeTab !== targetTab) {
                setActiveTab(targetTab);
                setSelectedCategory('Todas');
            }
            setActiveMenu(menu);
            enterTimeoutRef.current = null;
        }, 350);
    };

    const handleMouseLeave = () => {
        // Clear pending enter timeout if mouse leaves early
        if (enterTimeoutRef.current) {
            window.clearTimeout(enterTimeoutRef.current);
            enterTimeoutRef.current = null;
        }

        closeTimeoutRef.current = window.setTimeout(() => {
            setActiveMenu(null);
        }, 150);
    };

    React.useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
            if (enterTimeoutRef.current) window.clearTimeout(enterTimeoutRef.current);
        };
    }, []);

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const getThemeLabel = () => {
        if (theme === 'dark') return 'Dark';
        if (theme === 'light') return 'Claro';
        return 'Juvenil';
    };

    return (
        <header className="w-full z-[100] lg:bg-[var(--dark-bg)]/95 lg:backdrop-blur-md border-b border-white/5 py-4 lg:py-3 transition-colors duration-300">
            <div className="max-w-[1700px] mx-auto flex flex-col items-center lg:flex-row lg:justify-between lg:items-center px-4 gap-4">
                {/* Logo & Title */}
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl md:text-3xl lg:text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-color)] via-[var(--secondary-color)] to-[var(--accent-color)] flex items-center gap-2">
                        <Radio size={28} className="text-[var(--primary-color)]" />
                        <span className="inline">Radio Streaming <span className="text-[var(--text-primary)]">Pro</span></span>
                    </h1>
                </div>

                {/* Navigation Filters - Desktop Only */}
                <div className="hidden lg:flex items-center bg-white/5 p-1 border border-white/5 flex-shrink-0">
                    <div
                        className="relative"
                        onClick={(e) => e.stopPropagation()}
                        onMouseLeave={handleMouseLeave}
                        onMouseEnter={() => {
                            if (closeTimeoutRef.current) {
                                window.clearTimeout(closeTimeoutRef.current);
                                closeTimeoutRef.current = null;
                            }
                        }}
                    >
                        <button
                            onMouseEnter={() => handleMouseEnter('radios')}
                            onClick={() => {
                                if (activeMenu === 'radios') {
                                    setActiveMenu(null);
                                } else {
                                    setActiveTab('all');
                                    // If already in 'all', clicking acts as a reset for the filter
                                    if (activeTab === 'all') setSelectedCategory('Todas');
                                    setActiveMenu('radios');
                                }
                            }}
                            className={`flex items-center gap-2 px-2.5 py-1.5 transition-all font-bold text-[10px] md:text-xs uppercase tracking-wider whitespace-nowrap ${activeTab === 'all' ? 'bg-[var(--primary-color)] text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'}`}
                        >
                            <Antenna size={15} />
                            <span>{activeTab === 'all' && selectedCategory !== 'Todas' ? selectedCategory : 'Radios'}</span>
                            <ChevronDown size={14} className={`transition-transform duration-300 ${activeMenu === 'radios' ? 'rotate-180 text-white/70' : 'text-white/30'}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenu === 'radios' && (
                            <div className="absolute top-full left-0 pt-1 min-w-[100px] w-max bg-transparent z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="bg-[var(--dark-surface)] border border-white/10 shadow-2xl py-2">
                                    {radioCategories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveTab('all');
                                                setSelectedCategory(cat);
                                                setActiveMenu(null);
                                            }}
                                            className={`block w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors hover:bg-white/5 ${selectedCategory === cat && activeTab === 'all' ? 'text-[var(--primary-color)]' : 'text-[var(--text-secondary)] hover:text-white'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            setActiveTab('favorites');
                            setSelectedCategory('Todas');
                        }}
                        className={`flex items-center gap-2 px-2.5 py-1.5 transition-all font-bold text-[10px] md:text-xs uppercase tracking-wider whitespace-nowrap ${activeTab === 'favorites' ? 'bg-[var(--primary-color)] text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'}`}
                    >
                        <Star size={15} className={`${activeTab === 'favorites' ? 'fill-[#f59e0b] text-[#f59e0b]' : 'text-[#f59e0b]'}`} />
                        <span>Favoritos</span>
                    </button>

                    <div
                        className="relative"
                        onClick={(e) => e.stopPropagation()}
                        onMouseLeave={handleMouseLeave}
                        onMouseEnter={() => {
                            if (closeTimeoutRef.current) {
                                window.clearTimeout(closeTimeoutRef.current);
                                closeTimeoutRef.current = null;
                            }
                        }}
                    >
                        <button
                            onMouseEnter={() => handleMouseEnter('tv')}
                            onClick={() => {
                                if (activeMenu === 'tv') {
                                    setActiveMenu(null);
                                } else {
                                    setActiveTab('tv');
                                    // If already in 'tv', clicking acts as a reset for the filter
                                    if (activeTab === 'tv') setSelectedCategory('Todas');
                                    setActiveMenu('tv');
                                }
                            }}
                            className={`flex items-center gap-2 px-2.5 py-1.5 transition-all font-bold text-[10px] md:text-xs uppercase tracking-wider whitespace-nowrap group ${activeTab === 'tv' ? 'bg-[var(--primary-color)] text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'}`}
                        >
                            <Monitor size={15} />
                            <span>{activeTab === 'tv' && selectedCategory !== 'Todas' ? selectedCategory : 'Televisión'}</span>
                            <ChevronDown size={14} className={`transition-transform duration-300 ${activeMenu === 'tv' ? 'rotate-180 text-white/70' : 'text-white/30'}`} />

                            {/* Shortcut to Lite version */}
                            <a
                                href="/tv-lite.html"
                                target="_blank"
                                onClick={(e) => e.stopPropagation()}
                                className="ml-1 px-1 bg-white/20 text-[8px] rounded hover:bg-white/40 transition-colors"
                                title="Abrir versión optimizada para TV"
                            >
                                LITE
                            </a>
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenu === 'tv' && (
                            <div className="absolute top-full left-0 pt-1 min-w-[100px] w-max bg-transparent z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="bg-[var(--dark-surface)] border border-white/10 shadow-2xl py-2">
                                    {tvCategories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveTab('tv');
                                                setSelectedCategory(cat);
                                                setActiveMenu(null);
                                            }}
                                            className={`block w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors hover:bg-white/5 ${selectedCategory === cat && activeTab === 'tv' ? 'text-[var(--primary-color)]' : 'text-[var(--text-secondary)] hover:text-white'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions Section - Desktop Only */}
                <div className="hidden lg:flex items-center gap-4">
                    {/* Unified Theme Switcher */}
                    <button
                        onClick={onThemeClick}
                        className="flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/5  hover:bg-white/10 transition-all group"
                        title="Cambiar tema"
                    >
                        <div className="relative w-5 h-5 flex items-center justify-center">
                            {theme === 'dark' && <Moon size={18} className="text-[var(--primary-color)]" />}
                            {theme === 'light' && <Sun size={18} className="text-[var(--warning-color)]" />}
                            {theme === 'youth' && <Zap size={18} className="text-[var(--accent-color)]" />}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider min-w-[60px] text-left">
                            {getThemeLabel()}
                        </span>
                    </button>

                    {/* Chat Button */} {/* uppercase */}
                    <button
                        onClick={onChatClick}
                        className="relative flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-white hover:opacity-90 transition-all border border-transparent"
                        title="Chatear online sin registro"
                    >
                        <MessageCircle size={18} />
                        <span className="text-xs font-bold tracking-wider">En Línea</span>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black rounded-full min-w-[20px] h-[20px] px-1 flex items-center justify-center shadow-lg border-2 border-[var(--dark-bg)]">
                                {unreadCount > 99 ? '99' : unreadCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
};
