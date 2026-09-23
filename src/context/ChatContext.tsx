import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { ChatMessage, UserIdentity, ConnectionStatus } from '../types/chat';
import {
    fetchChatHistoryFromCloud,
    sendChatMessageToCloud,
    deleteChatMessageFromCloud,
    deleteMultipleChatMessagesFromCloud,
    subscribeToChatMessages,
    subscribeToOnlineListeners,
    broadcastTypingEvent,
    broadcastDeleteMessageEvent,
    subscribeToTypingEvents,
    pingSupabase
} from '../services/supabase';

interface ChatContextType {
    messages: ChatMessage[];
    onlineListeners: number;
    connectionStatus: ConnectionStatus;
    userIdentity: UserIdentity | null;
    sendMessage: (message: string, attachment?: { url: string; name: string; type: string; size?: number }) => Promise<void>;
    identify: (identity: UserIdentity) => void;
    isIdentified: boolean;
    clearMessages: () => void;
    deleteMessage: (messageId: string) => Promise<void>;
    deleteMultipleMessages: (messageIds: string[]) => Promise<void>;
    logout: () => void;
    error: string | null;
    unreadCount: number;
    setModalOpen: (isOpen: boolean) => void;
    notificationsEnabled: boolean;
    isNotificationsMuted: boolean;
    toggleNotifications: () => Promise<void>;
    requestNotificationPermission: () => Promise<boolean>;
    typingUsers: string[];
    broadcastTyping: () => void;
    currentUserId: string;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};

// Generador o recuperador de identificador único de dispositivo/usuario
function getUserId(identity?: UserIdentity | null): string {
    if (identity?.phone && identity.phone.trim()) {
        const cleanPhone = identity.phone.replace(/\D/g, '');
        if (cleanPhone) return `phone_${cleanPhone}`;
    }
    let storedId = localStorage.getItem('chatUserId');
    if (!storedId) {
        storedId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        localStorage.setItem('chatUserId', storedId);
    }
    return storedId;
}

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return null;
        if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
            sharedAudioCtx = new AudioContextClass();
        }
        if (sharedAudioCtx.state === 'suspended') {
            sharedAudioCtx.resume().catch(() => {});
        }
        return sharedAudioCtx;
    } catch (e) {
        return null;
    }
}

// Desbloquear audio automáticamente con la primera interacción del usuario
if (typeof window !== 'undefined') {
    const unlockAudio = () => {
        getAudioContext();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
}

// Reproducir sonido sintetizado agradable (no depende de archivos mp3 externos)
function playNotificationSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        const now = ctx.currentTime;
        // Doble tono estilo mensajería (E5 a A5)
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.setValueAtTime(880, now + 0.08);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
    } catch (e) {
        console.warn('Audio de notificación no reproducido:', e);
    }
}

