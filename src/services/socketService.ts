import { io, Socket } from 'socket.io-client';
import { ChatMessage, UserIdentity } from '../types/chat';

// In production (when served from the same backend), undefined lets socket.io connect to the same origin.
// In development, we default to localhost:3001.
const SERVER_URL = import.meta.env.PROD ? undefined : (import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001');

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Function[]> = new Map();

    connect() {
        if (this.socket?.connected) return;

        this.socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 3000, // 3 seconds between attempts
            reconnectionAttempts: 3  // Only try 3 times
        });

        // Setup event forwarding
        this.socket.on('connect', () => {
            console.log('Socket.io connected');
            this.emit('connection:status', 'connected');
        });

        this.socket.on('disconnect', () => {
            console.log('Socket.io disconnected');
            this.emit('connection:status', 'disconnected');
        });

        this.socket.on('connect_error', (_error) => {
            // Silencio intencional en desarrollo para no saturar la consola si el servidor de chat no está activo
            // console.warn('Socket.io connection error:', error.message);
            this.emit('connection:status', 'error');
        });

        // Forward server events
        this.socket.on('chat:broadcast', (message: ChatMessage) => {
            this.emit('chat:message', message);
        });

        this.socket.on('chat:history', (messages: ChatMessage[]) => {
            this.emit('chat:history', messages);
        });

        this.socket.on('listeners:update', (count: number) => {
            this.emit('listeners:update', count);
        });

        this.socket.on('user:identified', (data) => {
            this.emit('user:identified', data);
        });

        this.socket.on('error', (message: string) => {
            this.emit('error', message);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    identify(identity: UserIdentity) {
        this.socket?.emit('user:identify', identity);
    }

    sendMessage(message: string) {
        this.socket?.emit('chat:message', { message });
    }

    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)?.push(callback);
    }

    off(event: string, callback: Function) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            const index = eventListeners.indexOf(callback);
            if (index > -1) {
                eventListeners.splice(index, 1);
            }
        }
    }

    private emit(event: string, ...args: any[]) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => callback(...args));
        }
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

export const socketService = new SocketService();
