import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ChatMessage } from '../types/chat';
import { useChat } from './ChatContext';
import { useWatchParty } from './WatchPartyContext';
import {
    fetchRoomChatHistory,
    registerRoomChatMessageListener,
    sendRoomChatMessage,
    type WatchPartyChatMessage,
} from '../services/watchPartySocket';

interface WatchPartyChatContextValue {
    messages: ChatMessage[];
    error: string | null;
    participantCount: number;
    connectionStatus: 'connected' | 'connecting' | 'disconnected';
    sendMessage: (message: string, attachment?: { url: string; name: string; type: string; size?: number }) => Promise<void>;
}

const WatchPartyChatContext = createContext<WatchPartyChatContextValue | null>(null);

export function WatchPartyChatProvider({ children }: { children: ReactNode }) {
    const { roomCode, members, isConnected } = useWatchParty();
    const { userIdentity } = useChat();
    const [messages, setMessages] = useState<WatchPartyChatMessage[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setMessages([]);
        setError(null);
        if (!roomCode) return;

        let isActive = true;
        const addMessage = (message: WatchPartyChatMessage) => {
            if (!isActive || message.roomCode !== roomCode) return;
            setMessages((current) => current.some((item) => item.id === message.id)
                ? current
                : [...current, message]);
        };
        const unsubscribe = registerRoomChatMessageListener(addMessage);

        fetchRoomChatHistory(roomCode)
            .then((response) => {
                if (!isActive) return;
                if (!response.success) {
                    setError('No se pudo cargar el historial de la sala.');
                    return;
                }
                setMessages((current) => {
                    const merged = [...(response.messages ?? [])];
                    for (const message of current) {
                        if (!merged.some((item) => item.id === message.id)) merged.push(message);
                    }
                    return merged;
                });
            })
            .catch((requestError: unknown) => {
                if (isActive) setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el historial de la sala.');
            });

        return () => {
            isActive = false;
            unsubscribe();
        };
    }, [roomCode]);

    const sendMessage = useCallback(async (
        message: string,
        attachment?: { url: string; name: string; type: string; size?: number },
    ) => {
        if (!roomCode || !userIdentity) return;
        const trimmedMessage = message.trim();
        if (!trimmedMessage && !attachment) return;

        let mediaTitle = attachment?.name;
        let mediaAuthor = attachment?.type;
        let mediaThumbnail = attachment?.url;
        if (!attachment) {
            const youtubeMatch = trimmedMessage.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([0-9A-Za-z_-]{11})/);
            if (youtubeMatch?.[1]) {
                mediaThumbnail = `https://img.youtube.com/vi/${youtubeMatch[1]}/mqdefault.jpg`;
            }
        }

        setError(null);
        try {
            const response = await sendRoomChatMessage({
                roomCode,
                message: trimmedMessage || attachment?.name || '',
                ...(mediaTitle ? { mediaTitle } : {}),
                ...(mediaAuthor ? { mediaAuthor } : {}),
                ...(mediaThumbnail ? { mediaThumbnail } : {}),
            });
            if (!response.success || !response.message) {
                const failure = response.error === 'NOT_IN_ROOM'
                    ? 'Ya no perteneces a esta sala.'
                    : response.error === 'RATE_LIMITED'
                        ? 'Espera un momento antes de enviar otro mensaje.'
                    : 'No se pudo enviar el mensaje a la sala.';
                setError(failure);
                throw new Error(failure);
            }
            setMessages((current) => current.some((item) => item.id === response.message!.id)
                ? current
                : [...current, response.message!]);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'No se pudo enviar el mensaje a la sala.');
            throw requestError;
        }
    }, [roomCode, userIdentity]);

    const value = useMemo<WatchPartyChatContextValue>(() => ({
        messages,
        error,
        participantCount: members.length,
        connectionStatus: isConnected ? 'connected' : roomCode ? 'disconnected' : 'connecting',
        sendMessage,
    }), [messages, error, members.length, isConnected, roomCode, sendMessage]);

    return <WatchPartyChatContext.Provider value={value}>{children}</WatchPartyChatContext.Provider>;
}

export function useWatchPartyChat(): WatchPartyChatContextValue {
    const context = useContext(WatchPartyChatContext);
    if (!context) throw new Error('useWatchPartyChat must be used within WatchPartyChatProvider');
    return context;
}
