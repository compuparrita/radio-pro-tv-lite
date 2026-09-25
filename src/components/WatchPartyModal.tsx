import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, HelpCircle, LogOut, PlusCircle, Users, X } from 'lucide-react';
import { useWatchParty } from '../context/WatchPartyContext';

interface WatchPartyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type WatchPartyTab = 'create' | 'join';

const inputClassName = 'h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10';
const secondaryButtonClassName = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/50';

function WatchPartyModal({ isOpen, onClose }: WatchPartyModalProps) {
    const [activeTab, setActiveTab] = useState<WatchPartyTab>('create');
    const [roomName, setRoomName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [copyError, setCopyError] = useState('');
    const [isHelpOpen, setIsHelpOpen] = useState(false);
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
        needsSyncPlayback,
        syncPlayback,
    } = useWatchParty();

    if (!isOpen) return null;

    const hostName = members.find((member) => member.socketId === hostId)?.userName ?? 'Anfitrión';

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        clearError();
        if (activeTab === 'create') {
            void createRoom({ roomName });
        } else {
            void joinRoom({ roomCode: joinCode });
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
            setCopyError('No se pudo copiar el código.');
        }
    };

    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <section
                aria-labelledby="watchparty-title"
                aria-modal="true"
                className="relative flex max-h-[84vh] w-full max-w-[460px] flex-col overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#111318]/95 text-white shadow-[0_24px_100px_rgba(0,0,0,0.55)] backdrop-blur-xl"
                role="dialog"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex items-start justify-between border-b border-white/[0.07] px-6 py-5">
                    <div>
                        <h2 id="watchparty-title" className="text-xl font-semibold tracking-tight">WatchParty</h2>
                        <p className="mt-1 text-sm text-white/45">
                            {room
                                ? (isHost ? 'Comparte esta sala con tus amigos' : 'Conectado a la sala')
                                : 'Disfruta y sincroniza contenido en grupo'}
                        </p>
                    </div>
                    <button
                        aria-label="Cerrar"
                        className="-mr-2 -mt-1 flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition hover:bg-white/[0.07] hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
                        onClick={onClose}
                        type="button"
                    >
                        <X aria-hidden="true" size={18} />
                    </button>
                </header>

                <div className="space-y-5 overflow-y-auto px-6 py-5">
                    {error && (
                        <div className="rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-sm text-red-200" role="alert">
                            {error.code !== 'ROOM_ENDED' && <span className="mr-2 font-semibold">{error.code}</span>}{error.message}
                        </div>
                    )}

                    {room ? (
                        <>
                            <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">Sala</p>
                                        <h3 className="mt-1 truncate text-lg font-medium text-white/90">{room.name}</h3>
                                    </div>
                                    {isHost && (
                                        <span className="shrink-0 rounded-full border border-cyan-200/15 bg-cyan-200/[0.07] px-2.5 py-1 text-[11px] font-medium text-cyan-100/80">
                                            Anfitrión
                                        </span>
                                    )}
                                </div>

                                {isHost ? (
                                    <>
                                        <div className="mt-5 rounded-xl bg-black/20 px-4 py-4 text-center">
                                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">{'Código de sala'}</p>
                                            <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.28em] text-white">
                                                {roomCode ?? room.roomCode}
                                            </p>
                                        </div>
                                        <div className="mt-3 flex flex-wrap justify-center gap-2">
                                            <button className={secondaryButtonClassName} onClick={() => void handleCopyCode()} type="button">
                                                {copied ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
                                                {copied ? 'Copiado' : 'Copiar'}
                                            </button>
                                            <button className={secondaryButtonClassName} onClick={() => setIsHelpOpen(true)} type="button">
                                                <HelpCircle aria-hidden="true" size={15} />
                                                {'¿Cómo funciona?'}
                                            </button>
                                        </div>
                                        {copyError && <p className="mt-2 text-center text-xs text-red-300" role="alert">{copyError}</p>}
                                    </>
                                ) : (
                                    <div className="mt-4 space-y-3">
                                        <div className="rounded-xl bg-black/20 px-4 py-3">
                                            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">{'Código'}</p>
                                            <p className="mt-1 font-mono text-lg font-medium tracking-[0.2em] text-white/85">{roomCode ?? room.roomCode}</p>
                                        </div>
                                        <p className="text-sm text-white/55">{'Anfitrión: '}<span className="text-white/85">{hostName}</span></p>
                                        {needsSyncPlayback && !isHost && (
                                            <div className="rounded-xl border border-cyan-200/15 bg-cyan-200/[0.06] p-4">
                                                <p className="text-sm text-white/75">{hostName} está reproduciendo</p>
                                                <button
                                                    className="mt-3 min-h-11 w-full rounded-xl bg-white text-sm font-semibold text-zinc-950 transition hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-200/70"
                                                    onClick={syncPlayback}
                                                    type="button"
                                                >
                                                    Sincronizar y reproducir
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>

                            <section aria-labelledby="watchparty-participants">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm font-medium text-white/75">
                                        <Users aria-hidden="true" className="text-white/40" size={16} />
                                        <h3 id="watchparty-participants">Participantes</h3>
                                    </div>
                                    <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs tabular-nums text-white/45">{members.length}</span>
                                </div>
                                <ul className="max-h-40 space-y-1.5 overflow-y-auto">
                                    {members.map((member) => {
                                        const isMemberHost = member.socketId === hostId;
                                        return (
                                            <li key={member.socketId} className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-white/[0.035]">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span className={'h-2 w-2 shrink-0 rounded-full ' + (isMemberHost ? 'bg-cyan-200' : 'bg-white/25')} />
                                                    <span className="truncate text-sm text-white/80">{member.userName}</span>
                                                </div>
                                                {isMemberHost && <span className="text-[11px] font-medium text-cyan-100/65">Anfitrión</span>}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        </>
                    ) : (
                        <>
                            <div aria-label="Opciones de WatchParty" className="grid grid-cols-2 rounded-xl bg-white/[0.04] p-1" role="tablist">
                                <button
                                    aria-selected={activeTab === 'create'}
                                    className={'rounded-lg px-3 py-2.5 text-sm font-medium transition ' + (activeTab === 'create' ? 'bg-white/[0.09] text-white' : 'text-white/45 hover:text-white/75')}
                                    onClick={() => { setActiveTab('create'); clearError(); }}
                                    role="tab"
                                    type="button"
                                >
                                    <span className="inline-flex items-center gap-2"><PlusCircle aria-hidden="true" size={15} />Crear sala</span>
                                </button>
                                <button
                                    aria-selected={activeTab === 'join'}
                                    className={'rounded-lg px-3 py-2.5 text-sm font-medium transition ' + (activeTab === 'join' ? 'bg-white/[0.09] text-white' : 'text-white/45 hover:text-white/75')}
                                    onClick={() => { setActiveTab('join'); clearError(); }}
                                    role="tab"
                                    type="button"
                                >
                                    Unirse
                                </button>
                            </div>

                            <form className="space-y-4" onSubmit={handleSubmit}>
                                {activeTab === 'create' ? (
                                    <label className="block space-y-2 text-sm text-white/65">
                                        Nombre de la sala
                                        <input className={inputClassName} onChange={(event) => setRoomName(event.target.value)} placeholder="Noche de cine" required value={roomName} />
                                    </label>
                                ) : (
                                    <label className="block space-y-2 text-sm text-white/65">
                                        {'Código de sala'}
                                        <input
                                            className={inputClassName + ' text-center uppercase tracking-[0.2em]'}
                                            onChange={(event) => setJoinCode(event.target.value)}
                                            placeholder="A7K9P2"
                                            required
                                            value={joinCode}
                                        />
                                    </label>
                                )}
                                <button
                                    className="min-h-11 w-full rounded-xl bg-white text-sm font-semibold text-zinc-950 transition hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-200/70 disabled:cursor-wait disabled:opacity-55"
                                    disabled={isLoading}
                                    type="submit"
                                >
                                    {isLoading ? 'Conectando...' : activeTab === 'create' ? 'Crear sala' : 'Unirse a la sala'}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <footer className="border-t border-white/[0.07] px-6 py-4">
                    {room ? (
                        isHost ? (
                            <button
                                className="min-h-11 w-full rounded-xl bg-white/[0.07] text-sm font-medium text-white/85 transition hover:bg-white/[0.11] focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-wait disabled:opacity-50"
                                disabled={isLoading}
                                onClick={() => {
                                    void leaveRoom().then((left) => {
                                        if (left) onClose();
                                    });
                                }}
                                type="button"
                            >
                                {isLoading ? 'Abandonando...' : 'Abandonar sala'}
                            </button>
                        ) : (
                            <button
                                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-300/15 bg-red-300/[0.06] text-sm font-medium text-red-100/85 transition hover:bg-red-300/[0.1] focus:outline-none focus:ring-2 focus:ring-red-200/30 disabled:opacity-50"
                                disabled={isLoading}
                                onClick={() => void leaveRoom()}
                                type="button"
                            >
                                <LogOut aria-hidden="true" size={15} />
                                {isLoading ? 'Saliendo...' : 'Salir de la sala'}
                            </button>
                        )
                    ) : (
                        <button className="w-full py-1 text-sm text-white/40 transition hover:text-white/75" onClick={() => setIsHelpOpen(true)} type="button">
                            {'¿Cómo funciona?'}
                        </button>
                    )}
                </footer>

                {isHelpOpen && createPortal(
                    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setIsHelpOpen(false)}>
                        <section
                            aria-labelledby="watchparty-help-title"
                            aria-modal="true"
                            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#17191f] p-5 text-white shadow-2xl"
                            role="dialog"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 id="watchparty-help-title" className="font-semibold">{'¿Cómo funciona?'}</h3>
                                    <p className="mt-1 text-xs text-white/40">Una sala compartida, sincronizada en tiempo real.</p>
                                </div>
                                <button aria-label="Cerrar ayuda" className="rounded-full p-1 text-white/45 hover:bg-white/10 hover:text-white" onClick={() => setIsHelpOpen(false)} type="button">
                                    <X aria-hidden="true" size={17} />
                                </button>
                            </div>
                            <ol className="mt-5 space-y-3 text-sm text-white/65">
                                <li className="flex gap-3"><span className="text-cyan-200/70">01</span><span>El anfitrión crea una sala.</span></li>
                                <li className="flex gap-3"><span className="text-cyan-200/70">02</span><span>Comparte el código con sus amigos.</span></li>
                                <li className="flex gap-3"><span className="text-cyan-200/70">03</span><span>Los invitados ingresan el código para unirse.</span></li>
                                <li className="flex gap-3"><span className="text-cyan-200/70">04</span><span>La reproducción, las pausas y el contenido se sincronizan automáticamente.</span></li>
                                <li className="flex gap-3"><span className="text-cyan-200/70">05</span><span>Si el anfitrión sale, el rol se transfiere automáticamente.</span></li>
                            </ol>
                            <button className="mt-5 min-h-10 w-full rounded-xl bg-white/[0.07] text-sm font-medium text-white/80 hover:bg-white/[0.11]" onClick={() => setIsHelpOpen(false)} type="button">
                                Entendido
                            </button>
                        </section>
                    </div>,
                    document.body,
                )}
            </section>
        </div>
    );

    return createPortal(modalContent, document.body);
}

export default WatchPartyModal;
