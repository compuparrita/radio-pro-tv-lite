export interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    message: string;
    timestamp: number;
    mediaTitle?: string;
    mediaAuthor?: string;
    mediaThumbnail?: string;
    isPending?: boolean;
}

export interface UserIdentity {
    name: string;
    phone?: string;
}

export interface TypingEvent {
    userId: string;
    userName: string;
    isTyping: boolean;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
