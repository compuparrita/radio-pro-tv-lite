import { useState, useEffect, useRef } from 'react';
import { Settings } from 'lucide-react';
import { RadioProvider } from './context/RadioContext';
import { ChatProvider } from './context/ChatContext';
import { Header } from './components/Header';
import { Player } from './components/Player';
import { StationList } from './components/StationList';
import { StationManager } from './components/StationManager';
import { ChatModal } from './components/ChatModal';
import { MobileNav } from './components/MobileNav';
import { useTVRemote } from './hooks/useTVRemote';
import GeneralHelpModal from './components/GeneralHelpModal';
import { HelpCircle } from 'lucide-react';

function AppContent() {
    const [isManagerOpen, setIsManagerOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light' | 'youth'>(() => {
        const saved = localStorage.getItem('theme');
        return (saved as 'dark' | 'light' | 'youth') || 'dark';
    });
    const [isAppHelpOpen, setIsAppHelpOpen] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const saved = localStorage.getItem('sidebarWidth');
        return saved ? parseInt(saved) : 360;
    });
    const [isResizing, setIsResizing] = useState(false);
    const [headerHeight, setHeaderHeight] = useState(0);
    const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
    const headerRef = useRef<HTMLDivElement>(null);

    // Precise header height tracking for universal sticky offset
    useEffect(() => {
        if (!headerRef.current) return;

        const updateHeight = () => {
            if (headerRef.current) {
                const rect = headerRef.current.getBoundingClientRect();
                setHeaderHeight(rect.height);
                document.documentElement.style.setProperty('--header-final-height', `${rect.height}px`);
                // Also update the older variable for compatibility during transition
                document.documentElement.style.setProperty('--header-height', `${rect.height}px`);
            }
        };

        const observer = new ResizeObserver(updateHeight);
        observer.observe(headerRef.current);

        // Initial measurement
        updateHeight();

        return () => observer.disconnect();
    }, []);

    // Enable Smart TV remote control navigation
    useTVRemote();

    // Apply theme to body
    useEffect(() => {
        document.body.className = theme === 'dark' ? '' : theme === 'light' ? 'light-mode' : 'youth-mode';
        localStorage.setItem('theme', theme);
    }, [theme]);

    const cycleTheme = () => {
        setTheme(prev => {
            if (prev === 'dark') return 'light';
            if (prev === 'light') return 'youth';
            return 'dark';
        });
    };

    const startResizing = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    const stopResizing = () => {
        setIsResizing(false);
    };

    const resize = (e: MouseEvent) => {
        if (isResizing) {
            // Calculate width from right side of screen
            const newWidth = window.innerWidth - e.clientX - 24; // 24 is padding/gap
            if (newWidth >= 280 && newWidth <= 600) {
                setSidebarWidth(newWidth);
                localStorage.setItem('sidebarWidth', newWidth.toString());
            }
        }
    };

    // Update isDesktop on resize
    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing]);

    // Scroll Persistence for Mobile Orientation Change
    // When entering landscape (Cinema Mode), the page scroll usually resets or becomes irrelevant.
    // We want to save the user's scroll position in portrait and restore it when they return.
    const lastPortraitScrollY = useRef(0);

    useEffect(() => {
        const cinemaModeQuery = window.matchMedia('(max-width: 1023px) and (orientation: landscape) and (max-height: 500px)');

        const handleScroll = () => {
            // Only save scroll position if we are NOT in cinema mode
            if (!cinemaModeQuery.matches) {
                lastPortraitScrollY.current = window.scrollY;
            }
        };

        const handleOrientationChange = (e: MediaQueryListEvent) => {
            if (!e.matches) {
                // We just exited cinema mode (back to portrait/normal)
                // Restore the scroll after a brief delay to allow layout to stabilization
                setTimeout(() => {
                    window.scrollTo({
                        top: lastPortraitScrollY.current,
                        behavior: 'instant' // Instant jump to prevent disorientation
                    });
                }, 100);
            }
        };

        // Attach listeners
        window.addEventListener('scroll', handleScroll, { passive: true });
        cinemaModeQuery.addEventListener('change', handleOrientationChange);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            cinemaModeQuery.removeEventListener('change', handleOrientationChange);
        };
    }, []);

    return (
        <div className="min-h-screen pb-24 md:pb-2" style={{ overflow: 'visible' }}>
            <div className="animated-bg"></div>

            {/* Universal Header - FIXED ON DESKTOP, RELATIVE ON MOBILE */}
            <div
                ref={headerRef}
                className={`${isDesktop ? 'fixed' : 'relative'} top-0 left-0 w-full transition-colors duration-300 bg-[var(--dark-bg)] shadow-md header-container`}
                style={{ zIndex: 1000 }}
            >
                <Header
                    theme={theme}
                    onThemeClick={cycleTheme}
                    onChatClick={() => setIsChatOpen(true)}
                />
            </div>

            {/* Main content area - REACTIVE PADDING (Removes black gaps) */}
            <div
                className="w-full relative px-4"
                style={{
                    overflow: 'visible',
                    zIndex: 10,
                    // No padding on mobile to avoid the black gap
                    paddingTop: isDesktop ? `${headerHeight + 20}px` : '0px'
                }}
            >
                <div
                    className="max-w-[1700px] mx-auto grid grid-cols-1 lg:flex gap-4 lg:gap-0 relative"
                    style={{ overflow: 'visible' }}
                >
                    {/* Left Column - Player + List on mobile */}
                    <div
                        className="flex-1 lg:pr-6 player-column"
                        style={{
                            position: isDesktop ? 'sticky' : 'relative',
                            top: isDesktop ? `${headerHeight}px` : '0',
                            ...(isDesktop ? { alignSelf: 'flex-start' } : {}),
                            zIndex: 100
                        }}
                    >
                        <Player />
                        {/* On mobile, the list is part of the same parent as the player */}
                        <div className="lg:hidden mt-4 mobile-list-container">
                            <StationList />
                        </div>
                    </div>

                    {/* Resizer Handle (Desktop only) - STICKY to stay visible during scroll */}
                    <div
                        onMouseDown={startResizing}
                        className={`hidden lg:flex w-4 -mx-2 items-center justify-center cursor-col-resize group relative`}
                        style={{
                            zIndex: 200,
                            position: 'sticky',
                            top: `${headerHeight}px`, // Align top exactly with header/player
                            height: '400px', // Matches typical player height on desktop for vertical centering
                            alignSelf: 'flex-start'
                        }}
                    >
                        <div className={`w-0.5 h-16 rounded-full transition-all duration-300 ${isResizing ? 'bg-[var(--primary-color)] h-24 scale-x-150' : 'bg-[var(--dark-border)] opacity-60 group-hover:opacity-100 group-hover:bg-[var(--primary-color)]/50 group-hover:h-24'}`} />
                    </div>

                    {/* Right Column - Desktop only */}
                    <div
                        className="hidden lg:flex h-full flex-col lg:pl-6"
                        style={{
                            width: `${sidebarWidth}px`,
                            position: 'relative',
                            zIndex: 100
                        }}
                    >
                        <StationList />
                    </div>
                </div>

                <div className="mt-20 md:mt-16 text-[var(--text-secondary)] text-sm mb-4 px-4 footer-container">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 border-t border-[var(--dark-border)] pt-8 md:pt-6">
                        <button
                            onClick={() => setIsManagerOpen(true)}
                            className="flex items-center gap-2 hover:text-[var(--primary-color)] transition-colors"
                        >
                            <Settings size={16} /> Gestor de Emisoras
                        </button>
                        <button
                            onClick={() => setIsAppHelpOpen(true)}
                            className="flex items-center gap-2 hover:text-[var(--primary-color)] transition-colors"
                        >
                            <HelpCircle size={16} /> Ayuda de la App
                        </button>
                        <span className="hidden md:inline text-[var(--dark-border)]">|</span>
                        <p className="opacity-80">© 2025 Radio Streaming Pro - Versión ti8ocb</p>
                    </div>
                </div>
            </div>

            <StationManager isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} />
            <ChatModal externalOpen={isChatOpen} onOpenChange={setIsChatOpen} />
            <GeneralHelpModal isOpen={isAppHelpOpen} onClose={() => setIsAppHelpOpen(false)} />
            <div className="mobile-nav-container">
                <MobileNav onChatClick={() => setIsChatOpen(true)} onThemeClick={cycleTheme} />
            </div>
        </div>
    );
}

function App() {
    return (
        <RadioProvider>
            <ChatProvider>
                <AppContent />
            </ChatProvider>
        </RadioProvider>
    );
}

export default App;
