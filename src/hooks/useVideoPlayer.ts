import { useCallback, useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { Station } from '../types';
import { registerPlayerTimeProvider, unregisterPlayerTimeProvider } from '../utils/playerTimeBridge';
import { resolveWatchPartyMediaCapabilities } from '../utils/watchPartyMediaCapabilities';

type PlayerType = 'html5' | 'videojs' | 'iframe' | null;

/**
 * Quality Level Information
 */
export interface QualityLevel {
    index: number;
    height: number;
    label: string; // e.g., "720p", "540p", "Auto"
}

export type WatchPartyPlaybackAction = 'play' | 'pause' | 'seek';

export const useVideoPlayer = (
    currentStation: Station | null,
    isPlaying: boolean,
    volume: number,
    onPlayStateChange: (playing: boolean) => void,
    onStationUpdate?: (station: Station) => void,
    onSeek?: (seconds: number) => void
) => {
    const videoRef = useRef<HTMLElement | null>(null);
    const [videoElement, setVideoElement] = useState<HTMLElement | null>(null);
    const setVideoElementRef = useCallback((element: HTMLElement | null) => {
        videoRef.current = element;
        setVideoElement(element);
    }, []);
    const videojsPlayerRef = useRef<any>(null);
    const ytPlayerRef = useRef<any>(null);
    const lastStationIdRef = useRef<string | null>(null);
    const timeoutsRef = useRef<number[]>([]);
    const retryCountRef = useRef<number>(0);
    const isPlayingRef = useRef(isPlaying);
    const youtubeReadyRef = useRef(false);
    const pendingRemoteActionRef = useRef<{ action: WatchPartyPlaybackAction; seconds?: number; mediaKey: string } | null>(null);
    const lastYouTubeTimeRef = useRef<number | null>(null);
    const remoteSeekSuppressionRef = useRef(false);
    const driftRateRef = useRef<number | null>(null);
    const driftSeekResultTimerRef = useRef<number | null>(null);
    const latestDriftRef = useRef<number | null>(null);

    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

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

    const extractYouTubeId = (url?: string): string | null => {
        if (!url) return null;
        const match = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?.*?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
        if (match) return match[1];
        if (url.includes('youtube.com/embed/')) {
            return url.split('/embed/')[1]?.split('?')[0]?.split('&')[0] || null;
        }
        if (url.includes('youtube-nocookie.com/embed/')) {
            return url.split('/embed/')[1]?.split('?')[0]?.split('&')[0] || null;
        }
        if (url.includes('youtube.com/watch')) {
            return url.split('v=')[1]?.split('&')[0]?.split('#')[0] || null;
        }
        if (url.includes('youtu.be/')) {
            return url.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0] || null;
        }
        return null;
    };

    const ytId = extractYouTubeId(currentStation?.iframeUrl) || extractYouTubeId(currentStation?.url) || (currentStation?.id?.startsWith('yt-') ? currentStation.id.replace('yt-', '') : null);
    const isYouTube = !!ytId;
    const currentMediaKey = currentStation
        ? `${currentStation.id}:${currentStation.url}:${currentStation.iframeUrl ?? ''}`
        : '';

    const applyRemoteAction = (player: any, action: WatchPartyPlaybackAction, seconds?: number) => {
        try {
            if (action === 'play') {
                const result = player.play?.();
                result?.catch?.((error: any) => {
                    if (error?.name !== 'AbortError') console.warn('[VideoPlayer] Remote play failed:', error);
                });
            } else if (action === 'pause') {
                player.pause?.();
            } else if (Number.isFinite(seconds)) {
                player.currentTime?.(seconds);
            }
        } catch (error) {
            console.warn('[VideoPlayer] Remote playback action failed:', error);
        }
    };

    const executeRemoteAction = (action: WatchPartyPlaybackAction, seconds?: number) => {
        if (action === 'seek' && (!watchPartyCapabilities.seek || !watchPartyCapabilities.positionSync)) return;
        if ((action === 'play' || action === 'pause') && !watchPartyCapabilities.playPause) return;
        if (action === 'play') isPlayingRef.current = true;
        if (action === 'pause') isPlayingRef.current = false;

        if (playerType === 'videojs') {
            const player = videojsPlayerRef.current;
            if (!player) {
                pendingRemoteActionRef.current = { action, seconds, mediaKey: currentMediaKey };
                return;
            }
            player.ready(() => applyRemoteAction(player, action, seconds));
            return;
        }

        if (playerType === 'iframe' && isYouTube) {
            const player = ytPlayerRef.current;
            if (!player || !youtubeReadyRef.current) {
                const prev = pendingRemoteActionRef.current;
                pendingRemoteActionRef.current = {
                    action: action === 'seek' ? (prev?.action === 'play' || prev?.action === 'pause' ? prev.action : action) : action,
                    seconds: Number.isFinite(seconds) ? seconds : prev?.seconds,
                    mediaKey: currentMediaKey,
                };
                return;
            }
            if (action === 'seek' && Number.isFinite(seconds)) {
                remoteSeekSuppressionRef.current = true;
                player.seekTo(seconds, true);
                if (driftSeekResultTimerRef.current !== null) {
                    window.clearTimeout(driftSeekResultTimerRef.current);
                }
                driftSeekResultTimerRef.current = window.setTimeout(() => {
                    remoteSeekSuppressionRef.current = false;
                    driftSeekResultTimerRef.current = null;
                }, 2000);
            } else if (action === 'play') {
                if (Number.isFinite(seconds)) {
                    remoteSeekSuppressionRef.current = true;
                    player.seekTo(seconds, true);
                }
                player.playVideo();
            } else if (action === 'pause') {
                if (Number.isFinite(seconds)) {
                    remoteSeekSuppressionRef.current = true;
                    player.seekTo(seconds, true);
                }
                player.pauseVideo();
            }
            return;
        }

        const mediaElement = videoRef.current;
        if (mediaElement instanceof HTMLMediaElement) {
            if (action === 'play') {
                mediaElement.play().catch((error: any) => {
                    if (error?.name !== 'AbortError') console.warn('[VideoPlayer] Remote play failed:', error);
                });
            } else if (action === 'pause') {
                mediaElement.pause();
            } else if (Number.isFinite(seconds)) {
                mediaElement.currentTime = seconds as number;
            }
        }
    };

    const goLive = () => {
        if (playerType === 'videojs') {
            videojsPlayerRef.current?.liveTracker?.seekToLiveEdge?.();
            return;
        }
        if (playerType === 'iframe' && isYouTube) {
            const player = ytPlayerRef.current;
            const duration = Number(player?.getDuration?.());
            if (player && Number.isFinite(duration)) player.seekTo(duration, true);
            return;
        }
        const mediaElement = videoRef.current;
        if (mediaElement instanceof HTMLMediaElement) {
            const seekable = mediaElement.seekable;
            if (seekable.length > 0) {
                mediaElement.currentTime = seekable.end(seekable.length - 1);
            } else if (Number.isFinite(mediaElement.duration)) {
                mediaElement.currentTime = mediaElement.duration;
            }
        }
    };

    const reportSeek = (seconds: number) => {
        if (remoteSeekSuppressionRef.current || !watchPartyCapabilities.seek) return;
        onSeek?.(seconds);
    };

    const runPendingRemoteAction = (player: any, isYouTubePlayer = false) => {
        const pending = pendingRemoteActionRef.current;
        if (!pending) return;
        pendingRemoteActionRef.current = null;
        if (pending.mediaKey !== currentMediaKey
            || (pending.action === 'seek' && (!watchPartyCapabilities.seek || !watchPartyCapabilities.positionSync))) return;
        if (isYouTubePlayer) {
            if (Number.isFinite(pending.seconds)) {
                remoteSeekSuppressionRef.current = true;
                player.seekTo(pending.seconds, true);
                if (driftSeekResultTimerRef.current !== null) {
                    window.clearTimeout(driftSeekResultTimerRef.current);
                }
                driftSeekResultTimerRef.current = window.setTimeout(() => {
                    remoteSeekSuppressionRef.current = false;
                    driftSeekResultTimerRef.current = null;
                }, 2000);
            }
            if (pending.action === 'play') {
                player.playVideo();
            } else if (pending.action === 'pause') {
                player.pauseVideo();
            }
        } else {
            applyRemoteAction(player, pending.action, pending.seconds);
        }
    };

    // Detect if iframeUrl is actually an m3u8 stream mistakenly saved in iframeUrl
    const isM3u8Iframe = !isYouTube && (currentStation?.iframeUrl?.includes('.m3u8') ?? false) && !currentStation?.iframeUrl?.includes('bradmax.com');
    const effectiveUrl = (isM3u8Iframe ? currentStation?.iframeUrl : currentStation?.url) || '';

    // Synchronous mode detection to prevent double-render unmounts
    const isIframe = isYouTube || (!isM3u8Iframe && (!!currentStation?.iframeUrl || !!currentStation?.embedCanal));
    // An HLS stream is identified by .m3u8 OR if it's a known proxy route for HLS
    const isHls = !isIframe && (
        effectiveUrl.includes('.m3u8') ||
        effectiveUrl.includes('/repretel-') ||
        isM3u8Iframe
    );
    const watchPartyCapabilities = resolveWatchPartyMediaCapabilities(
        currentStation,
        isHls ? { playPause: true, seek: false, positionSync: false, driftCorrection: false } : undefined,
    );
    const playerType: PlayerType = isIframe ? 'iframe' : (isHls ? 'videojs' : 'html5');
    const hasVideo = currentStation?.type === 'video' || isYouTube || isHls || isIframe;

    // Quality levels state
    const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
    const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = Auto
    const [isAutoMode, setIsAutoMode] = useState<boolean>(true);

    // Ref to track auto mode inside event listeners (avoids stale closures)
    const isAutoModeRef = useRef<boolean>(true);

    useEffect(() => {
        isAutoModeRef.current = isAutoMode;
    }, [isAutoMode]);

    // Register this player as the time provider for WatchParty heartbeats.
    // Allows the host to send the REAL currentTime instead of extrapolating from React state.
    useEffect(() => {
        const provider = (): number | null => {
            if (playerType === 'videojs' && videojsPlayerRef.current) {
                const v = Number(videojsPlayerRef.current.currentTime?.());
                return Number.isFinite(v) ? v : null;
            }
            if (playerType === 'iframe' && isYouTube && ytPlayerRef.current) {
                const v = Number(ytPlayerRef.current.getCurrentTime?.());
                return Number.isFinite(v) ? v : null;
            }
            if (videoRef.current instanceof HTMLMediaElement) {
                const v = videoRef.current.currentTime;
                return Number.isFinite(v) ? v : null;
            }
            return null;
        };
        registerPlayerTimeProvider(provider);
        return () => unregisterPlayerTimeProvider();
    }, [playerType, isYouTube]);

    // 1. Manejo de cambio de estación (Source/Tech Change)
    // Guests correct their local player from the host heartbeat without emitting a WatchParty action.
    useEffect(() => {
        type RemoteHeartbeat = {
            currentTime: number;
            isPlaying: boolean;
            stationId?: string;
        };

        const getPlayer = () => {
            if (playerType === 'videojs') {
                const player = videojsPlayerRef.current;
                if (!player) return null;
                return {
                    currentTime: () => Number(player.currentTime?.()),
                    isPlaying: () => !player.paused?.(),
                    setPlaybackRate: (rate: number) => player.playbackRate?.(rate),
                    seek: (seconds: number) => player.currentTime?.(seconds),
                    onSeeked: (callback: () => void) => player.one?.('seeked', callback),
                    supportsSeeked: true,
                };
            }

            if (playerType === 'iframe' && isYouTube) {
                const player = ytPlayerRef.current;
                if (!player || !youtubeReadyRef.current) return null;
                return {
                    currentTime: () => Number(player.getCurrentTime?.()),
                    isPlaying: () => player.getPlayerState?.() === 1,
                    setPlaybackRate: (rate: number) => player.setPlaybackRate?.(rate),
                    seek: (seconds: number) => player.seekTo?.(seconds, true),
                    onSeeked: undefined,
                    supportsSeeked: false,
                };
            }

            const mediaElement = videoRef.current;
            if (mediaElement instanceof HTMLMediaElement) {
                return {
                    currentTime: () => mediaElement.currentTime,
                    isPlaying: () => !mediaElement.paused,
                    setPlaybackRate: (rate: number) => { mediaElement.playbackRate = rate; },
                    seek: (seconds: number) => { mediaElement.currentTime = seconds; },
                    onSeeked: (callback: () => void) => mediaElement.addEventListener('seeked', callback, { once: true }),
                    supportsSeeked: true,
                };
            }

            return null;
        };

        const clearRateCorrection = () => {
            if (driftRateRef.current === null) return;
            driftRateRef.current = null;
            getPlayer()?.setPlaybackRate(1);
        };

        const logDrift = (remote: number, local: number, drift: number, action: 'none' | 'rate' | 'seek') => {
            console.info(`[WatchParty Drift] remote=${remote.toFixed(3)} local=${local.toFixed(3)} drift=${drift.toFixed(3)} action=${action}`);
        };

        const onRemoteHeartbeat = (event: Event) => {
            if (!watchPartyCapabilities.positionSync || !watchPartyCapabilities.driftCorrection) return;
            const heartbeat = (event as CustomEvent<RemoteHeartbeat>).detail;
            if (!heartbeat || !Number.isFinite(heartbeat.currentTime)
                || (heartbeat.stationId && heartbeat.stationId !== currentStation?.id)) return;
            if (!heartbeat.isPlaying) return;

            const player = getPlayer();
            if (!player || player.isPlaying() !== heartbeat.isPlaying) return;

            const localTime = player.currentTime();
            if (!Number.isFinite(localTime)) return;

            const drift = heartbeat.currentTime - localTime;
            const absoluteDrift = Math.abs(drift);
            latestDriftRef.current = drift;

            // Micro-drift under 1.5 seconds is normal network variance in watchparty
            if (absoluteDrift < 1.5) {
                if (player.supportsSeeked) {
                    const correctionRate = drift > 0 ? 1.03 : 0.97;
                    if (driftRateRef.current !== correctionRate) {
                        player.setPlaybackRate(correctionRate);
                        driftRateRef.current = correctionRate;
                        logDrift(heartbeat.currentTime, localTime, drift, 'rate');
                    } else {
                        logDrift(heartbeat.currentTime, localTime, drift, 'none');
                    }
                } else {
                    // YouTube rejects non-standard rates (1.03/0.97); sub-1.5s difference is left uninterrupted
                    logDrift(heartbeat.currentTime, localTime, drift, 'none');
                }
                return;
            }

            clearRateCorrection();
            if (driftSeekResultTimerRef.current !== null) {
                window.clearTimeout(driftSeekResultTimerRef.current);
                driftSeekResultTimerRef.current = null;
            }

            remoteSeekSuppressionRef.current = true;
            player.seek(heartbeat.currentTime);
            logDrift(heartbeat.currentTime, localTime, drift, 'seek');

            const logSeekResult = () => {
                const correctedTime = getPlayer()?.currentTime();
                if (typeof correctedTime === 'number' && Number.isFinite(correctedTime)) {
                    console.info(`[WatchParty Drift] remote=${heartbeat.currentTime.toFixed(3)} local=${correctedTime.toFixed(3)} drift=${(heartbeat.currentTime - correctedTime).toFixed(3)} action=seek`);
                }
            };

            if (player.supportsSeeked) {
                player.onSeeked?.(() => {
                    remoteSeekSuppressionRef.current = false;
                    logSeekResult();
                });
            } else {
                // The YouTube iframe API has no seeked event; suppress seek reporting for 2000ms to allow buffering to complete without feedback
                driftSeekResultTimerRef.current = window.setTimeout(() => {
                    remoteSeekSuppressionRef.current = false;
                    logSeekResult();
                    driftSeekResultTimerRef.current = null;
                }, 2000);
            }
        };

        window.addEventListener('watchparty:heartbeat:remote', onRemoteHeartbeat);
        return () => {
            window.removeEventListener('watchparty:heartbeat:remote', onRemoteHeartbeat);
            clearRateCorrection();
            if (driftSeekResultTimerRef.current !== null) {
                window.clearTimeout(driftSeekResultTimerRef.current);
                driftSeekResultTimerRef.current = null;
            }
        };
    }, [currentMediaKey, playerType, isYouTube, watchPartyCapabilities.positionSync, watchPartyCapabilities.driftCorrection]);

    useEffect(() => {
        if (!currentStation || !videoElement) return;

        const videoEl = videoElement;
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

            if (playerType === 'html5' && videoEl instanceof HTMLMediaElement) {
                let targetSrc = effectiveUrl;
                if (currentStation.useProxy) {
                    targetSrc = `/proxy-stream?url=${encodeURIComponent(effectiveUrl)}`;
                }
                videoEl.src = targetSrc;
                videoEl.volume = volume;
                videoEl.load();

                if (isPlayingRef.current) {
                    videoEl.play().catch((err: any) => {
                        if (err.name !== 'AbortError') console.warn('[VideoPlayer] Autoplay failed:', err);
                    });
                }
            }
        };

        // Initialize based on type
        addTrackedTimeout(initPlayer, 0);

        // Listeners
        const onPlay = () => onPlayStateChange(true);
        const onPause = () => {
            if (videoEl instanceof HTMLMediaElement && (videoEl as any).seeking) return;
            onPlayStateChange(false);
        };
        const onSeeked = () => {
            if (playerType === 'html5' && videoEl instanceof HTMLMediaElement) {
                reportSeek(videoEl.currentTime);
            }
        };

        videoEl.addEventListener('play', onPlay);
        videoEl.addEventListener('pause', onPause);
        videoEl.addEventListener('seeked', onSeeked);

        return () => {
            isCancelled = true;
            videoEl.removeEventListener('play', onPlay);
            videoEl.removeEventListener('pause', onPause);
            videoEl.removeEventListener('seeked', onSeeked);

            // SAFE CLEANUP: Pause both video and audio elements on unmount/station switch
            if (videoEl instanceof HTMLMediaElement) {
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
    }, [currentStation?.id, playerType, effectiveUrl, videoElement]);

    // 2. Inicialización de Video.js (Para HLS / Video)
    useEffect(() => {
        if (playerType !== 'videojs' || !videoElement || !currentStation) return;

        const videoEl = videoElement;
        if (videojsPlayerRef.current) return;

        let isCancelled = false;

        // Si no hay reproductor, lo inicializamos
        const initializePlayer = () => {
            if (isCancelled || videojsPlayerRef.current || videoRef.current !== videoEl) return;

            // Verificamos si el elemento realmente está en el DOM
            if (!document.body.contains(videoEl)) {
                console.warn('[VideoPlayer] Element exists in ref but not in DOM. Skipping VideoJS init.');
                return;
            }

            console.info('[Bootstrap] createPlayer', {
                stationId: currentStation.id,
                source: effectiveUrl,
                elementConnected: videoEl.isConnected,
            });
            console.log(`[VideoPlayer] NEW VideoJS init for: ${currentStation.name} (ID: ${currentStation.id})`);
            const player = videojs(videoEl, {
                controls: true,
                autoplay: isPlayingRef.current,
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

            player.one('canplay', () => {
                console.info('[Bootstrap] firstCanPlay', {
                    stationId: currentStation.id,
                    source: player.currentSrc(),
                    readyState: (videoEl as HTMLVideoElement).readyState,
                    networkState: (videoEl as HTMLVideoElement).networkState,
                });
            });

            const logHlsEvent = (eventName: string) => {
                const mediaElement = videoEl as HTMLVideoElement;
                console.info(`[HLS] ${eventName}`, {
                    source: player.currentSrc(),
                    readyState: mediaElement.readyState,
                    networkState: mediaElement.networkState,
                });
            };
            player.on('loadedmetadata', () => logHlsEvent('loadedmetadata'));
            player.on('loadeddata', () => logHlsEvent('loadeddata'));
            player.on('canplay', () => logHlsEvent('canplay'));
            player.on('error', () => {
                const mediaError = player.error();
                console.error('[HLS] error code=', mediaError?.code, {
                    message: mediaError?.message,
                    source: player.currentSrc(),
                    readyState: (videoEl as HTMLVideoElement).readyState,
                    networkState: (videoEl as HTMLVideoElement).networkState,
                });
            });

            let finalUrl = effectiveUrl;
            if (currentStation.useProxy) {
                finalUrl = `/proxy-stream?url=${encodeURIComponent(effectiveUrl)}`;
            }

            console.info('[Bootstrap] assignSource', { stage: 'initial', stationId: currentStation.id, url: finalUrl });
            console.info('[HLS] source=', { stage: 'initial', url: finalUrl });
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
                player.on('seeked', () => {
                    const currentTime = player.currentTime();
                    if (typeof currentTime === 'number' && Number.isFinite(currentTime)) reportSeek(currentTime);
                });

                // Si el usuario hace clic en el botón "Live" nativo, forzar reproducción SOLO si está activo
                player.on('liveedgechange', () => {
                    if (isPlayingRef.current && (player as any).liveTracker?.atLiveEdge()) {
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

                console.info('[Bootstrap] playerReady', { stationId: currentStation.id, url: finalUrl });
                runPendingRemoteAction(player);
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
        };
        initializePlayer();

        return () => {
            isCancelled = true;
            if (videojsPlayerRef.current) {
                try {
                    videojsPlayerRef.current.dispose();
                } catch (e) {
                    console.warn('[VideoPlayer] Error disposing player:', e);
                }
                videojsPlayerRef.current = null;
            }
        };
    }, [currentStation?.id, playerType, effectiveUrl, videoElement]);

    // 3. Control de Reproducción (Play/Pause/Volume)
    useEffect(() => {
        const videoEl = videoElement;
        if (!videoEl) return;

        // Volume
        if (playerType === 'videojs' && videojsPlayerRef.current) {
            videojsPlayerRef.current.volume(volume);
        } else if (playerType === 'iframe' && isYouTube && ytPlayerRef.current?.setVolume) {
            try {
                ytPlayerRef.current.setVolume(Math.round(volume * 100));
            } catch (e) {}
        } else if (videoEl instanceof HTMLMediaElement) {
            videoEl.volume = volume;
        }

        // Play/Pause logic
        const handlePlayback = async () => {
            if (!currentStation || (!currentStation.url && !currentStation.iframeUrl && !currentStation.embedCanal)) return;

            try {
                if (isPlaying) {
                    if (playerType === 'videojs' && videojsPlayerRef.current) {
                        try {
                            const playPromise = videojsPlayerRef.current.play();
                            if (playPromise !== undefined) {
                                await playPromise;
                            }
                        } catch (playErr: any) {
                            if (playErr?.name !== 'AbortError') {
                                console.warn('[VideoPlayer] VideoJS play error:', playErr);
                            }
                        }
                    } else if (playerType === 'html5' && videoEl instanceof HTMLMediaElement) {
                        if (!videoEl.src && effectiveUrl) {
                            let targetSrc = effectiveUrl;
                            if (currentStation.useProxy) {
                                targetSrc = `/proxy-stream?url=${encodeURIComponent(effectiveUrl)}`;
                            }
                            videoEl.src = targetSrc;
                            videoEl.load();
                        }
                        if (videoEl.paused) {
                            await videoEl.play();
                        }
                    } else if (playerType === 'iframe' && isYouTube && ytPlayerRef.current) {
                        if (typeof ytPlayerRef.current.playVideo === 'function') {
                            ytPlayerRef.current.playVideo();
                        }
                    }
                } else {
                    if (playerType === 'videojs' && videojsPlayerRef.current) {
                        try {
                            videojsPlayerRef.current.pause();
                        } catch (e) {
                            console.warn('[VideoPlayer] VideoJS pause error:', e);
                        }
                    } else if (playerType === 'html5' && videoEl instanceof HTMLMediaElement) {
                        if (!videoEl.paused) {
                            videoEl.pause();
                        }
                    } else if (playerType === 'iframe' && isYouTube && ytPlayerRef.current) {
                        if (typeof ytPlayerRef.current.pauseVideo === 'function') {
                            ytPlayerRef.current.pauseVideo();
                        }
                    }
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error('[VideoPlayer] Playback error:', error);
                }
            }
        };

        handlePlayback();
    }, [isPlaying, volume, playerType, effectiveUrl, isYouTube, videoElement]);

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
        if (!currentStation || playerType !== 'iframe' || !isYouTube || !ytId || !videoElement) {
            ytPlayerRef.current = null;
            youtubeReadyRef.current = false;
            return;
        }

        const currentIframe = videoElement;
        if (!(currentIframe instanceof HTMLIFrameElement)) return;

        let isCancelled = false;

        const initYt = () => {
            if (isCancelled) return;
            const YT = (window as any).YT;
            if (!YT || !YT.Player) return;

            ytPlayerRef.current = null;
            youtubeReadyRef.current = false;

            try {
                ytPlayerRef.current = new YT.Player(currentIframe, {
                    events: {
                        onReady: (event: any) => {
                            if (isCancelled) return;
                            youtubeReadyRef.current = true;
                            lastReportedIdRef.current = currentStation.id;
                            try {
                                event.target.setVolume(Math.round(volume * 100));
                            } catch (e) {}

                            const pending = pendingRemoteActionRef.current;
                            if (pending) {
                                runPendingRemoteAction(event.target, true);
                            } else {
                                if (!isPlayingRef.current) {
                                    try {
                                        event.target.pauseVideo();
                                    } catch (e) {}
                                } else {
                                    try {
                                        event.target.playVideo();
                                    } catch (e) {}
                                }
                            }
                        },
                        onStateChange: (event: any) => {
                            if (isCancelled) return;
                            const currentTime = Number(event.target.getCurrentTime?.());
                            if (event.data === 1) {
                                onPlayStateChange(true);
                                if (Number.isFinite(currentTime)) lastYouTubeTimeRef.current = currentTime;
                            } else if (event.data === 2) {
                                onPlayStateChange(false);
                                if (Number.isFinite(currentTime)) lastYouTubeTimeRef.current = currentTime;
                            } else if (event.data === 3 && Number.isFinite(currentTime)) {
                                const previousTime = lastYouTubeTimeRef.current;
                                if (previousTime !== null && Math.abs(currentTime - previousTime) > 0.75) {
                                    reportSeek(currentTime);
                                }
                                lastYouTubeTimeRef.current = currentTime;
                            }
                            // YT.PlayerState.PLAYING = 1
                            if (event.data === 1) {
                                if (!isPlayingRef.current) {
                                    try {
                                        event.target.pauseVideo();
                                    } catch (e) {}
                                    return;
                                }
                                const player = event.target;
                                const videoData = player.getVideoData?.();
                                const realTitle = videoData?.title;
                                const currentId = videoData?.video_id;

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
            initYt();
        }

        return () => {
            isCancelled = true;
            youtubeReadyRef.current = false;
            if (ytPlayerRef.current) {
                const el = ytPlayerRef.current.getIframe?.() || videoRef.current;
                if (!el || !document.body.contains(el)) {
                    try { ytPlayerRef.current.destroy(); } catch (e) { }
                    ytPlayerRef.current = null;
                }
            }
        };
    }, [currentStation?.id, playerType, isYouTube, ytId, videoElement]);

    return {
        videoRef,
        setVideoElementRef,
        playerType,
        hasVideo,
        error,
        qualityLevels,
        currentLevel,
        isAutoMode,
        setQualityLevel,
        isYouTube,
        executeRemoteAction,
        goLive
    };
};
