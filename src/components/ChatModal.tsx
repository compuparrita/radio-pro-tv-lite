import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Users, Wifi, WifiOff, Trash2, LogOut, HelpCircle } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useRadio } from '../context/RadioContext';
import HelpModal from './HelpModal';

interface ChatModalProps {
    externalOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const MessageText = ({ text, stations, playStation, setIsOpen, isOwnMessage }: {
    text: string;
    stations: any[];
    playStation: (s: any) => void;
    setIsOpen: (o: boolean) => void;
    isOwnMessage: boolean;
}) => {
    // Build a regex for station names (memoized for performance)
    const stationRegex = React.useMemo(() => {
        if (!stations.length) return null;
        // Sort by length descending to match longer names first ("Radio FM Pro" before "Radio")
        const names = [...stations]
            .sort((a, b) => b.name.length - a.name.length)
            .map(s => s.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        // Use non-capturing group (?:...) to prevent duplicates in split()
        // Removed \b to allow matching names with special characters like parentheses
        return new RegExp(`(?:${names.join('|')})`, 'gi');
    }, [stations]);

    // Regex for URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return (
        <div className="break-words">
            {parts.map((part, i) => {
                if (part.match(urlRegex)) {
                    const isYouTube = part.includes('youtube.com/watch') || part.includes('youtu.be/');
                    let ytId = '';
                    if (isYouTube) {
                        const match = part.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
                        if (match) ytId = match[1];
                    }

                    return (
                        <React.Fragment key={i}>
                            <a
                                href={part}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${isOwnMessage ? 'text-sky-200' : 'text-cyan-300'} hover:underline break-all font-bold shadow-sm decoration-2 transition-all`}
                            >
                                {part}
                            </a>
                            {ytId && (
                                <div className="mt-2 mb-2 rounded-lg overflow-hidden border-2 border-[var(--primary-color)]/30 shadow-xl max-w-[260px] relative group cursor-pointer"
                                    onClick={() => {
                                        const ytStation = {
                                            id: `yt-${ytId}`,
                                            name: `YouTube: ${ytId}`,
                                            url: `https://www.youtube.com/embed/${ytId}`,
                                            iframeUrl: `https://www.youtube.com/embed/${ytId}`,
                                            logo: `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
                                            country: 'YouTube',
                                            type: 'video'
                                        };
                                        playStation(ytStation);
                                        setIsOpen(false);
                                    }}
                                >
                                    <img
                                        src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                                        alt="YouTube Preview"
                                        className="w-full h-auto block group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-[var(--primary-color)] text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                            <Send size={12} className="rotate-90" /> Reproducir en App
                                        </div>
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                }

                // For non-URL parts, look for station names
                if (!stationRegex) return <span key={i}>{part}</span>;

                const subParts = part.split(stationRegex);
                const matches = part.match(stationRegex);

                return (
                    <React.Fragment key={i}>
                        {subParts.map((sp, j) => (
                            <React.Fragment key={j}>
                                {sp}
                                {matches && matches[j] && (() => {
                                    const station = stations.find(s => s.name.toLowerCase() === matches[j].toLowerCase());
                                    return (
                                        <button
                                            onClick={() => {
                                                if (station) {
                                                    playStation(station);
                                                    setIsOpen(false);
                                                }
                                            }}
                                            className={`${isOwnMessage ? 'text-sky-100' : 'text-[var(--primary-color)]'} font-extrabold hover:underline transition-all active:scale-95 decoration-2`}
                                            title={`Click para escuchar ${matches[j]}`}
                                        >
                                            {matches[j]}
                                        </button>
                                    );
                                })()}
                            </React.Fragment>
                        ))}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export const ChatModal: React.FC<ChatModalProps> = ({ externalOpen, onOpenChange }) => {
    const {
        messages,
        onlineListeners,
        connectionStatus,
        userIdentity,
        sendMessage,
        identify,
        isIdentified,
        clearMessages,
        deleteMessage,
        logout,
        error: contextError,
        setModalOpen
    } = useChat();

    const { stations, playStation } = useRadio();

    const [isOpen, setIsOpen] = useState(false);
    const [currentMessage, setCurrentMessage] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [canSend, setCanSend] = useState(true);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Auto-scroll to bottom when new messages arrive or modal opens
    useEffect(() => {
        if (isOpen) {
            const scrollToBottom = (instant = false) => {
                if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({
                        behavior: instant ? 'auto' : 'smooth',
                        block: 'end'
                    });
                }
            };

            // 1. Instant scroll attempt
            scrollToBottom(true);

            // 2. Delayed scroll for animations/rendering stabilization
            const timerScroll = setTimeout(() => scrollToBottom(), 100);

            // Lock body scroll
            document.body.style.overflow = 'hidden';

            // 3. Focus and secondary scroll
            const timerFocus = setTimeout(() => {
                inputRef.current?.focus();
                scrollToBottom();
            }, 300);

            return () => {
                clearTimeout(timerScroll);
                clearTimeout(timerFocus);
                document.body.style.overflow = '';
            };
        } else {
            document.body.style.overflow = '';
        }
    }, [messages, isOpen]);

    // Sync with external control
    useEffect(() => {
        if (externalOpen !== undefined && externalOpen !== isOpen) {
            setIsOpen(externalOpen);
        }
    }, [externalOpen]);

    // Notify parent and context when modal opens/closes
    useEffect(() => {
        setModalOpen(isOpen);
        onOpenChange?.(isOpen);
    }, [isOpen, setModalOpen, onOpenChange]);

    const handleIdentify = (e: React.FormEvent) => {
        e.preventDefault();

        if (name.trim().length < 2) {
            setError('El nombre debe tener al menos 2 caracteres');
            return;
        }

        if (name.trim().length > 50) {
            setError('El nombre no puede tener más de 50 caracteres');
            return;
        }

        identify({
            name: name.trim(),
            phone: phone.trim() || undefined
        });

        setError('');
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();

        if (!canSend) {
            // Error already shown, do nothing or shake animation
            return;
        }

        const trimmedMessage = currentMessage.trim();

        if (trimmedMessage.length === 0) {
            return;
        }

        if (trimmedMessage.length > 500) {
            setError('El mensaje no puede tener más de 500 caracteres');
            return;
        }

        sendMessage(trimmedMessage);
        setCurrentMessage('');
        setError('');

        // Rate limiting in frontend (10 msgs per minute approx logic, here just delay)
        setCanSend(false);

        // Prevent sending for 6 seconds
        setTimeout(() => {
            setCanSend(true);
            setError(''); // Clear any rate limit error if it was set by server
        }, 6000);
    };

    // Autocomplete logic
    useEffect(() => {
        const words = currentMessage.split(/\s+/);
        const lastWord = words[words.length - 1].toLowerCase();

        if (lastWord.length >= 3) {
            const filtered = stations
                .filter(s => s.name.toLowerCase().includes(lastWord))
                .slice(0, 5); // Limit to top 5 suggestions

            if (filtered.length > 0) {
                setSuggestions(filtered);
                setShowSuggestions(true);
                setSelectedIndex(0);
            } else {
                setShowSuggestions(false);
            }
        } else {
            setShowSuggestions(false);
        }
    }, [currentMessage, stations]);

    const handleSelectSuggestion = (suggestion: any) => {
        const words = currentMessage.split(/\s+/);
        words[words.length - 1] = suggestion.name;
        setCurrentMessage(words.join(' ') + ' ');
        setShowSuggestions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showSuggestions) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev: number) => (prev + 1) % suggestions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev: number) => (prev - 1 + suggestions.length) % suggestions.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleSelectSuggestion(suggestions[selectedIndex]);
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
            }
        }
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <>

            {/* Chat Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-start md:items-end justify-end p-0 md:p-1 md:pr-6">
                    {/* Backdrop (mobile only) */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full md:w-96 h-full md:h-[calc(min(1000px,100vh-var(--header-final-height,70px)-30px))] bg-[var(--dark-surface)] rounded-none md:rounded-lg shadow-2xl flex flex-col animate-slide-in-right">
                        {/* Header */}
                        <div className="p-2 border-b border-[var(--dark-border)] flex items-center justify-between bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] rounded-none">
                            <div className="flex items-center gap-2">
                                <MessageCircle size={20} className="text-white" />
                                <div>
                                    <h3 className="text-white font-bold text-sm drop-shadow-md">
                                        {isIdentified && userIdentity ? userIdentity.name : 'Chat en Vivo'}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-white/90 drop-shadow-md">
                                        {connectionStatus === 'connected' ? (
                                            <>
                                                <Wifi size={14} />
                                                <span>Conectado</span>
                                            </>
                                        ) : (
                                            <>
                                                <WifiOff size={14} />
                                                <span>Desconectado</span>
                                            </>
                                        )}
                                        <span>•</span>
                                        <Users size={14} />
                                        <span>{onlineListeners} en línea</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <button
                                    onClick={() => setIsHelpOpen(true)}
                                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors mr-1"
                                    title="Ayuda"
                                >
                                    <HelpCircle size={20} />
                                </button>
                                {isIdentified && (
                                    <button
                                        onClick={logout}
                                        className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors mr-1"
                                        title="Cerrar sesión"
                                    >
                                        <LogOut size={20} />
                                    </button>
                                )}
                                <button
                                    onClick={clearMessages}
                                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors mr-1"
                                    title="Limpiar historial"
                                >
                                    <Trash2 size={20} />
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Identification Form */}
                        {!isIdentified && (
                            <div className="flex-1 flex items-center justify-center p-6">
                                <form onSubmit={handleIdentify} className="w-full max-w-sm space-y-4">
                                    <div className="text-center mb-6">
                                        <h4 className="text-xl font-bold mb-2">Únete al chat</h4>
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            Identifícate para comenzar a chatear
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Nombre *
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Tu nombre"
                                            className="w-full p-3 bg-[var(--dark-bg)] border border-[var(--dark-border)] rounded-lg focus:border-[var(--primary-color)] outline-none"
                                            required
                                            minLength={2}
                                            maxLength={50}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Teléfono (opcional)
                                        </label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="Ej: 8888-8888"
                                            className="w-full p-3 bg-[var(--dark-bg)] border border-[var(--dark-border)] rounded-lg focus:border-[var(--primary-color)] outline-none"
                                        />
                                    </div>

                                    {error && (
                                        <div className="text-red-400 text-sm text-center">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="w-full py-3 bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                                    >
                                        Continuar al Chat
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Chat Messages */}
                        {isIdentified && (
                            <>
                                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                    {messages.length === 0 ? (
                                        <div className="text-center text-[var(--text-secondary)] py-12">
                                            <MessageCircle size={48} className="mx-auto mb-3 opacity-50" />
                                            <p>No hay mensajes aún</p>
                                            <p className="text-sm">¡Sé el primero en escribir!</p>
                                        </div>
                                    ) : (
                                        messages.map((msg) => {
                                            const isOwnMessage = userIdentity?.name === msg.userName;
                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={`flex group ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${isOwnMessage
                                                            ? 'bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-white'
                                                            : 'bg-white/10 text-[var(--text-primary)]'
                                                            }`}
                                                    >
                                                        {!isOwnMessage && (
                                                            <div className="font-semibold text-xs mb-1 opacity-80">
                                                                {msg.userName}
                                                            </div>
                                                        )}
                                                        <MessageText
                                                            text={msg.message}
                                                            stations={stations}
                                                            playStation={playStation}
                                                            setIsOpen={setIsOpen}
                                                            isOwnMessage={isOwnMessage}
                                                        />
                                                        <div className="flex items-center justify-between mt-1 gap-2">
                                                            <button
                                                                onClick={() => deleteMessage(msg.id)}
                                                                className="opacity-0 group-hover:opacity-40 hover:!opacity-90 transition-opacity p-0.5 text-[var(--text-primary)]"
                                                                title="Eliminar mensaje"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                            <div className="text-xs opacity-70">
                                                                {formatTime(msg.timestamp)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {showSuggestions && (
                                    <div className="mx-2 mb-2 bg-[var(--dark-surface)] border border-[var(--dark-border)] shadow-xl overflow-hidden rounded-none">
                                        {suggestions.map((s: any, idx: number) => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => handleSelectSuggestion(s)}
                                                className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${idx === selectedIndex ? 'bg-[var(--primary-color)] text-white' : 'hover:bg-white/5 text-[var(--text-primary)]'
                                                    }`}
                                            >
                                                <Wifi size={14} className="opacity-50" />
                                                <span className="truncate flex-1">{s.name}</span>
                                                <span className="text-[10px] opacity-50 uppercase">{s.country}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Message Input */}
                                <form
                                    onSubmit={handleSendMessage}
                                    onKeyDown={handleKeyDown}
                                    className="p-2 border-t border-[var(--dark-border)] bg-[var(--dark-surface)]"
                                >
                                    {(error || contextError) && (
                                        <div className="text-red-400 text-xs mb-2 text-center">
                                            {error || contextError}
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={currentMessage}
                                            onChange={(e) => setCurrentMessage(e.target.value)}
                                            placeholder="Escribe un mensaje..."
                                            className="flex-1 p-3 bg-[var(--dark-bg)] border border-[var(--dark-border)] rounded-lg focus:border-[var(--primary-color)] outline-none"
                                            maxLength={500}
                                            disabled={connectionStatus !== 'connected'}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!currentMessage.trim() || connectionStatus !== 'connected' || !canSend}
                                            className="px-4 py-3 bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                                        >
                                            <Send size={20} />
                                        </button>
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-2 text-right">
                                        {currentMessage.length}/500
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            <HelpModal
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
            />
        </>
    );
};
