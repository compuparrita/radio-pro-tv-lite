import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type Modifier,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { WatchPartyChatMessage } from '../services/watchPartySocket';
import { getWatchPartySocketId, registerRoomChatMessageListener } from '../services/watchPartySocket';
import './RoomChatTicker.css';

const MAX_QUEUED_MESSAGES = 40;
const EXIT_ANIMATION_MS = 320;
const MARQUEE_SPEED_PX_PER_SECOND = 16;
const LAYOUT_STORAGE_KEY = 'radiofm:room-chat-ticker:layout:v1';
const TICKER_SPEEDS = [1, 2, 3] as const;
const TICKER_FIXED_HEIGHT = 30;
type TickerSpeed = (typeof TICKER_SPEEDS)[number];

interface RoomChatTickerProps {
    roomCode: string;
    isGuestCinema: boolean;
}

interface PlayerBounds {
    width: number;
    height: number;
}

interface TickerGeometry {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface SavedTickerLayout {
    xRatio: number;
    yRatio: number;
    widthRatio: number;
    speed: TickerSpeed;
}

interface ResizeStart {
    pointerId: number;
    startX: number;
    width: number;
}

interface MarqueeMetrics {
    overflow: number;
    startOffset: number;
    endOffset: number;
    travelDistance: number;
}

interface RoomChatTickerSurfaceProps {
    message: WatchPartyChatMessage;
    geometry: TickerGeometry;
    isExiting: boolean;
    marquee: MarqueeMetrics;
    speed: TickerSpeed;
    onSpeedClick: () => void;
    onMarqueeEnd: (messageId: string) => void;
    onOverflowChange: (metrics: MarqueeMetrics) => void;
    onResizeStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
    onResizeMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
    onResizeEnd: (event: ReactPointerEvent<HTMLButtonElement>) => void;
    onResizeKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
}

function getDisplayText(message: WatchPartyChatMessage): string {
    return message.message.trim() || message.mediaTitle || 'Contenido compartido';
}

function isUnitRatio(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isTickerSpeed(value: unknown): value is TickerSpeed {
    return TICKER_SPEEDS.some((speed) => speed === value);
}

function readSavedLayout(): SavedTickerLayout | null {
    try {
        const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
        if (!raw) return null;
        const value = JSON.parse(raw) as Partial<SavedTickerLayout>;
        if (!isUnitRatio(value.xRatio) || !isUnitRatio(value.yRatio)
            || !isUnitRatio(value.widthRatio)) return null;
        return {
            xRatio: value.xRatio,
            yRatio: value.yRatio,
            widthRatio: value.widthRatio,
            speed: isTickerSpeed(value.speed) ? value.speed : 1,
        };
    } catch {
        return null;
    }
}

function getSizeLimits(bounds: PlayerBounds) {
    const availableWidth = Math.max(1, bounds.width);
    const minWidth = Math.min(260, availableWidth);
    const maxWidth = Math.max(minWidth, availableWidth);
    const minHeight = Math.min(TICKER_FIXED_HEIGHT, Math.max(1, bounds.height));
    const maxHeight = minHeight;
    return { minWidth, maxWidth, minHeight, maxHeight };
}

function clampGeometry(geometry: TickerGeometry, bounds: PlayerBounds): TickerGeometry {
    const { minWidth, maxWidth, minHeight, maxHeight } = getSizeLimits(bounds);
    const width = Math.min(maxWidth, Math.max(minWidth, geometry.width));
    const height = Math.min(maxHeight, Math.max(minHeight, geometry.height));
    return {
        x: Math.min(Math.max(0, geometry.x), Math.max(0, bounds.width - width)),
        y: Math.min(Math.max(0, geometry.y), Math.max(0, bounds.height - height)),
        width,
        height,
    };
}

function createInitialGeometry(bounds: PlayerBounds, saved: SavedTickerLayout | null): TickerGeometry {
    const { minWidth, maxWidth, minHeight } = getSizeLimits(bounds);
    if (saved) {
        const width = Math.min(maxWidth, Math.max(minWidth, saved.widthRatio * bounds.width));
        const height = minHeight;
        return clampGeometry({
            x: saved.xRatio * Math.max(0, bounds.width - width),
            y: saved.yRatio * Math.max(0, bounds.height - height),
            width,
            height,
        }, bounds);
    }

    const isCompactViewport = window.matchMedia('(width < 1200px)').matches;
    const width = Math.min(672, Math.max(minWidth, bounds.width - (isCompactViewport ? 16 : 48)));
    const height = minHeight;
    const bottomGap = isCompactViewport ? 56 : 80;
    return clampGeometry({
        x: (bounds.width - width) / 2,
        y: Math.max(0, bounds.height - height - bottomGap),
        width,
        height,
    }, bounds);
}

function persistGeometry(geometry: TickerGeometry, bounds: PlayerBounds, speed: TickerSpeed): void {
    const maxX = Math.max(0, bounds.width - geometry.width);
    const maxY = Math.max(0, bounds.height - geometry.height);
    const saved: SavedTickerLayout = {
        xRatio: maxX > 0 ? geometry.x / maxX : 0,
        yRatio: maxY > 0 ? geometry.y / maxY : 0,
        widthRatio: geometry.width / bounds.width,
        speed,
    };
    try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(saved));
    } catch {
        // Keep the ticker usable if browser storage is unavailable.
    }
}

