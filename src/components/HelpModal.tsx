import React from 'react';
import type { ComponentType } from 'react';
import { MessageSquare, Share2, Youtube, Sparkles } from 'lucide-react';
import type { PanelShellProps } from './panels/PanelShell';

export interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface HelpModalHostProps extends HelpModalProps {
    PanelShellComponent: ComponentType<PanelShellProps>;
}

const HelpModal: React.FC<HelpModalHostProps> = ({ isOpen, onClose, PanelShellComponent }) => {

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
        <PanelShellComponent
            ariaLabel="Guía de Uso del Chat"
            closeButtonLabel="Cerrar ayuda del chat"
            contentClassName="custom-scrollbar"
            description="Aprende a sacarle el máximo provecho al chat en vivo"
            footer={(
                <div className="flex items-center justify-end border-t border-white/10 bg-black/20 p-3 sm:p-4">
                    <button
                        onClick={onClose}
                        className="w-full rounded-lg bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-95 sm:w-auto"
                    >
                        Entendido
                    </button>
                </div>
            )}
            isOpen={isOpen}
            onClose={onClose}
            title={(
                <span className="inline-flex items-center gap-3">
                    <span className="rounded-lg border border-[var(--primary-color)]/30 bg-[var(--primary-color)]/20 p-2 text-[var(--primary-color)]">
                        <Sparkles aria-hidden="true" size={22} />
                    </span>
                    Guía de Uso del Chat
                </span>
            )}
            titleId="chat-help-title"
        >
                <div className="space-y-4">
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
        </PanelShellComponent>
    );
};

export default HelpModal;
