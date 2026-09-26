import { LogOut, MessageCircle } from 'lucide-react';
import { Player } from './Player';

interface GuestCinemaLayoutProps {
    isConnected: boolean;
    isLeaving: boolean;
    onChatClick: () => void;
    onLeaveRoom: () => void;
}

export function GuestCinemaLayout({ isConnected, isLeaving, onChatClick, onLeaveRoom }: GuestCinemaLayoutProps) {
    return (
        <main className="min-h-screen bg-[var(--dark-bg)] text-[var(--text-primary)]">
            <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:gap-8 sm:px-8 sm:py-8 lg:px-12">
                <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <h1 className="text-base font-bold tracking-wide sm:text-lg">
                        WatchParty <span className="ml-1 font-medium text-[var(--text-secondary)]">Invitado</span>
                    </h1>
                    <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] sm:text-sm" role="status" aria-live="polite">
                        <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                        {isConnected ? 'Conectado' : 'Reconectando'}
                    </div>
                </header>

                <section className="w-full flex-1" aria-label="Cine compartido">
                    <Player />
                </section>

                <footer className="flex flex-col-reverse gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-[var(--text-secondary)]">Estás viendo la sala como invitado.</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-semibold transition hover:bg-white/10"
                            onClick={onChatClick}
                            type="button"
                        >
                            <MessageCircle size={17} /> Chat
                        </button>
                        <button
                            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-rose-300/20 bg-rose-400/10 px-4 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/20 disabled:cursor-wait disabled:opacity-60"
                            disabled={isLeaving}
                            onClick={onLeaveRoom}
                            type="button"
                        >
                            <LogOut size={17} /> {isLeaving ? 'Saliendo…' : 'Salir de la sala'}
                        </button>
                    </div>
                </footer>
            </div>
        </main>
    );
}
