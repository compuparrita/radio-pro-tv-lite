import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useRadio } from '../context/RadioContext';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { QualitySelector } from './QualitySelector';
import { QualitySelectorPortal } from './QualitySelectorPortal';
import { StationSelector } from './StationSelector';

export const Player: React.FC = () => {
    const {
        currentStation,
        isPlaying,
        volume,
        togglePlay,
        setVolume,
        nextStation,
        prevStation
    } = useRadio();

    const [imgError, setImgError] = useState(false);
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
        }
    );

    useEffect(() => {
        setImgError(false);
    }, [currentStation]);

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
            <div className="w-[calc(100%+32px)] -mx-4 lg:w-full lg:mx-0 glass shadow-2xl bg-[var(--dark-bg)] aspect-video max-h-[250px] md:max-h-[350px] lg:max-h-[60vh] relative group overflow-hidden sticky top-0 lg:static rounded-none z-[60] mb-4">
                {/* Station Selector Overlay (Desktop only) */}
                <div className="hidden md:flex absolute top-3 left-3 z-[100] items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-64">
                        <StationSelector />
                    </div>
                </div>

                {hasVideo && playerType === 'videojs' ? (
                    <div key={`video-${currentStation.id}`} className="absolute inset-0 bg-black group">
                        <div data-vjs-player className="h-full w-full">
                            <video
                                ref={videoRef as any}
                                className="video-js vjs-big-play-centered w-full h-full"
                                playsInline
                                crossOrigin="anonymous"
                                preload="metadata"
                            />
                        </div>

                        {/* Quality Selector Portal */}
                        {videoRef.current?.parentNode && (
                            <QualitySelectorPortal
                                container={videoRef.current.parentNode as HTMLElement}
                            >
                                <div className="absolute top-3 right-3 z-[100]">
                                    <QualitySelector
                                        qualityLevels={qualityLevels}
                                        currentLevel={currentLevel}
                                        isAutoMode={isAutoMode}
                                        onLevelChange={setQualityLevel}
                                    />
                                </div>
                            </QualitySelectorPortal>
                        )}
                    </div>
                ) : (
                    <div key={`audio-${currentStation.id}`} className="absolute inset-0 flex flex-col">
                        {/* Hidden Audio Element handles HLS/Native */}
                        {playerType === 'videojs' ? (
                            <div data-vjs-player style={{ height: 0, opacity: 0 }}>
                                <video ref={videoRef as any} className="video-js" playsInline preload="metadata" />
                            </div>
                        ) : (
                            <audio ref={videoRef as any} style={{ display: 'none' }} autoPlay={isPlaying} playsInline preload="metadata" />
                        )}

                        {/* Large Rotating Logo Area */}
                        <div className="h-full w-full bg-[var(--dark-bg)]/40 flex items-center justify-center p-[15px] md:p-[20px]">
                            <img
                                src={imgError ? "https://picsum.photos/seed/radio/300/300" : currentStation.logo}
                                alt={currentStation.name}
                                onError={() => setImgError(true)}
                                className={`w-24 h-24 md:w-32 lg:w-40 lg:h-40 object-cover rounded-full border-4 lg:border-8 border-[var(--primary-color)] shadow-[0_20px_60px_rgba(99,102,241,0.5)] ${isPlaying ? 'animate-rotate-logo' : ''}`}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Horizontal Control Bar below video */}
            <div className="glass p-2 md:p-3 rounded-none">
                <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4">
                    {/* Station info */}
                    <div className="flex-1 text-center md:text-left min-w-0">
                        <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-color)] to-[var(--accent-color)] truncate">
                            {currentStation.name}
                        </h2>
                        <p className="text-[var(--text-secondary)] text-xs md:text-sm">{currentStation.country}</p>
                    </div>

                    {/* Player Controls - Hidden on mobile, handled by Nav bar */}
                    <div className="hidden md:flex items-center gap-4">
                        <button
                            onClick={prevStation}
                            className="p-3 bg-white/5 hover:bg-white/10 text-white transition-all shadow-lg rounded-full"
                        >
                            <SkipBack size={20} />
                        </button>

                        <button
                            onClick={togglePlay}
                            className="w-16 h-16 bg-gradient-to-br from-[var(--primary-color)] to-[var(--accent-color)] text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all rounded-full"
                        >
                            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                        </button>

                        <button
                            onClick={nextStation}
                            className="p-2 md:p-3 bg-white/5 hover:bg-white/10 text-white transition-all shadow-lg rounded-full"
                        >
                            <SkipForward size={18} />
                        </button>
                    </div>

                    {/* Volume and Error (Flexible box) */}
                    <div className="w-full md:w-48 lg:w-64 space-y-1">
                        {error && (
                            <div className="text-red-400 text-xs font-medium bg-red-400/10 px-3 py-1 rounded-full text-center">
                                {error}
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            {volume === 0 ? <VolumeX size={18} className="text-[var(--text-secondary)]" /> : <Volume2 size={18} className="text-[var(--primary-color)]" />}
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--primary-color)]"
                            />
                            <span className="text-xs font-mono text-[var(--text-secondary)] w-8">{Math.round(volume * 100)}%</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="md:hidden flex-1" />
        </>
    );
};