function RoomChatTickerSurface({
    message,
    geometry,
    isExiting,
    marquee,
    speed,
    onSpeedClick,
    onMarqueeEnd,
    onOverflowChange,
    onResizeStart,
    onResizeMove,
    onResizeEnd,
    onResizeKeyDown,
}: RoomChatTickerSurfaceProps) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        isDragging,
    } = useDraggable({ id: 'room-chat-ticker' });

    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        const text = textRef.current;
        if (!viewport || !text) return;

        const measureOverflow = () => {
            const overflow = Math.max(0, text.scrollWidth - viewport.clientWidth);
            onOverflowChange(overflow > 0 ? {
                overflow,
                startOffset: viewport.clientWidth,
                endOffset: text.scrollWidth,
                travelDistance: viewport.clientWidth + text.scrollWidth,
            } : { overflow: 0, startOffset: 0, endOffset: 0, travelDistance: 0 });
        };
        measureOverflow();
        const observer = new ResizeObserver(measureOverflow);
        observer.observe(viewport);
        observer.observe(text);
        return () => observer.disconnect();
    }, [message.id, onOverflowChange]);

    useLayoutEffect(() => {
        const animation = textRef.current?.getAnimations()[0];
        if (animation) animation.updatePlaybackRate(speed);
    }, [message.id, marquee.overflow, speed]);

    const animationDuration = Math.max(8, marquee.travelDistance / MARQUEE_SPEED_PX_PER_SECOND);
    const tickerStyle = {
        left: geometry.x,
        top: geometry.y,
        width: geometry.width,
        height: geometry.height,
        transform: CSS.Translate.toString(transform),
        '--ticker-start': `${marquee.startOffset}px`,
        '--ticker-end': `${-marquee.endOffset}px`,
        '--ticker-duration': `${animationDuration}s`,
    } as CSSProperties;

    return (
        <div
            ref={setNodeRef}
            className={`room-chat-ticker${isExiting ? ' room-chat-ticker--exit' : ''}${isDragging ? ' room-chat-ticker--dragging' : ''}`}
            style={tickerStyle}
        >
            <button
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                className="room-chat-ticker__drag-handle"
                type="button"
                aria-label={`Mover cintillo de ${message.userName}`}
                title="Arrastrar cintillo"
            >
                <GripVertical aria-hidden="true" size={12} />
            </button>
            <div className="room-chat-ticker__content" role="status" aria-live="polite" aria-atomic="true">
                <span className="room-chat-ticker__sender">{message.userName}</span>
                <span className="room-chat-ticker__separator" aria-hidden="true">·</span>
                <div className="room-chat-ticker__viewport" ref={viewportRef}>
                    <span
                        className={`room-chat-ticker__text${marquee.overflow > 0 ? ' room-chat-ticker__text--scroll' : ''}`}
                        ref={textRef}
                        onAnimationEnd={(event) => {
                            if (event.animationName === 'room-chat-ticker-marquee') {
                                onMarqueeEnd(message.id);
                            }
                        }}
                    >
                        {getDisplayText(message)}
                    </span>
                </div>
            </div>
            <button
                className="room-chat-ticker__speed"
                type="button"
                aria-label={`Velocidad de desplazamiento ${speed}×. Cambiar velocidad`}
                title="Cambiar velocidad del texto"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                    event.stopPropagation();
                    onSpeedClick();
                }}
            >
                {speed}×
            </button>
            <button
                className="room-chat-ticker__resize-handle"
                type="button"
                aria-label="Cambiar ancho del cintillo"
                title="Arrastrar horizontalmente para cambiar el ancho"
                onPointerDown={onResizeStart}
                onPointerMove={onResizeMove}
                onPointerUp={onResizeEnd}
                onPointerCancel={onResizeEnd}
                onKeyDown={onResizeKeyDown}
            />
        </div>
    );
}

