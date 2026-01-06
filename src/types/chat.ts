export interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    message: string;
    timestamp: number;
}

export interface UserIdentity {
    name: string;
    phone?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
