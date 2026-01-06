import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { RadioProvider } from './context/RadioContext';
import { ChatProvider } from './context/ChatContext';
import { Header } from './components/Header';
import { Player } from './components/Player';
import { StationList } from './components/StationList';
import { StationManager } from './components/StationManager';
import { ThemeToggle } from './components/ThemeToggle';
import { ChatModal } from './components/ChatModal';
import { MobileNav } from './components/MobileNav';
import { useTVRemote } from './hooks/useTVRemote';

function AppContent() {
    const [isManagerOpen, setIsManagerOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light' | 'youth'>(() => {
        const saved = localStorage.getItem('theme');
        return (saved as 'dark' | 'light' | 'youth') || 'dark';
    });

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

    return (
        <div className="min-h-screen pb-12">
            <div className="animated-bg"></div>
            <div className="hidden md:block">
                <ThemeToggle />
            </div>

            {/* Main content container */}
            <div className="container mx-auto px-4">
                <Header />

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 lg:gap-6 max-w-[1700px] mx-auto mt-4">
                    {/* Left Column: Player & Mobile Station List */}
                    <div className="">
                        <Player />
                        {/* On mobile, the list is part of the same parent as the player, 
                            so the sticky video stays active while scrolling the list */}
                        <div className="lg:hidden mt-4">
                            <StationList />
                        </div>
                    </div>

                    {/* Right Column: Station List (Desktop only) */}
                    <div className="hidden lg:flex h-full flex-col gap-6">
                        <StationList />
                    </div>
                </div>

                <div className="text-center mt-12 text-[var(--text-secondary)] text-sm mb-20 md:mb-0">
                    <button
                        onClick={() => setIsManagerOpen(true)}
                        className="flex items-center gap-2 mx-auto hover:text-[var(--primary-color)] transition-colors mb-4"
                    >
                        <Settings size={16} /> Gestionar Emisoras
                    </button>
                    <p>© 2025 Radio Streaming Pro - Versión ti8ocb</p>
                </div>
            </div>

            <StationManager isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} />
            <ChatModal externalOpen={isChatOpen} onOpenChange={setIsChatOpen} />
            <MobileNav onChatClick={() => setIsChatOpen(true)} onThemeClick={cycleTheme} />
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
