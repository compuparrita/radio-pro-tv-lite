import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChatMessage, UserIdentity, ConnectionStatus } from '../types/chat';
import { socketService } from '../services/socketService';

interface ChatContextType {
    messages: ChatMessage[];
    onlineListeners: number;
    connectionStatus: ConnectionStatus;
    userIdentity: UserIdentity | null;
    sendMessage: (message: string) => void;
    identify: (identity: UserIdentity) => void;
    isIdentified: boolean;
    clearMessages: () => void;
    deleteMessage: (messageId: string) => void;
    logout: () => void;
    error: string | null;
    unreadCount: number;
    setModalOpen: (isOpen: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [onlineListeners, setOnlineListeners] = useState(0);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const [userIdentity, setUserIdentity] = useState<UserIdentity | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const logout = () => {
        setUserIdentity(null);
        localStorage.removeItem('chatIdentity');
        localStorage.removeItem('chatClearedAt');
        localStorage.removeItem('chatDeletedIds');
        setMessages([]);
        socketService.disconnect();
        socketService.connect();
    };

    const setModalOpen = (isOpen: boolean) => {
        setIsModalOpen(isOpen);
        if (isOpen) {
            setUnreadCount(0);
        }
    };

    // Track unread messages when modal is closed
    useEffect(() => {
        if (!isModalOpen && messages.length > 0) {
            // Calculate unread based on messages that arrived while closed
            const lastReadCount = parseInt(localStorage.getItem('lastReadMessageCount') || '0');
            const newUnread = Math.max(0, messages.length - lastReadCount);
            setUnreadCount(newUnread);
        }

        // Update last read count when modal is open
        if (isModalOpen) {
            localStorage.setItem('lastReadMessageCount', messages.length.toString());
        }
    }, [messages, isModalOpen]);

    useEffect(() => {
        // Load saved identity from localStorage
        const savedIdentity = localStorage.getItem('chatIdentity');
        if (savedIdentity) {
            try {
                setUserIdentity(JSON.parse(savedIdentity));
            } catch (e) {
                console.error('Failed to parse saved identity');
            }
        }

        // Connect to Socket.io
        socketService.connect();

        // Setup event listeners
        const handleConnectionStatus = (status: ConnectionStatus) => {
            setConnectionStatus(status);

            // Re-identify on reconnection if we have an identity
            if (status === 'connected') {
                const currentIdentity = localStorage.getItem('chatIdentity');
                if (currentIdentity) {
                    try {
                        const identity = JSON.parse(currentIdentity);
                        socketService.identify(identity);
                    } catch (e) {
                        console.error('Failed to re-identify');
                    }
                }
            }
        };

        const handleChatMessage = (message: ChatMessage) => {
            setMessages(prev => [...prev, message]);
        };

        const handleChatHistory = (history: ChatMessage[]) => {
            setMessages(history);
        };

        const handleListenersUpdate = (count: number) => {
            setOnlineListeners(count);
        };

        const handleUserIdentified = () => {
            // Identity confirmed by server
        };

        const handleError = (errorMsg: string) => {
            console.error('Socket error:', errorMsg);
            setError(errorMsg);
            // Auto-clear error after 5 seconds
            setTimeout(() => setError(null), 5000);
        };

        socketService.on('connection:status', handleConnectionStatus);
        socketService.on('chat:message', handleChatMessage);
        socketService.on('chat:history', handleChatHistory);
        socketService.on('listeners:update', handleListenersUpdate);
        socketService.on('user:identified', handleUserIdentified);
        socketService.on('error', handleError);

        // If user is already identified, send to server (initial load)
        if (savedIdentity) {
            const identity = JSON.parse(savedIdentity);
            socketService.identify(identity);
        }

        // Cleanup
        return () => {
            socketService.off('connection:status', handleConnectionStatus);
            socketService.off('chat:message', handleChatMessage);
            socketService.off('chat:history', handleChatHistory);
            socketService.off('listeners:update', handleListenersUpdate);
            socketService.off('user:identified', handleUserIdentified);
            socketService.off('error', handleError);
            socketService.disconnect();
        };
    }, []);

    const identify = (identity: UserIdentity) => {
        setUserIdentity(identity);
        localStorage.setItem('chatIdentity', JSON.stringify(identity));
        socketService.identify(identity);
    };

    const sendMessage = (message: string) => {
        if (!userIdentity) {
            console.error('Must identify before sending messages');
            return;
        }
        socketService.sendMessage(message);
    };

    const clearMessages = () => {
        const now = Date.now();
        localStorage.setItem('chatClearedAt', now.toString());
        localStorage.removeItem('chatDeletedIds'); // Clear individual deletes when history is wiped
        setMessages([]);
    };

    const deleteMessage = (messageId: string) => {
        // Add to persistent deleted list
        const deletedIds = JSON.parse(localStorage.getItem('chatDeletedIds') || '[]');
        if (!deletedIds.includes(messageId)) {
            deletedIds.push(messageId);
            localStorage.setItem('chatDeletedIds', JSON.stringify(deletedIds));
        }
        // Filter locally
        setMessages(prev => prev.filter(m => m.id !== messageId));
    };

    // Filter messages based on persistent clear and individual deletes
    const filteredMessages = React.useMemo(() => {
        const clearedAt = parseInt(localStorage.getItem('chatClearedAt') || '0');
        const deletedIds = JSON.parse(localStorage.getItem('chatDeletedIds') || '[]');
        return messages.filter(m => m.timestamp > clearedAt && !deletedIds.includes(m.id));
    }, [messages]);

    return (
        <ChatContext.Provider
            value={{
                messages: filteredMessages,
                onlineListeners,
                connectionStatus,
                userIdentity,
                sendMessage,
                identify,
                isIdentified: !!userIdentity,
                clearMessages,
                deleteMessage,
                logout,
                error,
                unreadCount,
                setModalOpen
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};
