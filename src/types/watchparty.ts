import type { Station } from '../types';
import type { WatchPartyMediaCapabilities, WatchPartyMediaType } from '../utils/watchPartyMediaCapabilities';

export interface MediaInfo {
    stationId: string;
    mediaType: WatchPartyMediaType;
    sourceUrl: string;
    title: string;
    isLive: boolean;
    watchPartyCapabilities?: Partial<WatchPartyMediaCapabilities>;
}

export interface WatchPartyHeartbeat {
    roomCode: string;
    stateVersion: number;
    currentTime?: number;
    isPlaying: boolean;
    isLive?: boolean;
    timestamp: number;
}

export interface WatchPartyMember {
    socketId: string;
    userId: string;
    userName: string;
    role: 'host' | 'guest';
    followHost: boolean;
    joinedAt: number;
    lastPing: number;
}

export interface WatchPartyAction {
    roomId: string;
    action: 'play' | 'pause' | 'seek' | 'change_station';
    origin: string;
    actionId: string;
    payload: unknown;
}

export interface WatchPartyState {
    roomId: string;
    stateVersion: number;
    currentTime: number;
    isPlaying: boolean;
    updatedAt: number;
}

export interface WatchPartyRoom {
    id: string;
    name: string;
    status: 'active' | 'reconnecting' | 'closed';
    hostId: string;
    stateVersion: number;
    media: MediaInfo | null;
    playback: WatchPartyState;
    members: WatchPartyMember[];
    createdAt: number;
    currentStation: Station;
    playbackState: 'playing' | 'paused';
    currentTime: number;
}
