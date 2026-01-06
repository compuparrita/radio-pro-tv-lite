import React, { useState, useRef, useEffect } from 'react';
import { Settings } from 'lucide-react';
import type { QualityLevel } from '../hooks/useVideoPlayer';

interface QualitySelectorProps {
    qualityLevels: QualityLevel[];
    currentLevel: number;
    isAutoMode: boolean;
    onLevelChange: (levelIndex: number) => void;
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({
    qualityLevels,
    currentLevel,
    isAutoMode,
    onLevelChange
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside, { passive: true });
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    if (qualityLevels.length === 0) return null;

    const getCurrentLabel = () => {
        if (isAutoMode) {
            const actualLevel = qualityLevels.find(level => level.index === currentLevel);
            return actualLevel ? `Auto (${actualLevel.label})` : 'Auto';
        }
        const level = qualityLevels.find(level => level.index === currentLevel);
        return level?.label || 'Auto';
    };

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="quality-selector-trigger p-2 rounded-full transition-transform hover:scale-110 active:scale-95 shadow-lg flex items-center justify-center translate-y-[-2px] z-50"
                style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    border: 'none',
                    outline: 'none',
                    display: 'flex'
                }}
                title={`Quality: ${getCurrentLabel()}`}
            >
                <Settings size={22} className={isOpen ? 'rotate-90 transition-transform' : 'transition-transform'} />
            </button>

            {isOpen && (
                <div
                    className="absolute top-0 right-10 md:top-10 md:right-0 min-w-[140px] bg-red-600/95 backdrop-blur-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50 max-h-[60vh] overflow-y-auto custom-scrollbar ring-1 ring-white/10"
                >
                    <div className="flex flex-col py-1">
                        {qualityLevels.map((level) => {
                            const isSelected = isAutoMode ? level.index === -1 : level.index === currentLevel;

                            let label = level.label;
                            if (level.index === -1 && isAutoMode) {
                                const currentRes = qualityLevels.find(l => l.index === currentLevel);
                                if (currentRes) {
                                    label = `Auto (${currentRes.label})`;
                                }
                            }

                            return (
                                <button
                                    key={level.index}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLevelChange(level.index);
                                        setIsOpen(false);
                                    }}
                                    className={`
                                        relative px-3 py-3 text-white text-xs md:text-sm font-medium
                                        transition-colors w-full text-left whitespace-nowrap
                                        flex items-center gap-1.5
                                        ${isSelected ? 'bg-black/20' : 'hover:bg-black/10'}
                                    `}
                                >
                                    {/* Indicators Container - Now on the left */}
                                    <span className="inline-flex items-center justify-center flex-shrink-0 min-w-[12px]">
                                        {isSelected && (
                                            <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                                        )}
                                    </span>

                                    {/* Text Label */}
                                    <span>{label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
