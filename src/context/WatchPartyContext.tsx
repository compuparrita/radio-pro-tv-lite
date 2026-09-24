import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { useRadio } from './RadioContext';
import type { Station } from '../types';
import type { MediaInfo, WatchPartyAction, WatchPartyMember } from '../types/watchparty';
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
    mediaInfo: MediaInfo | null;
    stateVersion: number;
    remoteExecutionRef: string | null;
    pendingAction: WatchPartyAction | null;
    createRoom: (payload: { roomName: string; userName: string }) => Promise<boolean>;
    joinRoom: (payload: { roomCode: string; userName: string }) => Promise<boolean>;
    leaveRoom: () => Promise<boolean>;
    sendAction: (action: WatchPartyAction['action'], payload: unknown) => Promise<WatchPartyResponse>;
    consumePendingAction: () => WatchPartyAction | null;
    clearRemoteExecutionRef: () => void;
    clearError: () => void;
}

const WatchPartyContext = createContext<WatchPartyContextValue | undefined>(undefined);

function getMediaInfo(value: unknown): MediaInfo | null {
    if (!value || typeof value !== 'object') return null;
    const media = value as Partial<MediaInfo>;
    if (typeof media.stationId !== 'string'
        || typeof media.mediaType !== 'string'
        || (media.mediaType !== 'youtube' && media.mediaType !== 'hls')
        || typeof media.sourceUrl !== 'string'
        || typeof media.title !== 'string'
        || typeof media.isLive !== 'boolean') return null;
    return media as MediaInfo;
}

function getYouTubeId(sourceUrl: string): string | null {
    return sourceUrl.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([^?&/]+)/i)?.[1] ?? null;
}

function createMediaInfo(station: Station | null): MediaInfo | null {
    if (!station) return null;
    const sourceUrl = station.iframeUrl || station.url;
    if (!sourceUrl) return null;
    const mediaType = station.id.startsWith('yt-') || /youtube(?:-nocookie)?\.com|youtu\.be/i.test(sourceUrl)
        ? 'youtube'
        : 'hls';
    const isLive = Boolean((station as Station & { isLive?: boolean }).isLive ?? mediaType === 'hls');
    return {
        stationId: station.id,
        mediaType,
        sourceUrl,
        title: station.name,
        isLive,
    };
}

function stationFromMedia(media: MediaInfo, stations: Station[]): Station {
    const knownStation = stations.find((station) => station.id === media.stationId);
    if (knownStation) {
        const station = { ...knownStation, name: media.title };
        if (media.mediaType === 'youtube') {
            const videoId = getYouTubeId(media.sourceUrl);
            station.url = media.sourceUrl;
            station.iframeUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : media.sourceUrl;
        }
        return station;
    }

    const station: Station = {
        id: media.stationId,
        name: media.title,
        url: media.sourceUrl,
        logo: '',
        country: '',
        type: 'video',
    };

    if (media.mediaType === 'youtube') {
        const videoId = getYouTubeId(media.sourceUrl) || (media.stationId.startsWith('yt-') ? media.stationId.slice(3) : null);
        station.iframeUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : media.sourceUrl;
    }
    return station;
}

