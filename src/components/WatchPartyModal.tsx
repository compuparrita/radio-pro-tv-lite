import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Info, LogOut, PlusCircle, Users } from 'lucide-react';
import { useWatchParty } from '../context/WatchPartyContext';

interface WatchPartyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type WatchPartyTab = 'create' | 'join';

const inputClassName = 'h-12 w-full rounded-xl border border-zinc-700 bg-zinc-800/70 px-4 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20';

function WatchPartyModal({ isOpen, onClose }: WatchPartyModalProps) {
    const [activeTab, setActiveTab] = useState<WatchPartyTab>('create');
    const [userName, setUserName] = useState('');
    const [roomName, setRoomName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [copyError, setCopyError] = useState('');
    const {
        createRoom,
        joinRoom,
        leaveRoom,
        room,
        roomCode,
        members,
        hostId,
        isLoading,
        error,
        isHost,
        clearError,
    } = useWatchParty();

    if (!isOpen) return null;

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        clearError();

        if (activeTab === 'create') {
            void createRoom({ roomName, userName });
        } else {
            void joinRoom({ roomCode: joinCode, userName });
        }
    };

    const handleCopyCode = async () => {
        if (!room) return;
        setCopyError('');
        try {
            await navigator.clipboard.writeText(roomCode ?? room.roomCode);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopyError('No se pudo copiar el código. Puedes seleccionarlo y copiarlo manualmente.');
        }
    };

    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <section
                aria-labelledby="watchparty-title"
                aria-modal="true"
                className="mx-4 my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 text-white shadow-2xl"
                role="dialog"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex items-start justify-between border-b border-white/10 px-5 py-6 sm:px-7">
                    <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">WATCHPARTY BETA</p>
                        <h2 id="watchparty-title" className="text-2xl font-bold tracking-tight">Cine Compartido</h2>
                        <p className="mt-2 text-sm text-white/55">{'Sincroniza pel\u00edculas, TV y YouTube con tus amigos.'}</p>
                    </div>
                    <button
                        aria-label="Cerrar"
                        className="flex h-10 w-10 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
                        onClick={onClose}
                        type="button"
                    >
                        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </header>

                {error && (
                    <div className="mx-5 mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 sm:mx-7" role="alert">
                        <span className="mr-2 font-bold">{error.code}</span>
                        {error.message}
                    </div>
                )}

                {room ? (
                    <div className="space-y-5 px-5 py-6 sm:px-7 sm:py-7">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Sala</p>
                                <h3 className="mt-1 truncate text-xl font-bold">{room.name}</h3>
                            </div>
                            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold tracking-wider ${isHost ? 'bg-cyan-400/15 text-cyan-200' : 'bg-zinc-800 text-zinc-300'}`}>
                                {isHost ? 'HOST' : 'GUEST'}
                            </span>
                        </div>

                        <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-5 text-center">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Código de sala</p>
                            <p className="my-3 font-mono text-3xl font-bold tracking-[0.25em] text-white sm:text-4xl">
                                {roomCode ?? room.roomCode}
                            </p>
                            <button
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-zinc-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                                onClick={() => void handleCopyCode()}
                                type="button"
                            >
                                {copied ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
                                {copied ? 'Copiado' : 'Copiar código'}
                            </button>
                            {copyError && <p className="mt-2 text-xs text-red-300" role="alert">{copyError}</p>}
                        </div>

                        <div>
                            <div className="mb-3 flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-zinc-200">Miembros</h4>
                                <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">{members.length}</span>
                            </div>
                            <ul className="max-h-48 space-y-2 overflow-y-auto">
                                {members.map((member) => (
                                    <li key={member.socketId} className="flex items-center justify-between rounded-xl bg-zinc-800/70 px-4 py-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${member.socketId === hostId ? 'bg-cyan-300' : 'bg-zinc-500'}`} />
                                            <span className="truncate text-sm font-medium text-white">{member.userName}</span>
                                        </div>
                                        <span className={`ml-3 text-xs font-semibold ${member.socketId === hostId ? 'text-cyan-200' : 'text-zinc-400'}`}>
                                            {member.socketId === hostId ? 'HOST' : 'GUEST'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button
                            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-60"
                            disabled={isLoading}
                            onClick={() => void leaveRoom()}
                            type="button"
                        >
                            <LogOut aria-hidden="true" size={17} />
                            {isLoading ? 'Saliendo...' : 'Salir de la sala'}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="px-5 pt-6 sm:px-7">
                            <div aria-label="Opciones de WatchParty" className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-800/70 p-1" role="tablist">
                                <button
                                    aria-selected={activeTab === 'create'}
                                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold transition ${activeTab === 'create' ? 'bg-zinc-700 text-white shadow-sm' : 'bg-transparent text-zinc-400 hover:text-zinc-200'}`}
                                    onClick={() => { setActiveTab('create'); clearError(); }}
                                    role="tab"
                                    type="button"
                                >
                                    <PlusCircle aria-hidden="true" size={17} />
                                    Crear Sala
                                </button>
                                <button
                                    aria-selected={activeTab === 'join'}
                                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold transition ${activeTab === 'join' ? 'bg-zinc-700 text-white shadow-sm' : 'bg-transparent text-zinc-400 hover:text-zinc-200'}`}
                                    onClick={() => { setActiveTab('join'); clearError(); }}
                                    role="tab"
                                    type="button"
                                >
                                    <Users aria-hidden="true" size={17} />
                                    Unirse
                                </button>
                            </div>
                        </div>

                        <form className="space-y-5 px-5 py-6 sm:px-7 sm:py-7" onSubmit={handleSubmit}>
                            <label className="block space-y-2 text-sm font-medium text-white/75">
                                Alias del usuario
                                <input
                                    autoComplete="nickname"
                                    className={inputClassName}
                                    onChange={(event) => setUserName(event.target.value)}
                                    placeholder="Tu nombre"
                                    required
                                    value={userName}
                                />
                            </label>

                            {activeTab === 'create' ? (
                                <label className="block space-y-2 text-sm font-medium text-white/75">
                                    Nombre de la sala
                                    <input className={inputClassName} onChange={(event) => setRoomName(event.target.value)} placeholder="Noche de cine" required value={roomName} />
                                </label>
                            ) : (
                                <label className="block space-y-2 text-sm font-medium text-white/75">
                                    {'C\u00f3digo de sala'}
                                    <input
                                        className={`${inputClassName} uppercase tracking-[0.2em] text-center`}
                                        onChange={(event) => setJoinCode(event.target.value)}
                                        placeholder="A7K9P2"
                                        required
                                        value={joinCode}
                                    />
                                </label>
                            )}

                            <button
                                className="min-h-12 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-950/30 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-wait disabled:opacity-60"
                                disabled={isLoading}
                                type="submit"
                            >
                                {isLoading ? 'Conectando...' : activeTab === 'create' ? 'Crear Sala' : 'Unirse a la Sala'}
                            </button>
                        </form>
                    </>
                )}

                {!room && (
                    <footer className="px-5 pb-5 sm:px-7 sm:pb-7">
                        <div className="flex gap-3 rounded-xl bg-zinc-800 p-4 text-sm leading-relaxed text-zinc-300">
                            <Info aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-300" size={18} />
                            <p>
                                <span className="mb-0.5 block font-semibold text-white">Beta</span>
                                {'El anfitri\u00f3n controla la reproducci\u00f3n y los invitados pueden seguir la sincronizaci\u00f3n en tiempo real.'}
                            </p>
                        </div>
                    </footer>
                )}
            </section>
        </div>
    );

    return createPortal(modalContent, document.body);
}

export default WatchPartyModal;
