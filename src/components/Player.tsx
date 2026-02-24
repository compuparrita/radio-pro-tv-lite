import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useRadio } from '../context/RadioContext';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { QualitySelector } from './QualitySelector';
import { QualitySelectorPortal } from './QualitySelectorPortal';


export const Player: React.FC = () => {
    const {
        currentStation,
        isPlaying,
        volume,
        togglePlay,
        setVolume,
        nextStation,
        prevStation,
        setCurrentStation
    } = useRadio();

    const [isVolumeOpen, setIsVolumeOpen] = useState(false);

    const volumeRef = useRef<HTMLDivElement>(null);



    const {
        videoRef,
        playerType,
        hasVideo,
        error,
        qualityLevels,
        currentLevel,
        isAutoMode,
        setQualityLevel
    } = useVideoPlayer(
        currentStation,
        isPlaying,
        volume,
        (playing) => {
            if (playing !== isPlaying) togglePlay();
        },
        setCurrentStation
    );

    // Close volume on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (volumeRef.current && !volumeRef.current.contains(event.target as Node)) {
                setIsVolumeOpen(false);
            }
        };

        if (isVolumeOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
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

    if (!currentStation) {
        return (
            <div className="glass p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Selecciona una emisora</h2>
                <p className="text-[var(--text-secondary)]">Elige una emisora de la lista para comenzar.</p>
            </div>
        );
    }


    return (
        <>
            {/* 1. Main Media Area (Video or Large Logo) - STICKY ON MOBILE ONLY */}
            <div
                className="w-[calc(100%+32px)] -mx-4 lg:w-full lg:mx-0 glass bg-[var(--dark-bg)] aspect-video max-h-[215px] md:max-h-[315px] lg:max-h-[2000px] relative group overflow-hidden rounded-none z-50 sticky top-0 lg:static player-main-media"
                style={{ touchAction: 'manipulation' }}
            >
                {/* Content-Aware Overlay Layer (Strictly follows 16:9 video content) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[70]">
                    <div className="relative h-full max-w-full aspect-video pointer-events-none">
                    </div>
                </div>

                {hasVideo ? (
                    <div key={`tech-container-${currentStation.id}-${playerType}`} className="absolute inset-0 bg-black flex items-center justify-center player-tech-container">
                        <div className="relative h-full w-full player-aspect-wrapper">
                            {playerType === 'iframe' ? (
                                isPlaying ? (
                                    <iframe
                                        ref={videoRef as any}
                                        src={(() => {
                                            if (currentStation.iframeUrl?.includes('youtube.com/embed/')) return undefined;

                                            // Construir URL base
                                            let src = currentStation.iframeUrl || (currentStation.embedCanal ? `https://embed.saohgdasregions.fun/embed2/${currentStation.embedCanal}.html` : '');
                                            if (!src) return undefined;

                                            // Añadir parámetros de autoplay y sonido si no los tiene
                                            const separator = src.includes('?') ? '&' : '?';
                                            return `${src}${separator}autoplay=1&muted=0&mute=0&volume=100`;
                                        })()}
                                        className="w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                        sandbox="allow-scripts allow-same-origin allow-presentation"
                                        title={currentStation.name}
                                    />
                                ) : (
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
                            ) : (
                                <>
                                    <div data-vjs-player={playerType === 'videojs' ? true : undefined} className="h-full w-full relative">
                                        <video
                                            ref={videoRef as any}
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
                                    ref={videoRef as any}
                                    className="video-js"
                                    playsInline
                                    preload="metadata"
                                />
                            </div>
                        ) : (
                            <audio ref={videoRef as any} style={{ display: 'none' }} playsInline preload="metadata" />
                        )}

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

            {/* 2. Horizontal Control Bar below video - Using Grid for absolute stability */}
            <div className="hidden lg:block glass p-2 md:p-3 rounded-none border border-white/5 mt-4 mb-6 lg:mb-10">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-6">
                    {/* Station info - Smaller font, 2 lines, fixed width container */}
                    <div className="min-w-0 flex flex-col justify-center text-center md:text-left">
                        <h2 className="text-xs md:text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-color)] to-[var(--accent-color)] line-clamp-2 leading-tight mb-0.5">
                            {currentStation.name}
                        </h2>
                        <p className="text-[var(--text-secondary)] text-[9px] md:text-[11px] truncate opacity-70">{currentStation.country}</p>
                    </div>

                    {/* Player Controls - Perfectly Centered - Hidden on mobile as requested */}
                    <div className="hidden md:flex items-center justify-center gap-3 md:gap-5">
                        <button
                            onClick={prevStation}
                            className="p-2 md:p-2 bg-white/5 hover:bg-white/10 text-white transition-all rounded-none focus-visible:bg-white/20"
                            title="Anterior (Flecha Izquierda)"
                        >
                            <SkipBack size={18} />
                        </button>

                        <button
                            onClick={togglePlay}
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

                    {/* Volume and Error - Right aligned, mirroring info width */}
                    <div className="flex flex-col items-center md:items-end justify-center min-w-0">
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
                            <div className="flex items-center gap-4">
                                <div
                                    ref={volumeRef}
                                    className="hidden md:flex flex-col items-center relative"
                                >
                                    {isVolumeOpen && (
                                        <div className="absolute bottom-full left-4 -translate-x-1/2 mb-1 flex flex-col items-center bg-black/95 backdrop-blur-2xl p-3 rounded-none border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-4 duration-300 min-h-[140px] z-[100]">
                                            <div className="relative h-24 w-1 flex items-center justify-center">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    value={volume}
                                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                                    className="absolute w-24 h-1 appearance-none bg-white/20 rounded-full cursor-pointer accent-[var(--primary-color)]"
                                                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                                                />
                                            </div>
                                            <span className="mt-4 text-[10px] font-mono text-white/70 w-8 text-center">{Math.round(volume * 100)}%</span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setIsVolumeOpen(!isVolumeOpen)}
                                        className={`p-2.5 rounded-none transition-all duration-300 shadow-lg ${isVolumeOpen ? 'bg-[var(--primary-color)] text-white scale-110' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
                                        title="Volumen (Usa la rueda del mouse)"
                                    >
                                        {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                    </button>
                                </div>

                                {/* Mobile Volume Layout - Still horizontal but persistent */}
                                <div className="flex md:hidden items-center gap-2 w-24 sm:w-32">
                                    {volume === 0 ? <VolumeX size={14} className="text-[var(--text-secondary)]" /> : <Volume2 size={14} className="text-[var(--primary-color)]" />}
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={volume}
                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--primary-color)]"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Added spacer to prevent cutting bottom on mobile */}
            <div className="h-4 md:hidden" />
        </>
    );
};
