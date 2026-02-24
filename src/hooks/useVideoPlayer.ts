import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { Station } from '../types';

type PlayerType = 'html5' | 'videojs' | 'iframe' | null;

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
    onPlayStateChange: (playing: boolean) => void,
    onStationUpdate?: (station: Station) => void
) => {
    const videoRef = useRef<HTMLElement | null>(null);
    const videojsPlayerRef = useRef<any>(null);
    const ytPlayerRef = useRef<any>(null);
    const lastStationIdRef = useRef<string | null>(null);
    const timeoutsRef = useRef<number[]>([]);
    const retryCountRef = useRef<number>(0);

    // Internal state for non-derived values
    const [error, setError] = useState<string | null>(null);
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
    const isIframe = !!currentStation?.iframeUrl || !!currentStation?.embedCanal;
    // An HLS stream is identified by .m3u8 OR if it's a known proxy route for HLS
    const isHls = !isIframe && (
        (currentStation?.url.includes('.m3u8') ?? false) ||
        (currentStation?.url.includes('/repretel-') ?? false)
    );
    const playerType: PlayerType = isIframe ? 'iframe' : (isHls ? 'videojs' : 'html5');
    const hasVideo = currentStation?.type === 'video';

    // Quality levels state
    const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
    const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = Auto
    const [isAutoMode, setIsAutoMode] = useState<boolean>(true);

    // Ref to track auto mode inside event listeners (avoids stale closures)
    const isAutoModeRef = useRef<boolean>(true);

    useEffect(() => {
        isAutoModeRef.current = isAutoMode;
    }, [isAutoMode]);

    // 1. Manejo de cambio de estación (Source/Tech Change)
    useEffect(() => {
        if (!currentStation || !videoRef.current) return;

        const videoEl = videoRef.current;
        const stationId = currentStation.id;
        let isCancelled = false;

        console.log(`[VideoPlayer] Station switch: ${lastStationIdRef.current} -> ${stationId} (Tech: ${playerType})`);
        lastStationIdRef.current = stationId;
        setError(null);
        setQualityLevels([]);
        setCurrentLevel(-1);
        setIsAutoMode(true);
        retryCountRef.current = 0;
        clearAllTimeouts();

        // Initialize based on type
        const initPlayer = () => {
            if (isCancelled) return;

            if (playerType === 'html5') {
                const el = videoEl as HTMLVideoElement;
                el.src = currentStation.url;
                el.volume = volume;
                el.load();

                if (isPlaying) {
                    el.play().catch((err: any) => {
                        if (err.name !== 'AbortError') console.warn('[VideoPlayer] Autoplay failed:', err);
                    });
                }
            }
        };

        // Initialize based on type
        // Use 0ms to start as soon as possible after mount
        addTrackedTimeout(initPlayer, 0);

        // Listeners
        const onPlay = () => onPlayStateChange(true);
        const onPause = () => {
            if (videoEl instanceof HTMLVideoElement && videoEl.seeking) return;
            onPlayStateChange(false);
        };

        videoEl.addEventListener('play', onPlay);
        videoEl.addEventListener('pause', onPause);

        return () => {
            isCancelled = true;
            videoEl.removeEventListener('play', onPlay);
            videoEl.removeEventListener('pause', onPause);

            // SAFE CLEANUP: Only pause if it's a video element
            if (videoEl instanceof HTMLVideoElement) {
                videoEl.pause();
                videoEl.removeAttribute('src');
                videoEl.load();
            }

            if (videojsPlayerRef.current) {
                console.log('[VideoPlayer] Cleanup: Disposing VideoJS instance...');
                try {
                    videojsPlayerRef.current.dispose();
                } catch (e) {
                    console.warn('[VideoPlayer] Error disposing player:', e);
                }
                videojsPlayerRef.current = null;
            }
        };
    }, [currentStation?.id, playerType]);

    // 2. Inicialización de Video.js (Para HLS / Video)
    useEffect(() => {
        if (playerType !== 'videojs' || !videoRef.current || !currentStation) return;

        const videoEl = videoRef.current;
        let isCancelled = false;

        // Si no hay reproductor, lo inicializamos
        addTrackedTimeout(() => {
            if (isCancelled || videojsPlayerRef.current || !videoRef.current) return;

            // Verificamos si el elemento realmente está en el DOM
            if (!document.body.contains(videoEl)) {
                console.warn('[VideoPlayer] Element exists in ref but not in DOM. Skipping VideoJS init.');
                return;
            }

            console.log(`[VideoPlayer] NEW VideoJS init for: ${currentStation.name} (ID: ${currentStation.id})`);
            const player = videojs(videoEl, {
                controls: true,
                autoplay: isPlaying,
                preload: 'auto',
                fluid: false,
                liveui: true,
                html5: {
                    vhs: {
                        withCredentials: false,
                        fastQualityChange: true,
                        useDevicePixelRatio: true,
                        bufferLowWaterLine: 2, // Minimal for TV RAM
                        goalBufferLength: 5,   // Minimal buffer to prevent RAM exhaustion
                        enableLowInitialPlaylist: true,
                        maxPlaylistRetries: 3
                    }
                }
            });

            videojsPlayerRef.current = player;
            player.volume(volume);

            let finalUrl = currentStation.url;
            if (currentStation.useProxy) {
                finalUrl = `/proxy-stream?url=${encodeURIComponent(currentStation.url)}`;
            }

            player.src({ src: finalUrl, type: 'application/x-mpegURL' }); // Force initial source
            player.controls(true);
            player.userActive(true);

            // 1. WATCHDOG: Force error if nothing happens in 10s ONLY IF PLAYING
            const watchdogId = addTrackedTimeout(() => {
                if (!videojsPlayerRef.current || isCancelled) return;

                // Solo damos error si el usuario quiere reproducir (not player.paused())
                // y no hemos cargado nada (readyState < 1)
                if (!player.paused() && player.readyState() < 1) {
                    console.error('[VideoPlayer] Watchdog: Initial load timeout (10s). Stopping.');
                    setError('Error de conexión o link caído');
                    player.pause();
                }
            }, 10000);

            // 2. Attach listeners using .ready() to ensure they fire even if already ready
            player.ready(() => {
                if (isCancelled) return;
                console.log('[VideoPlayer] Player Ready - Attaching VHS listeners');

                const vhsListenersAttached = { current: false };

                const updateQualityLevels = () => {
                    if (isCancelled) return;

                    const currentTech = player.tech({ IWillNotUseThisInPlugins: true }) as any;
                    const currentVhs = (player as any).vhs || currentTech?.vhs;

                    if (currentVhs) {
                        // Attach VHS specific listeners only once
                        if (!vhsListenersAttached.current) {
                            currentVhs.on('usage-stats-ready', updateQualityLevels);
                            currentVhs.on('mediachange', updateQualityLevels);
                            vhsListenersAttached.current = true;
                            console.log('[VideoPlayer] VHS Tech detected and listeners attached');
                        }

                        retryCountRef.current = 0;
                        window.clearTimeout(watchdogId); // Metadata loaded! Kill watchdog

                        let representations: any[] = (currentVhs.representations?.() || currentVhs.playlists?.master?.playlists || []).slice();

                        // Advanced Fallback: Only use videoHeight if no variants are found after 3 seconds of metadata/playing
                        if (representations.length === 0) {
                            const vHeight = (player as any).videoHeight();
                            // If we have a height but it's very early, we might still be waiting for VHS to parse representations
                            // We only lock it in if we are truly stuck with no representations
                            if (vHeight > 0) {
                                representations = [{
                                    height: vHeight,
                                    index: 0,
                                    label: `${vHeight}p`
                                }];
                                console.log(`[VideoPlayer] Quality Fallback active: ${vHeight}p`);
                            }
                        }

                        let levels: QualityLevel[] = representations
                            .map((rep: any, index: number) => {
                                const height = rep.height || rep.attributes?.RESOLUTION?.height || 0;
                                return { index, height, label: `${height}p` };
                            })
                            .filter((l: any) => l.height > 0)
                            .sort((a: any, b: any) => b.height - a.height);

                        levels = levels.filter((l, i, s) => i === s.findIndex((t) => t.height === l.height));

                        if (levels.length > 0) {
                            const allLevels = levels.length > 1 ? [{ index: -1, height: 0, label: 'Auto' }, ...levels] : levels;

                            // Check if current levels are just a single fallback
                            const isCurrentlyFallback = qualityLevels.length === 1 && qualityLevels[0].index >= 0;
                            const newHasMultiple = allLevels.length > 1;

                            setQualityLevels(prev => JSON.stringify(prev) === JSON.stringify(allLevels) ? prev : allLevels);

                            // Initialize or update mode
                            if (newHasMultiple) {
                                // If we were in fallback mode, switch to Auto
                                if (isCurrentlyFallback || !isAutoMode) {
                                    setIsAutoMode(true);
                                }
                            } else if (qualityLevels.length === 0) {
                                // First time detection and only one level
                                setCurrentLevel(allLevels[0].index);
                                setIsAutoMode(false);
                            }
                        }
                    }
                };

                player.on('loadedmetadata', updateQualityLevels);
                player.on('resize', updateQualityLevels);
                player.on('playing', updateQualityLevels);

                // Sincronizar estado nativo -> React
                player.on('play', () => {
                    onPlayStateChange?.(true);
                    setupVhsErrorHandling();
                });
                player.on('pause', () => {
                    if (player.seeking()) return;
                    onPlayStateChange?.(false);
                });

                // Si el usuario hace clic en el botón "Live" nativo, forzar reproducción
                player.on('liveedgechange', () => {
                    if ((player as any).liveTracker?.atLiveEdge()) {
                        (player as any).play()?.catch?.(() => { });
                    }
                });

                // Also check for VHS errors/retries
                const setupVhsErrorHandling = () => {
                    const vtech = player.tech({ IWillNotUseThisInPlugins: true }) as any;
                    const vvhs = (player as any).vhs || vtech?.vhs;
                    if (vvhs) {
                        vvhs.on('retryplaylist', () => {
                            retryCountRef.current++;
                            console.warn(`[VideoPlayer] VHS retry ${retryCountRef.current}/3 for ${currentStation.name}`);
                            if (retryCountRef.current >= 3) {
                                setError('Error de carga persistente');
                                player.pause();
                                player.src({ src: '', type: '' });
                            }
                        });
                    }
                };
                player.on('play', setupVhsErrorHandling);

                player.src({
                    src: finalUrl,
                    type: 'application/x-mpegURL'
                });
            });

            player.on('error', () => {
                const error = player.error();
                if (error && (error.code === 4 || error.code === 2)) {
                    console.warn('[VideoPlayer] Terminal Error. Resetting tech.');
                    addTrackedTimeout(() => {
                        if (videojsPlayerRef.current === player) {
                            player.dispose();
                            videojsPlayerRef.current = null;
                        }
                    }, 0);
                }
            });
        }, 0); // No delay needed, React key change ensures fresh DOM

        return () => {
            isCancelled = true;
        };
    }, [currentStation?.id, playerType]);

    // 3. Control de Reproducción (Play/Pause/Volume)
    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        // Volume
        if (playerType === 'videojs' && videojsPlayerRef.current) {
            videojsPlayerRef.current.volume(volume);
        } else if (videoEl instanceof HTMLMediaElement) {
            videoEl.volume = volume;
        }

        // Play/Pause logic
        const handlePlayback = async () => {
            if (!currentStation || (!currentStation.url && !currentStation.iframeUrl)) return;

            try {
                if (isPlaying) {
                    if (playerType === 'videojs' && videojsPlayerRef.current) {
                        // Ensure player is ready and has src
                        if (videojsPlayerRef.current.src()) {
                            await videojsPlayerRef.current.play();
                        }
                    } else if (videoEl instanceof HTMLMediaElement && videoEl.paused && (videoEl as any).src) {
                        await (videoEl as HTMLMediaElement).play();
                    }
                } else {
                    if (playerType === 'videojs' && videojsPlayerRef.current) {
                        videojsPlayerRef.current.pause();
                    } else if (videoEl instanceof HTMLMediaElement && !videoEl.paused) {
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

    const lastReportedIdRef = useRef<string | null>(null);

    // 4. YouTube Iframe API Sync (Magic Sync)
    useEffect(() => {
        if (playerType !== 'iframe' || !currentStation?.iframeUrl?.includes('youtube.com/embed/')) {
            if (ytPlayerRef.current) {
                try { ytPlayerRef.current.destroy(); } catch (e) { }
            }
            ytPlayerRef.current = null;
            return;
        }

        // BYPASS: If the station change was already reported by the player, don't re-init
        if (ytPlayerRef.current && currentStation.id === lastReportedIdRef.current) {
            return;
        }

        // NAVIGATION: If player exists but ID is different (manual change from sidebar)
        if (ytPlayerRef.current && (window as any).YT && (window as any).YT.Player) {
            const player = ytPlayerRef.current;
            try {
                const videoData = player.getVideoData();
                const currentId = videoData.video_id;
                const targetId = currentStation.id.startsWith('yt-')
                    ? currentStation.id.replace('yt-', '')
                    : currentStation.iframeUrl?.split('/embed/')[1]?.split('?')[0];

                if (targetId && currentId !== targetId) {
                    console.log(`[VideoPlayer] Manual navigation: ${currentId} -> ${targetId}`);
                    player.loadVideoById(targetId);
                    lastReportedIdRef.current = currentStation.id;
                    return; // Early return, don't re-init
                }
            } catch (e) {
                console.warn('[VideoPlayer] Manual navigation failed, re-initializing:', e);
            }
        }

        const videoEl = videoRef.current;
        if (!videoEl || !(videoEl instanceof HTMLIFrameElement)) return;

        let isCancelled = false;

        const initYt = () => {
            if (isCancelled) return;
            const YT = (window as any).YT;
            if (!YT || !YT.Player) return;

            // Cleanup previous instance if any
            if (ytPlayerRef.current) {
                try { ytPlayerRef.current.destroy(); } catch (e) { }
                ytPlayerRef.current = null;
            }

            try {
                // Use youtube-nocookie and add widget_referrer for better embedding compatibility
                const ytBaseUrl = currentStation.iframeUrl?.replace('youtube.com/embed/', 'youtube-nocookie.com/embed/');
                const initialUrl = `${ytBaseUrl}${ytBaseUrl?.includes('?') ? '&' : '?'}autoplay=1&enablejsapi=1&origin=${window.location.origin}&widget_referrer=${encodeURIComponent(window.location.href)}&rel=0`;
                videoEl.src = initialUrl;

                ytPlayerRef.current = new (window as any).YT.Player(videoEl, {
                    events: {
                        onStateChange: (event: any) => {
                            if (isCancelled) return;
                            // YT.PlayerState.PLAYING = 1
                            if (event.data === 1) {
                                const player = event.target;
                                const videoData = player.getVideoData();
                                const realTitle = videoData.title;
                                const currentId = videoData.video_id;

                                // If the name is generic (contains ID or "YouTube:"), update with real title
                                if (realTitle && currentStation && (
                                    currentStation.name.includes(currentId) ||
                                    currentStation.name.toLowerCase().startsWith('youtube:')
                                )) {
                                    console.log(`[VideoPlayer] Title sync: ${currentStation.name} -> ${realTitle}`);
                                    if (onStationUpdate) {
                                        onStationUpdate({
                                            ...currentStation,
                                            name: realTitle
                                        });
                                    }
                                }
                            }
                        },
                        onError: (event: any) => {
                            if (isCancelled) return;
                            const errCode = event.data;
                            if (errCode === 101 || errCode === 150) {
                                setError('Video no permitido en esta App (Copyright)');
                            } else {
                                setError('Error en el video de YouTube');
                            }
                        }
                    }
                });
            } catch (e) {
                console.warn('[VideoPlayer] YT.Player init failed:', e);
            }
        };

        if (!(window as any).YT || !(window as any).YT.Player) {
            if (!document.getElementById('youtube-api-script')) {
                const tag = document.createElement('script');
                tag.id = 'youtube-api-script';
                tag.src = "https://www.youtube.com/iframe_api";
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
            }
            const prevOnReady = (window as any).onYouTubeIframeAPIReady;
            (window as any).onYouTubeIframeAPIReady = () => {
                if (prevOnReady) prevOnReady();
                initYt();
            };
        } else {
            addTrackedTimeout(initYt, 500);
        }

        return () => {
            isCancelled = true;
            if (ytPlayerRef.current && currentStation.id !== lastReportedIdRef.current) {
                try { ytPlayerRef.current.destroy(); } catch (e) { }
                ytPlayerRef.current = null;
            }
        };
    }, [currentStation?.id, playerType]);

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
