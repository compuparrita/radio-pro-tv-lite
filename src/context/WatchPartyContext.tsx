import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { setRadioMediaChangeAllowed, useRadio } from './RadioContext';
import { useUserProfile } from './UserProfileContext';
import type { Station } from '../types';
import type { MediaInfo, WatchPartyAction, WatchPartyMember } from '../types/watchparty';
import { socketService } from '../services/socketService';
import {
    connectWatchPartySocket,
    createRoom as sendCreateRoom,
    getWatchPartySocketId,
    isWatchPartySocketConnected,
    joinRoom as sendJoinRoom,
    leaveRoom as sendLeaveRoom,
    sendAction as emitWatchPartyAction,
    onWatchPartyConnectionStatus,
    registerErrorListener,
    registerActionListener,
    registerStateListener,
    registerHostChangedListener,
    registerMembersListener,
    registerMediaListener,
    changeMedia,
    type WatchPartyErrorEvent,
    type WatchPartyRoomData,
    type WatchPartyResponse,
} from '../services/watchPartySocket';

interface WatchPartyContextValue {
    room: WatchPartyRoomData | null;
    members: WatchPartyMember[];
    hostId: string | null;
    roomCode: string | null;
    isConnected: boolean;
    isLoading: boolean;
    error: WatchPartyErrorEvent | null;
    isHost: boolean;
    canChangeMedia: boolean;
    needsSyncPlayback: boolean;
    mediaInfo: MediaInfo | null;
    stateVersion: number;
    remoteExecutionRef: string | null;
    pendingAction: WatchPartyAction | null;
    createRoom: (payload: { roomName: string }) => Promise<boolean>;
    joinRoom: (payload: { roomCode: string }) => Promise<boolean>;
    leaveRoom: () => Promise<boolean>;
    sendAction: (action: WatchPartyAction['action'], payload: unknown) => Promise<WatchPartyResponse>;
    consumePendingAction: () => WatchPartyAction | null;
    clearRemoteExecutionRef: () => void;
    clearError: () => void;
    syncPlayback: () => void;
}

const WatchPartyContext = createContext<WatchPartyContextValue | undefined>(undefined);

interface WatchPartyHeartbeat {
    roomCode: string;
    stateVersion: number;
    currentTime: number;
    isPlaying: boolean;
    isLive: boolean;
    timestamp: number;
}

function getMediaInfo(value: unknown): MediaInfo | null {
    if (!value || typeof value !== 'object') return null;
    const media = value as Partial<MediaInfo>;
    if (typeof media.stationId !== 'string'
        || typeof media.sourceUrl !== 'string') return null;
    const validTypes = ['youtube', 'hls', 'video', 'audio', 'iframe'];
    const mediaType = (media.mediaType && validTypes.includes(media.mediaType))
        ? media.mediaType
        : 'video';
    return {
        stationId: media.stationId,
        mediaType: mediaType as MediaInfo['mediaType'],
        sourceUrl: media.sourceUrl,
        title: typeof media.title === 'string' ? media.title : 'Emisión',
        isLive: Boolean(media.isLive),
    };
}

function getYouTubeId(sourceUrl: string): string | null {
    return sourceUrl.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([^?&/]+)/i)?.[1] ?? null;
}

