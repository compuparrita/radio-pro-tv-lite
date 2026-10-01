import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useRadio } from '../context/RadioContext';
import { useWatchParty } from '../context/WatchPartyContext';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { QualitySelector } from './QualitySelector';
import { QualitySelectorPortal } from './QualitySelectorPortal';
import { getPlayerCurrentTime } from '../utils/playerTimeBridge';


export const Player: React.FC = () => {
    const {
        room: watchPartyRoom,
        isHost,
        remoteExecutionRef,
        consumePendingAction,
        clearRemoteExecutionRef,
        sendAction,
        needsSyncPlayback,
        syncPlayback,
    } = useWatchParty();
    const {
        currentStation,
        isPlaying,
        setIsPlaying,
        volume,
        togglePlay,
        setVolume,
        nextStation,
        prevStation,
        setCurrentStation
    } = useRadio();

    const [isVolumeOpen, setIsVolumeOpen] = useState(false);
    const [isUserActive, setIsUserActive] = useState(true);

    const volumeRef = useRef<HTMLDivElement>(null);
    const remoteExecutionInProgressRef = useRef<string | null>(null);
    const suppressedLocalActionRef = useRef<'play' | 'pause' | 'seek' | null>(null);
    const suppressionTimeoutRef = useRef<number | null>(null);
    const lastReportedPlaybackRef = useRef<boolean | null>(isPlaying);
    const observedPlaybackRef = useRef(isPlaying);
    const lastReportedSeekRef = useRef<number | null>(null);
    const watchPartyRef = useRef({ watchPartyRoom, remoteExecutionRef, sendAction, isHost, needsSyncPlayback, syncPlayback });
    watchPartyRef.current = { watchPartyRoom, remoteExecutionRef, sendAction, isHost, needsSyncPlayback, syncPlayback };
    const externalIframeTraceRef = useRef({
        stationId: currentStation?.id,
        stationName: currentStation?.name,
        isPlaying,
        iframeUrl: currentStation?.iframeUrl,
        embedCanal: currentStation?.embedCanal,
        src: undefined as string | undefined,
    });

    const clearSuppressedAction = useCallback(() => {
        suppressedLocalActionRef.current = null;
        if (suppressionTimeoutRef.current !== null) {
            window.clearTimeout(suppressionTimeoutRef.current);
            suppressionTimeoutRef.current = null;
        }
    }, []);

    const markSuppressedAction = useCallback((action: 'play' | 'pause' | 'seek') => {
        clearSuppressedAction();
        suppressedLocalActionRef.current = action;
        suppressionTimeoutRef.current = window.setTimeout(clearSuppressedAction, 5000);
    }, [clearSuppressedAction]);

    const handleTogglePlayback = useCallback(() => {
        const watchParty = watchPartyRef.current;
        if (watchParty.watchPartyRoom && !isHost && watchParty.needsSyncPlayback) {
            watchParty.syncPlayback();
            return;
        }
        togglePlay();
    }, [isHost, togglePlay]);

    useEffect(() => () => {
        if (suppressionTimeoutRef.current !== null) window.clearTimeout(suppressionTimeoutRef.current);
    }, []);

    // Track isPlaying in a ref to avoid stale closures in event listener callbacks
    const isPlayingRef = useRef(isPlaying);
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    useEffect(() => {
        if (observedPlaybackRef.current === isPlaying) return;
        observedPlaybackRef.current = isPlaying;

        const watchParty = watchPartyRef.current;
        if (remoteExecutionInProgressRef.current
            || watchParty.remoteExecutionRef
            || !watchParty.watchPartyRoom
            || lastReportedPlaybackRef.current === isPlaying) return;

        lastReportedPlaybackRef.current = isPlaying;
        void watchParty.sendAction(isPlaying ? 'play' : 'pause', null).catch((sendError) => {
            console.warn('[WatchParty] No se pudo enviar la accion de reproduccion:', sendError);
        });
    }, [isPlaying]);

    const handlePlayStateChange = useCallback((playing: boolean) => {
        const action = playing ? 'play' : 'pause';
        const suppressed = suppressedLocalActionRef.current === action;
        const source = suppressed || remoteExecutionInProgressRef.current || watchPartyRef.current.remoteExecutionRef
            ? 'remote'
            : 'local';
        console.info(playing ? '[WP LOCAL PLAY]' : '[WP LOCAL PAUSE]', {
            role: watchPartyRef.current.watchPartyRoom ? (watchPartyRef.current.isHost ? 'host' : 'guest') : 'none',
            currentTime: getPlayerCurrentTime(),
            source,
        });
        if (suppressed) clearSuppressedAction();

        if (playing !== isPlayingRef.current) {
            setIsPlaying(playing);
        }

        const watchParty = watchPartyRef.current;
        if (!suppressed
            && !remoteExecutionInProgressRef.current
            && !watchParty.remoteExecutionRef
            && watchParty.watchPartyRoom
            && lastReportedPlaybackRef.current !== playing) {
            lastReportedPlaybackRef.current = playing;
            void watchParty.sendAction(action, null).catch((sendError) => {
                console.warn('[WatchParty] No se pudo enviar la accion de reproduccion:', sendError);
            });
        }
    }, [clearSuppressedAction, setIsPlaying]);

    const handleLocalSeek = useCallback((seconds: number) => {
        if (!Number.isFinite(seconds)) return;
        const suppressed = suppressedLocalActionRef.current === 'seek';
        if (suppressed) clearSuppressedAction();

        const watchParty = watchPartyRef.current;
        const isYtStation = Boolean(
            currentStation?.id?.startsWith('yt-')
            || currentStation?.url?.includes('youtube')
            || currentStation?.url?.includes('youtu.be')
            || currentStation?.iframeUrl?.includes('youtube')
            || currentStation?.iframeUrl?.includes('youtu.be')
        );
        const canSeek = watchParty.isHost || isYtStation;
        if (canSeek
            && !suppressed
            && !remoteExecutionInProgressRef.current
            && !watchParty.remoteExecutionRef
            && watchParty.watchPartyRoom
            && lastReportedSeekRef.current !== seconds) {
            lastReportedSeekRef.current = seconds;
            void watchParty.sendAction('seek', seconds).catch((sendError) => {
                console.warn('[WatchParty] No se pudo enviar la posicion:', sendError);
            });
        }
    }, [clearSuppressedAction, currentStation]);

    const {
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
        executeRemoteAction
    } = useVideoPlayer(
        currentStation,
        isPlaying,
        volume,
        handlePlayStateChange,
        setCurrentStation,
        handleLocalSeek
    );

    const extractYouTubeId = (url?: string): string | null => {
        if (!url) return null;
        const match = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?.*?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
        if (match) return match[1];
        if (url.includes('youtube.com/embed/')) return url.split('/embed/')[1]?.split('?')[0]?.split('&')[0] || null;
        if (url.includes('youtube-nocookie.com/embed/')) return url.split('/embed/')[1]?.split('?')[0]?.split('&')[0] || null;
        if (url.includes('youtube.com/watch')) return url.split('v=')[1]?.split('&')[0]?.split('#')[0] || null;
        if (url.includes('youtu.be/')) return url.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0] || null;
        return null;
    };

    const ytId = extractYouTubeId(currentStation?.iframeUrl)
        || extractYouTubeId(currentStation?.url)
        || (currentStation?.id?.startsWith('yt-') ? currentStation.id.replace('yt-', '') : null);

    const youtubeEmbedSrc = ytId
        ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&widget_referrer=${encodeURIComponent(window.location.href)}&rel=0&playsinline=1`
        : '';

    const externalIframeBaseSrc = currentStation?.iframeUrl || (currentStation?.embedCanal
        ? `https://embed.saohgdasregions.fun/embed2/${currentStation.embedCanal}.html`
        : '');
    const externalIframeSrc = externalIframeBaseSrc
        ? (externalIframeBaseSrc.includes('autoplay') ? externalIframeBaseSrc : `${externalIframeBaseSrc}${externalIframeBaseSrc.includes('?') ? '&' : '?'}autoplay=1`)
        : undefined;
    externalIframeTraceRef.current = {
        stationId: currentStation?.id,
        stationName: currentStation?.name,
        isPlaying,
        iframeUrl: currentStation?.iframeUrl,
        embedCanal: currentStation?.embedCanal,
        src: externalIframeSrc,
    };

    const setExternalIframeRef = useCallback((element: HTMLIFrameElement | null) => {
        setVideoElementRef(element);
        const trace = externalIframeTraceRef.current;
        if (element) {
            console.info('[External iframe] iframe mounted', {
                stationId: trace.stationId,
                stationName: trace.stationName,
                isPlaying: trace.isPlaying,
                iframeUrl: trace.iframeUrl,
                embedCanal: trace.embedCanal,
                src: trace.src,
                mounted: true,
            });
        } else {
            console.info('[External iframe] iframe unmounted', {
                stationId: trace.stationId,
                stationName: trace.stationName,
                isPlaying: trace.isPlaying,
                iframeUrl: trace.iframeUrl,
                embedCanal: trace.embedCanal,
                src: trace.src,
                mounted: false,
            });
        }
    }, [setVideoElementRef]);

    const handleExternalIframeLoad = useCallback((event: React.SyntheticEvent<HTMLIFrameElement>) => {
        const iframe = event.currentTarget;
        const trace = externalIframeTraceRef.current;
        let contentHref: string | null = null;
        let contentHrefError: string | null = null;
        try {
            contentHref = iframe.contentWindow?.location.href ?? null;
        } catch (error) {
            contentHrefError = error instanceof Error ? error.message : String(error);
        }
        console.info('[External iframe] iframe loaded', {
            stationId: trace.stationId,
            stationName: trace.stationName,
            isPlaying: trace.isPlaying,
            iframeUrl: trace.iframeUrl,
            embedCanal: trace.embedCanal,
            src: trace.src,
            contentWindowLocation: contentHref,
            contentWindowLocationError: contentHrefError,
            clientWidth: iframe.clientWidth,
            clientHeight: iframe.clientHeight,
            offsetWidth: iframe.offsetWidth,
            offsetHeight: iframe.offsetHeight,
        });
    }, []);

    useEffect(() => {
        const action = consumePendingAction();
        if (!action) return;

        const executionRef = remoteExecutionRef || action.actionId || action.origin;
        if (!executionRef) {
            clearRemoteExecutionRef();
            return;
        }

        if (action.action !== 'play' && action.action !== 'pause' && action.action !== 'seek') {
            clearRemoteExecutionRef();
            return;
        }

        let seekSeconds: number | undefined;
        if (action.action === 'seek') {
            const payload = action.payload;
            seekSeconds = typeof payload === 'number'
                ? payload
                : payload && typeof payload === 'object'
                    ? Number((payload as { seconds?: unknown; currentTime?: unknown }).seconds
                        ?? (payload as { currentTime?: unknown }).currentTime)
                    : Number(payload);
            if (!Number.isFinite(seekSeconds)) {
                clearRemoteExecutionRef();
                return;
            }
            lastReportedSeekRef.current = seekSeconds;
        }

        remoteExecutionInProgressRef.current = executionRef;
        markSuppressedAction(action.action);
        if (action.action === 'play') lastReportedPlaybackRef.current = true;
        if (action.action === 'pause') lastReportedPlaybackRef.current = false;

        try {
            const currentTime = getPlayerCurrentTime();
            const role = watchPartyRoom ? (isHost ? 'host' : 'guest') : 'none';
            console.info('[WP Remote Execute]', {
                role,
                action: action.action,
                position: action.action === 'seek' ? seekSeconds : currentTime,
                currentTime,
                isPlaying,
            });
            if (action.action === 'play') {
                console.info('[WP PLAY CALL]', { role, source: 'remote', currentTime });
            } else if (action.action === 'pause') {
                console.info('[WP PAUSE CALL]', { role, source: 'remote', currentTime });
            }
            executeRemoteAction(action.action, seekSeconds);
            if (action.action === 'play') {
                setIsPlaying(true);
            } else if (action.action === 'pause') {
                setIsPlaying(false);
            }
        } finally {
            remoteExecutionInProgressRef.current = null;
            clearRemoteExecutionRef();
        }
    });

    // Close volume on outside click or touch
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (volumeRef.current && !volumeRef.current.contains(event.target as Node)) {
                setIsVolumeOpen(false);
            }
        };

        if (isVolumeOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isVolumeOpen]);

    // Non-passive wheel listener to prevent page scroll
    useEffect(() => {
        const volumeContainer = volumeRef.current;
        if (!volumeContainer) return;

        const handleWheel = (e: WheelEvent) => {
            if (isVolumeOpen) {
                e.preventDefault();
                e.stopPropagation();
                const delta = e.deltaY > 0 ? -0.05 : 0.05;
                const newVolume = Math.min(1, Math.max(0, volume + delta));
                setVolume(newVolume);
            }
        };

        volumeContainer.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            volumeContainer.removeEventListener('wheel', handleWheel);
        };
    }, [isVolumeOpen, volume, setVolume]);

    // Track the global 'user-is-active' class to toggle the mouse sensor
    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const isActive = document.body.classList.contains('user-is-active');
                    setIsUserActive(isActive);
                }
            });
        });

        observer.observe(document.body, { attributes: true });
        
        // Initial check
        setIsUserActive(document.body.classList.contains('user-is-active'));

        return () => observer.disconnect();
    }, []);

    if (!currentStation) {
        return (
            <div className="glass p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Selecciona una emisora</h2>
                <p className="text-[var(--text-secondary)]">Elige una emisora de la lista para comenzar.</p>
            </div>
        );
    }


    return (
        <div className="player-sticky-wrapper sticky" style={{ zIndex: 100 }}>
            {/* 1. Main Media Area (Video or Large Logo) */}
            <div
                className="w-full mx-0 glass bg-[var(--dark-bg)] aspect-video max-h-[215px] md:max-h-[315px] lg:max-h-[2000px] relative group overflow-hidden rounded-none z-50 player-main-media"
                style={{ touchAction: 'manipulation' }}
            >
                {/* Mouse Activity Sensor Shield for iFrames (Smart TV Fix) */}
                {!isUserActive && (
                    <div 
                        className="absolute inset-0 z-[70] cursor-default"
                        onMouseMove={() => {
                            // Wake up the global tracker by dispatching a fake event
                            window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
                        }}
                    />
                )}

                {/* Content-Aware Overlay Layer (Strictly follows 16:9 video content) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[75]">
                    <div className="relative h-full max-w-full aspect-video pointer-events-none">
                    </div>
                </div>

                {hasVideo ? (
                    <div key={`tech-container-${currentStation.id}-${playerType}`} className="absolute inset-0 bg-black flex items-center justify-center player-tech-container">
                        <div className="relative h-full w-full player-aspect-wrapper">
                            {playerType === 'iframe' ? (
                                isYouTube ? (
                                    /* YouTube Player managed by YouTube IFrame API */
                                    <div className="relative h-full w-full">
                                        <iframe
                                            id={`youtube-player-${currentStation.id}`}
                                            ref={setVideoElementRef as any}
                                            key={`iframe-yt-${currentStation.id}-${ytId}`}
                                            src={youtubeEmbedSrc}
                                            className="w-full h-full border-0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                            title={currentStation.name}
                                        />
                                        {needsSyncPlayback && !isHost ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm z-20 p-4">
                                                <div className="flex flex-col items-center max-w-sm text-center">
                                                    <p className="text-white text-base font-semibold mb-1">
                                                        Transmisión en directo del anfitrión
                                                    </p>
                                                    <p className="text-white/60 text-xs mb-4">
                                                        Pulsa para sincronizarte al instante con la sala
                                                    </p>
                                                    <button
                                                        onClick={() => syncPlayback()}
                                                        type="button"
                                                        className="px-6 py-2.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm shadow-[0_4px_20px_rgba(34,211,238,0.4)] transition hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
                                                    >
                                                        <Play size={16} fill="currentColor" />
                                                        Sincronizar ahora
                                                    </button>
                                                </div>
                                            </div>
                                        ) : !isPlaying ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--dark-bg)] bg-gradient-to-b from-black/20 to-black/60 z-10 pointer-events-none">
                                                <img
                                                    src={currentStation.logo || 'https://picsum.photos/seed/radio-streaming-pro/150/150.jpg'}
                                                    alt={currentStation.name}
                                                    className="w-24 h-24 md:w-32 md:h-32 object-contain rounded-full border-[4px] md:border-[6px] border-[var(--primary-color)] opacity-60 p-2 bg-white/5"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = "https://picsum.photos/seed/radio-streaming-pro/150/150.jpg" }}
                                                />
                                                <p className="mt-3 text-[var(--text-secondary)] text-sm font-medium">Pausado</p>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : (
                                    /* General TV / Embed iFrame (e.g. ksdjugfssddeports.com, tvporinternet2.com, etc.) */
                                    isPlaying ? (
                                        <iframe
                                            ref={setExternalIframeRef}
                                            key={`iframe-${currentStation.id}`}
                                            src={externalIframeSrc}
                                            onLoad={handleExternalIframeLoad}
                                            className="w-full h-full border-0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                            scrolling="no"
                                            title={currentStation.name}
                                        />
                                    ) : (
                                        /* Clean Paused State: unmounts iframe completely so ALL sound & video STOP immediately */
                                        <div className="flex flex-col items-center justify-center h-full bg-[var(--dark-bg)] bg-gradient-to-b from-black/20 to-black/60">
                                            <img
                                                src={currentStation.logo || 'https://picsum.photos/seed/radio-streaming-pro/150/150.jpg'}
                                                alt={currentStation.name}
                                                className="w-32 h-32 md:w-44 md:h-44 object-contain rounded-full border-[6px] md:border-[10px] border-[var(--primary-color)] opacity-60 p-2 md:p-3 bg-white/5"
                                                onError={(e) => { (e.target as HTMLImageElement).src = "https://picsum.photos/seed/radio-streaming-pro/150/150.jpg" }}
                                            />
                                            <p className="mt-4 text-[var(--text-secondary)] font-medium">Pausado</p>
                                        </div>
                                    )
                                )
                            ) : (
                                <>
                                    <div data-vjs-player={playerType === 'videojs' ? true : undefined} className="h-full w-full relative">
                                        <video
                                            ref={setVideoElementRef as any}
                                            className={`${playerType === 'videojs' ? 'video-js vjs-big-play-centered' : ''} w-full h-full object-contain`}
                                            playsInline
                                            preload="metadata"
                                            controls={playerType === 'html5'}
                                        />

                                        {!isPlaying && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] z-[60]">
                                                <img
                                                    src={currentStation.logo || 'https://picsum.photos/seed/radio-streaming-pro/150/150.jpg'}
                                                    alt={currentStation.name}
                                                    className="w-24 h-24 md:w-32 md:h-32 object-contain rounded-full border-4 border-[var(--primary-color)] opacity-80 p-2 bg-white/5 shadow-2xl"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = "https://picsum.photos/seed/radio-streaming-pro/150/150.jpg" }}
                                                />
                                                <p className="mt-3 text-white/90 font-medium text-sm md:text-base tracking-wide drop-shadow-md">Pulsar Play para ver en vivo</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Quality Selector Portal (Only for VideoJS) */}
                                    {playerType === 'videojs' && videoRef.current?.parentNode && (
                                        <QualitySelectorPortal
                                            container={videoRef.current.parentNode as HTMLElement}
                                        >
                                            <div className="absolute top-2 right-2 z-[100]">
                                                <QualitySelector
                                                    qualityLevels={qualityLevels}
                                                    currentLevel={currentLevel}
                                                    isAutoMode={isAutoMode}
                                                    onLevelChange={setQualityLevel}
                                                />
                                            </div>
                                        </QualitySelectorPortal>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div key={`tech-container-${currentStation.id}-${playerType}`} className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--dark-bg)] bg-gradient-to-b from-black/20 to-black/60">
                        {/* Hidden Audio Element handles HLS/Native */}
                        {playerType === 'videojs' ? (
                            <div data-vjs-player className="hidden pointer-events-none opacity-0 h-0 w-0">
                                <video
                                    ref={setVideoElementRef as any}
                                    className="video-js"
                                    playsInline
                                    preload="metadata"
                                />
                            </div>
                        ) : isPlaying ? (
                            <audio ref={setVideoElementRef as any} style={{ display: 'none' }} playsInline preload="metadata" />
                        ) : null}

                        {/* Audio Logo with pulsing effect */}
                        <div className="relative z-10">
                            <img
                                src={currentStation.logo || 'https://picsum.photos/seed/radio-streaming-pro/150/150.jpg'}
                                alt={currentStation.name}
                                className={`w-32 h-32 md:w-44 md:h-44 object-contain rounded-full border-[6px] md:border-[10px] border-[var(--primary-color)] shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-all duration-700 p-2 md:p-3 bg-white/5 ${isPlaying ? 'animate-rotate-logo scale-105' : 'scale-100 opacity-60'}`}
                                onError={(e) => { (e.target as HTMLImageElement).src = "https://picsum.photos/seed/radio-streaming-pro/150/150.jpg" }}
                            />

                            {/* Suble glow effect behind logo */}
                            <div className={`absolute inset-0 bg-[var(--primary-color)]/5 blur-3xl rounded-full transition-opacity duration-1000 ${isPlaying ? 'opacity-100' : 'opacity-0'}`}></div>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Control Bar below video - High z-index to ensure volume slider popover is never hidden behind player */}
            <div className="block glass p-2 md:p-3 rounded-none border border-white/5 mt-[3px] mb-4 lg:mb-10 relative z-[200]">
                <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-6">
                    {/* Station info - Clean 2-line title and country */}
                    <div className="min-w-0 flex flex-col justify-center text-left">
                        <h2 className="text-xs md:text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-color)] to-[var(--accent-color)] line-clamp-1 leading-snug mb-0.5">
                            {currentStation.name}
                        </h2>
                        <p className="text-[var(--text-secondary)] text-[10px] md:text-xs truncate opacity-75">{currentStation.country}</p>
                    </div>

                    {/* Player Controls - Centered on desktop, bottom bar handles mobile */}
                    <div className="hidden md:flex items-center justify-center gap-3 md:gap-5">
                        <button
                            onClick={prevStation}
                            className="p-2 md:p-2 bg-white/5 hover:bg-white/10 text-white transition-all rounded-none focus-visible:bg-white/20"
                            title="Anterior (Flecha Izquierda)"
                        >
                            <SkipBack size={18} />
                        </button>

                        <button
                            onClick={handleTogglePlayback}
                            className="w-12 h-12 md:w-10 md:h-10 bg-gradient-to-br from-[var(--primary-color)] to-[var(--accent-color)] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all rounded-none tv-focus-primary"
                            title="Play/Pause (Enter / Espacio)"
                        >
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                        </button>

                        <button
                            onClick={nextStation}
                            className="p-2 md:p-2 bg-white/5 hover:bg-white/10 text-white transition-all rounded-none focus-visible:bg-white/20"
                            title="Siguiente (Flecha Derecha)"
                        >
                            <SkipForward size={18} />
                        </button>
                    </div>

                    {/* Volume and Error - Right aligned with high z-index popover */}
                    <div className="flex flex-col items-end justify-center min-w-0 relative z-[210]">
                        {error && (
                            <div className="text-red-400 text-[9px] font-medium bg-red-400/5 px-2 py-0.5 rounded-none border border-red-400/20 max-w-full truncate mb-1">
                                Error de carga
                            </div>
                        )}
                        {playerType === 'iframe' ? (
                            <div className="text-[var(--text-secondary)] text-[9px] md:text-[10px] italic opacity-60 bg-white/5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-white/5 text-center leading-tight">
                                Usa el volumen nativo del reproductor
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                {/* Responsive Vertical Popup Volume Control (Mobile & Desktop) */}
                                <div
                                    ref={volumeRef}
                                    className="flex flex-col items-center relative z-[220]"
                                >
                                    {isVolumeOpen && (
                                        <div className="absolute bottom-full right-0 mb-2 flex flex-col items-center bg-black/95 backdrop-blur-2xl p-3 rounded-none border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-bottom-3 duration-200 min-h-[150px] z-[300] pointer-events-auto">
                                            <div className="relative h-24 w-6 flex items-center justify-center">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    value={volume}
                                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                                    className="w-24 h-2 appearance-none bg-white/20 rounded-full cursor-pointer accent-[var(--primary-color)]"
                                                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', touchAction: 'none' }}
                                                    aria-label="Control de volumen"
                                                />
                                            </div>
                                            <span className="mt-4 text-[10px] font-mono text-white/90 w-10 text-center font-bold">
                                                {Math.round(volume * 100)}%
                                            </span>
                                            <button
                                                onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
                                                className="mt-2 text-[10px] text-[var(--text-secondary)] hover:text-white transition-colors px-1 py-0.5"
                                                title={volume === 0 ? "Activar sonido" : "Silenciar"}
                                            >
                                                {volume === 0 ? "Activar" : "Silenciar"}
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setIsVolumeOpen(!isVolumeOpen)}
                                        className={`p-2 md:p-2.5 rounded-none transition-all duration-300 shadow-lg ${isVolumeOpen ? 'bg-[var(--primary-color)] text-white scale-105' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
                                        title="Volumen"
                                        aria-label="Control de volumen"
                                    >
                                        {volume === 0 ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Added spacer to prevent cutting bottom on mobile */}
            <div className="h-2 md:hidden" />
        </div>
    );
};
