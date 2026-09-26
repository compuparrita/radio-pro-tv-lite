import { LogOut, MessageCircle, Users } from 'lucide-react';
import { useWatchParty } from '../context/WatchPartyContext';
import { Player } from './Player';

interface GuestCinemaLayoutProps {
    isConnected: boolean;
    onChatClick: () => void;
    onExitCinema: () => void;
}

export function GuestCinemaLayout({ isConnected, onChatClick, onExitCinema }: GuestCinemaLayoutProps) {
    const { members, mediaInfo, room } = useWatchParty();
    const host = members.find((member) => member.role === 'host')
        ?? room?.members.find((member) => member.role === 'host');
    const participantCount = members.length || room?.members.length || 0;

    return (
        <main className="min-h-screen bg-[var(--dark-bg)] text-[var(--text-primary)]">
            <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:gap-8 sm:px-8 sm:py-8 lg:px-12">
                <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <h1 className="text-base font-bold tracking-wide sm:text-lg">
                        <span aria-hidden="true">🎬 </span>Noche de cine
                    </h1>
                    <div className="flex shrink-0 items-center gap-3 sm:gap-5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] sm:text-sm" role="status" aria-live="polite">
                            <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]' : 'bg-amber-400 animate-pulse'}`} />
                            <Users aria-hidden="true" size={15} />
                            <span>{participantCount} {participantCount === 1 ? 'participante' : 'participantes'}</span>
                        </div>
                        <button
                            aria-label="Salir del Modo Cine"
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-cyan-200"
                            onClick={onExitCinema}
                            title="Salir del Modo Cine"
                            type="button"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </header>

                <section className="w-full flex-1" aria-label="Cine compartido">
                    <Player />
                </section>

                <section className="border-t border-white/10 pt-4 sm:pt-5" aria-label="Contenido compartido">
                    <h2 className="truncate text-base font-semibold sm:text-lg">
                        {mediaInfo?.title || 'Contenido compartido'}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        Compartido por {host?.userName || 'Anfitrión'}
                    </p>
                </section>
            </div>

            <button
                aria-label="Abrir chat"
                className="fixed bottom-5 right-5 z-[250] flex h-14 w-14 items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-400 text-slate-950 shadow-[0_8px_30px_rgba(34,211,238,0.25)] transition hover:scale-105 hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dark-bg)] sm:bottom-8 sm:right-8"
                onClick={onChatClick}
                title="Abrir chat"
                type="button"
            >
                <MessageCircle size={22} />
            </button>
        </main>
    );
}
