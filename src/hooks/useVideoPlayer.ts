import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { Station } from '../types';

type PlayerType = 'html5' | 'videojs' | null;

/**
 * Quality Level Information
 */
export interface QualityLevel {
    index: number;
    height: number;
    label: string; // e.g., "720p", "540p", "Auto"
}

export const useVideoPlayer = (
    currentStation: Station | null,
    isPlaying: boolean,
    volume: number,
    onPlayStateChange: (playing: boolean) => void
) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const videojsPlayerRef = useRef<any>(null);
    const lastStationIdRef = useRef<string | null>(null);
    const timeoutsRef = useRef<number[]>([]);

    // Helper to track and clear timeouts
    const clearAllTimeouts = () => {
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];
    };

    const addTrackedTimeout = (fn: () => void, delay: number) => {
        const id = window.setTimeout(fn, delay);
        timeoutsRef.current.push(id);
        return id;
    };

    // Synchronous mode detection to prevent double-render unmounts
    const isHls = currentStation?.url.includes('.m3u8') ?? false;
    const playerType: PlayerType = isHls ? 'videojs' : 'html5';
    const hasVideo = isHls;

    // Internal state for non-derived values
    const [error, setError] = useState<string | null>(null);

    // Quality levels state
    const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
    const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = Auto
    const [isAutoMode, setIsAutoMode] = useState<boolean>(true);

    // Ref to track auto mode inside event listeners (avoids stale closures)
    const isAutoModeRef = useRef<boolean>(true);
    const lastBandwidthRef = useRef<number>(Number(localStorage.getItem('vjs-last-bandwidth') || 0));

    useEffect(() => {
        isAutoModeRef.current = isAutoMode;
    }, [isAutoMode]);

    // 1. Manejo de cambio de estación y limpieza inicial
    useEffect(() => {
        if (!currentStation || !videoRef.current) return;

        const { url } = currentStation;

        // Reset state only if station changed
        if (currentStation.id !== lastStationIdRef.current) {
            setError(null);
            lastStationIdRef.current = currentStation.id;

            // Limpieza agresiva de instancias previas y timeouts
            clearAllTimeouts();

            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            if (videojsPlayerRef.current) {
                console.log('[VideoPlayer] Station change cleanup: disposing old instance...');
                videojsPlayerRef.current.off(); // Remove all listeners
                videojsPlayerRef.current.src('');
                videojsPlayerRef.current.dispose();
                videojsPlayerRef.current = null;
            }
        }

        // Small timeout to ensure DOM is ready
        addTrackedTimeout(() => {
            if (!videoRef.current) return;
            const videoEl = videoRef.current;

            // Native logic handled separately to avoid event pollution
            if (playerType === 'html5') {
                videoEl.src = url;
                videoEl.volume = volume;
                videoEl.load();

                if (isPlaying) {
                    videoEl.play().catch(e => {
                        if (e.name !== 'AbortError') console.warn('Auto-play blocked:', e);
                    });
                }
            }

            // Centralized Event Listeners
            const onPlay = () => onPlayStateChange(true);
            const onPause = () => onPlayStateChange(false);

            videoEl.addEventListener('play', onPlay);
            videoEl.addEventListener('pause', onPause);

            return () => {
                videoEl.removeEventListener('play', onPlay);
                videoEl.removeEventListener('pause', onPause);
            };
        }, 50);
    }, [currentStation, isPlaying, volume, playerType, onPlayStateChange]);

    // 2. Inicialización de Video.js (Para HLS / Video)
    useEffect(() => {
        if (playerType !== 'videojs' || !videoRef.current || !currentStation) return;

        const videoEl = videoRef.current;

        // Pequeño timeout para asegurar que el DOM está listo
        addTrackedTimeout(() => {
            if (videojsPlayerRef.current || !videoRef.current) return; // Ya existe o se desmontó

            // Configuración ROBUSTA con Buffer aumentado para TV
            const player = videojs(videoEl, {
                controls: true,
                autoplay: isPlaying,
                preload: 'auto',
                fluid: false,
                liveui: true,
                html5: {
                    // Fix for ABR being too conservative on mobile/small screens
                    limitRenditionByPlayerDimensions: false,
                    useDevicePixelRatio: false,

                    // Ensure controls are not hidden by layout logic
                    vhs: {
                        overrideNative: true,
                        // Bandwidth persistence
                        bandwidth: lastBandwidthRef.current || undefined,
                        useNetworkInformation: true,

                        // Allow faster switches up
                        smoothQualityChange: false,
                        fastQualityChange: true,

                        // Extreme Memory Optimization for Smart TV
                        bufferGood: 5,
                        maxBufferLength: 15,
                        backBufferLength: 0,
                        goalBufferLength: 5,

                        // ABR specific tweaks
                        abr: {
                            bandwidthUpgradeTarget: 0.85,
                            initialBandwidth: lastBandwidthRef.current || 500000,
                        }
                    }
                }
            });

            player.src({
                src: currentStation.url,
                type: 'application/x-mpegURL'
            });

            // Force controls to be visible if they are somehow disabled
            player.controls(true);

            // Prevent the player from going into "inactive" state too quickly
            player.userActive(true);

            videojsPlayerRef.current = player;
            player.volume(volume);

            // Extract quality levels when player is ready
            player.ready(() => {
                const tech = player.tech({ IWillNotUseThisInPlugins: true }) as any;
                const vhs = tech?.vhs;

                if (vhs) {
                    const updateQualityLevels = () => {
                        let representations: any[] = vhs.representations?.() || [];

                        // Fallback to master playlist if representations API is empty
                        if (representations.length === 0) {
                            representations = vhs.playlists?.master?.playlists || [];
                        }

                        let levels: QualityLevel[] = [];

                        if (representations.length > 0) {
                            levels = representations
                                .map((rep: any, index: number) => {
                                    const height = rep.height || rep.attributes?.RESOLUTION?.height || 0;
                                    return {
                                        index,
                                        height,
                                        label: `${height}p`
                                    };
                                })
                                .filter((level: QualityLevel) => level.height > 0)
                                .sort((a: QualityLevel, b: QualityLevel) => b.height - a.height);

                            // Remove duplicates based on height
                            levels = levels.filter((level, index, self) =>
                                index === self.findIndex((t) => t.height === level.height)
                            );
                        }

                        if (levels.length === 0) {
                            const currentMedia = vhs.playlists?.media?.();
                            const height = currentMedia?.attributes?.RESOLUTION?.height || videoEl.videoHeight;
                            if (height > 0) {
                                levels = [{ index: 0, height, label: `${height}p` }];
                            }
                        }

                        if (levels.length > 0) {
                            const allLevels = levels.length > 1
                                ? [{ index: -1, height: 0, label: 'Auto' }, ...levels]
                                : levels;

                            // Solo actualizamos si realmente hay un cambio en la longitud o primer/último nivel
                            setQualityLevels(prev => {
                                if (prev.length === allLevels.length && prev[0]?.label === allLevels[0]?.label) return prev;
                                return allLevels;
                            });

                            if (levels.length > 1) {
                                setIsAutoMode(true);
                                const activePlaylist = vhs.playlists?.media?.();
                                const height = activePlaylist?.attributes?.RESOLUTION?.height;
                                if (height) {
                                    const match = levels.find(l => l.height === height);
                                    if (match) setCurrentLevel(match.index);
                                }
                            } else {
                                setCurrentLevel(allLevels[0].index);
                                setIsAutoMode(false);
                            }
                        }
                    };

                    player.on('loadedmetadata', updateQualityLevels);

                    if (vhs.playlists) {
                        vhs.playlists.on('change', updateQualityLevels);
                        vhs.playlists.on('addplaylist', updateQualityLevels);
                    }

                    // Tracked timeouts
                    addTrackedTimeout(updateQualityLevels, 1000);
                    addTrackedTimeout(updateQualityLevels, 3000);

                    // Track playing rendition
                    vhs.on('renditionchange', () => {
                        const activePlaylist = vhs.playlists?.media?.();
                        if (activePlaylist) {
                            if (vhs.systemBandwidth) {
                                localStorage.setItem('vjs-last-bandwidth', vhs.systemBandwidth.toString());
                                lastBandwidthRef.current = vhs.systemBandwidth;
                            }

                            if (isAutoModeRef.current) {
                                const height = activePlaylist.attributes?.RESOLUTION?.height;
                                if (height) {
                                    let representations: any[] = vhs.representations?.() || vhs.playlists?.master?.playlists || [];
                                    const repsArray = Array.from(representations);
                                    const activeIndex = repsArray.findIndex((p: any) =>
                                        (p.height || p.attributes?.RESOLUTION?.height) === height
                                    );

                                    if (activeIndex !== -1) {
                                        setCurrentLevel(activeIndex);
                                    }
                                }
                            }
                        }
                    });
                }
            });

            player.on('error', () => {
                const err = player.error();
                if (err && err.code !== 3) {
                    console.error('VideoJS Error:', err);
                }
            });

        }, 100);

        return () => {
            clearAllTimeouts();
            if (videojsPlayerRef.current) {
                const player = videojsPlayerRef.current;
                console.log('[VideoPlayer] Safe cleanup: disposing player...');
                player.off(); // Remove all listeners first
                try {
                    player.dispose();
                } catch (e) {
                    console.warn('[VideoPlayer] Dispose error (ignorable):', e);
                }
                videojsPlayerRef.current = null;
            }
        };
    }, [playerType, currentStation]);

    // 3. Control de Reproducción (Play/Pause/Volume)
    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        // Volume
        if (playerType === 'videojs' && videojsPlayerRef.current) {
            videojsPlayerRef.current.volume(volume);
        } else {
            videoEl.volume = volume;
        }

        // Play/Pause logic
        const handlePlayback = async () => {
            try {
                if (isPlaying) {
                    if (playerType === 'videojs' && videojsPlayerRef.current) {
                        await videojsPlayerRef.current.play();
                    } else if (videoEl.paused) {
                        await videoEl.play();
                    }
                } else {
                    if (playerType === 'videojs' && videojsPlayerRef.current) {
                        videojsPlayerRef.current.pause();
                    } else if (!videoEl.paused) {
                        videoEl.pause();
                    }
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error('[VideoPlayer] Playback error:', error);
                }
            }
        };

        handlePlayback();
    }, [isPlaying, volume, playerType]);

    /**
     * Set quality level manually
     * @param levelIndex - Index of quality level, -1 for Auto
     */
    const setQualityLevel = (levelIndex: number) => {
        const player = videojsPlayerRef.current;
        if (!player) return;

        const tech = player.tech({ IWillNotUseThisInPlugins: true });
        const vhs = (tech as any)?.vhs;
        if (!vhs) return;

        const representations = vhs.representations?.();
        if (!representations) return;

        const repsArray = Array.from(representations);

        if (levelIndex === -1) {
            repsArray.forEach((rep: any) => rep.enabled(true));
            setIsAutoMode(true);

            const checkCurrentQuality = () => {
                const activePlaylist = vhs.playlists?.media?.();
                const height = activePlaylist?.attributes?.RESOLUTION?.height;
                if (height) {
                    const activeIndex = repsArray.findIndex((p: any) =>
                        (p.height || p.attributes?.RESOLUTION?.height) === height
                    );
                    if (activeIndex !== -1) setCurrentLevel(activeIndex);
                }
            };

            checkCurrentQuality();
            addTrackedTimeout(checkCurrentQuality, 500);
            addTrackedTimeout(checkCurrentQuality, 1000);
            addTrackedTimeout(checkCurrentQuality, 2000);
        } else {
            repsArray.forEach((rep: any, index: number) => {
                rep.enabled(index === levelIndex);
            });
            setCurrentLevel(levelIndex);
            setIsAutoMode(false);
        }
    };

    return {
        videoRef,
        playerType,
        hasVideo,
        error,
        qualityLevels,
        currentLevel,
        isAutoMode,
        setQualityLevel
    };
};
