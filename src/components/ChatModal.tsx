import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, X, Send, Users, Wifi, WifiOff, Trash2, LogOut, HelpCircle, Bell, BellOff, Menu, ChevronDown, CheckSquare, Clock, Paperclip, FileText, Download, ExternalLink, Music, Loader2, Mic, CheckCheck, Play, Pause, Smile } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useRadio } from '../context/RadioContext';
import HelpModal from './HelpModal';

interface ChatModalProps {
    externalOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

interface YouTubeCardProps {
    ytId: string;
    mediaTitle?: string;
    mediaAuthor?: string;
    mediaThumbnail?: string;
    playStation: (s: any) => void;
    setIsOpen: (o: boolean) => void;
    isOwnMessage: boolean;
}

const YouTubeCard: React.FC<YouTubeCardProps> = ({
    ytId,
    mediaTitle,
    mediaAuthor,
    mediaThumbnail,
    playStation,
    setIsOpen,
    isOwnMessage
}) => {
    const [title, setTitle] = useState<string>(mediaTitle || '');
    const [author, setAuthor] = useState<string>(mediaAuthor || '');

    useEffect(() => {
        if (!title) {
            let isMounted = true;
            fetch(`https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ytId}`)}`)
                .then(res => res.json())
                .then(data => {
                    if (isMounted && data) {
                        if (data.title) setTitle(data.title);
                        if (data.author_name) setAuthor(data.author_name);
                    }
                })
                .catch(() => {});
            return () => { isMounted = false; };
        }
    }, [ytId, title]);

    const handlePlay = () => {
        const ytStation = {
            id: `yt-${ytId}`,
            name: title || `YouTube: ${ytId}`,
            url: `https://www.youtube-nocookie.com/embed/${ytId}`,
            iframeUrl: `https://www.youtube-nocookie.com/embed/${ytId}`,
            logo: mediaThumbnail || `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
            country: author || 'YouTube',
            type: 'video'
        };
        playStation(ytStation);
        setIsOpen(false);
    };

    return (
        <div
            onClick={handlePlay}
            className={`mt-2 mb-1.5 rounded-xl overflow-hidden border shadow-xl w-full max-w-[380px] cursor-pointer transition-all duration-200 group hover:shadow-2xl ${
                isOwnMessage 
                    ? 'bg-black/30 border-white/20 hover:border-white/40' 
                    : 'bg-black/40 border-white/10 hover:border-[var(--primary-color)]/60'
            }`}
        >
            {/* Contenedor de la miniatura (16:9) */}
            <div className="relative aspect-video w-full overflow-hidden bg-black/60">
                <img
                    src={mediaThumbnail || `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                    alt={title || "YouTube Preview"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                    <div className="bg-[var(--primary-color)] text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg transform group-hover:scale-105 transition-transform">
                        <Send size={12} className="rotate-90" /> Reproducir en App
                    </div>
                </div>
                {/* Badge YouTube */}
                <div className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider shadow">
                    YouTube
                </div>
            </div>

            {/* Contenedor de Información debajo de la miniatura (Estilo YouTube) */}
            <div className="p-2.5 flex flex-col gap-1 text-left">
                <h5 className="font-bold text-xs leading-snug line-clamp-2 text-white/95 group-hover:text-sky-300 transition-colors">
                    {title || 'Cargando video de YouTube...'}
                </h5>
                {author && (
                    <p className="text-[10px] text-white/60 font-medium truncate">
                        {author}
                    </p>
                )}
            </div>
        </div>
    );
};

export const getFullMediaUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
        return url;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const openImageSafely = (rawUrl: string, _title?: string) => {
    const url = getFullMediaUrl(rawUrl);
    if (!url) return;

    if (url.startsWith('data:')) {
        try {
            const arr = url.split(',');
            const mimeMatch = arr[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : 'image/png';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });
            const blobUrl = URL.createObjectURL(blob);
            const win = window.open(blobUrl, '_blank');
            if (!win) {
                const a = document.createElement('a');
                a.href = blobUrl;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            return;
        } catch (e) {
            console.error('Error al convertir data URL a Blob:', e);
        }
    }

    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
};

export const downloadMediaSafely = async (rawUrl: string, filename: string = 'archivo') => {
    const url = getFullMediaUrl(rawUrl);
    if (!url) return;

    // Detectar extensión real según URL si filename usa genérico o sin extensión
    let finalFilename = filename;
    try {
        const parsedUrl = new URL(url, window.location.origin);
        const pathname = parsedUrl.pathname;
        const lastDot = pathname.lastIndexOf('.');
        if (lastDot !== -1) {
            const urlExt = pathname.substring(lastDot); // e.g. .webm, .ogg, .mp3, .png
            if (urlExt && !finalFilename.endsWith(urlExt)) {
                const nameWithoutExt = finalFilename.replace(/\.[a-zA-Z0-9]+$/, '');
                finalFilename = `${nameWithoutExt}${urlExt}`;
            }
        }
    } catch {
        // Ignorar si falla parseo
    }

    if (url.startsWith('data:')) {
        try {
            const arr = url.split(',');
            const mimeMatch = arr[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = finalFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            return;
        } catch (e) {
            console.error('Error al descargar data URL:', e);
        }
    }

    // Para archivos servidos desde /uploads/ o HTTP, descargar vía fetch Blob
    try {
        const response = await fetch(url, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });
        if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = finalFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            return;
        }
    } catch (e) {
        console.warn('Fallback a descarga directa con link:', e);
    }

    // Fallback nativo
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

// Manejador global para que un solo audio se reproduzca a la vez
const globalAudioRegistry = new Set<HTMLAudioElement>();
const registerAndPlayAudio = (currentAudio: HTMLAudioElement) => {
    globalAudioRegistry.forEach(audio => {
        if (audio !== currentAudio && !audio.paused) {
            audio.pause();
        }
    });
    globalAudioRegistry.add(currentAudio);
};

// Paleta de colores deterministicos para avatares (basado en inicial)
const AVATAR_COLORS = [
    '#0284c7','#0ea5e9','#6366f1','#8b5cf6','#ec4899',
    '#f59e0b','#10b981','#14b8a6','#f97316','#ef4444',
];
const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// Componente de Nota de Voz estilo WhatsApp (con avatar, play/pause circular, onda de audio y tiempo)
const VoiceNotePlayer: React.FC<{
    url: string;
    title?: string;
    isOwnMessage: boolean;
    timestamp?: number;
    formatTimeFn?: (t: number) => string;
    senderName?: string;
}> = ({ url, title, isOwnMessage, timestamp, formatTimeFn, senderName }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const waveContainerRef = useRef<HTMLDivElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    // Detección robusta de duración para archivos WebM / Opus que no traen metadata completa de inmediato
    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            const d = audioRef.current.duration;
            if (isFinite(d) && !isNaN(d) && d > 0) {
                setDuration(d);
            } else {
                // Fallback para streams/webm: avanzar al final temporalmente para forzar el cálculo
                audioRef.current.currentTime = 1e6;
                audioRef.current.ontimeupdate = () => {
                    if (audioRef.current) {
                        audioRef.current.ontimeupdate = null;
                        const realDuration = audioRef.current.duration;
                        audioRef.current.currentTime = 0;
                        if (isFinite(realDuration) && realDuration > 0) {
                            setDuration(realDuration);
                        }
                    }
                };
            }
        }
    };

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            registerAndPlayAudio(audioRef.current);
            audioRef.current.play().catch(e => console.warn('Error reproduciendo audio:', e));
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current && !isDragging) {
            setCurrentTime(audioRef.current.currentTime);
            // Si duration aún no se conocía, actualizarlo
            if ((!duration || !isFinite(duration)) && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
                setDuration(audioRef.current.duration);
            }
        }
    };

    // Calcular posición a partir de coordenadas del mouse / touch
    const seekToPosition = (clientX: number) => {
        if (!waveContainerRef.current || !audioRef.current) return;
        const rect = waveContainerRef.current.getBoundingClientRect();
        if (rect.width <= 0) return;
        const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const fraction = clickX / rect.width;
        
        let targetDuration = duration;
        if ((!targetDuration || !isFinite(targetDuration) || targetDuration <= 0) && audioRef.current.duration && isFinite(audioRef.current.duration)) {
            targetDuration = audioRef.current.duration;
            setDuration(targetDuration);
        }
        if (!targetDuration || !isFinite(targetDuration) || targetDuration <= 0) return;

        const newTime = fraction * targetDuration;
        setCurrentTime(newTime);
        try {
            audioRef.current.currentTime = newTime;
        } catch (err) {
            console.warn('Error setting currentTime:', err);
        }
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
        seekToPosition(e.clientX);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isDragging) {
            e.preventDefault();
            seekToPosition(e.clientX);
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isDragging) {
            e.preventDefault();
            setIsDragging(false);
            seekToPosition(e.clientX);
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {}
        }
    };

    const formatSecs = (sec: number) => {
        if (!isFinite(sec) || isNaN(sec) || sec <= 0) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

    // 34 barras de onda proporcionadas para encajar perfecto en el ancho
    const waveHeights = [
        30, 45, 65, 35, 80, 50, 95, 70, 40, 85, 100, 60,
        75, 45, 90, 65, 35, 80, 55, 30, 70, 95, 40, 60,
        75, 50, 90, 85, 40, 65, 80, 55, 35, 60
    ];

    // Texto de tiempo dinámico: Si está en reposo o al inicio, muestra la duración total. Al sonar o pausar en medio, muestra el tiempo actual.
    const displayTimeText = (isPlaying || currentTime > 0) ? formatSecs(currentTime) : (duration > 0 ? formatSecs(duration) : '0:00');

    return (
        <div className={`mt-0.5 mb-1 px-3 py-2.5 rounded-2xl border shadow-sm select-none ${
            !isOwnMessage && senderName
                ? 'w-[270px] sm:w-[300px]'   // más ancho cuando hay avatar
                : 'w-[220px] sm:w-[260px]'
        } max-w-full ${
            isOwnMessage
                ? 'bg-black/25 border-white/20'
                : 'bg-black/35 border-white/10'
        }`}>
            <audio
                ref={audioRef}
                src={url}
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                }}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onDurationChange={handleLoadedMetadata}
            />

            {/* ── Fila única: avatar + play + waveform — todos items-center ── */}
            <div className="flex items-center gap-2">

                {/* Avatar con badge mic — h-8 igual que play */}
                {!isOwnMessage && senderName && (
                    <div className="relative flex-shrink-0">
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
                            style={{ backgroundColor: getAvatarColor(senderName) }}
                        >
                            {senderName.charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#25d366] flex items-center justify-center border-2 border-[var(--dark-surface,#0f172a)] shadow">
                            <Mic size={7} className="text-white" />
                        </div>
                    </div>
                )}

                {/* Play/Pause — w-8 h-8 (32px) */}
                <button
                    type="button"
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center flex-shrink-0 transition-all cursor-pointer border border-white/25 shadow"
                    title={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                    {isPlaying
                        ? <Pause size={13} className="fill-white" />
                        : <Play  size={13} className="fill-white ml-0.5" />
                    }
                </button>

                {/* Columna derecha: Waveform arriba + tiempo y hora directamente debajo */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                    {/* Waveform — h-7 centrado */}
                    <div
                        ref={waveContainerRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        className="relative w-full h-7 flex items-center cursor-pointer touch-none select-none"
                    >
                        <div className="w-full flex items-center justify-between gap-[1.5px] h-full pointer-events-none">
                            {waveHeights.map((h, idx) => {
                                const barPercent = (idx / (waveHeights.length - 1)) * 100;
                                const isPlayed = barPercent <= progressPercent;
                                const scaledH = Math.round(h * 0.65);
                                return (
                                    <div
                                        key={idx}
                                        style={{ height: `${scaledH}%` }}
                                        className={`w-[2px] rounded-full transition-colors ${
                                            isPlayed
                                                ? 'bg-[var(--primary-color)]'
                                                : 'bg-white/35'
                                        }`}
                                    />
                                );
                            })}
                        </div>
                        {/* Cabezal scrubber */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[var(--primary-color)] border-2 border-white shadow pointer-events-none transition-transform duration-75"
                            style={{ left: `${progressPercent}%` }}
                        />
                    </div>

                    {/* Fila debajo del waveform: tiempo + hora + descarga (estilo WhatsApp) */}
                    <div className="flex items-center justify-between px-0.5 text-[10px] text-white/55 font-mono leading-none">
                        <span className="font-semibold text-white/75">{displayTimeText}</span>
                        <div className="flex items-center gap-1.5 font-sans">
                            {timestamp && formatTimeFn && (
                                <span>{formatTimeFn(timestamp)}</span>
                            )}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    downloadMediaSafely(url, title || 'audio.webm');
                                }}
                                className="p-0.5 text-white/40 hover:text-white/80 rounded transition-colors"
                                title="Descargar"
                            >
                                <Download size={10} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AttachmentCard: React.FC<{
    url: string;
    title?: string;
    type?: string;
    isOwnMessage: boolean;
    onImageClick?: (url: string, title?: string) => void;
    timestamp?: number;
    formatTimeFn?: (t: number) => string;
    senderName?: string;
}> = ({ url, title, type, isOwnMessage, onImageClick, timestamp, formatTimeFn, senderName }) => {
    const fullUrl = getFullMediaUrl(url);
    const isImage = type === 'image' || url.match(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i) || url.startsWith('data:image');
    const isAudio = type === 'audio' || url.match(/\.(mp3|wav|ogg|m4a|webm|aac|flac)(\?.*)?$/i) || url.startsWith('data:audio');

    if (isImage) {
        return (
            <div className="mt-1.5 mb-2 rounded-xl overflow-hidden border border-white/20 bg-black/40 max-w-[280px] shadow-lg group/img">
                <div
                    className="relative cursor-pointer overflow-hidden bg-white/5 min-h-[160px] flex items-center justify-center"
                    onClick={() => onImageClick ? onImageClick(fullUrl, title) : openImageSafely(fullUrl, title)}
                    title="Clic para ver en pantalla completa"
                >
                    <img
                        src={fullUrl}
                        alt={title || "Imagen adjunta"}
                        className="w-full max-h-[260px] object-cover hover:scale-[1.02] transition-transform duration-200"
                        loading="lazy"
                        decoding="async"
                    />
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="text-[11px] font-semibold bg-black/75 text-white px-3 py-1 rounded-full backdrop-blur-md border border-white/20 shadow-md">
                            🔍 Ver imagen
                        </span>
                    </div>
                </div>
                <div className="p-1.5 px-2.5 bg-black/60 text-[11px] text-white/90 flex items-center justify-between gap-1.5 border-t border-white/10">
                    <span className="truncate flex-1 font-medium" title={title || 'Imagen adjunta'}>
                        {title || 'Imagen adjunta'}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                downloadMediaSafely(fullUrl, title || 'imagen.png');
                            }}
                            className="p-1 text-white/80 hover:text-[var(--primary-color)] hover:bg-white/10 rounded transition-colors cursor-pointer"
                            title="Descargar imagen"
                        >
                            <Download size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                openImageSafely(fullUrl, title || 'imagen.png');
                            }}
                            className="p-1 text-white/80 hover:text-[var(--primary-color)] hover:bg-white/10 rounded transition-colors cursor-pointer"
                            title="Abrir imagen en nueva pestaña"
                        >
                            <ExternalLink size={13} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (isAudio) {
        return (
            <VoiceNotePlayer
                url={fullUrl}
                title={title}
                isOwnMessage={isOwnMessage}
                timestamp={timestamp}
                formatTimeFn={formatTimeFn}
                senderName={senderName}
            />
        );
    }

    // Default: Document / PDF
    return (
        <div
            onClick={() => downloadMediaSafely(fullUrl, title || 'documento')}
            className={`mt-1.5 mb-2 flex items-center gap-2.5 p-2 rounded-xl border transition-all max-w-[280px] cursor-pointer group ${
                isOwnMessage
                    ? 'bg-black/25 border-white/25 hover:bg-black/40'
                    : 'bg-black/30 border-white/15 hover:border-[var(--primary-color)]/60'
            }`}
            title="Clic para descargar documento"
        >
            <div className="w-9 h-9 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <FileText size={18} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate group-hover:underline text-white">
                    {title || 'Documento adjunto'}
                </p>
                <p className="text-[9px] text-[var(--text-secondary)] uppercase font-semibold">
                    {type === 'pdf' ? 'Archivo PDF' : 'Documento'}
                </p>
            </div>
            <Download size={15} className="text-white/60 group-hover:text-white transition-colors flex-shrink-0" />
        </div>
    );
};

const MessageText = ({ text, msg, stations, playStation, setIsOpen, isOwnMessage, onImageClick, formatTimeFn }: {
    text: string;
    msg?: any;
    stations: any[];
    playStation: (s: any) => void;
    setIsOpen: (o: boolean) => void;
    isOwnMessage: boolean;
    onImageClick?: (url: string, title?: string) => void;
    formatTimeFn?: (t: number) => string;
}) => {
    // Build a regex for station names (memoized for performance)
    const stationRegex = React.useMemo(() => {
        if (!stations.length) return null;
        // Only include names >= 3 characters to avoid false positives on short words
        const validStations = stations.filter(s => s.name && s.name.trim().length >= 3);
        if (!validStations.length) return null;

        const names = [...validStations]
            .sort((a, b) => b.name.length - a.name.length)
            .map(s => {
                const escaped = s.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return `(?:\\b${escaped}\\b)`;
            });
        return new RegExp(`(${names.join('|')})`, 'gi');
    }, [stations]);

    // Regex for URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text ? text.split(urlRegex) : [];

    const isYouTubeThumbnail = msg?.mediaThumbnail?.includes('youtube.com') || msg?.mediaThumbnail?.includes('youtu.be') || msg?.mediaThumbnail?.includes('noembed.com');
    const hasFileAttachment = !!(msg?.mediaThumbnail && !isYouTubeThumbnail);

    return (
        <div className="break-words">
            {hasFileAttachment && (
                <AttachmentCard
                    url={msg.mediaThumbnail}
                    title={msg.mediaTitle}
                    type={msg.mediaAuthor}
                    isOwnMessage={isOwnMessage}
                    onImageClick={onImageClick}
                    timestamp={msg?.timestamp}
                    formatTimeFn={formatTimeFn}
                    senderName={msg?.userName}
                />
            )}
            {(!hasFileAttachment || (text && text !== msg?.mediaTitle)) && (
                <div>
                    {parts.map((part, i) => {
                if (part.match(urlRegex)) {
                    const isYouTube = part.includes('youtube.com/watch') || part.includes('youtu.be/') || part.includes('youtube.com/embed/');
                    let ytId = '';
                    if (isYouTube) {
                        const match = part.match(/(?:v=|\/embed\/|\/)([0-9A-Za-z_-]{11})/);
                        if (match) ytId = match[1];
                    }

                    // Si es enlace de YouTube, ocultamos la URL larga y mostramos la tarjeta estilizada
                    if (ytId) {
                        return (
                            <React.Fragment key={i}>
                                <YouTubeCard
                                    ytId={ytId}
                                    mediaTitle={msg?.mediaTitle}
                                    mediaAuthor={msg?.mediaAuthor}
                                    mediaThumbnail={msg?.mediaThumbnail}
                                    playStation={playStation}
                                    setIsOpen={setIsOpen}
                                    isOwnMessage={isOwnMessage}
                                />
                            </React.Fragment>
                        );
                    }

                    return (
                        <React.Fragment key={i}>
                            <a
                                href={part}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${isOwnMessage ? 'text-sky-200' : 'text-cyan-300'} hover:underline break-all font-bold shadow-sm decoration-2 transition-all`}
                            >
                                {part}
                            </a>
                        </React.Fragment>
                    );
                }

                // For non-URL parts, look for station names
                if (!stationRegex) return <span key={i}>{part}</span>;

                const subParts = part.split(stationRegex);

                return (
                    <React.Fragment key={i}>
                        {subParts.map((sp, j) => {
                            if (!sp) return null;
                            const station = stations.find(s => s.name && s.name.toLowerCase() === sp.toLowerCase());
                            if (station) {
                                return (
                                    <button
                                        key={j}
                                        onClick={() => {
                                            playStation(station);
                                            setIsOpen(false);
                                        }}
                                        className={`${isOwnMessage ? 'text-sky-100' : 'text-[var(--primary-color)]'} font-extrabold hover:underline transition-all active:scale-95 decoration-2 inline-block`}
                                        title={`Click para escuchar ${station.name}`}
                                    >
                                        {sp}
                                    </button>
                                );
                            }
                            return <span key={j}>{sp}</span>;
                        })}
                    </React.Fragment>
                );
                    })}
                </div>
            )}
        </div>
    );
};

export const ChatModal: React.FC<ChatModalProps> = ({ externalOpen, onOpenChange }) => {
    const {
        messages,
        onlineListeners,
        connectionStatus,
        userIdentity,
        sendMessage,
        identify,
        isIdentified,
        clearMessages,
        deleteMessage,
        deleteMultipleMessages,
        logout,
        error: contextError,
        setModalOpen,
        notificationsEnabled,
        isNotificationsMuted,
        toggleNotifications,
        typingUsers,
        broadcastTyping,
        currentUserId
    } = useChat();

    const { stations, playStation } = useRadio();

    const [isOpen, setIsOpen] = useState(false);
    const [currentMessage, setCurrentMessage] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [canSend, setCanSend] = useState(true);
    const [rateLimitTimer, setRateLimitTimer] = useState<number>(0);
    const rateLimitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [chatWidth, setChatWidth] = useState<number>(() => {
        const saved = localStorage.getItem('chatModalWidth');
        return saved ? parseInt(saved, 10) : 400; // Ancho predeterminado cómodo y estilizado
    });
    const [isResizing, setIsResizing] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeMenuCoords, setActiveMenuCoords] = useState<{
        id: string;
        top?: number;
        bottom?: number;
        right: number;
    } | null>(null);
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);
    const [pendingFile, setPendingFile] = useState<{
        name: string;
        type: string;
        size: number;
        data: string;
        previewUrl?: string;
    } | null>(null);
    const [lightboxMedia, setLightboxMedia] = useState<{ url: string; title?: string } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const xhrRef = useRef<XMLHttpRequest | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Grabación de notas de voz tipo WhatsApp
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingDurationRef = useRef<number>(0);
    const isRecordingVoiceRef = useRef<boolean>(false);
    const isHoldingRef = useRef<boolean>(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<any>(null);
    const recordingStartTimestampRef = useRef<number>(0);

    // Cerrar lightbox con tecla Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && lightboxMedia) {
                setLightboxMedia(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxMedia]);

    // Cleanup de intervals al desmontar el componente
    useEffect(() => {
        return () => {
            if (rateLimitIntervalRef.current) clearInterval(rateLimitIntervalRef.current);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        };
    }, []);

    // Lógica de redimensionamiento del chat (arrastre desde el borde izquierdo)
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            // El chat está pegado a la derecha, por lo que su ancho es: window.innerWidth - e.clientX
            const newWidth = window.innerWidth - e.clientX;
            // Limitar entre 340px y el 85% de la pantalla o 720px
            const maxWidth = Math.min(window.innerWidth * 0.85, 750);
            if (newWidth >= 340 && newWidth <= maxWidth) {
                setChatWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            if (isResizing) {
                setIsResizing(false);
                localStorage.setItem('chatModalWidth', chatWidth.toString());
            }
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'ew-resize';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };
    }, [isResizing, chatWidth]);

    // Close options menu or message dropdown menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            const target = e.target as HTMLElement;
            if (menuRef.current && !menuRef.current.contains(target)) {
                setIsMenuOpen(false);
            }
            // Solo cerrar el menú del mensaje si el clic ocurrió fuera de cualquier menú de mensaje
            if (!target.closest('[data-message-menu]')) {
                setActiveMenuCoords(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    // Auto-scroll to bottom when new messages arrive, someone is typing, or modal opens
    useEffect(() => {
        if (isOpen) {
            const scrollToBottom = (instant = false) => {
                if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({
                        behavior: instant ? 'auto' : 'smooth',
                        block: 'end'
                    });
                }
            };

            // 1. Instant scroll attempt
            scrollToBottom(true);

            // 2. Delayed scroll for animations/rendering stabilization
            const timerScroll = setTimeout(() => scrollToBottom(), 100);

            // Lock body scroll
            document.body.style.overflow = 'hidden';

            // 3. Focus solo en escritorio (no en móviles para que no salte el teclado virtual)
            const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
            const timerFocus = setTimeout(() => {
                if (isDesktop) {
                    inputRef.current?.focus();
                }
                scrollToBottom();
            }, 300);

            return () => {
                clearTimeout(timerScroll);
                clearTimeout(timerFocus);
                document.body.style.overflow = '';
            };
        } else {
            document.body.style.overflow = '';
        }
    }, [messages, isOpen, typingUsers]);

    // Sync with external control
    useEffect(() => {
        if (externalOpen !== undefined && externalOpen !== isOpen) {
            setIsOpen(externalOpen);
        }
    }, [externalOpen]);

    // Notify parent and context when modal opens/closes
    useEffect(() => {
        setModalOpen(isOpen);
        onOpenChange?.(isOpen);
    }, [isOpen, setModalOpen, onOpenChange]);

    const handleIdentify = (e: React.FormEvent) => {
        e.preventDefault();

        if (name.trim().length < 2) {
            setError('El nombre debe tener al menos 2 caracteres');
            return;
        }

        if (name.trim().length > 50) {
            setError('El nombre no puede tener más de 50 caracteres');
            return;
        }

        identify({
            name: name.trim(),
            phone: phone.trim() || undefined
        });

        setError('');
    };

const compressImageFile = (file: File): Promise<{ data: string; previewUrl: string; size: number }> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const rawBase64 = e.target?.result as string;
            // No comprimir si ya es pequeña (< 350KB) o si es GIF (para no perder animación)
            if (file.size <= 350 * 1024 || file.type.includes('gif')) {
                resolve({ data: rawBase64, previewUrl: rawBase64, size: file.size });
                return;
            }

            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 1280;

                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        } else {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                        const compressedBase64 = canvas.toDataURL(mime, 0.82);
                        const approxSize = Math.round((compressedBase64.length * 3) / 4);
                        resolve({ data: compressedBase64, previewUrl: compressedBase64, size: approxSize });
                        return;
                    }
                } catch (err) {
                    console.warn('Compresión falló, usando original:', err);
                }
                resolve({ data: rawBase64, previewUrl: rawBase64, size: file.size });
            };
            img.onerror = () => {
                resolve({ data: rawBase64, previewUrl: rawBase64, size: file.size });
            };
            img.src = rawBase64;
        };
        reader.readAsDataURL(file);
    });
};

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 15 * 1024 * 1024) {
            setError('El archivo no puede superar los 15MB');
            return;
        }

        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const isImg = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext);
        const isAud = file.type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext);
        const isPdf = file.type.includes('pdf') || ext === 'pdf';
        const category = isImg ? 'image' : isAud ? 'audio' : isPdf ? 'pdf' : 'document';

        if (isImg) {
            const { data, previewUrl, size } = await compressImageFile(file);
            setPendingFile({
                name: file.name,
                type: category,
                size,
                data,
                previewUrl
            });
            setError('');
        } else {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result as string;
                setPendingFile({
                    name: file.name,
                    type: category,
                    size: file.size,
                    data: base64
                });
                setError('');
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    // Funciones de grabación de notas de voz tipo WhatsApp
    const formatAudioTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const stopAudioTracks = () => {
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(t => t.stop());
            audioStreamRef.current = null;
        }
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
        isRecordingVoiceRef.current = false;
        isHoldingRef.current = false;
    };

    const startVoiceRecording = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            setError('Tu navegador no permite grabar notas de voz.');
            return;
        }

        try {
            setError('');
            // Parámetros de audio optimizados para notas de voz claras en móvil y PC
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            audioStreamRef.current = stream;
            audioChunksRef.current = [];

            // Detectar tipo MIME soportado preferido
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'audio/ogg;codecs=opus';
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = 'audio/mp4';
                        if (!MediaRecorder.isTypeSupported(mimeType)) {
                            mimeType = ''; // Formato por defecto del navegador
                        }
                    }
                }
            }

            const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;

            // IMPORTANTE: Definir ondataavailable antes de llamar a start()
            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            // Emitir fragmentos cada 500ms para asegurar que los datos de audio se escriben periódicamente
            recorder.start(500);
            setIsRecordingVoice(true);
            isRecordingVoiceRef.current = true;
            setRecordingDuration(0);
            recordingDurationRef.current = 0;
            recordingStartTimestampRef.current = Date.now();

            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration(prev => {
                    const next = prev + 1;
                    recordingDurationRef.current = next;
                    if (next >= 300) { // Máximo 5 minutos
                        finishVoiceRecording(true);
                        return next;
                    }
                    return next;
                });
            }, 1000);
        } catch (err: any) {
            console.error('Error al acceder al micrófono:', err);
            stopAudioTracks();
            setIsRecordingVoice(false);
            isRecordingVoiceRef.current = false;
            isHoldingRef.current = false;
            if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
                setError('Permiso de micrófono denegado. Permite el acceso para enviar notas de voz.');
            } else {
                setError('No se pudo acceder al micrófono del dispositivo.');
            }
        }
    };

    const cancelVoiceRecording = () => {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== 'inactive') {
            recorder.onstop = null;
            recorder.ondataavailable = null;
            try {
                recorder.stop();
            } catch {}
        }
        stopAudioTracks();
        setIsRecordingVoice(false);
        isRecordingVoiceRef.current = false;
        isHoldingRef.current = false;
        setRecordingDuration(0);
        recordingDurationRef.current = 0;
        audioChunksRef.current = [];
    };

    const finishVoiceRecording = (autoSend = true) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state === 'inactive') {
            cancelVoiceRecording();
            return;
        }

        recorder.onstop = async () => {
            const rawMime = recorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunksRef.current, { type: rawMime });

            console.log(`[Voice Note] Finalizada grabación: ${audioChunksRef.current.length} chunks, total ${audioBlob.size} bytes (${rawMime})`);

            // Parar tracks una vez que el Blob ya ha sido empaquetado
            stopAudioTracks();
            setIsRecordingVoice(false);
            isRecordingVoiceRef.current = false;
            isHoldingRef.current = false;
            setRecordingDuration(0);
            recordingDurationRef.current = 0;

            if (audioBlob.size < 600) {
                setError('Grabación demasiado corta o sin sonido');
                return;
            }

            const reader = new FileReader();
            reader.onload = async () => {
                const base64Data = reader.result as string;
                let ext = 'webm';
                if (rawMime.includes('ogg')) ext = 'ogg';
                else if (rawMime.includes('mp4') || rawMime.includes('m4a')) ext = 'm4a';
                else if (rawMime.includes('wav')) ext = 'wav';

                const fileName = `nota_de_voz_${Date.now()}.${ext}`;

                if (autoSend) {
                    setIsUploading(true);
                    setUploadProgress(0);

                    let audioAttachment: { url: string; name: string; type: string; size?: number } | undefined = undefined;

                    try {
                        const uploadResult = await new Promise<{ url: string; fileName: string; fileType: string; fileSize?: number }>((resolve, reject) => {
                            const xhr = new XMLHttpRequest();
                            xhrRef.current = xhr;

                            xhr.upload.onprogress = (e) => {
                                if (e.lengthComputable) {
                                    setUploadProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
                                }
                            };

                            xhr.onload = () => {
                                xhrRef.current = null;
                                if (xhr.status >= 200 && xhr.status < 300) {
                                    try {
                                        resolve(JSON.parse(xhr.responseText));
                                    } catch {
                                        reject(new Error('Respuesta inválida'));
                                    }
                                } else {
                                    reject(new Error(`Error ${xhr.status}`));
                                }
                            };
                            xhr.onerror = () => reject(new Error('Error de red'));
                            xhr.open('POST', '/api/upload');
                            xhr.setRequestHeader('Content-Type', 'application/json');
                            xhr.send(JSON.stringify({
                                fileName,
                                fileType: 'audio',
                                fileData: base64Data
                            }));
                        });

                        audioAttachment = {
                            url: uploadResult.url,
                            name: fileName,
                            type: 'audio',
                            size: audioBlob.size
                        };
                    } catch (uploadErr) {
                        console.warn('Fallo upload de audio, usando base64 fallback:', uploadErr);
                        if (base64Data.length < 2500000) {
                            audioAttachment = {
                                url: base64Data,
                                name: fileName,
                                type: 'audio',
                                size: audioBlob.size
                            };
                        } else {
                            setError('No se pudo subir la nota de voz');
                            setIsUploading(false);
                            return;
                        }
                    } finally {
                        setIsUploading(false);
                        setUploadProgress(0);
                    }

                    if (audioAttachment) {
                        await sendMessage('', audioAttachment);
                    }
                } else {
                    setPendingFile({
                        name: fileName,
                        type: 'audio',
                        size: audioBlob.size,
                        data: base64Data
                    });
                }
            };
            reader.readAsDataURL(audioBlob);
        };

        try {
            recorder.stop();
        } catch (e) {
            cancelVoiceRecording();
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!canSend || isUploading) return;

        const trimmedMessage = currentMessage.trim();

        if (trimmedMessage.length === 0 && !pendingFile) {
            return;
        }

        if (trimmedMessage.length > 500) {
            setError('El mensaje no puede tener más de 500 caracteres');
            return;
        }

        let attachment: { url: string; name: string; type: string; size?: number } | undefined = undefined;

        if (pendingFile) {
            setIsUploading(true);
            setUploadProgress(0);
            try {
                // En dev (localhost:3000), ngrok o producción, usar siempre la ruta relativa /api/upload
                const uploadResult = await new Promise<{ url: string; fileName: string; fileType: string; fileSize?: number }>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhrRef.current = xhr;

                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
                            setUploadProgress(percent);
                        }
                    };

                    xhr.onload = () => {
                        xhrRef.current = null;
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                const data = JSON.parse(xhr.responseText);
                                setUploadProgress(100);
                                resolve(data);
                            } catch {
                                reject(new Error('Respuesta inválida del servidor'));
                            }
                        } else {
                            try {
                                const errData = JSON.parse(xhr.responseText);
                                reject(new Error(errData?.error || `Error ${xhr.status}: ${xhr.statusText}`));
                            } catch {
                                reject(new Error(`Error ${xhr.status}: ${xhr.statusText}`));
                            }
                        }
                    };

                    xhr.onerror = () => {
                        xhrRef.current = null;
                        reject(new Error('Error de red al subir archivo'));
                    };

                    xhr.onabort = () => {
                        xhrRef.current = null;
                        reject(new Error('Subida cancelada'));
                    };

                    xhr.open('POST', '/api/upload');
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.send(JSON.stringify({
                        fileName: pendingFile.name,
                        fileType: pendingFile.type,
                        fileData: pendingFile.data
                    }));
                });

                attachment = {
                    url: uploadResult.url,
                    name: pendingFile.name,
                    type: pendingFile.type,
                    size: pendingFile.size
                };
            } catch (err: any) {
                if (err?.message === 'Subida cancelada') {
                    setIsUploading(false);
                    setUploadProgress(0);
                    return;
                }
                console.warn('Upload a backend falló, usando fallback base64:', err);
                if (pendingFile.data.length < 2500000) {
                    attachment = {
                        url: pendingFile.data,
                        name: pendingFile.name,
                        type: pendingFile.type,
                        size: pendingFile.size
                    };
                } else {
                    const userMsg = err?.message && err.message !== 'Upload failed'
                        ? err.message
                        : 'No se pudo subir el archivo. Verifica la conexión con el servidor.';
                    setError(userMsg);
                    setIsUploading(false);
                    setUploadProgress(0);
                    return;
                }
            } finally {
                setIsUploading(false);
                setUploadProgress(0);
            }
            setPendingFile(null);
        }

        await sendMessage(trimmedMessage, attachment);
        setCurrentMessage('');
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
        setError('');

        // Rate limiting en frontend con countdown visible
        triggerRateLimit(6);
    };

    const triggerRateLimit = (seconds = 6) => {
        if (rateLimitIntervalRef.current) clearInterval(rateLimitIntervalRef.current);
        setCanSend(false);
        setRateLimitTimer(seconds);
        rateLimitIntervalRef.current = setInterval(() => {
            setRateLimitTimer(prev => {
                if (prev <= 1) {
                    clearInterval(rateLimitIntervalRef.current!);
                    rateLimitIntervalRef.current = null;
                    setCanSend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCurrentMessage(e.target.value);
        if (e.target.value) broadcastTyping();
        // Ajustar altura automáticamente al contenido (máx 120px)
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
        }
    };

    const handleToggleMessageMenu = (e: React.MouseEvent, msgId: string) => {
        e.stopPropagation();
        if (activeMenuCoords?.id === msgId) {
            setActiveMenuCoords(null);
            return;
        }
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const menuHeight = 90; // altura estimada del menú (2 opciones)
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUpwards = spaceBelow < menuHeight + 16 && spaceAbove > menuHeight;

        // Calcular top/bottom anclado al botón, limitando que no salga del viewport
        const topValue = openUpwards
            ? undefined
            : Math.min(rect.bottom + 2, window.innerHeight - menuHeight - 8);
        const bottomValue = openUpwards
            ? window.innerHeight - rect.top + 2
            : undefined;

        setActiveMenuCoords({
            id: msgId,
            ...(openUpwards
                ? { bottom: bottomValue }
                : { top: topValue }),
            right: Math.max(8, window.innerWidth - rect.right)
        });
    };

    // Autocomplete logic — Solo se activa al escribir '/' (ej: /emisora)
    useEffect(() => {
        const words = currentMessage.split(/\s+/);
        const lastWord = words[words.length - 1];

        // Solo disparar si la palabra empieza con '/'
        if (lastWord.startsWith('/')) {
            const query = lastWord.slice(1).toLowerCase().trim();
            const filtered = stations
                .filter(s => query === '' || s.name.toLowerCase().includes(query))
                .slice(0, 5); // Máximo 5 sugerencias

            if (filtered.length > 0) {
                setSuggestions(filtered);
                setShowSuggestions(true);
                setSelectedIndex(0);
            } else {
                setShowSuggestions(false);
            }
        } else {
            setShowSuggestions(false);
        }
    }, [currentMessage, stations]);

    const handleSelectSuggestion = (suggestion: any) => {
        const words = currentMessage.split(/\s+/);
        // Reemplazar la palabra con '/' por el nombre exacto de la emisora
        words[words.length - 1] = suggestion.name;
        setCurrentMessage(words.join(' ') + ' ');
        setShowSuggestions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showSuggestions) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev: number) => (prev + 1) % suggestions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev: number) => (prev - 1 + suggestions.length) % suggestions.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleSelectSuggestion(suggestions[selectedIndex]);
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
            }
            return;
        }

        // Si se presiona Enter sin Shift, enviar mensaje
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDateSeparator = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();

        const msgYear = date.getFullYear();
        const msgMonth = date.getMonth();
        const msgDay = date.getDate();

        const nowYear = now.getFullYear();
        const nowMonth = now.getMonth();
        const nowDay = now.getDate();

        // Mismo día
        if (msgYear === nowYear && msgMonth === nowMonth && msgDay === nowDay) {
            return 'Hoy';
        }

        // Ayer (diferencia de 1 día)
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (msgYear === yesterday.getFullYear() && msgMonth === yesterday.getMonth() && msgDay === yesterday.getDate()) {
            return 'Ayer';
        }

        // Si es el mismo año, formato "18 de febrero"
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        if (msgYear === nowYear) {
            return `${msgDay} de ${months[msgMonth]}`;
        }

        // Si es otro año, formato "18 de febrero de 2025"
        return `${msgDay} de ${months[msgMonth]} de ${msgYear}`;
    };

    return (
        <>

            {/* Chat Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-start md:items-end justify-end p-0 md:p-1 md:pr-6">
                    {/* Backdrop (mobile only) */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal Content */}
                    <div 
                        style={{ width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${chatWidth}px` : '100%' }}
                        className="relative w-full h-full md:h-[calc(min(1000px,100vh-var(--header-final-height,70px)-30px))] bg-[var(--dark-surface)] rounded-none md:rounded-lg shadow-2xl flex flex-col animate-slide-in-right"
                    >
                        {/* Resizer Handle (Desktop only) - Borde izquierdo para arrastrar y cambiar ancho */}
                        <div
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setIsResizing(true);
                            }}
                            className="hidden md:flex absolute -left-2 top-0 bottom-0 w-4 cursor-ew-resize items-center justify-center group z-50 select-none"
                            title="Arrastra para cambiar el ancho del chat"
                        >
                            <div className={`w-1 h-12 rounded-full transition-all duration-200 ${isResizing ? 'bg-[var(--primary-color)] h-24 w-1.5 shadow-[0_0_10px_var(--primary-color)]' : 'bg-white/20 group-hover:bg-[var(--primary-color)] group-hover:h-16'}`} />
                        </div>

                        {/* Header */}
                        {isMultiSelectMode ? (
                            /* WhatsApp-style selection action bar */
                            <div className="p-2 border-b border-[var(--dark-border)] flex items-center justify-between bg-[var(--dark-surface)] rounded-none animate-in fade-in duration-150">
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsMultiSelectMode(false);
                                            setSelectedMessageIds([]);
                                        }}
                                        className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                                        title="Cancelar selección"
                                    >
                                        <X size={20} />
                                    </button>
                                    <span className="text-sm font-bold text-white">
                                        {selectedMessageIds.length} {selectedMessageIds.length === 1 ? 'seleccionado' : 'seleccionados'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={selectedMessageIds.length === 0}
                                        onClick={async () => {
                                            if (selectedMessageIds.length === 0) return;
                                            const idsToDelete = [...selectedMessageIds];
                                            setIsMultiSelectMode(false);
                                            setSelectedMessageIds([]);
                                            await deleteMultipleMessages(idsToDelete);
                                        }}
                                        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow"
                                        title="Eliminar seleccionados para todos"
                                    >
                                        <Trash2 size={15} />
                                        <span>Eliminar ({selectedMessageIds.length})</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-2 border-b border-[var(--dark-border)] flex items-center justify-between bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] rounded-none">
                                {/* Left Side: Hamburger Menu + User Info */}
                                <div className="flex items-center gap-2 relative" ref={menuRef}>
                                    {/* Hamburger Menu Button (Left side - standard mobile navigation) */}
                                    <button
                                        onClick={() => setIsMenuOpen(prev => !prev)}
                                        className={`p-2 rounded-lg text-white transition-colors ${isMenuOpen ? 'bg-white/20' : 'hover:bg-white/10'}`}
                                        title="Menú de opciones"
                                        aria-label="Menú de opciones"
                                    >
                                        <Menu size={20} />
                                    </button>

                                    {/* Dropdown Menu (aligned to the left below hamburger button) */}
                                    {isMenuOpen && (
                                        <div className="absolute top-full left-0 mt-1 w-48 bg-[var(--dark-surface)] border border-white/15 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
                                            <button
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                    setIsHelpOpen(true);
                                                }}
                                                className="w-full px-3 py-2 text-left text-xs font-medium text-[var(--text-primary)] hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                                            >
                                                <HelpCircle size={16} className="text-[var(--primary-color)]" />
                                                <span>Guía y Ayuda</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                    clearMessages();
                                                }}
                                                className="w-full px-3 py-2 text-left text-xs font-medium text-[var(--text-primary)] hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                                            >
                                                <Trash2 size={16} className="text-amber-400" />
                                                <span>Limpiar Historial</span>
                                            </button>

                                            {isIdentified && (
                                                <>
                                                    <div className="my-1 border-t border-white/10" />
                                                    <button
                                                        onClick={() => {
                                                            setIsMenuOpen(false);
                                                            logout();
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-xs font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                                                    >
                                                        <LogOut size={16} />
                                                        <span>Cerrar Sesión</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <h3 className="text-white font-bold text-sm drop-shadow-md">
                                            {isIdentified && userIdentity ? userIdentity.name : 'Chat en Vivo'}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-white/90 drop-shadow-md">
                                            {connectionStatus === 'connected' ? (
                                                <>
                                                    <Wifi size={14} className="text-emerald-300" />
                                                    <span className="text-emerald-300 font-medium">Conectado</span>
                                                </>
                                            ) : connectionStatus === 'connecting' ? (
                                                <>
                                                    <Wifi size={14} className="text-amber-300 animate-pulse" />
                                                    <span className="text-amber-300 font-medium">Reconectando...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <WifiOff size={14} className="text-red-300" />
                                                    <span className="text-red-300 font-medium">Sin conexión</span>
                                                </>
                                            )}
                                            <span>•</span>
                                            <Users size={14} />
                                            <span>{connectionStatus === 'connected' ? `${onlineListeners} en línea` : 'Offline'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Bell + Close Button */}
                                <div className="flex items-center gap-1.5">
                                    {/* Bell Button (Notifications) */}
                                    {(() => {
                                        const isMutedOrDisabled = isNotificationsMuted || !notificationsEnabled;
                                        return (
                                            <button
                                                onClick={toggleNotifications}
                                                className={`p-2 rounded-lg transition-all ${!isMutedOrDisabled ? 'text-amber-300 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                                                title={!isMutedOrDisabled ? "Notificaciones activadas (clic para silenciar)" : "Notificaciones silenciadas (clic para activar)"}
                                                aria-label="Notificaciones"
                                            >
                                                {!isMutedOrDisabled ? <Bell size={18} /> : <BellOff size={18} />}
                                            </button>
                                        );
                                    })()}

                                    {/* Close Chat Button (Always prominent and accessible) */}
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors ml-0.5"
                                        title="Cerrar chat (sin cerrar sesión)"
                                        aria-label="Cerrar chat"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Identification Form */}
                        {!isIdentified && (
                            <div className="flex-1 flex items-center justify-center p-6">
                                <form onSubmit={handleIdentify} className="w-full max-w-sm space-y-4">
                                    <div className="text-center mb-6">
                                        <h4 className="text-xl font-bold mb-2">Únete al chat</h4>
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            Identifícate para comenzar a chatear
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Nombre *
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Tu nombre"
                                            className="w-full p-3 bg-[var(--dark-bg)] border border-[var(--dark-border)] rounded-lg focus:border-[var(--primary-color)] outline-none"
                                            required
                                            minLength={2}
                                            maxLength={50}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 flex items-center justify-between">
                                            <span>Teléfono <span className="text-xs text-[var(--text-secondary)] font-normal">(opcional)</span></span>
                                            <span className="text-xs text-[var(--primary-color)] font-medium">ID Único</span>
                                        </label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="Ej: 8888-8888"
                                            className="w-full p-3 bg-[var(--dark-bg)] border border-[var(--dark-border)] rounded-lg focus:border-[var(--primary-color)] outline-none"
                                            title="Tu teléfono funciona como tu llave personal. Si entras desde tu móvil, PC o Android TV con el mismo número, tus favoritos e historial se sincronizan solos."
                                        />
                                        <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed bg-white/5 p-2 rounded-md border border-white/5">
                                            💡 <strong>¿Para qué sirve?</strong> Funciona como tu identificador personal. Si cambias de dispositivo (celular, PC o Smart TV) y pones el mismo teléfono, se sincronizarán tu historial y tus emisoras favoritas automáticamente sin necesidad de contraseñas.
                                        </p>
                                    </div>

                                    {error && (
                                        <div className="text-red-400 text-sm text-center">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="w-full py-3 bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                                    >
                                        Continuar al Chat
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Chat Messages */}
                        {isIdentified && (
                            <>
                                <div
                                    onScroll={() => { if (activeMenuCoords) setActiveMenuCoords(null); }}
                                    className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar"
                                >
                                    {messages.length === 0 ? (
                                        <div className="text-center text-[var(--text-secondary)] py-12">
                                            <MessageCircle size={48} className="mx-auto mb-3 opacity-50" />
                                            <p>No hay mensajes aún</p>
                                            <p className="text-sm">¡Sé el primero en escribir!</p>
                                        </div>
                                    ) : (
                                        messages.map((msg, index) => {
                                            const isOwnMessage = !!((userIdentity?.name && msg.userName && msg.userName.trim().toLowerCase() === userIdentity.name.trim().toLowerCase()) ||
                                                                 (msg.userId && currentUserId && msg.userId === currentUserId));
                                            const isChecked = selectedMessageIds.includes(msg.id);
                                            const isMenuOpen = activeMenuCoords?.id === msg.id;

                                            // Cálculo de separador de fecha (Hoy, Ayer, o fecha)
                                            const prevMsg = index > 0 ? messages[index - 1] : null;
                                            const showDateSeparator = !prevMsg || (() => {
                                                const prevD = new Date(prevMsg.timestamp);
                                                const currD = new Date(msg.timestamp);
                                                return prevD.toDateString() !== currD.toDateString();
                                            })();

                                            return (
                                                <React.Fragment key={msg.id}>
                                                    {/* Separador de Fecha estilo WhatsApp (Píldora centrada o con líneas) */}
                                                    {showDateSeparator && (
                                                        <div className="flex items-center justify-center my-3 select-none">
                                                            <div className="px-3.5 py-1 rounded-full text-[11px] font-semibold bg-[#182229]/90 text-white/80 border border-white/10 shadow-sm backdrop-blur-md">
                                                                {formatDateSeparator(msg.timestamp)}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div
                                                        className={`flex items-center gap-2 group ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                                    >
                                                        {/* Checkbox en modo multiselección (a la izquierda) */}
                                                        {isMultiSelectMode && isOwnMessage && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedMessageIds(prev =>
                                                                        prev.includes(msg.id)
                                                                            ? prev.filter(id => id !== msg.id)
                                                                            : [...prev, msg.id]
                                                                    );
                                                                }}
                                                                className={`p-1.5 rounded-md border transition-colors ${isChecked ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white' : 'border-white/40 bg-white/5 text-transparent hover:border-white/80'}`}
                                                            >
                                                                <CheckSquare size={16} className={isChecked ? 'opacity-100 text-white' : 'opacity-0'} />
                                                            </button>
                                                        )}

                                                        <div
                                                            onClick={() => {
                                                                if (isMultiSelectMode && isOwnMessage) {
                                                                    setSelectedMessageIds(prev =>
                                                                        prev.includes(msg.id)
                                                                            ? prev.filter(id => id !== msg.id)
                                                                            : [...prev, msg.id]
                                                                    );
                                                                }
                                                            }}
                                                            className={`relative max-w-[92%] md:max-w-[85%] px-3.5 py-2 transition-all shadow-md ${isOwnMessage
                                                                ? `rounded-2xl rounded-tr-none bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-white shadow-[0_3px_12px_rgba(0,0,0,0.3)] ${isChecked ? 'ring-2 ring-white shadow-xl' : ''}`
                                                                : 'chat-bubble-incoming rounded-2xl rounded-tl-none bg-[var(--dark-surface)] border border-white/10 text-[var(--text-primary)] shadow-md'
                                                                } ${isMultiSelectMode && isOwnMessage ? 'cursor-pointer' : ''}`}
                                                        >
                                                            {/* Botón de flecha WhatsApp (v hacia abajo) en la esquina superior derecha */}
                                                            {isOwnMessage && !isMultiSelectMode && (
                                                                <div className="absolute top-1.5 right-1.5 z-30" data-message-menu>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => handleToggleMessageMenu(e, msg.id)}
                                                                        className={`p-1 rounded-full transition-all shadow-sm flex items-center justify-center backdrop-blur-sm ${
                                                                            isMenuOpen ? 'bg-white/30 text-white' : 'bg-white/10 hover:bg-white/20 text-white/90 hover:text-white'
                                                                        }`}
                                                                        title="Opciones del mensaje"
                                                                    >
                                                                        <ChevronDown size={13} strokeWidth={2.5} />
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {!isOwnMessage && (
                                                                <div className="font-semibold text-xs mb-1 text-[var(--primary-color)] brightness-125">
                                                                    {msg.userName}
                                                                </div>
                                                            )}
                                                            {(() => {
                                                                const isVoiceNoteOnly = !!(
                                                                    msg.mediaThumbnail &&
                                                                    (msg.mediaAuthor === 'audio' || msg.mediaThumbnail.match(/\.(webm|mp3|ogg|m4a|wav)(\?.*)?$/i) || msg.mediaThumbnail.startsWith('data:audio')) &&
                                                                    (!msg.message || msg.message === msg.mediaTitle)
                                                                );

                                                                return (
                                                                    <>
                                                                        <div className={isOwnMessage && !isVoiceNoteOnly ? 'pr-4' : ''}>
                                                                            <MessageText
                                                                                text={msg.message}
                                                                                msg={msg}
                                                                                stations={stations}
                                                                                playStation={playStation}
                                                                                setIsOpen={setIsOpen}
                                                                                isOwnMessage={isOwnMessage}
                                                                                onImageClick={(url, title) => setLightboxMedia({ url, title })}
                                                                                formatTimeFn={formatTime}
                                                                            />
                                                                        </div>
                                                                        {!isVoiceNoteOnly && (
                                                                            <div className="flex items-center justify-end mt-1 gap-1">
                                                                                <span className="text-[10px] text-white/75">
                                                                                    {formatTime(msg.timestamp)}
                                                                                </span>
                                                                                {msg.isPending ? (
                                                                                    <span className="flex items-center text-[9px] text-amber-300" title="Pendiente de envío (se enviará automáticamente)">
                                                                                        <Clock size={11} className="animate-pulse inline" />
                                                                                    </span>
                                                                                ) : isOwnMessage ? (
                                                                                    <span className="flex items-center text-white/90" title="Enviado">
                                                                                        <CheckCheck size={14} className="stroke-[2.5]" />
                                                                                    </span>
                                                                                ) : null}
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                    {/* Typing Indicator */}
                                    {typingUsers.length > 0 && (
                                        <div className="flex items-end gap-2 px-2 pb-1">
                                            <div className="flex items-center gap-1.5 bg-[var(--dark-surface)] border border-[var(--dark-border)] rounded-2xl rounded-bl-sm px-3 py-2 max-w-[70%]">
                                                <span className="text-xs text-[var(--text-secondary)] mr-1">
                                                    {typingUsers.length === 1
                                                        ? typingUsers[0]
                                                        : `${typingUsers.slice(0, 2).join(' y ')}${typingUsers.length > 2 ? ` +${typingUsers.length - 2}` : ''}`}
                                                </span>
                                                <span className="flex items-center gap-0.5 text-[var(--text-secondary)]">
                                                    <span className="typing-dot" />
                                                    <span className="typing-dot" />
                                                    <span className="typing-dot" />
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {showSuggestions && (
                                    <div className="mx-2 mb-2 bg-[var(--dark-surface)] border border-[var(--dark-border)] shadow-xl overflow-hidden rounded-none">
                                        {suggestions.map((s: any, idx: number) => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => handleSelectSuggestion(s)}
                                                className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${idx === selectedIndex ? 'bg-[var(--primary-color)] text-white' : 'hover:bg-white/5 text-[var(--text-primary)]'
                                                    }`}
                                            >
                                                <Wifi size={14} className="opacity-50" />
                                                <span className="truncate flex-1">{s.name}</span>
                                                <span className="text-[10px] opacity-50 uppercase">{s.country}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Menú contextual → renderizado en portal fuera del modal (ver createPortal al final del return) */}

                                {/* Message Input */}
                                <form
                                    onSubmit={handleSendMessage}
                                    className="p-2 border-t border-[var(--dark-border)] bg-[var(--dark-surface)]"
                                >
                                    {(error || contextError) && (
                                        <div className="text-red-400 text-xs mb-2 text-center">
                                            {error || contextError}
                                        </div>
                                    )}

                                    {/* Preview del archivo adjunto seleccionado con barra de progreso */}
                                    {pendingFile && (
                                        <div className="mb-2 p-2.5 rounded-xl bg-[var(--dark-bg)] border border-[var(--dark-border)] shadow-md animate-in fade-in slide-in-from-bottom-1">
                                            <div className="flex items-center gap-2.5">
                                                {pendingFile.type === 'image' && pendingFile.previewUrl ? (
                                                    <img src={pendingFile.previewUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/20 flex-shrink-0" />
                                                ) : pendingFile.type === 'audio' ? (
                                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                                                        <Music size={20} />
                                                    </div>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
                                                        <FileText size={20} />
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-white truncate">{pendingFile.name}</p>
                                                    <p className="text-[10px] text-[var(--text-secondary)]">
                                                        {(pendingFile.size / 1024).toFixed(1)} KB • {pendingFile.type === 'image' ? 'Imagen' : pendingFile.type === 'audio' ? 'Audio' : pendingFile.type === 'pdf' ? 'PDF' : 'Archivo'}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (isUploading && xhrRef.current) {
                                                            xhrRef.current.abort();
                                                        }
                                                        setPendingFile(null);
                                                        setIsUploading(false);
                                                        setUploadProgress(0);
                                                    }}
                                                    className="p-1.5 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                                                    title={isUploading ? "Cancelar subida" : "Quitar archivo adjunto"}
                                                >
                                                    <X size={15} />
                                                </button>
                                            </div>

                                            {/* Barra de progreso en tiempo real */}
                                            {isUploading && (
                                                <div className="mt-2.5 pt-2 border-t border-white/10 animate-in fade-in">
                                                    <div className="flex items-center justify-between text-[11px] mb-1 font-medium">
                                                        <span className="flex items-center gap-1.5 text-white/90">
                                                            <Loader2 size={12} className="animate-spin text-[var(--primary-color)]" />
                                                            {uploadProgress < 100 ? `Subiendo archivo (${uploadProgress}%)` : 'Procesando en servidor...'}
                                                        </span>
                                                        <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                                                            {((pendingFile.size * (uploadProgress / 100)) / (1024 * 1024)).toFixed(1)} / {(pendingFile.size / (1024 * 1024)).toFixed(1)} MB
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden p-0.5">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] rounded-full transition-all duration-150 ease-out shadow-sm"
                                                            style={{ width: `${Math.max(4, uploadProgress)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {isRecordingVoice ? (
                                        /* Barra de grabación de nota de voz activa (Estilo WhatsApp) */
                                        <div className="flex items-center gap-2 p-1.5 px-3 bg-red-950/40 border border-red-500/40 rounded-2xl animate-in fade-in duration-150">
                                            {/* Indicador pulsante rojo y tiempo */}
                                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                <div className="relative flex items-center justify-center">
                                                    <span className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute opacity-75" />
                                                    <span className="w-3 h-3 rounded-full bg-red-600 relative" />
                                                </div>
                                                <span className="text-sm font-mono font-bold text-red-400 tracking-wider">
                                                    {formatAudioTime(recordingDuration)}
                                                </span>
                                                <span className="text-xs text-red-200/70 truncate hidden sm:inline">
                                                    Grabando nota de voz...
                                                </span>
                                            </div>

                                            {/* Botón descartar / cancelar */}
                                            <button
                                                type="button"
                                                onClick={cancelVoiceRecording}
                                                className="p-2 text-white/70 hover:text-red-400 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                                                title="Cancelar grabación"
                                            >
                                                <Trash2 size={18} />
                                            </button>

                                            {/* Botón enviar nota de voz */}
                                            <button
                                                type="button"
                                                onClick={() => finishVoiceRecording(true)}
                                                className="h-[40px] px-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl font-medium transition-all flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                                                title="Enviar nota de voz"
                                            >
                                                <Send size={16} />
                                                <span className="text-xs font-bold hidden sm:inline">Enviar</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-end gap-2">
                                            {/* Input oculto para selección de archivos */}
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                onChange={handleFileSelect}
                                                accept="image/*,application/pdf,.doc,.docx,.txt,.mp3,.wav,.ogg,.m4a"
                                                className="hidden"
                                            />

                                            {/* Cápsula de entrada estilo WhatsApp que armoniza con el tema activo */}
                                            <div className="flex-1 flex items-end bg-[var(--dark-bg)] border border-[var(--dark-border)] rounded-[24px] px-2.5 py-1 transition-all focus-within:border-[var(--primary-color)]/60 shadow-inner">
                                                {/* En Windows / Desktop: Clip a la izquierda */}
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isUploading}
                                                    className={`hidden sm:flex p-2 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-colors flex-shrink-0 mb-0.5 ${
                                                        pendingFile ? 'text-[var(--primary-color)] bg-[var(--primary-color)]/20' : ''
                                                    }`}
                                                    title="Adjuntar imagen, audio o documento (hasta 25MB)"
                                                >
                                                    <Paperclip size={20} className="-rotate-45" />
                                                </button>

                                                {/* Icono de Carita / Emoji */}
                                                <div className="p-2 text-white/40 flex-shrink-0 mb-0.5 select-none hidden xs:block">
                                                    <Smile size={20} />
                                                </div>

                                                {/* Textarea sin bordes integrada dentro de la cápsula */}
                                                <textarea
                                                    ref={inputRef}
                                                    rows={1}
                                                    value={currentMessage}
                                                    onChange={handleInputChange}
                                                    onKeyDown={handleKeyDown}
                                                    placeholder={
                                                        connectionStatus === 'connected'
                                                            ? (pendingFile ? "Añade un comentario (opcional)..." : "Mensaje...")
                                                            : "Sin conexión — se enviará al reconectar..."
                                                    }
                                                    className="flex-1 min-h-[38px] max-h-[120px] py-2 px-2 bg-transparent text-white placeholder-white/45 border-none outline-none resize-none text-sm leading-relaxed chat-textarea-scroll"
                                                    maxLength={500}
                                                />

                                                {/* En Móvil: Clip a la derecha dentro de la misma cápsula */}
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isUploading}
                                                    className={`sm:hidden p-2 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-colors flex-shrink-0 mb-0.5 ${
                                                        pendingFile ? 'text-[var(--primary-color)] bg-[var(--primary-color)]/20' : ''
                                                    }`}
                                                    title="Adjuntar archivo"
                                                >
                                                    <Paperclip size={20} className="-rotate-45" />
                                                </button>
                                            </div>

                                            {/* Botón circular flotante exterior con gradiente del tema activo */}
                                            {(!currentMessage.trim() && !pendingFile) ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        startVoiceRecording();
                                                    }}
                                                    onContextMenu={(e) => e.preventDefault()}
                                                    disabled={!canSend || isUploading}
                                                    className="w-[46px] h-[46px] bg-gradient-to-tr from-[var(--primary-color)] to-[var(--secondary-color)] hover:brightness-110 active:brightness-90 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg active:scale-95 flex-shrink-0 cursor-pointer select-none touch-none"
                                                    title="Toca para grabar nota de voz"
                                                >
                                                    <Mic size={22} />
                                                </button>
                                            ) : (
                                                <button
                                                    type="submit"
                                                    disabled={(!currentMessage.trim() && !pendingFile) || !canSend || isUploading}
                                                    className="w-[46px] h-[46px] bg-gradient-to-tr from-[var(--primary-color)] to-[var(--secondary-color)] hover:brightness-110 active:brightness-90 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg active:scale-95 flex-shrink-0 cursor-pointer"
                                                    title={isUploading ? "Subiendo archivo..." : (connectionStatus !== 'connected' ? "Guardar y enviar automáticamente al reconectar" : "Enviar mensaje (Enter)")}
                                                >
                                                    {isUploading ? (
                                                        <Loader2 size={20} className="animate-spin" />
                                                    ) : rateLimitTimer > 0 ? (
                                                        <span className="text-xs font-bold font-mono">{rateLimitTimer}s</span>
                                                    ) : (
                                                        <Send size={20} className="ml-0.5" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <div className="text-[10px] text-[var(--text-secondary)] mt-1.5 pr-1 text-right">
                                        {currentMessage.length}/500
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Visualizador de imagen a pantalla completa (Lightbox estilo WhatsApp) */}
            {lightboxMedia && (
                <div
                    className="fixed inset-0 z-[9999999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-3 md:p-6 animate-in fade-in duration-150"
                    onClick={() => setLightboxMedia(null)}
                >
                    {/* Barra superior de controles */}
                    <div
                        className="w-full max-w-4xl flex items-center justify-between py-2.5 px-4 bg-black/70 backdrop-blur-lg rounded-2xl border border-white/15 text-white z-10 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2 overflow-hidden pr-3">
                            <span className="text-xs md:text-sm font-semibold truncate text-white">
                                {lightboxMedia.title || 'Visualizador de imagen'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => downloadMediaSafely(lightboxMedia.url, lightboxMedia.title || 'imagen.png')}
                                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                                title="Descargar imagen"
                            >
                                <Download size={15} />
                                <span className="hidden sm:inline">Descargar</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => openImageSafely(lightboxMedia.url, lightboxMedia.title || 'imagen.png')}
                                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                                title="Abrir en pestaña nueva"
                            >
                                <ExternalLink size={15} />
                                <span className="hidden sm:inline">Abrir en pestaña</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setLightboxMedia(null)}
                                className="p-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-all ml-1 cursor-pointer"
                                title="Cerrar (Esc)"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Imagen centrada */}
                    <div
                        className="flex-1 flex items-center justify-center p-2 max-w-full max-h-[calc(100vh-120px)] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={lightboxMedia.url}
                            alt={lightboxMedia.title || 'Imagen adjunta'}
                            className="max-w-full max-h-[82vh] object-contain rounded-xl shadow-2xl transition-transform select-none"
                        />
                    </div>

                    {/* Pie informativo */}
                    <div className="text-[11px] text-white/50 text-center pb-1">
                        Haz clic fuera de la imagen o presiona <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/70">Esc</kbd> para cerrar
                    </div>
                </div>
            )}

            <HelpModal
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
            />

            {/* ── Portal del menú contextual ──────────────────────────────────────
                Se renderiza en document.body para escapar del stacking context
                del modal animado (animate-slide-in-right usa transform CSS,
                lo que atrapa position:fixed dentro de él).
            ────────────────────────────────────────────────────────────────────── */}
            {activeMenuCoords && createPortal(
                <div
                    data-message-menu
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'fixed',
                        right: `${activeMenuCoords.right}px`,
                        ...(activeMenuCoords.bottom !== undefined
                            ? { bottom: `${activeMenuCoords.bottom}px` }
                            : { top: `${activeMenuCoords.top}px` }),
                        zIndex: 2147483647  // máximo z-index posible
                    }}
                    className="w-44 bg-[var(--dark-surface)] border border-white/20 rounded-xl shadow-2xl py-1.5 animate-in fade-in zoom-in-95 duration-150"
                >
                    <button
                        type="button"
                        onClick={async (e) => {
                            e.stopPropagation();
                            const idToDelete = activeMenuCoords.id;
                            setActiveMenuCoords(null);
                            await deleteMessage(idToDelete);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                        <Trash2 size={14} />
                        <span>Eliminar mensaje</span>
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            const idToSelect = activeMenuCoords.id;
                            setActiveMenuCoords(null);
                            setIsMultiSelectMode(true);
                            setSelectedMessageIds([idToSelect]);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-white/90 hover:bg-white/10 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                        <CheckSquare size={14} />
                        <span>Seleccionar varios</span>
                    </button>
                </div>,
                document.body
            )}
        </>
    );
};