export function RoomChatTicker({ roomCode, isGuestCinema }: RoomChatTickerProps) {
    const [queue, setQueue] = useState<WatchPartyChatMessage[]>([]);
    const [current, setCurrent] = useState<WatchPartyChatMessage | null>(null);
    const [isExiting, setIsExiting] = useState(false);
    const [marquee, setMarquee] = useState<MarqueeMetrics>({ overflow: 0, startOffset: 0, endOffset: 0, travelDistance: 0 });
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const [bounds, setBounds] = useState<PlayerBounds | null>(null);
    const [geometry, setGeometry] = useState<TickerGeometry | null>(null);
    const [savedLayout] = useState(readSavedLayout);
    const [speed, setSpeed] = useState<TickerSpeed>(() => savedLayout?.speed ?? 1);
    const speedRef = useRef<TickerSpeed>(speed);
    const boundsRef = useRef<PlayerBounds | null>(null);
    const geometryRef = useRef<TickerGeometry | null>(null);
    const resizeStartRef = useRef<ResizeStart | null>(null);

    const updateGeometry = useCallback((next: TickerGeometry, persist = false) => {
        geometryRef.current = next;
        setGeometry(next);
        const currentBounds = boundsRef.current;
        if (persist && currentBounds) persistGeometry(next, currentBounds, speedRef.current);
    }, []);

    useLayoutEffect(() => {
        const playerSelector = isGuestCinema
            ? '.guest-cinema-layout .player-main-media'
            : '.player-column .player-main-media';
        setPortalTarget(document.querySelector<HTMLElement>(playerSelector));
    }, [isGuestCinema, roomCode]);

    useLayoutEffect(() => {
        if (!portalTarget) {
            boundsRef.current = null;
            setBounds(null);
            return;
        }

        const measurePlayer = () => {
            const nextBounds = { width: portalTarget.clientWidth, height: portalTarget.clientHeight };
            boundsRef.current = nextBounds;
            setBounds((currentBounds) => currentBounds?.width === nextBounds.width
                && currentBounds.height === nextBounds.height ? currentBounds : nextBounds);
        };
        measurePlayer();
        const observer = new ResizeObserver(measurePlayer);
        observer.observe(portalTarget);
        return () => observer.disconnect();
    }, [portalTarget]);

    useLayoutEffect(() => {
        if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;
        const nextGeometry = geometryRef.current
            ? clampGeometry(geometryRef.current, bounds)
            : createInitialGeometry(bounds, savedLayout);
        geometryRef.current = nextGeometry;
        setGeometry(nextGeometry);
    }, [bounds?.width, bounds?.height, savedLayout]);

    useEffect(() => {
        setQueue([]);
        setCurrent(null);
        if (!roomCode) return;

        let active = true;
        const seenMessageIds = new Set<string>();
        const unsubscribe = registerRoomChatMessageListener((message) => {
            if (!active || message.roomCode !== roomCode || !message.id || seenMessageIds.has(message.id)) return;
            const currentUserId = getWatchPartySocketId();
            if (currentUserId && message.userId === currentUserId) return;
            seenMessageIds.add(message.id);
            setQueue((pending) => [...pending, message].slice(-MAX_QUEUED_MESSAGES));
        });

        return () => {
            active = false;
            unsubscribe();
        };
    }, [roomCode]);

    useEffect(() => {
        if (current || queue.length === 0) return;
        setCurrent(queue[0]);
        setQueue((pending) => pending.slice(1));
    }, [current, queue]);

    const displayText = current ? getDisplayText(current) : '';

    useEffect(() => {
        if (!current || current.roomCode !== roomCode) {
            setIsExiting(false);
            return;
        }

        if (isExiting) {
            const clearTimer = window.setTimeout(() => {
                setCurrent((visible) => visible?.id === current.id ? null : visible);
                setIsExiting(false);
                setMarquee({ overflow: 0, startOffset: 0, endOffset: 0, travelDistance: 0 });
            }, EXIT_ANIMATION_MS);
            return () => window.clearTimeout(clearTimer);
        }

        if (marquee.overflow > 0) return;

        const duration = 6000 + Math.min(displayText.length * 35, 10000);
        const exitTimer = window.setTimeout(() => setIsExiting(true), duration);
        return () => window.clearTimeout(exitTimer);
    }, [current?.id, current?.roomCode, roomCode, displayText, marquee.overflow, isExiting]);

    const handleMarqueeEnd = useCallback((messageId: string) => {
        if (current?.id !== messageId || isExiting) return;
        setIsExiting(true);
    }, [current?.id, isExiting]);

    const handleOverflowChange = useCallback((metrics: MarqueeMetrics) => {
        setMarquee((currentMetrics) => currentMetrics.overflow === metrics.overflow
            && currentMetrics.startOffset === metrics.startOffset
            && currentMetrics.endOffset === metrics.endOffset
            ? currentMetrics : metrics);
    }, []);

    const restrictDragToPlayer = useCallback<Modifier>(({ transform, activeNodeRect }) => {
        if (!activeNodeRect || !portalTarget) return transform;
        const playerRect = portalTarget.getBoundingClientRect();
        const left = playerRect.left + portalTarget.clientLeft;
        const top = playerRect.top + portalTarget.clientTop;
        const right = left + portalTarget.clientWidth;
        const bottom = top + portalTarget.clientHeight;
        const minX = left - activeNodeRect.left;
        const maxX = right - activeNodeRect.right;
        const minY = top - activeNodeRect.top;
        const maxY = bottom - activeNodeRect.bottom;
        return {
            ...transform,
            x: Math.min(Math.max(transform.x, minX), Math.max(minX, maxX)),
            y: Math.min(Math.max(transform.y, minY), Math.max(minY, maxY)),
        };
    }, [portalTarget]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor),
    );

    const handleDragEnd = useCallback(({ delta }: DragEndEvent) => {
        const currentGeometry = geometryRef.current;
        const currentBounds = boundsRef.current;
        if (!currentGeometry || !currentBounds) return;
        updateGeometry(clampGeometry({
            ...currentGeometry,
            x: currentGeometry.x + delta.x,
            y: currentGeometry.y + delta.y,
        }, currentBounds), true);
    }, [updateGeometry]);

    const handleResizeStart = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const currentGeometry = geometryRef.current;
        if (!currentGeometry) return;
        resizeStartRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            width: currentGeometry.width,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    }, []);

    const handleResizeMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
        const start = resizeStartRef.current;
        const currentBounds = boundsRef.current;
        if (!start || start.pointerId !== event.pointerId || !currentBounds) return;
        event.preventDefault();
        event.stopPropagation();
        const currentGeometry = geometryRef.current;
        if (!currentGeometry) return;
        const minWidth = getSizeLimits(currentBounds).minWidth;
        const maxWidth = Math.max(minWidth, currentBounds.width - currentGeometry.x);
        updateGeometry(clampGeometry({
            ...currentGeometry,
            width: Math.min(maxWidth, Math.max(minWidth, start.width + event.clientX - start.startX)),
        }, currentBounds));
    }, [updateGeometry]);

    const handleResizeEnd = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
        const start = resizeStartRef.current;
        if (!start || start.pointerId !== event.pointerId) return;
        event.stopPropagation();
        resizeStartRef.current = null;
        const currentGeometry = geometryRef.current;
        const currentBounds = boundsRef.current;
        if (currentGeometry && currentBounds) persistGeometry(currentGeometry, currentBounds, speedRef.current);
    }, []);

    const handleResizeKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>) => {
        const currentGeometry = geometryRef.current;
        const currentBounds = boundsRef.current;
        if (!currentGeometry || !currentBounds) return;
        const step = event.shiftKey ? 32 : 12;
        let width = currentGeometry.width;
        if (event.key === 'ArrowRight') width += step;
        else if (event.key === 'ArrowLeft') width -= step;
        else return;
        event.preventDefault();
        width = Math.min(currentBounds.width - currentGeometry.x, width);
        updateGeometry(clampGeometry({ ...currentGeometry, width }, currentBounds), true);
    }, [updateGeometry]);

    const handleSpeedClick = useCallback(() => {
        const currentIndex = TICKER_SPEEDS.indexOf(speedRef.current);
        const nextSpeed = TICKER_SPEEDS[(currentIndex + 1) % TICKER_SPEEDS.length];
        speedRef.current = nextSpeed;
        setSpeed(nextSpeed);
        const currentGeometry = geometryRef.current;
        const currentBounds = boundsRef.current;
        if (currentGeometry && currentBounds) persistGeometry(currentGeometry, currentBounds, nextSpeed);
        else {
            try {
                const currentSaved = readSavedLayout();
                if (currentSaved) localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({ ...currentSaved, speed: nextSpeed }));
            } catch {
                // Keep the speed control usable if browser storage is unavailable.
            }
        }
    }, []);

    if (!current || current.roomCode !== roomCode || !portalTarget || !bounds || !geometry) return null;

    return createPortal(
        <DndContext
            sensors={sensors}
            modifiers={[restrictDragToPlayer]}
            autoScroll={false}
            onDragEnd={handleDragEnd}
        >
            <div className="room-chat-ticker-boundary">
                <RoomChatTickerSurface
                    message={current}
                    geometry={geometry}
                    isExiting={isExiting}
                    marquee={marquee}
                    speed={speed}
                    onSpeedClick={handleSpeedClick}
                    onMarqueeEnd={handleMarqueeEnd}
                    onOverflowChange={handleOverflowChange}
                    onResizeStart={handleResizeStart}
                    onResizeMove={handleResizeMove}
                    onResizeEnd={handleResizeEnd}
                    onResizeKeyDown={handleResizeKeyDown}
                />
            </div>
        </DndContext>,
        portalTarget,
    );
}