export function WatchPartyProvider({ children }: { children: ReactNode }) {
    const { currentStation, stations, setCurrentStation, setIsPlaying } = useRadio();
    const [room, setRoom] = useState<WatchPartyRoomData | null>(null);
    const [members, setMembers] = useState<WatchPartyMember[]>([]);
    const [hostId, setHostId] = useState<string | null>(null);
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<WatchPartyErrorEvent | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
    const [stateVersion, setStateVersion] = useState(0);
    const [remoteExecutionRef, setRemoteExecutionRef] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<WatchPartyAction | null>(null);
    const hasStartedSocket = useRef(false);
    const roomRef = useRef(room);
    roomRef.current = room;
    const lastAppliedMediaRef = useRef<string | null>(null);
    const lastSentMediaRef = useRef<string | null>(null);
    const remoteMediaStationRef = useRef<string | null>(null);

    const openMedia = useCallback((media: MediaInfo) => {
        setMediaInfo(media);
        const mediaKey = `${media.stationId}:${media.sourceUrl}`;
        lastSentMediaRef.current = mediaKey;
        if (lastAppliedMediaRef.current === mediaKey) return;
        lastAppliedMediaRef.current = mediaKey;

        remoteMediaStationRef.current = media.stationId;
        setIsPlaying(false);
        setCurrentStation(stationFromMedia(media, stations));
    }, [setCurrentStation, setIsPlaying, stations]);

    const clearRoomState = useCallback(() => {
        setRoom(null);
        setMembers([]);
        setHostId(null);
        setRoomCode(null);
        setIsHost(false);
        setMediaInfo(null);
        lastAppliedMediaRef.current = null;
        lastSentMediaRef.current = null;
        remoteMediaStationRef.current = null;
        setStateVersion(0);
        setRemoteExecutionRef(null);
        setPendingAction(null);
    }, []);

    useEffect(() => {
        const cleanups: Array<() => void> = [];

        cleanups.push(onWatchPartyConnectionStatus((status) => {
            const connected = status === 'connected';
            setIsConnected(connected);
            if (status === 'disconnected') clearRoomState();
        }));

        cleanups.push(registerMembersListener((event) => {
            setMembers(event.members);
            setHostId(event.hostId);
            setIsHost(event.hostId === getWatchPartySocketId());
            setRoom((currentRoom) => currentRoom?.id === event.roomId
                ? { ...currentRoom, members: event.members, hostId: event.hostId }
                : currentRoom);
        }));

        cleanups.push(registerHostChangedListener((event) => {
            setHostId(event.hostId);
            setIsHost(event.hostId === getWatchPartySocketId());
            setRoom((currentRoom) => currentRoom?.id === event.roomId
                ? { ...currentRoom, hostId: event.hostId }
                : currentRoom);
        }));

        cleanups.push(registerErrorListener(setError));

        cleanups.push(registerActionListener((event) => {
            setStateVersion(event.stateVersion);
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
                if (roomRef.current?.hostId !== getWatchPartySocketId()) openMedia(media);
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
            if (roomRef.current?.hostId !== getWatchPartySocketId()) openMedia(media);
        }));

        if (!hasStartedSocket.current) {
            connectWatchPartySocket();
            hasStartedSocket.current = true;
        }
        setIsConnected(isWatchPartySocketConnected());

        return () => cleanups.forEach((cleanup) => cleanup());
    }, [clearRoomState, openMedia]);

    useEffect(() => {
        if (remoteMediaStationRef.current !== null) remoteMediaStationRef.current = null;
    }, [currentStation]);

    useEffect(() => {
        if (!room || !isHost || !currentStation) return;

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
    }, [currentStation, isHost, room]);

    const clearError = useCallback(() => setError(null), []);

    const createRoom = useCallback(async ({ roomName, userName }: { roomName: string; userName: string }) => {
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
    }, [currentStation]);

    const joinRoom = useCallback(async ({ roomCode: requestedRoomCode, userName }: { roomCode: string; userName: string }) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await sendJoinRoom({ roomCode: requestedRoomCode.trim().toUpperCase(), userName });
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
            setIsHost(response.room.hostId === getWatchPartySocketId());
            if (roomMedia && response.room.hostId !== getWatchPartySocketId()) openMedia(roomMedia);
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
    }, [openMedia]);

    const leaveRoom = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await sendLeaveRoom();
            if (!response.success) {
                setError({ code: response.error ?? 'ROOM_LEAVE_FAILED', message: 'No se pudo salir de la sala.' });
                return false;
            }
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
        return emitWatchPartyAction({ roomId: room.id, action, payload, stateVersion });
    }, [room, stateVersion]);

    const consumePendingAction = useCallback(() => {
        const action = pendingAction;
        setPendingAction(null);
        return action;
    }, [pendingAction]);

    const clearRemoteExecutionRef = useCallback(() => setRemoteExecutionRef(null), []);

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
