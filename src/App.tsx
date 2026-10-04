import { useState, useEffect, useRef } from 'react';
import { Settings } from 'lucide-react';
import { RadioProvider } from './context/RadioContext';
import { ChatProvider } from './context/ChatContext';
import { WatchPartyProvider, useWatchParty } from './context/WatchPartyContext';
import { WatchPartyChatProvider } from './context/WatchPartyChatContext';
import { UserProfileProvider, useUserProfile } from './context/UserProfileContext';
import { Header } from './components/Header';
import { Player } from './components/Player';
import { StationList } from './components/StationList';
import { StationManager } from './components/StationManager';
import { ChatModal } from './components/ChatModal';
import { RoomChatTicker } from './components/RoomChatTicker';
import { MobileNav } from './components/MobileNav';
import { useTVRemote } from './hooks/useTVRemote';
import { PanelHost } from './components/panels/PanelHost';
import { UserProfileForm } from './components/UserProfileForm';
import { HelpCircle } from 'lucide-react';
import { GuestCinemaLayout } from './components/GuestCinemaLayout';
import { getWatchPartySessionTitle } from './utils/watchPartySessionTitle';

const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

function clearRoomInviteParameter() {
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function AppContent() {
    const { room, roomCode, isHost, isConnected } = useWatchParty();
    const [isManagerOpen, setIsManagerOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isWatchPartyOpen, setIsWatchPartyOpen] = useState(false);
    const [isGuestCinemaMode, setIsGuestCinemaMode] = useState(true);
    const [isChatHelpOpen, setIsChatHelpOpen] = useState(false);
    const [pendingRoomInvite, setPendingRoomInvite] = useState<string | null>(null);
    const [theme, setTheme] = useState<'dark' | 'light' | 'youth'>(() => {
        const saved = localStorage.getItem('theme');
        return (saved as 'dark' | 'light' | 'youth') || 'light';
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

    const isGuestCinema = Boolean(room && isGuestCinemaMode);
    const roomChatTicker = room && roomCode && !isChatOpen
        ? <RoomChatTicker roomCode={roomCode} isGuestCinema={isGuestCinema} />
        : null;

    useEffect(() => {
        setIsGuestCinemaMode(Boolean(room && !isHost));
    }, [room?.id, isHost]);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const roomParameter = searchParams.get('room');
        if (roomParameter === null) return;

        const roomCode = roomParameter.trim().toUpperCase();
        if (!ROOM_CODE_PATTERN.test(roomCode)) {
            clearRoomInviteParameter();
            return;
        }

        setPendingRoomInvite(roomCode);
        setIsWatchPartyOpen(true);
    }, []);

    const handleRoomInviteCancel = () => {
        clearRoomInviteParameter();
        setPendingRoomInvite(null);
        setIsWatchPartyOpen(false);
    };

    const handleRoomInviteJoined = () => {
        clearRoomInviteParameter();
        setPendingRoomInvite(null);
    };

    const handleWatchPartyModalClose = () => {
        if (pendingRoomInvite) {
            handleRoomInviteCancel();
        } else {
            setIsWatchPartyOpen(false);
        }
    };

    const handleMobileWatchPartyNavigation = () => {
        if (!room) {
            setIsWatchPartyOpen(true);
        } else if (isGuestCinema) {
            setIsWatchPartyOpen(true);
        } else {
            setIsGuestCinemaMode(true);
        }
    };

    const handleReturnToApp = () => {
        setIsGuestCinemaMode(false);
        setIsWatchPartyOpen(false);
    };

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
        localStorage.setItem('sidebarWidth', sidebarWidth.toString());
    };

    const resize = (e: MouseEvent) => {
        if (isResizing) {
            const newWidth = window.innerWidth - e.clientX - 24;
            if (newWidth >= 280 && newWidth <= 500) {
                setSidebarWidth(newWidth);
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
    }, [isResizing, sidebarWidth]);

    // Scroll Persistence for Mobile Orientation Change
    // When entering landscape (Cinema Mode), the page scroll usually resets or becomes irrelevant.
    // We want to save the user's scroll position in portrait and restore it when they return.
    const lastPortraitScrollY = useRef(0);

    // Global Activity Tracker for Cursor Visibility (Fix for Smart TVs)
    useEffect(() => {
        let timeoutId: number;
        const body = document.body;

        const handleActivity = () => {
            if (!body.classList.contains('user-is-active')) {
                body.classList.add('user-is-active');
            }
            
            window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => {
                body.classList.remove('user-is-active');
            }, 5000); // 5 seconds of grace before hiding
        };

        // Listen for all possible interactions
        window.addEventListener('mousemove', handleActivity, { passive: true });
        window.addEventListener('mousedown', handleActivity, { passive: true });
        window.addEventListener('keydown', handleActivity, { passive: true });
        window.addEventListener('touchstart', handleActivity, { passive: true });
        window.addEventListener('scroll', handleActivity, { passive: true });

        // Initial state
        handleActivity();

        return () => {
            window.clearTimeout(timeoutId);
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('mousedown', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('scroll', handleActivity);
            body.classList.remove('user-is-active');
        };
    }, []);

    // Persistencia y Restauración del Scroll al recargar el navegador
    useEffect(() => {
        // Permitir que el navegador mantenga o nos permita controlar el scroll manualmente
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }

        const savedScroll = sessionStorage.getItem('appScrollPosition');
        if (savedScroll) {
            const targetY = parseInt(savedScroll, 10);
            if (!isNaN(targetY) && targetY > 0) {
                // Intentar restaurar de inmediato y reintentar conforme se renderiza el contenido dinámico
                window.scrollTo({ top: targetY, behavior: 'instant' });
                const t1 = setTimeout(() => window.scrollTo({ top: targetY, behavior: 'instant' }), 100);
                const t2 = setTimeout(() => window.scrollTo({ top: targetY, behavior: 'instant' }), 300);
                const t3 = setTimeout(() => window.scrollTo({ top: targetY, behavior: 'instant' }), 600);
                return () => {
                    clearTimeout(t1);
                    clearTimeout(t2);
                    clearTimeout(t3);
                };
            }
        }
    }, []);

    useEffect(() => {
        const cinemaModeQuery = window.matchMedia('(max-width: 1023px) and (orientation: landscape) and (max-height: 800px) and (pointer: coarse)');

        let saveTimeout: number;
        const handleScroll = () => {
            // Guardar posición de scroll solo si no estamos en cinema mode
            if (!cinemaModeQuery.matches) {
                const currentY = window.scrollY;
                lastPortraitScrollY.current = currentY;

                window.clearTimeout(saveTimeout);
                saveTimeout = window.setTimeout(() => {
                    sessionStorage.setItem('appScrollPosition', currentY.toString());
                }, 100);
            }
        };

        const handleBeforeUnload = () => {
            if (!cinemaModeQuery.matches) {
                sessionStorage.setItem('appScrollPosition', window.scrollY.toString());
            }
        };

        const handleOrientationChange = (e: MediaQueryListEvent | MediaQueryList) => {
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
        window.addEventListener('beforeunload', handleBeforeUnload);
        cinemaModeQuery.addEventListener('change', handleOrientationChange);

        return () => {
            window.clearTimeout(saveTimeout);
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            cinemaModeQuery.removeEventListener('change', handleOrientationChange);
        };
    }, []);

    if (isGuestCinema) {
        return (
            <>
                {roomChatTicker}
                <GuestCinemaLayout
                    isConnected={isConnected}
                    onChatClick={() => setIsChatOpen(true)}
                    onExitCinema={handleMobileWatchPartyNavigation}
                />
                <ChatModal
                    externalOpen={isChatOpen}
                    onOpenChange={setIsChatOpen}
                    onOpenChatHelp={() => setIsChatHelpOpen(true)}
                    roomCode={roomCode}
                />
                <PanelHost
                    activePanel={isWatchPartyOpen ? {
                        kind: 'watchparty',
                        props: {
                            isOpen: true,
                            onClose: handleWatchPartyModalClose,
                            inviteCode: pendingRoomInvite,
                            onInviteCancel: handleRoomInviteCancel,
                            onInviteJoined: handleRoomInviteJoined,
                            onReturnToApp: handleReturnToApp,
                        },
                    } : isChatHelpOpen ? {
                        kind: 'chat-help',
                        props: {
                            isOpen: true,
                            onClose: () => setIsChatHelpOpen(false),
                        },
                    } : null}
                />
                <div className="mobile-nav-container">
                    <MobileNav
                        onChatClick={() => setIsChatOpen(true)}
                        onThemeClick={cycleTheme}
                        onWatchPartyClick={handleMobileWatchPartyNavigation}
                        isGuestCinema={isGuestCinema}
                    />
                </div>
            </>
        );
    }

    return (
        <>
        {roomChatTicker}
        <div className="min-h-screen pb-24 md:pb-2" style={{ overflow: 'visible' }}>
            <div className="animated-bg"></div>

            {/* Universal Header - FIXED ON DESKTOP, RELATIVE ON MOBILE */}
            <div
                ref={headerRef}
                id="main-header"
                className={`${isDesktop ? 'fixed' : 'relative'} top-0 left-0 w-full transition-colors duration-300 bg-[var(--dark-bg)] shadow-md header-container`}
                style={{ zIndex: 1000 }}
            >
                <Header
                    theme={theme}
                    onThemeClick={cycleTheme}
                    onChatClick={() => setIsChatOpen(true)}
                    onWatchPartyClick={handleMobileWatchPartyNavigation}
                />
            </div>

            {/* Main content area - REACTIVE PADDING (Removes black gaps) */}
            <div
                className="w-full relative px-0 min-[1200px]:px-[10px]"
                style={{
                    overflow: 'visible',
                    zIndex: 10,
                    // No padding on mobile to avoid the black gap
                    // SimetrÃ­a perfecta: 3px de separaciÃ³n con el header
                    paddingTop: isDesktop ? `${headerHeight + 3}px` : '0px'
                }}
            >
                <div
                    className="max-w-[1700px] mx-auto relative flex flex-col lg:grid"
                    style={{ 
                        gridTemplateColumns: isDesktop ? `1fr auto minmax(300px, ${sidebarWidth}px)` : 'none',
                        gap: isDesktop ? '0' : '1.5rem'
                    }}
                >
                    {/* Left Column - Player + List on mobile */}
                    <div
                        className="player-column w-full"
                        style={{
                            position: 'relative',
                            zIndex: 10,
                            minWidth: isDesktop ? '450px' : '0'
                        }}
                    >
                        {room && isHost && (
                            <h1 className="mb-3 text-base font-bold tracking-wide sm:text-lg">
                                <span aria-hidden="true">🎬 </span>
                                {getWatchPartySessionTitle(room.id, room.createdAt)}
                            </h1>
                        )}
                        <Player />
                        {/* On mobile/tablet vertical, the list is part of the same parent as the player */}
                        <div className="lg:hidden mt-6 mobile-list-container">
                            <StationList />
                        </div>
                    </div>

                    {/* Resizer Handle (Desktop only) - SeparaciÃ³n de 16px y Grip de 2px */}
                    {isDesktop && (
                        <div
                            onMouseDown={startResizing}
                            className="flex w-[16px] items-center justify-center cursor-col-resize group relative"
                            style={{
                                zIndex: 200,
                                position: 'sticky',
                                top: `calc(var(--header-final-height, 40px) + 3px)`,
                                height: '300px', // Altura del Ã¡rea interactiva (cubre el alto del player)
                                alignSelf: 'start'
                            }}
                        >
                            {/* Línea visual del separador - más visible con puntos de grip */}
                            <div className="flex flex-col items-center gap-1">
                                <div className={`w-[3px] rounded-full transition-all duration-300 ${isResizing ? 'bg-[var(--primary-color)] h-32 shadow-[0_0_8px_var(--primary-color)]' : 'bg-white/25 h-8 group-hover:bg-[var(--primary-color)]/70 group-hover:h-20 group-hover:shadow-[0_0_6px_var(--primary-color)]'}`} />
                                <div className={`flex flex-col gap-1 transition-opacity duration-300 ${isResizing ? 'opacity-0' : 'opacity-40 group-hover:opacity-80'}`}>
                                    <div className="w-1 h-1 rounded-full bg-current" />
                                    <div className="w-1 h-1 rounded-full bg-current" />
                                    <div className="w-1 h-1 rounded-full bg-current" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Right Column - Desktop horizontal */}
                    <div
                        className="hidden lg:flex flex-col sidebar-container"
                        style={{
                            position: 'relative',
                            zIndex: 20,
                            minWidth: 0
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
            <ChatModal
                externalOpen={isChatOpen}
                onOpenChange={setIsChatOpen}
                onOpenChatHelp={() => setIsChatHelpOpen(true)}
                roomCode={roomCode}
            />
            <PanelHost
                activePanel={isWatchPartyOpen ? {
                    kind: 'watchparty',
                    props: {
                        isOpen: true,
                        onClose: handleWatchPartyModalClose,
                        inviteCode: pendingRoomInvite,
                        onInviteCancel: handleRoomInviteCancel,
                        onInviteJoined: handleRoomInviteJoined,
                    },
                } : isChatHelpOpen ? {
                    kind: 'chat-help',
                    props: {
                        isOpen: true,
                        onClose: () => setIsChatHelpOpen(false),
                    },
                } : isAppHelpOpen ? {
                    kind: 'general-help',
                    props: {
                        isOpen: true,
                        onClose: () => setIsAppHelpOpen(false),
                    },
                } : null}
            />
            <div className="mobile-nav-container">
                <MobileNav
                    onChatClick={() => setIsChatOpen(true)}
                    onThemeClick={cycleTheme}
                    onWatchPartyClick={handleMobileWatchPartyNavigation}
                    isGuestCinema={isGuestCinema}
                />
            </div>
        </div>
        </>
    );
}

function UserProfileGate() {
    const { hasProfile } = useUserProfile();
    return hasProfile ? <AppContent /> : <UserProfileForm />;
}

function App() {
    return (
        <UserProfileProvider>
            <RadioProvider>
                <ChatProvider>
                    <WatchPartyProvider>
                        <WatchPartyChatProvider>
                            <UserProfileGate />
                        </WatchPartyChatProvider>
                    </WatchPartyProvider>
                </ChatProvider>
            </RadioProvider>
        </UserProfileProvider>
    );
}

export default App;
