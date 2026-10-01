import { LogOut, MessageCircle, Play, Users } from 'lucide-react';
import { useWatchParty } from '../context/WatchPartyContext';
import { Player } from './Player';

interface GuestCinemaLayoutProps {
    isConnected: boolean;
    onChatClick: () => void;
    onExitCinema: () => void;
}

export function GuestCinemaLayout({ isConnected, onChatClick, onExitCinema }: GuestCinemaLayoutProps) {
    const { members, mediaInfo, room, needsSyncPlayback, syncPlayback } = useWatchParty();
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

                {needsSyncPlayback && (
                    <aside aria-label="Sincronización requerida" className="rounded-2xl border border-cyan-400/30 bg-gradient-to-r from-cyan-950/60 to-slate-900/60 p-4 shadow-xl backdrop-blur-md">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3 text-center sm:text-left">
                                <span className="flex h-3 w-3 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                                </span>
                                <div>
                                    <h3 className="font-semibold text-white text-sm">El anfitrión está reproduciendo</h3>
                                    <p className="text-xs text-white/60">Haz clic en sincronizar para ver y escuchar en tiempo real con el grupo.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={syncPlayback}
                                className="shrink-0 flex items-center gap-2 rounded-full bg-cyan-400 hover:bg-cyan-300 px-5 py-2 text-xs font-bold text-slate-950 transition hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                            >
                                <Play size={14} fill="currentColor" />
                                Sincronizar ahora
                            </button>
                        </div>
                    </aside>
                )}

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