function createMediaInfo(station: Station | null): MediaInfo | null {
    if (!station) return null;
    const sourceUrl = station.iframeUrl || station.url;
    if (!sourceUrl) return null;
    const isYt = station.id.startsWith('yt-') || /youtube(?:-nocookie)?\.com|youtu\.be/i.test(sourceUrl);
    const isHls = /\.m3u8(?:$|[?#])|\/repretel-|\/proxy-stream/i.test(sourceUrl);
    const mediaType: MediaInfo['mediaType'] = isYt
        ? 'youtube'
        : (station.type === 'audio' ? 'audio' : isHls ? 'hls' : station.iframeUrl || station.embedCanal ? 'iframe' : 'video');
    const isLive = mediaType !== 'youtube' && Boolean((station as Station & { isLive?: boolean }).isLive
        ?? (mediaType === 'audio' || mediaType === 'hls' || mediaType === 'iframe'));
    return {
        stationId: station.id,
        mediaType,
        sourceUrl,
        title: station.name || 'Emisión',
        isLive,
    };
}

function stationFromMedia(media: MediaInfo, stations: Station[]): Station {
    const knownStation = stations.find((station) => station.id === media.stationId);
    if (knownStation) {
        const station = { ...knownStation, name: media.title || knownStation.name };
        if (media.mediaType === 'youtube') {
            const videoId = getYouTubeId(media.sourceUrl);
            station.url = media.sourceUrl;
            station.iframeUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : media.sourceUrl;
        }
        return station;
    }

    const isAudio = media.mediaType === 'audio';
    const station: Station = {
        id: media.stationId,
        name: media.title || 'Emisión Compartida',
        url: media.sourceUrl,
        logo: '',
        country: '',
        type: isAudio ? 'audio' : 'video',
    };

    if (media.mediaType === 'youtube') {
        const videoId = getYouTubeId(media.sourceUrl) || (media.stationId.startsWith('yt-') ? media.stationId.slice(3) : null);
        station.iframeUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : media.sourceUrl;
    }
    return station;
}

export function WatchPartyProvider({ children }: { children: ReactNode }) {
    const { currentStation, stations, setCurrentStation, setIsPlaying, isPlaying } = useRadio();
    const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;
    const { profile } = useUserProfile();
    const [room, setRoom] = useState<WatchPartyRoomData | null>(null);
    const [members, setMembers] = useState<WatchPartyMember[]>([]);
    const [hostId, setHostId] = useState<string | null>(null);
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<WatchPartyErrorEvent | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [needsSyncPlayback, setNeedsSyncPlayback] = useState(false);
    const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
    const [stateVersion, setStateVersion] = useState(0);
    const [remoteExecutionRef, setRemoteExecutionRef] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<WatchPartyAction | null>(null);
    const hasStartedSocket = useRef(false);
    const readSavedSession = (): { roomCode: string; userId: string; role: 'host' | 'guest' } | null => {
        try {
            const value = localStorage.getItem('watchparty_session');
            if (!value) return null;
            const session = JSON.parse(value) as { roomCode?: unknown; userId?: unknown; role?: unknown };
            if (typeof session.roomCode !== 'string' || typeof session.userId !== 'string'
                || (session.role !== 'host' && session.role !== 'guest')) return null;
            return { roomCode: session.roomCode, userId: session.userId, role: session.role };
        } catch {
            return null;
        }
    };
    const activeSessionRef = useRef<{ roomCode: string; userName: string; userId?: string; role?: 'host' | 'guest' } | null>(null);
    if (activeSessionRef.current === null && profile?.name) {
        const savedSession = readSavedSession();
        if (savedSession) activeSessionRef.current = { ...savedSession, userName: profile.name };
    }
    const rejoinInFlightRef = useRef(false);
    const joiningRoomRef = useRef(false);
    const roomRef = useRef(room);
    roomRef.current = room;
    const lastAppliedMediaRef = useRef<string | null>(null);
    const lastSentMediaRef = useRef<string | null>(null);
    const remoteMediaStationRef = useRef<string | null>(null);
    const commandLockRef = useRef(false);
    const commandLockReleaseRef = useRef<(() => void) | null>(null);
    useEffect(() => {
        const socket = (socketService as unknown as { socket: {
            connected: boolean;
            on: (event: string, callback: (payload: WatchPartyHeartbeat) => void) => void;
            off: (event: string, callback: (payload: WatchPartyHeartbeat) => void) => void;
            emit: (event: string, payload: unknown) => void;
        } | null }).socket;
        if (!socket) return;

        const onHeartbeat = (heartbeat: WatchPartyHeartbeat) => {
            const currentRoom = roomRef.current;
            if (!currentRoom || heartbeat.roomCode !== currentRoom.roomCode
                || heartbeat.stateVersion < currentRoom.stateVersion
                || !Number.isFinite(heartbeat.currentTime) || heartbeat.currentTime < 0) return;

            const stationId = typeof currentRoom.media?.stationId === 'string'
                ? currentRoom.media.stationId
                : undefined;
            setStateVersion(heartbeat.stateVersion);
            setRoom((roomState) => roomState?.id === currentRoom.id
                ? {
                    ...roomState,
                    stateVersion: heartbeat.stateVersion,
                    playback: {
                        ...roomState.playback,
                        currentTime: heartbeat.currentTime,
                        isPlaying: heartbeat.isPlaying,
                        updatedAt: heartbeat.timestamp,
                    },
                }
                : roomState);

            if (heartbeat.isPlaying !== isPlayingRef.current) {
                const executionRef = `watchparty-heartbeat-${heartbeat.stateVersion}-${heartbeat.timestamp}`;
                setRemoteExecutionRef(executionRef);
                setPendingAction({
                    roomId: currentRoom.id,
                    action: heartbeat.isPlaying ? 'play' : 'pause',
                    payload: null,
                    origin: executionRef,
                    actionId: executionRef,
                });
            }

            window.dispatchEvent(new CustomEvent('watchparty:heartbeat:remote', {
                detail: { ...heartbeat, stationId },
            }));
        };
        socket.on('watchparty:heartbeat', onHeartbeat);
        return () => socket.off('watchparty:heartbeat', onHeartbeat);
    }, [isConnected]);

    useEffect(() => {
        if (!room || !roomCode || !isHost || !isConnected
            || members.filter((member) => member.role === 'guest').length === 0) return;

        const socket = (socketService as unknown as { socket: {
            connected: boolean;
            emit: (event: string, payload: unknown) => void;
        } | null }).socket;
        if (!socket?.connected) return;

        const emitHeartbeat = () => {
            if (!socket.connected || roomRef.current?.id !== room.id) return;
            const playback = roomRef.current.playback;
            const elapsed = playback.isPlaying ? Math.max(0, Date.now() - playback.updatedAt) / 1000 : 0;
            const position = playback.currentTime + elapsed;
            const currentStateVersion = roomRef.current.stateVersion ?? stateVersion;
            if (!Number.isInteger(currentStateVersion) || !Number.isFinite(position)) return;
            socket.emit('watchparty:heartbeat', {
                roomCode,
                stateVersion: currentStateVersion,
                currentTime: Math.max(0, position),
                isPlaying: playback.isPlaying,
                isLive: Boolean(mediaInfo?.isLive),
                timestamp: Date.now(),
            });
        };
        const intervalId = window.setInterval(emitHeartbeat, 3000);
        return () => window.clearInterval(intervalId);
    }, [room, roomCode, isHost, isConnected, members, stateVersion, mediaInfo]);

    const openMedia = useCallback((media: MediaInfo, silent = false, currentTime = 0, hostIsPlaying = true) => {
        setMediaInfo(media);
        if (silent) {
            setIsPlaying(false);
            const executionRef = `watchparty-initial-sync-${Date.now()}`;
            setRemoteExecutionRef(executionRef);
            window.setTimeout(() => setPendingAction({
                roomId: roomRef.current?.id ?? '',
                action: 'seek',
                payload: Math.max(0, currentTime),
                origin: executionRef,
                actionId: executionRef,
            }), 0);
            setNeedsSyncPlayback(hostIsPlaying);
        }
        const mediaKey = `${media.stationId}:${media.sourceUrl}`;
        lastSentMediaRef.current = mediaKey;

        if (currentStation?.id === media.stationId) {
            lastAppliedMediaRef.current = mediaKey;
            if (!silent) {
                setIsPlaying(hostIsPlaying);
                const executionRef = `watchparty-same-station-${Date.now()}`;
                setRemoteExecutionRef(executionRef);
                setPendingAction({
                    roomId: roomRef.current?.id ?? '',
                    action: 'seek',
                    payload: Math.max(0, currentTime),
                    origin: executionRef,
                    actionId: executionRef,
                });
            }
            return;
        }

        if (lastAppliedMediaRef.current === mediaKey) return;
        lastAppliedMediaRef.current = mediaKey;

        remoteMediaStationRef.current = media.stationId;
        if (!silent) setIsPlaying(hostIsPlaying);
        setCurrentStation(stationFromMedia(media, stations));
    }, [currentStation?.id, setCurrentStation, setIsPlaying, stations]);

    const pauseForSilentJoin = useCallback(() => {
        const executionRef = `watchparty-initial-pause-${Date.now()}`;
        setIsPlaying(false);
        setRemoteExecutionRef(executionRef);
        setPendingAction({
            roomId: roomRef.current?.id ?? '',
            action: 'pause',
            payload: null,
            origin: executionRef,
            actionId: executionRef,
        });
        setNeedsSyncPlayback(false);
    }, [setIsPlaying]);

    const clearRoomState = useCallback(() => {
        setRadioMediaChangeAllowed(true);
        setRoom(null);
        setMembers([]);
        setHostId(null);
        setRoomCode(null);
        setIsHost(false);
        setNeedsSyncPlayback(false);
        setMediaInfo(null);
        lastAppliedMediaRef.current = null;
        lastSentMediaRef.current = null;
        remoteMediaStationRef.current = null;
        setStateVersion(0);
        setRemoteExecutionRef(null);
        setPendingAction(null);
    }, []);

    const persistSession = useCallback((nextRoomCode: string, role: 'host' | 'guest') => {
        const userId = getWatchPartySocketId();
        if (!userId) return;
        const session = { roomCode: nextRoomCode, userId, role };
        try { localStorage.setItem('watchparty_session', JSON.stringify(session)); } catch { /* Storage may be unavailable. */ }
        activeSessionRef.current = { ...session, userName: profile?.name ?? '' };
    }, [profile?.name]);

    const rejoinSavedRoom = useCallback(async () => {
        const session = activeSessionRef.current;
        if (!session || !profile?.name || rejoinInFlightRef.current) return;
        rejoinInFlightRef.current = true;
        joiningRoomRef.current = true;
        try {
            const response = await sendJoinRoom({ roomCode: session.roomCode, userName: profile.name });
            if (!response.success || !response.room) {
                if (response.error === 'ROOM_NOT_FOUND') {
                    try { localStorage.removeItem('watchparty_session'); } catch { /* Storage may be unavailable. */ }
                    activeSessionRef.current = null;
                    clearRoomState();
                    setError({ code: 'ROOM_ENDED', message: 'La sala terminó.' });
                }
                return;
            }
            const joinedRoom = response.room;
            const isCurrentHost = joinedRoom.hostId === getWatchPartySocketId();
            setRoom(joinedRoom);
            setStateVersion(joinedRoom.stateVersion);
            setMembers(joinedRoom.members);
            setHostId(joinedRoom.hostId);
            setIsHost(isCurrentHost);
            setRadioMediaChangeAllowed(isCurrentHost);
            setRoomCode(joinedRoom.roomCode);
            persistSession(joinedRoom.roomCode, isCurrentHost ? 'host' : 'guest');
            const roomMedia = getMediaInfo(joinedRoom.media);
            if (!isCurrentHost) {
                if (roomMedia) openMedia(roomMedia, true, joinedRoom.playback.currentTime, joinedRoom.playback.isPlaying);
                else pauseForSilentJoin();
            }
        } catch {
            // Keep the saved session so a later Socket.IO reconnect can retry.
        } finally {
            joiningRoomRef.current = false;
            rejoinInFlightRef.current = false;
        }
    }, [clearRoomState, openMedia, pauseForSilentJoin, persistSession, profile?.name]);

    useEffect(() => {
        const cleanups: Array<() => void> = [];

        cleanups.push(onWatchPartyConnectionStatus(async (status) => {
            const connected = status === 'connected';
            setIsConnected(connected);
            if (connected) void rejoinSavedRoom();
        }));

        cleanups.push(registerMembersListener((event) => {
            const isCurrentHost = event.hostId === getWatchPartySocketId();
            setMembers(event.members);
            setHostId(event.hostId);
            setIsHost(isCurrentHost);
            setRadioMediaChangeAllowed(isCurrentHost);
            setRoom((currentRoom) => currentRoom?.id === event.roomId
                ? { ...currentRoom, members: event.members, hostId: event.hostId }
                : currentRoom);
        }));

        cleanups.push(registerHostChangedListener((event) => {
            const isCurrentHost = event.hostId === getWatchPartySocketId();
            setHostId(event.hostId);
            setIsHost(isCurrentHost);
            setRadioMediaChangeAllowed(isCurrentHost);
            setRoom((currentRoom) => currentRoom?.id === event.roomId
                ? { ...currentRoom, hostId: event.hostId }
                : currentRoom);
        }));

        cleanups.push(registerErrorListener(setError));

        cleanups.push(registerActionListener((event) => {
            setStateVersion(event.stateVersion);
            setRoom((currentRoom) => currentRoom?.id === event.roomId
                ? {
                    ...currentRoom,
                    stateVersion: event.stateVersion,
                    playback: {
                        ...currentRoom.playback,
                        ...(event.action === 'play' ? { isPlaying: true } : {}),
                        ...(event.action === 'pause' ? { isPlaying: false } : {}),
                        ...(event.action === 'seek' ? {
                            currentTime: typeof event.payload === 'number'
                                ? event.payload
                                : Number((event.payload as { seconds?: number; currentTime?: number } | null)?.seconds
                                    ?? (event.payload as { currentTime?: number } | null)?.currentTime
                                    ?? event.payload),
                        } : {}),
                        updatedAt: Date.now(),
                    },
                }
                : currentRoom);
            setRemoteExecutionRef(event.remoteExecutionRef);
            setPendingAction({
                roomId: event.roomId,
                action: event.action,
                payload: event.payload,
                origin: event.remoteExecutionRef,
                actionId: event.remoteExecutionRef,
            });
        }));

        cleanups.push(registerStateListener((event) => {
            setStateVersion(event.stateVersion);
            const media = getMediaInfo((event as typeof event & { media?: unknown }).media);
            if (media) {
                setMediaInfo(media);
                lastSentMediaRef.current = `${media.stationId}:${media.sourceUrl}`;
                if (!joiningRoomRef.current && roomRef.current?.hostId !== getWatchPartySocketId()) {
                    openMedia(media, false, event.currentTime, event.isPlaying);
                }
            }
            setRoom((currentRoom) => currentRoom?.id === event.roomId
                ? {
                    ...currentRoom,
                    stateVersion: event.stateVersion,
                    ...(media ? { media: media as unknown as Record<string, unknown> } : {}),
                    playback: {
                        ...currentRoom.playback,
                        currentTime: event.currentTime,
                        isPlaying: event.isPlaying,
                    },
                }
                : currentRoom);
        }));

        cleanups.push(registerMediaListener((event) => {
            if (roomRef.current && roomRef.current.id !== event.roomId) return;
            const media = getMediaInfo(event.media);
            if (!media) return;
            setMediaInfo(media);
            lastSentMediaRef.current = `${media.stationId}:${media.sourceUrl}`;
            setStateVersion(event.stateVersion);
            setRoom((currentRoom) => currentRoom?.id === event.roomId
                ? { ...currentRoom, stateVersion: event.stateVersion, media: media as unknown as Record<string, unknown> }
                : currentRoom);
            const myId = getWatchPartySocketId();
            const isSender = Boolean(event.senderId && myId && event.senderId === myId);
            if (!isSender) {
                openMedia(media, false, 0, true);
            }
        }));

        if (!hasStartedSocket.current) {
            connectWatchPartySocket();
            hasStartedSocket.current = true;
        }
        setIsConnected(isWatchPartySocketConnected());

        return () => cleanups.forEach((cleanup) => cleanup());
    }, [clearRoomState, openMedia, rejoinSavedRoom]);

    useEffect(() => {
        if (isWatchPartySocketConnected()) void rejoinSavedRoom();
    }, [rejoinSavedRoom]);

    useEffect(() => {
        if (!room || !currentStation || !isHost) return;
        if (remoteMediaStationRef.current === currentStation.id) {
            remoteMediaStationRef.current = null;
            return;
        }

        const media = createMediaInfo(currentStation);
        if (!media) return;
        const mediaKey = `${media.stationId}:${media.sourceUrl}`;

        if (lastSentMediaRef.current === mediaKey) return;

        lastSentMediaRef.current = mediaKey;
        void changeMedia({ roomId: room.id, media }).then((response) => {
            if (!response?.success) {
                console.warn('[WatchParty] No se pudo sincronizar el medio:', response?.error ?? 'sin confirmacion');
                if (lastSentMediaRef.current === mediaKey) lastSentMediaRef.current = null;
            }
        }).catch((err) => {
            console.warn('[WatchParty] Error al enviar cambio de medio:', err);
            if (lastSentMediaRef.current === mediaKey) lastSentMediaRef.current = null;
        });
    }, [currentStation, room, isHost]);

    const clearError = useCallback(() => setError(null), []);

    const createRoom = useCallback(async ({ roomName }: { roomName: string }) => {
        const userName = profile?.name;
        if (!userName) return false;
        setIsLoading(true);
        setError(null);
        try {
            const media = createMediaInfo(currentStation);
            const createPayload = media ? { roomName, userName, media } : { roomName, userName };
            const response = await sendCreateRoom(createPayload);
            if (!response.success || !response.room) {
                setError({
                    code: response.error ?? 'ROOM_CREATE_FAILED',
                    message: response.error === 'INVALID_REQUEST'
                        ? 'Revisa el nombre de la sala y tu alias.'
                        : 'No se pudo crear la sala. Inténtalo de nuevo.',
                });
                return false;
            }

            setRoom(response.room);
            setStateVersion(response.room.stateVersion);
            const roomMedia = getMediaInfo(response.room.media) ?? media;
            setMediaInfo(roomMedia);
            lastSentMediaRef.current = roomMedia ? `${roomMedia.stationId}:${roomMedia.sourceUrl}` : null;
            setMembers(response.room.members);
            setHostId(response.room.hostId);
            setRoomCode(response.roomCode ?? response.room.roomCode);
            setIsHost(true);
            setRadioMediaChangeAllowed(true);
            activeSessionRef.current = { roomCode: response.roomCode ?? response.room.roomCode, userName };
            persistSession(response.roomCode ?? response.room.roomCode, 'host');
            return true;
        } catch (requestError) {
            setError({
                code: 'CONNECTION_ERROR',
                message: requestError instanceof Error ? requestError.message : 'No se pudo conectar con el servidor.',
            });
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [currentStation, persistSession, profile?.name]);

    const joinRoom = useCallback(async ({ roomCode: requestedRoomCode }: { roomCode: string }) => {
        const userName = profile?.name;
        if (!userName) return false;
        setIsLoading(true);
        setError(null);
        try {
            joiningRoomRef.current = true;
            const response = await sendJoinRoom({ roomCode: requestedRoomCode.trim().toUpperCase(), userName });
            joiningRoomRef.current = false;
            if (!response.success || !response.room) {
                setError({
                    code: response.error ?? 'ROOM_JOIN_FAILED',
                    message: response.error === 'ROOM_NOT_FOUND'
                        ? 'No se encontró una sala con ese código.'
                        : 'Revisa el código y tu alias.',
                });
                return false;
            }

            setRoom(response.room);
            setStateVersion(response.room.stateVersion);
            const roomMedia = getMediaInfo(response.room.media);
            setMediaInfo(roomMedia);
            setMembers(response.room.members);
            setHostId(response.room.hostId);
            setRoomCode(response.room.roomCode);
            const isCurrentHost = response.room.hostId === getWatchPartySocketId();
            setIsHost(isCurrentHost);
            setRadioMediaChangeAllowed(isCurrentHost);
            if (roomMedia && response.room.hostId !== getWatchPartySocketId()) {
                openMedia(roomMedia, true, response.room.playback.currentTime, response.room.playback.isPlaying);
                setNeedsSyncPlayback(response.room.playback.isPlaying);
            } else if (response.room.hostId !== getWatchPartySocketId()) {
                pauseForSilentJoin();
            }
            persistSession(response.room.roomCode, isCurrentHost ? 'host' : 'guest');
            return true;
        } catch (requestError) {
            joiningRoomRef.current = false;
            setError({
                code: 'CONNECTION_ERROR',
                message: requestError instanceof Error ? requestError.message : 'No se pudo conectar con el servidor.',
            });
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [openMedia, pauseForSilentJoin, persistSession, profile?.name]);

    const leaveRoom = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await sendLeaveRoom();
            if (!response.success) {
                setError({ code: response.error ?? 'ROOM_LEAVE_FAILED', message: 'No se pudo salir de la sala.' });
                return false;
            }
            activeSessionRef.current = null;
            try { localStorage.removeItem('watchparty_session'); } catch { /* Storage may be unavailable. */ }
            clearRoomState();
            return true;
        } catch (requestError) {
            setError({
                code: 'CONNECTION_ERROR',
                message: requestError instanceof Error ? requestError.message : 'No se pudo conectar con el servidor.',
            });
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [clearRoomState]);

    const sendAction = useCallback((action: WatchPartyAction['action'], payload: unknown) => {
        if (!room) {
            return Promise.resolve({ success: false, error: 'NOT_IN_ROOM' });
        }

        const isPlayPause = action === 'play' || action === 'pause';
        if (!isPlayPause) {
            return emitWatchPartyAction({ roomId: room.id, action, payload, stateVersion });
        }
        if (commandLockRef.current) {
            return Promise.resolve({ success: false, error: 'COMMAND_LOCKED' });
        }

        commandLockRef.current = true;
        const startedAt = Date.now();
        let acknowledged = false;
        let cooldownElapsed = false;
        let maxTimeoutId = 0;
        let cooldownTimeoutId = 0;
        const releaseLock = () => {
            if (commandLockReleaseRef.current !== releaseLock) return;
            window.clearTimeout(maxTimeoutId);
            window.clearTimeout(cooldownTimeoutId);
            commandLockRef.current = false;
            commandLockReleaseRef.current = null;
        };
        commandLockReleaseRef.current = releaseLock;
        maxTimeoutId = window.setTimeout(releaseLock, 500);
        cooldownTimeoutId = window.setTimeout(() => {
            cooldownElapsed = true;
            if (acknowledged) releaseLock();
        }, 350);

        return emitWatchPartyAction({ roomId: room.id, action, payload, stateVersion }).then((response) => {
            acknowledged = true;
            if (cooldownElapsed || Date.now() - startedAt >= 350) releaseLock();
            return response;
        }, (error: unknown) => {
            acknowledged = true;
            if (cooldownElapsed || Date.now() - startedAt >= 350) releaseLock();
            throw error;
        });
    }, [room, stateVersion]);

    const consumePendingAction = useCallback(() => {
        const action = pendingAction;
        setPendingAction(null);
        return action;
    }, [pendingAction]);

    const clearRemoteExecutionRef = useCallback(() => setRemoteExecutionRef(null), []);
    const syncPlayback = useCallback(() => {
        if (!room || isHost || !needsSyncPlayback) return;
        const executionRef = `watchparty-local-sync-${Date.now()}`;
        setRemoteExecutionRef(executionRef);
        setPendingAction({ roomId: room.id, action: 'play', payload: null, origin: executionRef, actionId: executionRef });
        setIsPlaying(true);
        setNeedsSyncPlayback(false);
    }, [isHost, needsSyncPlayback, room, setIsPlaying]);
    const canChangeMedia = !room || isHost;

    return (
        <WatchPartyContext.Provider value={{
            room,
            members,
            hostId,
            roomCode,
            isConnected,
            isLoading,
            error,
            isHost,
            canChangeMedia,
            needsSyncPlayback,
            mediaInfo,
            stateVersion,
            remoteExecutionRef,
            pendingAction,
            createRoom,
            joinRoom,
            leaveRoom,
            sendAction,
            consumePendingAction,
            clearRemoteExecutionRef,
            clearError,
            syncPlayback,
        }}>
            {children}
        </WatchPartyContext.Provider>
    );
}

export function useWatchParty(): WatchPartyContextValue {
    const context = useContext(WatchPartyContext);
    if (!context) throw new Error('useWatchParty debe usarse dentro de WatchPartyProvider');
    return context;
}
