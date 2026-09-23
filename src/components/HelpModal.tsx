import React, { useEffect } from 'react';
import { X, MessageSquare, Share2, Youtube, Sparkles } from 'lucide-react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    useEffect(() => {
        if (isOpen) {
            const prevOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = prevOverflow;
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const sections = [
        {
            title: "Sintonizador Inteligente en Chat",
            icon: <MessageSquare size={22} className="text-[var(--primary-color)]" />,
            badge: "Autocompletado con /",
            content: "Para buscar y mencionar rápidamente una emisora de tu lista, escribe una barra inclinada '/' (ejemplo: '/tele' o solo '/'). Usa las flechas y Enter o tócala para seleccionarla.",
            tip: "Escribe '/' para ver todas las emisoras o '/nombre' para filtrar al instante."
        },
        {
            title: "Menciones y Botones Táctiles",
            icon: <Share2 size={22} className="text-cyan-400" />,
            badge: "Interactivo",
            content: "Cualquier nombre de emisora de tu lista que envíes en el chat se transformará en un botón táctil interactivo para que los demás oyentes puedan sintonizarla con un solo toque.",
            tip: "Escribe 'Telesur' o tu estación favorita y todos podrán escucharla tocando el botón."
        },
        {
            title: "Previsualización de YouTube",
            icon: <Youtube size={22} className="text-red-400" />,
            badge: "Multimedia",
            content: "Al pegar un enlace de YouTube en el chat, se generará de forma automática una miniatura de previsualización con un botón para reproducirlo directamente en la app.",
            tip: "Copia y pega cualquier link de YouTube (video, short o en vivo) en el cuadro de texto."
        }
    ];

    return (
        <div className="fixed inset-0 z-[100002] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative w-full max-w-xl bg-[var(--dark-surface)] text-[var(--text-primary)] border border-white/10 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-in-right flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[var(--primary-color)]/20 via-transparent to-[var(--secondary-color)]/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--primary-color)]/20 text-[var(--primary-color)] rounded-lg border border-[var(--primary-color)]/30">
                            <Sparkles size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Guía de Uso del Chat</h2>
                            <p className="text-xs text-[var(--text-secondary)]">Aprende a sacarle el máximo provecho al chat en vivo</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-[var(--text-secondary)] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Cerrar ayuda"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1">
                    {sections.map((section, idx) => (
                        <div
                            key={idx}
                            className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 transition-all group"
                        >
                            <div className="flex items-start gap-3.5">
                                <div className="p-2.5 rounded-lg bg-black/30 border border-white/10 group-hover:scale-105 transition-transform flex-shrink-0">
                                    {section.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                                        <h3 className="font-bold text-sm sm:text-base text-white">{section.title}</h3>
                                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[var(--text-secondary)]">
                                            {section.badge}
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
                                        {section.content}
                                    </p>
                                    <div className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                                        <span className="font-bold uppercase tracking-wider text-[10px]">Tip:</span>
                                        <span>{section.tip}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-3 sm:p-4 border-t border-white/10 bg-black/20 flex items-center justify-end">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-bold text-sm rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-lg"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HelpModal;