// Notificación nativa emergente del sistema (Windows Toast / Notificaciones de Android)
function showDesktopNotification(senderName: string, messageText: string, onOpen?: () => void) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
        // Tag único por mensaje para que Windows NUNCA silencie la notificación en segundo plano
        const notif = new Notification(`💬 ${senderName}`, {
            body: messageText,
            icon: '/favicon.ico',
            tag: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            silent: false
        });

        notif.onclick = () => {
            window.focus();
            if (onOpen) onOpen();
            notif.close();
        };
    } catch (e) {
        console.warn('Error al disparar notificación de escritorio:', e);
    }
}

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [onlineListeners, setOnlineListeners] = useState(1);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() =>
        typeof navigator !== 'undefined' && !navigator.onLine ? 'disconnected' : 'connecting'
    );
    const [userIdentity, setUserIdentity] = useState<UserIdentity | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            return Notification.permission === 'granted';
        }
        return false;
    });

    const [isNotificationsMuted, setIsNotificationsMuted] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('chatNotificationsMuted') === 'true';
        }
        return false;
    });

    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const userIdentityRef = useRef<UserIdentity | null>(null);
    const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const isNotificationsMutedRef = useRef(isNotificationsMuted);
    useEffect(() => {
        isNotificationsMutedRef.current = isNotificationsMuted;
    }, [isNotificationsMuted]);

    const isModalOpenRef = useRef(isModalOpen);
    useEffect(() => {
        isModalOpenRef.current = isModalOpen;
    }, [isModalOpen]);

    // Keep userIdentityRef in sync so the flush function can access it without stale closures
    useEffect(() => {
        userIdentityRef.current = userIdentity;
    }, [userIdentity]);

    // Clave para forzar re-suscripción limpia de Supabase al reconectar
    const [reconnectKey, setReconnectKey] = useState(0);
    const triggerReconnect = useCallback(() => {
        setReconnectKey((prev) => prev + 1);
    }, []);

    // ── Offline message queue helpers ──────────────────────────────────────
    const PENDING_KEY = 'pendingChatMessages';

    const getPendingMessages = (): ChatMessage[] => {
        try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch { return []; }
    };
    const setPendingMessages = (msgs: ChatMessage[]) => {
        localStorage.setItem(PENDING_KEY, JSON.stringify(msgs));
    };

    // Cargar mensajes pendientes almacenados en localStorage al inicio
    useEffect(() => {
        const pending = getPendingMessages();
        if (pending.length > 0) {
            setMessages((prev) => {
                const combined = [...prev];
                for (const p of pending) {
                    if (!combined.some((m) => m.id === p.id)) {
                        combined.push({ ...p, isPending: true });
                    }
                }
                return combined;
            });
        }
    }, []);

    // Enviar mensajes en cola pendientes cuando se restablece la conexión
    const flushPendingMessages = useCallback(async () => {
        const pending = getPendingMessages();
        if (!pending.length) return;

        let sentAny = false;
        const remaining: ChatMessage[] = [];

        for (const msg of pending) {
            const identity = userIdentityRef.current || (
                typeof window !== 'undefined' && localStorage.getItem('chatIdentity')
                    ? JSON.parse(localStorage.getItem('chatIdentity')!)
                    : null
            );
            const phone = identity?.phone;
            const ok = await sendChatMessageToCloud(msg, phone);
            if (ok) {
                sentAny = true;
                // Quitar indicador de pendiente en la interfaz
                setMessages((prev) =>
                    prev.map((m) => (m.id === msg.id ? { ...m, isPending: false } : m))
                );
            } else {
                remaining.push(msg);
            }
        }

        setPendingMessages(remaining);
        if (sentAny && remaining.length === 0) {
            setError('¡Conexión restablecida! Mensajes enviados 🚀');
            setTimeout(() => setError(null), 4000);
        }
    }, []);

    // ── Detección de red inteligente y adaptativa (CERO pings mientras esté conectado) ──
    // Mientras la conexión esté activa ('connected'), no se realiza NINGUNA petición periódica.
    // La desconexión se detecta instantáneamente por los WebSockets de Supabase (CLOSED/ERROR) y window.offline.
    // Solo cuando se pierde la conexión se activa la comprobación ligera contra Google 204 (0 cuota de Supabase).
    useEffect(() => {
        let isCancelled = false;

        const verifyAndReconnect = async () => {
            if (isCancelled) return;
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                return;
            }
            const isReachable = await pingSupabase();
            if (isCancelled) return;

            if (isReachable) {
                setConnectionStatus('connecting');
                triggerReconnect();
            }
        };

        const handleOffline = () => {
            setConnectionStatus('disconnected');
        };

        const handleOnline = () => {
            verifyAndReconnect();
        };

        const handleFocus = () => {
            if (connectionStatus !== 'connected') {
                verifyAndReconnect();
            }
        };

        const handleVisibilityChange = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
                if (connectionStatus !== 'connected') {
                    verifyAndReconnect();
                }
            }
        };

        const handleConnectionChange = () => {
            // Transición entre Wi-Fi y Datos móviles detectada por el navegador
            verifyAndReconnect();
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Soporte específico para móviles (cambio entre Wi-Fi y Datos Móviles)
        const navConn = typeof navigator !== 'undefined' && (navigator as any).connection;
        if (navConn && typeof navConn.addEventListener === 'function') {
            navConn.addEventListener('change', handleConnectionChange);
        }

        // Intervalo de sondeo: ÚNICAMENTE activo cuando NO hay conexión
        let retryInterval: ReturnType<typeof setInterval> | null = null;
        if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
            retryInterval = setInterval(() => {
                // Si la pestaña está en segundo plano o el móvil tiene pantalla apagada, no gastar batería
                if (typeof document !== 'undefined' && document.hidden) return;
                verifyAndReconnect();
            }, 5000);
        }

        return () => {
            isCancelled = true;
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (navConn && typeof navConn.removeEventListener === 'function') {
                navConn.removeEventListener('change', handleConnectionChange);
            }
            if (retryInterval) clearInterval(retryInterval);
        };
    }, [connectionStatus, triggerReconnect]);



    const toggleNotifications = async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            alert('Tu navegador no soporta notificaciones de escritorio en esta conexión.');
            return;
        }

        // Si no tiene permisos concedidos en el navegador, solicitarlos
        if (Notification.permission !== 'granted') {
            try {
                const perm = await Notification.requestPermission();
                const granted = perm === 'granted';
                setNotificationsEnabled(granted);
                if (granted) {
                    setIsNotificationsMuted(false);
                    localStorage.setItem('chatNotificationsMuted', 'false');
                    playNotificationSound();
                    showDesktopNotification('Radio Streaming Pro', '🔔 ¡Notificaciones activadas en Windows!');
                } else if (perm === 'denied') {
                    alert('Las notificaciones están bloqueadas en este navegador o en modo Incógnito. Haz clic en el icono del candado o configuración al lado de la barra de direcciones para permitirlas.');
                }
            } catch (e) {
                console.warn('Error solicitando permisos:', e);
            }
            return;
        }

        // Si ya tenía permisos, alternar entre Silenciar y Activar
        setIsNotificationsMuted((prev) => {
            const next = !prev;
            localStorage.setItem('chatNotificationsMuted', next ? 'true' : 'false');
            if (!next) {
                playNotificationSound();
                showDesktopNotification('Radio Streaming Pro', '🔔 Notificaciones activadas');
            }
            return next;
        });
    };

    const requestNotificationPermission = async (): Promise<boolean> => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            alert('Tu navegador no soporta notificaciones de escritorio en esta conexión (se requiere HTTPS o localhost).');
            return false;
        }
        try {
            const perm = await Notification.requestPermission();
            const granted = perm === 'granted';
            setNotificationsEnabled(granted);
            if (granted) {
                setIsNotificationsMuted(false);
                localStorage.setItem('chatNotificationsMuted', 'false');
                playNotificationSound();
                showDesktopNotification('Radio Streaming Pro', '🔔 ¡Notificaciones activadas en Windows!');
            } else if (perm === 'denied') {
                alert('Las notificaciones están bloqueadas en este navegador o en modo Incógnito. Haz clic en el icono del candado o configuración al lado de la barra de direcciones para permitirlas.');
            }
            return granted;
        } catch (e) {
            console.warn('Error solicitando permisos de notificación:', e);
            return false;
        }
    };

    const logout = () => {
        setUserIdentity(null);
        localStorage.removeItem('chatIdentity');
        localStorage.removeItem('chatClearedAt');
        localStorage.removeItem('chatDeletedIds');
        setMessages([]);

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('user-identity-changed', { detail: null }));
        }
    };

    const setModalOpen = (isOpen: boolean) => {
        setIsModalOpen(isOpen);
        if (isOpen) {
            setUnreadCount(0);
            // Si las notificaciones no han sido solicitadas, sugerir al abrir
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().then(p => setNotificationsEnabled(p === 'granted'));
            }
        }
    };

    // Control de mensajes no leídos
    useEffect(() => {
        if (!isModalOpen && messages.length > 0) {
            const lastReadCount = parseInt(localStorage.getItem('lastReadMessageCount') || '0');
            const newUnread = Math.max(0, messages.length - lastReadCount);
            setUnreadCount(newUnread);
        }

        if (isModalOpen) {
            localStorage.setItem('lastReadMessageCount', messages.length.toString());
        }
    }, [messages, isModalOpen]);

    // Cargar identidad inicial
    useEffect(() => {
        const savedIdentity = localStorage.getItem('chatIdentity');
        if (savedIdentity) {
            try {
                setUserIdentity(JSON.parse(savedIdentity));
            } catch (e) {
                console.error('Failed to parse saved identity');
            }
        }
    }, []);

    // Conectar a Supabase (Carga de Historial + Realtime + Presencia)
    useEffect(() => {
        let isMounted = true;
        setConnectionStatus('connecting');

        // 1. Cargar historial desde Supabase
        fetchChatHistoryFromCloud(50)
            .then((history) => {
                if (isMounted) {
                    setMessages((prev) => {
                        // Conservar mensajes locales pendientes de envío que aún no están en la nube
                        const localPending = prev.filter((m) => m.isPending);
                        const merged = [...history];
                        for (const lp of localPending) {
                            if (!merged.some((m) => m.id === lp.id)) {
                                merged.push(lp);
                            }
                        }
                        return merged;
                    });
                    setConnectionStatus('connected');
                    // Enviar pendientes de inmediato ahora que la conexión está viva
                    flushPendingMessages();
                }
            })
            .catch((err) => {
                console.error('Error cargando historial de chat de Supabase:', err);
                if (isMounted) setConnectionStatus('error');
            });

        // 2. Suscribirse a nuevos mensajes en tiempo real
        const myUserId = getUserId(userIdentity);

        const unsubscribeMessages = subscribeToChatMessages(
            (newMsg) => {
                if (!isMounted) return;

                setMessages((prev) => {
                    if (prev.some((m) => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });

                // Si el mensaje no fue enviado por mí mismo (compara por ID y por Nombre)
                const isOwnMessage = (newMsg.userId && newMsg.userId === myUserId) ||
                                     (userIdentity?.name && newMsg.userName.trim().toLowerCase() === userIdentity.name.trim().toLowerCase());

                if (!isOwnMessage && !isNotificationsMutedRef.current) {
                    playNotificationSound();

                    // Notificar si la ventana no tiene el foco activo o el modal está cerrado
                    const isNotFocused = typeof document !== 'undefined' && (!document.hasFocus() || document.hidden);
                    if (isNotFocused || !isModalOpenRef.current) {
                        showDesktopNotification(newMsg.userName, newMsg.message, () => {
                            setModalOpen(true);
                        });
                    }
                }
            },
            (deletedMessageId) => {
                if (!isMounted) return;
                // Sincronizar localStorage también con eventos Postgres Realtime
                try {
                    const deleted = JSON.parse(localStorage.getItem('chatDeletedIds') || '[]');
                    if (!deleted.includes(deletedMessageId)) {
                        deleted.push(deletedMessageId);
                        localStorage.setItem('chatDeletedIds', JSON.stringify(deleted));
                    }
                } catch {}
                setMessages((prev) => prev.filter((m) => m.id !== deletedMessageId));
            },
            (status) => {
                if (!isMounted) return;
                if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setConnectionStatus('disconnected');
                } else if (status === 'SUBSCRIBED') {
                    setConnectionStatus('connected');
                }
            }
        );

        // 3. Suscribirse a presencia en línea
        const currentUserId = getUserId(userIdentity);
        const currentUserName = userIdentity?.name || 'Oyente';
        const unsubscribeListeners = subscribeToOnlineListeners(
            currentUserId,
            currentUserName,
            (count) => {
                if (isMounted) {
                    setOnlineListeners(Math.max(1, count));
                }
            },
            (status) => {
                if (!isMounted) return;
                if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setConnectionStatus('disconnected');
                }
            }
        );

        // 4. Suscribirse a eventos de typing y chat events (broadcast)
        const unsubscribeTyping = subscribeToTypingEvents(
            ({ userId, userName, isTyping }) => {
                if (!isMounted) return;
                // Ignorar eventos propios
                if (userId === currentUserId) return;

                // Limpiar timeout previo para este usuario
                if (typingTimeoutsRef.current[userId]) {
                    clearTimeout(typingTimeoutsRef.current[userId]);
                }

                if (isTyping) {
                    setTypingUsers((prev) => prev.includes(userName) ? prev : [...prev, userName]);
                    // Auto-expirar después de 3 segundos
                    typingTimeoutsRef.current[userId] = setTimeout(() => {
                        setTypingUsers((prev) => prev.filter((u) => u !== userName));
                        delete typingTimeoutsRef.current[userId];
                    }, 3000);
                } else {
                    setTypingUsers((prev) => prev.filter((u) => u !== userName));
                }
            },
            ({ messageId }) => {
                if (!isMounted) return;
                // Persistir en localStorage para que sobreviva recargas
                try {
                    const deleted = JSON.parse(localStorage.getItem('chatDeletedIds') || '[]');
                    if (!deleted.includes(messageId)) {
                        deleted.push(messageId);
                        localStorage.setItem('chatDeletedIds', JSON.stringify(deleted));
                    }
                } catch {}
                setMessages((prev) => prev.filter((m) => m.id !== messageId));
            },
            () => {
                if (!isMounted) return;
                setMessages([]);
            },
            (status) => {
                if (!isMounted) return;
                if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setConnectionStatus('disconnected');
                }
            }
        );

        return () => {
            isMounted = false;
            unsubscribeMessages();
            unsubscribeListeners();
            unsubscribeTyping();
            // Limpiar todos los timeouts de typing
            Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
            typingTimeoutsRef.current = {};
        };
    }, [userIdentity?.name, userIdentity?.phone, reconnectKey, flushPendingMessages]);

    const identify = async (identity: UserIdentity) => {
        setUserIdentity(identity);
        localStorage.setItem('chatIdentity', JSON.stringify(identity));

        // Limpiar marcas previas de borrado local al registrarse para mostrar el historial completo de la nube
        localStorage.removeItem('chatClearedAt');
        localStorage.removeItem('chatDeletedIds');

        // Consultar de inmediato el historial más reciente desde Supabase
        setConnectionStatus('connecting');
        try {
            const history = await fetchChatHistoryFromCloud(50);
            setMessages(history);
            setConnectionStatus('connected');
        } catch (err) {
            console.error('Error cargando historial de chat en registro:', err);
            setConnectionStatus('connected');
        }

        // Notificar en tiempo real a RadioContext para que recupere favoritos de inmediato
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('user-identity-changed', { detail: identity }));
        }

        // Solicitar permisos de notificación al identificarse
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(p => setNotificationsEnabled(p === 'granted'));
        }
    };

    const sendMessage = async (
        messageText: string,
        attachment?: { url: string; name: string; type: string; size?: number }
    ) => {
        if (!userIdentity) {
            console.error('Must identify before sending messages');
            return;
        }

        const trimmed = messageText.trim();
        if (!trimmed && !attachment) return;

        const isCurrentlyOffline = connectionStatus === 'disconnected' || (typeof navigator !== 'undefined' && !navigator.onLine);

        const userId = getUserId(userIdentity);
        const chatMessage: ChatMessage = {
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            userId,
            userName: userIdentity.name,
            message: trimmed || (attachment ? attachment.name : ''),
            timestamp: Date.now(),
            isPending: isCurrentlyOffline
        };

        if (attachment) {
            chatMessage.mediaThumbnail = attachment.url;
            chatMessage.mediaTitle = attachment.name;
            chatMessage.mediaAuthor = attachment.type;
        } else {
            // Extraer ID de YouTube si el mensaje contiene enlace
            const ytMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([0-9A-Za-z_-]{11})/);
            if (ytMatch && ytMatch[1]) {
                const ytId = ytMatch[1];
                chatMessage.mediaThumbnail = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
                try {
                    // Consultar título y autor mediante oEmbed (rápido y sin API key)
                    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ytId}`)}`);
                    if (res.ok) {
                        const oembed = await res.json();
                        if (oembed.title) chatMessage.mediaTitle = oembed.title;
                        if (oembed.author_name) chatMessage.mediaAuthor = oembed.author_name;
                    }
                } catch (e) {
                    console.warn('[ChatContext] No se pudo obtener título oEmbed:', e);
                }
            }
        }

        // Inserción optimista para respuesta instantánea en UI
        setMessages((prev) => {
            if (prev.some((m) => m.id === chatMessage.id)) return prev;
            return [...prev, chatMessage];
        });

        // ── Si no hay conexión o estamos desconectados ──────────
        if (isCurrentlyOffline) {
            const pending = getPendingMessages();
            setPendingMessages([...pending, chatMessage]);
            setError('Sin conexión — el mensaje se enviará automáticamente al reconectar 📶');
            setTimeout(() => setError(null), 5000);

            // Intentar ping inmediato por si la red volvió
            pingSupabase().then((reachable) => {
                if (reachable) {
                    setConnectionStatus('connecting');
                    triggerReconnect();
                }
            });
            return;
        }

        const success = await sendChatMessageToCloud(chatMessage, userIdentity.phone);
        if (!success) {
            // Si falló el envío (ej. corte súbito de internet), marcar como pendiente
            chatMessage.isPending = true;
            setMessages((prev) =>
                prev.map((m) => (m.id === chatMessage.id ? { ...m, isPending: true } : m))
            );
            const pending = getPendingMessages();
            setPendingMessages([...pending, chatMessage]);
            setConnectionStatus('disconnected');
            setError('Sin conexión — el mensaje se enviará automáticamente al reconectar 📶');
            setTimeout(() => setError(null), 5000);
        }
    };


    const clearMessages = () => {
        const now = Date.now();
        localStorage.setItem('chatClearedAt', now.toString());
        localStorage.removeItem('chatDeletedIds');
        localStorage.setItem('lastReadMessageCount', '0');
        setUnreadCount(0);
        setMessages([]);
    };

    const deleteMessage = async (messageId: string) => {
        // 1. Remoción optimista inmediata en UI local
        const deletedIds = JSON.parse(localStorage.getItem('chatDeletedIds') || '[]');
        if (!deletedIds.includes(messageId)) {
            deletedIds.push(messageId);
            localStorage.setItem('chatDeletedIds', JSON.stringify(deletedIds));
        }
        setMessages((prev) => prev.filter((m) => m.id !== messageId));

        // 2. Notificación en tiempo real instantánea a todos los clientes vía Broadcast
        const currentUserId = getUserId(userIdentity);
        broadcastDeleteMessageEvent(messageId, currentUserId);

        // 3. Borrado definitivo en la base de datos de Supabase
        await deleteChatMessageFromCloud(messageId, currentUserId);
    };

    const deleteMultipleMessages = async (messageIds: string[]) => {
        if (!messageIds.length) return;
        // 1. Remoción optimista inmediata en UI local
        const deletedIds = JSON.parse(localStorage.getItem('chatDeletedIds') || '[]');
        const updatedDeletedIds = Array.from(new Set([...deletedIds, ...messageIds]));
        localStorage.setItem('chatDeletedIds', JSON.stringify(updatedDeletedIds));
        setMessages((prev) => prev.filter((m) => !messageIds.includes(m.id)));

        // 2. Notificación en tiempo real instantánea a todos los clientes vía Broadcast
        const currentUserId = getUserId(userIdentity);
        messageIds.forEach((id) => broadcastDeleteMessageEvent(id, currentUserId));

        // 3. Borrado definitivo en la base de datos de Supabase
        await deleteMultipleChatMessagesFromCloud(messageIds);
    };

    // Filtrar mensajes según borrado local del usuario
    const filteredMessages = React.useMemo(() => {
        const clearedAt = parseInt(localStorage.getItem('chatClearedAt') || '0');
        const deletedIds = JSON.parse(localStorage.getItem('chatDeletedIds') || '[]');
        return messages.filter((m) => m.timestamp > clearedAt && !deletedIds.includes(m.id));
    }, [messages]);

    const broadcastTypingThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const broadcastTyping = useCallback(() => {
        if (!userIdentity) return;
        const userId = getUserId(userIdentity);
        const userName = userIdentity.name;
        broadcastTypingEvent(userId, userName, true);
        // Auto-stop después de 3 segundos de inactividad
        if (broadcastTypingThrottleRef.current) clearTimeout(broadcastTypingThrottleRef.current);
        broadcastTypingThrottleRef.current = setTimeout(() => {
            broadcastTypingEvent(userId, userName, false);
        }, 3000);
    }, [userIdentity]);

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
                deleteMultipleMessages,
                logout,
                error,
                unreadCount,
                setModalOpen,
                notificationsEnabled,
                isNotificationsMuted,
                toggleNotifications,
                requestNotificationPermission,
                typingUsers,
                broadcastTyping,
                currentUserId: getUserId(userIdentity)
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};
