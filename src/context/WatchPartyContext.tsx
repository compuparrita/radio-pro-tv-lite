import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import type { WatchPartyMember } from '../types/watchparty';
import {
    connectWatchPartySocket,
    createRoom as sendCreateRoom,
    getWatchPartySocketId,
    isWatchPartySocketConnected,
    joinRoom as sendJoinRoom,
    leaveRoom as sendLeaveRoom,
    onWatchPartyConnectionStatus,
    registerErrorListener,
    registerHostChangedListener,
    registerMembersListener,
    type WatchPartyErrorEvent,
    type WatchPartyRoomData,
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
    createRoom: (payload: { roomName: string; userName: string }) => Promise<boolean>;
    joinRoom: (payload: { roomCode: string; userName: string }) => Promise<boolean>;
    leaveRoom: () => Promise<boolean>;
    clearError: () => void;
}

const WatchPartyContext = createContext<WatchPartyContextValue | undefined>(undefined);

export function WatchPartyProvider({ children }: { children: ReactNode }) {
    const [room, setRoom] = useState<WatchPartyRoomData | null>(null);
    const [members, setMembers] = useState<WatchPartyMember[]>([]);
    const [hostId, setHostId] = useState<string | null>(null);
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<WatchPartyErrorEvent | null>(null);
    const [isHost, setIsHost] = useState(false);
    const hasStartedSocket = useRef(false);

    const clearRoomState = useCallback(() => {
        setRoom(null);
        setMembers([]);
        setHostId(null);
        setRoomCode(null);
        setIsHost(false);
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

        if (!hasStartedSocket.current) {
            connectWatchPartySocket();
            hasStartedSocket.current = true;
        }
        setIsConnected(isWatchPartySocketConnected());

        return () => cleanups.forEach((cleanup) => cleanup());
    }, [clearRoomState]);

    const clearError = useCallback(() => setError(null), []);

    const createRoom = useCallback(async ({ roomName, userName }: { roomName: string; userName: string }) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await sendCreateRoom({ roomName, userName });
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
    }, []);

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
            setMembers(response.room.members);
            setHostId(response.room.hostId);
            setRoomCode(response.room.roomCode);
            setIsHost(response.room.hostId === getWatchPartySocketId());
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
    }, []);

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
            createRoom,
            joinRoom,
            leaveRoom,
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
