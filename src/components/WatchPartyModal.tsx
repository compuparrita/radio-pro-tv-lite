import { useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { Check, Copy, HelpCircle, LogOut, PlusCircle, Radio, Users } from 'lucide-react';
import { useWatchParty } from '../context/WatchPartyContext';
import { useRadio } from '../context/RadioContext';
import { generateQrCodeMatrix } from '../utils/qrCode';
import { parseHelpMarkdown } from '../content/helpMarkdown';
import watchPartyHelpMarkdown from '../../help/watchparty.md?raw';
import type { PanelShellProps } from './panels/PanelShell';

export interface WatchPartyModalProps {
    isOpen: boolean;
    onClose: () => void;
    inviteCode?: string | null;
    onInviteCancel?: () => void;
    onInviteJoined?: () => void;
    onReturnToApp?: () => void;
}

interface WatchPartyModalHostProps extends WatchPartyModalProps {
    PanelShellComponent: ComponentType<PanelShellProps>;
}

type WatchPartyTab = 'create' | 'join';

const watchPartyHelp = parseHelpMarkdown(watchPartyHelpMarkdown);
const watchPartyHelpIcons = [PlusCircle, Users, Radio];

const inputClassName = 'h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10';
const secondaryButtonClassName = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/50';

function WatchPartyModal({ isOpen, onClose, inviteCode, onInviteCancel, onInviteJoined, onReturnToApp, PanelShellComponent }: WatchPartyModalHostProps) {
    const { currentStation } = useRadio();
    const [activeTab, setActiveTab] = useState<WatchPartyTab>('create');
    const [roomName, setRoomName] = useState('');
    const wasOpen = useRef(false);
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
    const activeRoomCode = roomCode ?? room?.roomCode;
    const inviteUrl = activeRoomCode ? `${window.location.origin}/?room=${activeRoomCode}` : '';
    const qrMatrix = room && isHost && inviteUrl ? generateQrCodeMatrix(inviteUrl) : null;
    const qrSvgSize = qrMatrix ? qrMatrix.length + 8 : 0;
    const qrSvgPath = qrMatrix
        ? qrMatrix.flatMap((row, y) => row.flatMap((dark, x) => dark ? [`M${x + 4} ${y + 4}h1v1h-1z`] : [])).join(' ')
        : '';

    useEffect(() => {
        if (isOpen && !wasOpen.current) {
            setRoomName(currentStation?.name?.trim() ?? '');
        }
        wasOpen.current = isOpen;
    }, [isOpen, currentStation?.name]);

    const hostName = members.find((member) => member.socketId === hostId)?.userName ?? 'Anfitrión';

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        clearError();
        if (activeTab === 'create') {
            void createRoom({ roomName: roomName.trim() || currentStation?.name?.trim() || '' });
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

    const handleInviteJoin = async () => {
        if (!inviteCode) return;
        const joined = await joinRoom({ roomCode: inviteCode });
        if (joined) onInviteJoined?.();
    };

    const panelFooter = !isHelpOpen ? (
        <footer className="border-t border-white/[0.07] px-5 py-4 sm:px-6">
            {inviteCode ? (
                <div className="flex gap-3">
                    <button
                        className="min-h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-medium text-white/75 transition hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-white/20"
                        onClick={onInviteCancel}
                        type="button"
                    >
                        Cancelar
                    </button>
                    <button
                        className="min-h-11 flex-1 rounded-xl bg-white text-sm font-semibold text-zinc-950 transition hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-200/70 disabled:cursor-wait disabled:opacity-55"
                        disabled={isLoading}
                        onClick={() => void handleInviteJoin()}
                        type="button"
                    >
                        Unirse
                    </button>
                </div>
            ) : room ? (
                <div className={onReturnToApp ? 'flex flex-wrap gap-2' : ''}>
                    {onReturnToApp && (
                        <button
                            className="min-h-11 min-w-28 flex-[1_1_7rem] rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-white/20"
                            onClick={onReturnToApp}
                            type="button"
                        >
                            Ir a App
                        </button>
                    )}
                    {isHost ? (
                        <button
                            className={`${onReturnToApp ? 'min-w-36 flex-[1_1_9rem] border border-red-300/15 bg-red-300/[0.06] text-red-100/85 hover:bg-red-300/[0.1]' : 'w-full bg-white/[0.07] text-white/85 hover:bg-white/[0.11]'} min-h-11 rounded-xl px-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-wait disabled:opacity-50`}
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
                            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300/15 bg-red-300/[0.06] px-3 text-sm font-medium text-red-100/85 transition hover:bg-red-300/[0.1] focus:outline-none focus:ring-2 focus:ring-red-200/30 disabled:opacity-50 ${onReturnToApp ? 'min-w-36 flex-[1_1_9rem]' : 'w-full'}`}
                            disabled={isLoading}
                            onClick={() => void leaveRoom()}
                            type="button"
                        >
                            <LogOut aria-hidden="true" size={15} />
                            {isLoading ? 'Saliendo...' : 'Abandonar sala'}
                        </button>
                    )}
                </div>
            ) : (
                <button className="w-full py-1 text-sm text-white/40 transition hover:text-white/75" onClick={() => setIsHelpOpen(true)} type="button">
                    {'¿Cómo funciona?'}
                </button>
            )}
        </footer>
    ) : null;

    const modalContent = (
        <PanelShellComponent
            ariaLabel="Panel Cine y WatchParty"
            backButtonLabel="Volver a gestión de sala"
            closeButtonLabel="Cerrar panel WatchParty"
            description={!isHelpOpen && !inviteCode ? (
                room && isHost
                    ? 'Invita a cualquier persona con un código o QR.'
                    : room
                        ? 'Conectado a la sala'
                        : 'Disfruta y sincroniza contenido en grupo'
            ) : undefined}
            footer={panelFooter}
            isOpen={isOpen}
            onBack={isHelpOpen ? () => setIsHelpOpen(false) : undefined}
            onClose={onClose}
            title={isHelpOpen ? 'Ayuda' : inviteCode ? 'Unirse a una sala' : room && isHost ? 'Compartir sala' : 'WatchParty'}
            titleId="watchparty-title"
        >
                    {isHelpOpen ? (
                        <div className="space-y-4 pb-1 text-sm text-[var(--text-secondary)]">
                            <div className="border-b border-[var(--glass-border)] pb-4">
                                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--primary-color)]"><Radio aria-hidden="true" size={12} />{watchPartyHelp.title}</p>
                                <h3 id="watchparty-help-title" className="mt-1 text-base font-semibold tracking-tight text-[var(--text-primary)]">{watchPartyHelp.subtitle}</h3>
                                <p className="mt-1.5 text-[13px] leading-5 text-[var(--text-secondary)]">{watchPartyHelp.introduction}</p>
                            </div>
                            <div className="space-y-3">
                                {watchPartyHelp.sections.map((section, sectionIndex) => {
                                    const SectionIcon = watchPartyHelpIcons[sectionIndex] ?? Radio;

                                    return (
                                        <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4" key={section.title}>
                                            <div className="flex items-center gap-2.5">
                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--dark-border)] bg-[var(--glass-bg)] text-[var(--primary-color)]"><SectionIcon aria-hidden="true" size={15} /></span>
                                                <h4 className="text-sm font-semibold text-[var(--text-primary)]">{section.title}</h4>
                                            </div>
                                            <ol className="mt-3 space-y-2.5">
                                                {section.steps.map((step) => (
                                                    <li className="flex gap-3 text-[13px] leading-5 text-[var(--text-primary)]" key={step.number}>
                                                        <span className="pt-0.5 text-[10px] font-semibold tracking-wide text-[var(--primary-color)]">{String(step.number).padStart(2, '0')}</span>
                                                        <span>{step.text}</span>
                                                    </li>
                                                ))}
                                            </ol>
                                        </section>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-sm text-red-200" role="alert">
                                    {error.code !== 'ROOM_ENDED' && <span className="mr-2 font-semibold">{error.code}</span>}{error.message}
                                </div>
                            )}

                            {inviteCode ? (
                        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-center">
                            <p className="text-sm text-white/65">Has abierto una invitación de WatchParty.</p>
                            <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">Código de sala</p>
                            <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.24em] text-white">{inviteCode}</p>
                        </section>
                    ) : room ? (
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
                                        <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
                                            <div className="flex shrink-0 flex-col items-center gap-2">
                                                {qrMatrix ? (
                                                    <svg
                                                        aria-label="Código QR para unirse a la sala"
                                                        className="h-[120px] w-[120px] rounded-xl bg-white shadow-inner"
                                                        role="img"
                                                        shapeRendering="crispEdges"
                                                        viewBox={`0 0 ${qrSvgSize} ${qrSvgSize}`}
                                                    >
                                                        <rect fill="white" height={qrSvgSize} width={qrSvgSize} />
                                                        <path d={qrSvgPath} fill="black" />
                                                    </svg>
                                                ) : (
                                                    <div aria-label="No se pudo generar el código QR" className="flex h-[120px] w-[120px] items-center justify-center rounded-xl bg-white text-center text-xs text-zinc-600 shadow-inner" role="img">
                                                        QR no disponible
                                                    </div>
                                                )}
                                                <p className="text-center text-[11px] text-white/40">Escanear para unirse</p>
                                            </div>
                                            <div className="flex min-w-0 flex-col items-center text-center sm:items-start sm:text-left">
                                                <p className="text-sm font-medium text-white/55">Código de sala</p>
                                                <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.24em] text-white">
                                                    {roomCode ?? room.roomCode}
                                                </p>
                                                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                                                    <button className={secondaryButtonClassName} onClick={() => void handleCopyCode()} type="button">
                                                        {copied ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
                                                        {copied ? 'Copiado' : 'Copiar código'}
                                                    </button>
                                                    <button className={secondaryButtonClassName} onClick={() => setIsHelpOpen(true)} type="button">
                                                        <HelpCircle aria-hidden="true" size={15} />
                                                        {'¿Cómo funciona?'}
                                                    </button>
                                                </div>
                                            </div>
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
                        </>
                    )}
                </PanelShellComponent>
    );

    return modalContent;
}

export default WatchPartyModal;
