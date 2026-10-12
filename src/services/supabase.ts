import { createClient } from '@supabase/supabase-js';
import { Station } from '../types';
import { ChatMessage } from '../types/chat';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uxgqlkqwbcenmmrzcdmf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_wz0IYMstMEcP9Y98nrt7lw_7WulvEQT';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==========================================
// SERVICIOS DE EMISORAS (STATIONS)
// ==========================================

export interface StationRealtimeChange {
    eventType: string;
    new: Record<string, unknown>;
    old: Record<string, unknown>;
}

export type StationRealtimeStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR' | string;

const hasOwn = (record: Record<string, unknown>, key: string) =>
    Object.prototype.hasOwnProperty.call(record, key);

export function mapStationFromCloudRow(row: Record<string, unknown>, previous?: Station): Station {
    const value = (key: string, fallback: unknown) => hasOwn(row, key) ? row[key] : fallback;
    const id = value('id', previous?.id);
    const type = value('type', previous?.type);

    return {
        id: typeof id === 'string' ? id : '',
        name: String(value('name', previous?.name ?? '') ?? ''),
        url: String(value('url', previous?.url ?? '') ?? ''),
        logo: String(value('logo', previous?.logo ?? '') ?? ''),
        country: String(value('country', previous?.country ?? '') ?? ''),
        type: type === 'video' ? 'video' : type === 'audio' ? 'audio' : previous?.type ?? 'audio',
        iframeUrl: String(value('iframe_url', previous?.iframeUrl ?? '') ?? ''),
        useProxy: !!value('use_proxy', previous?.useProxy ?? false),
        category: String(value('category', previous?.category ?? 'Otros') ?? 'Otros'),
        embedCanal: String(value('embed_canal', previous?.embedCanal ?? '') ?? ''),
        ...(previous?.watchPartyCapabilities
            ? { watchPartyCapabilities: previous.watchPartyCapabilities }
            : {}),
    };
}

