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
        <div ref={dropdownRef} className="relative group/quality">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`
                    quality-selector-trigger p-2.5 rounded-none transition-all duration-300
                    hover:scale-110 active:scale-95 shadow-lg flex items-center justify-center 
                    z-[60] relative
                    ${isOpen ? 'bg-red-600 text-white is-open' : 'bg-black/70 text-white hover:bg-black/90'}
                `}
                style={{
                    border: 'none',
                    outline: 'none',
                }}
                title={`Quality: ${getCurrentLabel()}`}
            >
                <Settings size={24} className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
            </button>

            {isOpen && (
                <div
                    className="absolute top-11 right-0 min-w-[105px] bg-red-600/95 backdrop-blur-xl rounded-none shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-[100] border border-white/10"
                    style={{
                        padding: '3px 0'
                    }}
                >
                    <div className="flex flex-col">
                        {qualityLevels.map((level) => {
                            const isSelected = isAutoMode ? level.index === -1 : level.index === currentLevel;

                            let label = level.label;
                            if (level.index === -1 && isAutoMode) {
                                const currentRes = qualityLevels.find(l => l.index === currentLevel);
                                label = currentRes ? `Auto (${currentRes.label})` : 'Auto';
                            } else if (level.index === -1) {
                                label = 'Auto';
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
                                        relative px-2.5 py-2 text-white transition-all duration-200 w-full text-left whitespace-nowrap
                                        ${isSelected ? 'bg-black/30' : 'hover:bg-black/10'}
                                    `}
                                    style={{
                                        border: 'none',
                                        outline: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {/* Column for the dot */}
                                    <div style={{ width: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <div
                                            style={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                backgroundColor: isSelected ? '#4ade80' : 'transparent',
                                                boxShadow: isSelected ? '0 0 8px rgba(74,222,128,0.8)' : 'none'
                                            }}
                                        />
                                    </div>

                                    {/* Text Label */}
                                    <span style={{
                                        fontWeight: isSelected ? '700' : '500',
                                        opacity: isSelected ? 1 : 0.8,
                                        fontSize: '0.85rem',
                                        lineHeight: '1'
                                    }}>
                                        {label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
