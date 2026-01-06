import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Station } from '../types';

export const usePlayer = (
    currentStation: Station | null,
    isPlaying: boolean,
    volume: number,
    onPlayStateChange: (playing: boolean) => void
) => {
    const audioRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const isInitializingRef = useRef(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize HLS and Audio
    useEffect(() => {
        if (!currentStation || !audioRef.current) return;

        // Limpiar error anterior al cambiar de emisora
        setError(null);

        const { url } = currentStation;
        const audio = audioRef.current;
        isInitializingRef.current = true;

        const handlePlay = () => onPlayStateChange(true);
        const handlePause = () => onPlayStateChange(false);
        const handleError = (e: Event) => {
            console.error('Media Error:', e);
            setError('Error al reproducir la emisora.');
            onPlayStateChange(false);
        };

        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('error', handleError);

        // Pause and reset audio before changing source
        audio.pause();

        // Destroy previous HLS instance
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        // Check if URL is HLS stream
        if (url.includes('.m3u8')) {
            if (Hls.isSupported()) {
                const hls = new Hls();
                hls.loadSource(url);
                hls.attachMedia(audio);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    isInitializingRef.current = false;
                    if (isPlaying) audio.play().catch(console.error);
                });
                hls.on(Hls.Events.ERROR, (_event, data) => {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                hls.recoverMediaError();
                                break;
                            default:
                                hls.destroy();
                                isInitializingRef.current = false;
                                setError('Error al cargar el stream HLS.');
                                break;
                        }
                    }
                });
                hlsRef.current = hls;
            } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS support (Safari)
                audio.src = url;
                audio.load();
                audio.addEventListener('loadeddata', () => {
                    isInitializingRef.current = false;
                    if (isPlaying) audio.play().catch(console.error);
                }, { once: true });
            } else {
                setError('Tu navegador no soporta HLS streams.');
                isInitializingRef.current = false;
            }
        } else {
            // Standard audio/video stream (MP3, AAC, etc.)
            audio.src = url;
            audio.load();
            audio.addEventListener('loadeddata', () => {
                isInitializingRef.current = false;
                if (isPlaying) audio.play().catch(console.error);
            }, { once: true });
        }

        return () => {
            // Detener el audio antes de limpiar
            audio.pause();
            audio.src = '';

            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('error', handleError);

            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [currentStation]);

    // Handle Play/Pause
    useEffect(() => {
        if (!audioRef.current || isInitializingRef.current) return;
        if (isPlaying) {
            audioRef.current.play().catch(e => console.error("Play failed", e));
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying]);

    // Handle Volume
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    return { audioRef, error };
};