export async function fetchStationsFromCloud(): Promise<Station[]> {
    try {
        const { data, error } = await supabase
            .from('stations')
            .select('*')
            .order('position', { ascending: true });

        if (error) {
            console.error('[Supabase] Error al consultar emisoras:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            return [];
        }

        return data.map((row: Record<string, unknown>) => mapStationFromCloudRow(row));
    } catch (err) {
        console.error('[Supabase] Fallo al cargar emisoras de la nube:', err);
        throw err;
    }
}

export async function saveStationToCloud(station: Station, position: number = 0): Promise<boolean> {
    try {
        const { error } = await supabase.from('stations').upsert({
            id: station.id,
            name: station.name,
            url: station.url,
            logo: station.logo,
            country: station.country,
            type: station.type,
            iframe_url: station.iframeUrl || '',
            use_proxy: !!station.useProxy,
            category: station.category || 'Otros',
            embed_canal: station.embedCanal || '',
            position
        }, { onConflict: 'id' });

        if (error) {
            console.error('[Supabase] Error al guardar emisora:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('[Supabase] Error de red al guardar emisora:', err);
        return false;
    }
}

export async function deleteStationFromCloud(stationId: string): Promise<boolean> {
    try {
        const { error } = await supabase.from('stations').delete().eq('id', stationId);
        if (error) {
            console.error('[Supabase] Error al eliminar emisora:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('[Supabase] Error al eliminar emisora:', err);
        return false;
    }
}

export async function updateStationsOrderInCloud(stations: Station[]): Promise<boolean> {
    try {
        const updates = stations.map((s, index) => ({
            id: s.id,
            name: s.name,
            url: s.url,
            logo: s.logo,
            country: s.country,
            type: s.type,
            iframe_url: s.iframeUrl || '',
            use_proxy: !!s.useProxy,
            category: s.category || 'Otros',
            embed_canal: s.embedCanal || '',
            position: index
        }));

        const { error } = await supabase.from('stations').upsert(updates, { onConflict: 'id' });
        if (error) {
            console.error('[Supabase] Error al reordenar emisoras:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('[Supabase] Error de red al reordenar:', err);
        return false;
    }
}

export function subscribeToStationsChanges(
    onChanged: (change: StationRealtimeChange) => void,
    onStatusChange?: (status: StationRealtimeStatus, error?: Error) => void
) {
    const channel = supabase
        .channel('public:stations:changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'stations' },
            (payload) => {
                onChanged({
                    eventType: payload.eventType,
                    new: payload.new as Record<string, unknown>,
                    old: payload.old as Record<string, unknown>,
                });
            }
        )
        .subscribe((status, error) => onStatusChange?.(status, error));

    return () => {
        supabase.removeChannel(channel);
    };
}

// ==========================================
// SERVICIOS DE CHAT (MESSAGES)
// ==========================================

export async function fetchChatHistoryFromCloud(limit: number = 50): Promise<ChatMessage[]> {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

    if (error) throw error;
    if (!data) return [];

    // PostgREST devuelve los más recientes primero; la interfaz los muestra cronológicamente.
    return data.map((row: any) => ({
        id: row.id,
        userId: row.user_id || '',
        userName: row.user_name || 'Anónimo',
        message: row.message || '',
        timestamp: Number(row.timestamp),
        mediaTitle: row.media_title || undefined,
        mediaAuthor: row.media_author || undefined,
        mediaThumbnail: row.media_thumbnail || undefined
    })).reverse();
}

export async function sendChatMessageToCloud(message: ChatMessage, phone?: string): Promise<boolean> {
    try {
        const payload: any = {
            id: message.id,
            user_id: message.userId,
            user_name: message.userName,
            phone: phone || null,
            message: message.message,
            timestamp: message.timestamp
        };

        if (message.mediaTitle) payload.media_title = message.mediaTitle;
        if (message.mediaAuthor) payload.media_author = message.mediaAuthor;
        if (message.mediaThumbnail) payload.media_thumbnail = message.mediaThumbnail;

        const { error } = await supabase.from('messages').insert([payload]);

        if (error) {
            // Si falla por columna inexistente (aún no creada en Supabase), reintentar sin las columnas extras
            if (error.message && (error.message.includes('media_') || error.code === 'PGRST204' || error.code === '42703')) {
                console.warn('[Supabase] Columnas de media aún no creadas en DB, enviando mensaje estándar');
                const { error: fallbackErr } = await supabase.from('messages').insert([{
                    id: message.id,
                    user_id: message.userId,
                    user_name: message.userName,
                    phone: phone || null,
                    message: message.message,
                    timestamp: message.timestamp
                }]);
                if (fallbackErr) {
                    console.error('[Supabase] Error en envío de respaldo:', fallbackErr);
                    return false;
                }
                return true;
            }
            console.error('[Supabase] Error al insertar mensaje:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('[Supabase] Fallo al enviar mensaje:', err);
        return false;
    }
}

export async function deleteChatMessageFromCloud(messageId: string, _userId?: string): Promise<boolean> {
    try {
        // Borramos siempre por id. La autorización ya está garantizada a nivel de UI
        // (solo aparece el menú de borrado en mensajes propios del usuario).
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);

        if (error) {
            console.error('[Supabase] Error al eliminar mensaje:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('[Supabase] Fallo al eliminar mensaje:', err);
        return false;
    }
}

export async function deleteMultipleChatMessagesFromCloud(messageIds: string[]): Promise<boolean> {
    try {
        if (!messageIds.length) return true;
        const { error } = await supabase
            .from('messages')
            .delete()
            .in('id', messageIds);

        if (error) {
            console.error('[Supabase] Error al eliminar múltiples mensajes:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('[Supabase] Fallo al eliminar múltiples mensajes:', err);
        return false;
    }
}

// ==========================================
// SERVICIO DE COMPROBACIÓN DE CONECTIVIDAD
// ==========================================
// Utiliza el endpoint oficial generate_204 de Google (0 cuota de Supabase, 0 bytes de respuesta).
// Solo se consulta cuando el cliente está desconectado para detectar cuándo regresa la red.
export async function checkInternetConnectivity(): Promise<boolean> {
    try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return false;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        await fetch(`https://clients3.google.com/generate_204?_=${Date.now()}`, {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return true;
    } catch {
        // En caso de que el endpoint de Google esté filtrado en la red local, respaldo con Supabase
        try {
            const timeoutPromise = new Promise<boolean>((resolve) =>
                setTimeout(() => resolve(false), 2500)
            );
            const checkPromise = Promise.resolve(
                supabase.from('messages').select('id').limit(1)
            ).then(
                ({ error }) => !error,
                () => false
            );
            return await Promise.race([checkPromise, timeoutPromise]);
        } catch {
            return false;
        }
    }
}

// Alias para mantener compatibilidad
export const pingSupabase = checkInternetConnectivity;

export function subscribeToChatMessages(
    onNewMessage: (msg: ChatMessage) => void,
    onDeleteMessage?: (messageId: string) => void,
    onStatusChange?: (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => void
) {
    const channel = supabase
        .channel('public:messages:live')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (payload: any) => {
                const row = payload.new;
                if (row) {
                    onNewMessage({
                        id: row.id,
                        userId: row.user_id || '',
                        userName: row.user_name || 'Anónimo',
                        message: row.message || '',
                        timestamp: Number(row.timestamp),
                        mediaTitle: row.media_title || undefined,
                        mediaAuthor: row.media_author || undefined,
                        mediaThumbnail: row.media_thumbnail || undefined
                    });
                }
            }
        )
        .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'messages' },
            (payload: any) => {
                const oldRow = payload.old;
                if (oldRow && oldRow.id && onDeleteMessage) {
                    onDeleteMessage(oldRow.id);
                }
            }
        )
        .subscribe((status: any) => {
            if (onStatusChange) {
                onStatusChange(status as any);
            }
        });

    return () => {
        supabase.removeChannel(channel);
    };
}

export function subscribeToOnlineListeners(
    userId: string,
    userName: string,
    onCountChange: (count: number) => void,
    onStatusChange?: (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => void
) {
    const channel = supabase.channel('radio-listeners', {
        config: {
            presence: {
                key: userId || `user_${Date.now()}`
            }
        }
    });

    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const count = Object.keys(state).length;
            onCountChange(count);
        })
        .subscribe(async (status: any) => {
            if (onStatusChange) {
                onStatusChange(status as any);
            }
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    name: userName || 'Oyente',
                    onlineAt: new Date().toISOString()
                });
            }
        });

    return () => {
        channel.untrack();
        supabase.removeChannel(channel);
    };
}

// ==========================================
// SERVICIOS DE TYPING & CHAT EVENTS (BROADCAST)
// ==========================================

let chatEventsChannel: ReturnType<typeof supabase.channel> | null = null;

export function broadcastTypingEvent(userId: string, userName: string, isTyping: boolean) {
    if (!chatEventsChannel) return;
    chatEventsChannel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, userName, isTyping }
    }).catch(() => {});
}

export function broadcastDeleteMessageEvent(messageId: string, userId: string) {
    if (!chatEventsChannel) return;
    chatEventsChannel.send({
        type: 'broadcast',
        event: 'delete_message',
        payload: { messageId, userId }
    }).catch(() => {});
}

export function broadcastClearMessagesEvent(userId: string) {
    if (!chatEventsChannel) return;
    chatEventsChannel.send({
        type: 'broadcast',
        event: 'clear_messages',
        payload: { userId }
    }).catch(() => {});
}

export function subscribeToTypingEvents(
    onTypingChange: (payload: { userId: string; userName: string; isTyping: boolean }) => void,
    onDeleteMessage?: (payload: { messageId: string; userId: string }) => void,
    onClearMessages?: (payload: { userId: string }) => void,
    onStatusChange?: (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => void
): () => void {
    chatEventsChannel = supabase.channel('chat-events');
    chatEventsChannel
        .on('broadcast', { event: 'typing' }, ({ payload }: { payload: any }) => {
            if (payload) onTypingChange(payload);
        })
        .on('broadcast', { event: 'delete_message' }, ({ payload }: { payload: any }) => {
            if (payload && onDeleteMessage) onDeleteMessage(payload);
        })
        .on('broadcast', { event: 'clear_messages' }, ({ payload }: { payload: any }) => {
            if (payload && onClearMessages) onClearMessages(payload);
        })
        .subscribe((status: any) => {
            if (onStatusChange) {
                onStatusChange(status as any);
            }
        });

    return () => {
        if (chatEventsChannel) {
            supabase.removeChannel(chatEventsChannel);
            chatEventsChannel = null;
        }
    };
}

// ==========================================
// SERVICIOS DE FAVORITOS (FAVORITES)
// ==========================================

export function getCurrentUserId(): string {
    if (typeof window === 'undefined') return 'guest';
    try {
        const savedIdentity = localStorage.getItem('chatIdentity');
        if (savedIdentity) {
            const parsed = JSON.parse(savedIdentity);
            if (parsed?.phone && parsed.phone.trim()) {
                const clean = parsed.phone.replace(/\D/g, '');
                if (clean) return `phone_${clean}`;
            }
        }
    } catch (e) {}

    let storedId = localStorage.getItem('chatUserId');
    if (!storedId) {
        storedId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        localStorage.setItem('chatUserId', storedId);
    }
    return storedId;
}

export async function fetchUserFavoritesFromCloud(userId: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('favorites')
        .select('station_id')
        .eq('user_id', userId);

    if (error) throw error;
    return data ? data.map((r: any) => r.station_id) : [];
}

export async function saveFavoriteToCloud(userId: string, stationId: string): Promise<boolean> {
    try {
        const { error } = await supabase.from('favorites').upsert({
            user_id: userId,
            station_id: stationId
        }, { onConflict: 'user_id,station_id' });

        if (error) {
            console.warn('[Supabase] Error al guardar favorito:', error.message);
            return false;
        }
        return true;
    } catch (err) {
        console.warn('[Supabase] Error de red al guardar favorito:', err);
        return false;
    }
}

export async function removeFavoriteFromCloud(userId: string, stationId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('favorites')
            .delete()
            .match({ user_id: userId, station_id: stationId });

        if (error) {
            console.warn('[Supabase] Error al eliminar favorito:', error.message);
            return false;
        }
        return true;
    } catch (err) {
        console.warn('[Supabase] Error de red al eliminar favorito:', err);
        return false;
    }
}

export function subscribeToUserFavorites(userId: string, onUpdate: () => void) {
    const channel = supabase
        .channel(`public:favorites:${userId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'favorites', filter: `user_id=eq.${userId}` },
            () => {
                onUpdate();
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

