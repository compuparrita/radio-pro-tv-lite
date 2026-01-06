import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Users, Wifi, WifiOff, Trash2, LogOut } from 'lucide-react';
import { useChat } from '../context/ChatContext';

interface ChatModalProps {
    externalOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

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
        logout,
        error: contextError,
        unreadCount,
        setModalOpen
    } = useChat();

    const [isOpen, setIsOpen] = useState(false);
    const [currentMessage, setCurrentMessage] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [canSend, setCanSend] = useState(true);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <>
            {/* Floating Chat Button - Desktop Only */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="hidden md:flex fixed bottom-6 right-6 z-40 w-16 h-10 rounded-full bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white shadow-2xl hover:scale-110 transition-transform items-center justify-center"
                    title="Abrir chat"
                >
                    <MessageCircle size={28} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
            )}

            {/* Chat Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-end md:justify-end p-0 md:p-6">
                    {/* Backdrop (mobile only) */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full md:w-96 h-full md:h-[600px] bg-[var(--dark-surface)] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col animate-slide-in-right">
                        {/* Header */}
                        <div className="p-4 border-b border-[var(--dark-border)] flex items-center justify-between bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <MessageCircle size={24} className="text-white" />
                                <div>
                                    <h3 className="text-white font-bold text-lg drop-shadow-md">
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
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
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
                                                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
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
                                                        <div className="break-words">{msg.message}</div>
                                                        <div className="text-xs opacity-70 mt-1 text-right">
                                                            {formatTime(msg.timestamp)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Message Input */}
                                <form
                                    onSubmit={handleSendMessage}
                                    className="p-4 border-t border-[var(--dark-border)] bg-[var(--dark-surface)]"
                                >
                                    {(error || contextError) && (
                                        <div className="text-red-400 text-xs mb-2 text-center">
                                            {error || contextError}
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <input
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
        </>
    );
};
