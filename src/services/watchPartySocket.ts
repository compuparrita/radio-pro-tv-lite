import type { Socket } from 'socket.io-client';
import { socketService } from './socketService';
import type { WatchPartyAction, WatchPartyMember } from '../types/watchparty';

export interface WatchPartyRoomData {
    id: string;
    roomCode: string;
    name: string;
    status: 'active' | 'reconnecting' | 'closed';
    hostId: string;
    stateVersion: number;
    media: Record<string, unknown> | null;
    playback: {
        currentTime: number;
        isPlaying: boolean;
        updatedAt: number;
    };
    members: WatchPartyMember[];
    createdAt: number;
}

export interface WatchPartyErrorEvent {
    code: string;
    message: string;
}

export interface WatchPartyMembersEvent {
    roomId: string;
    members: WatchPartyMember[];
    hostId: string;
}

export interface WatchPartyCreatePayload {
    roomName: string;
    userName: string;
}

export interface WatchPartyJoinPayload {
    roomCode: string;
    userName: string;
}

export interface WatchPartyResponse {
    success: boolean;
    error?: string;
    room?: WatchPartyRoomData;
    roomCode?: string;
    left?: boolean;
    deleted?: boolean;
    hostTransferred?: boolean;
}

export interface WatchPartyBroadcastAction {
    roomId: string;
    action: WatchPartyAction['action'];
    payload: unknown;
    stateVersion: number;
    remoteExecutionRef: string;
}

export interface WatchPartyStateEvent {
    roomId: string;
    stateVersion: number;
    isPlaying: boolean;
    currentTime: number;
}

interface SocketServiceInternals {
    socket: Socket | null;
}

function getExistingSocket(): Socket | null {
    return (socketService as unknown as SocketServiceInternals).socket;
}

function getOrCreateSocket(): Socket {
    let socket = getExistingSocket();
    if (!socket) {
        socketService.connect();
        socket = getExistingSocket();
    }
    if (!socket) throw new Error('No se pudo iniciar la conexión Socket.IO');
    return socket;
}

function waitForConnection(socket: Socket): Promise<Socket> {
    if (socket.connected) return Promise.resolve(socket);

    return new Promise((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
            socket.off('connect', handleConnect);
            reject(new Error('No hay conexión con el servidor'));
        }, 10000);

        const handleConnect = () => {
            window.clearTimeout(timeoutId);
            resolve(socket);
        };

        socket.once('connect', handleConnect);
    });
}

async function emitWithAck(
    event: string,
    payload: object,
): Promise<WatchPartyResponse> {
    const socket = await waitForConnection(getOrCreateSocket());
    const userId = socket.id;
    if (!userId) throw new Error('No se pudo obtener la identidad de la conexión');

    return new Promise((resolve, reject) => {
        socket.timeout(10000).emit(event, { ...payload, userId }, (timeoutError: Error | null, response: WatchPartyResponse) => {
            if (timeoutError) {
                reject(new Error('El servidor no respondió a tiempo'));
                return;
            }
            resolve(response);
        });
    });
}

export function connectWatchPartySocket(): void {
    getOrCreateSocket();
}

export function isWatchPartySocketConnected(): boolean {
    return socketService.isConnected();
}

export function getWatchPartySocketId(): string | null {
    return getExistingSocket()?.id ?? null;
}

export function onWatchPartyConnectionStatus(callback: (status: string) => void): () => void {
    socketService.on('connection:status', callback);
    return () => socketService.off('connection:status', callback);
}

export function registerMembersListener(callback: (event: WatchPartyMembersEvent) => void): () => void {
    const socket = getOrCreateSocket();
    socket.on('watchparty:members', callback);
    return () => socket.off('watchparty:members', callback);
}

export function registerHostChangedListener(callback: (event: { roomId: string; hostId: string }) => void): () => void {
    const socket = getOrCreateSocket();
    socket.on('watchparty:host:changed', callback);
    return () => socket.off('watchparty:host:changed', callback);
}

export function registerErrorListener(callback: (event: WatchPartyErrorEvent) => void): () => void {
    const socket = getOrCreateSocket();
    socket.on('watchparty:error', callback);
    return () => socket.off('watchparty:error', callback);
}

export function registerActionListener(callback: (event: WatchPartyBroadcastAction) => void): () => void {
    const socket = getOrCreateSocket();
    socket.on('watchparty:broadcast:action', callback);
    return () => socket.off('watchparty:broadcast:action', callback);
}

export function registerStateListener(callback: (event: WatchPartyStateEvent) => void): () => void {
    const socket = getOrCreateSocket();
    socket.on('watchparty:state', callback);
    return () => socket.off('watchparty:state', callback);
}

export function createRoom(payload: WatchPartyCreatePayload): Promise<WatchPartyResponse> {
    return emitWithAck('watchparty:create', payload);
}

export function joinRoom(payload: WatchPartyJoinPayload): Promise<WatchPartyResponse> {
    return emitWithAck('watchparty:join', payload);
}

export function leaveRoom(): Promise<WatchPartyResponse> {
    return emitWithAck('watchparty:leave', {});
}

export function sendAction(payload: {
    roomId: string;
    action: WatchPartyAction['action'];
    payload: unknown;
    stateVersion: number;
}): Promise<WatchPartyResponse> {
    return emitWithAck('watchparty:action', payload);
}
