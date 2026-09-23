import React, { useEffect } from 'react';
import { X, Radio, Settings, Filter, Cloud, Sparkles } from 'lucide-react';

interface GeneralHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GeneralHelpModal: React.FC<GeneralHelpModalProps> = ({ isOpen, onClose }) => {
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
            title: "Gestor de Emisoras y Sincronización en la Nube",
            icon: <Settings size={22} className="text-indigo-400" />,
            badge: "Cloud Supabase",
            content: "Pulsa 'Gestor de Emisoras' en el pie de página para añadir, editar o reordenar tus radios y canales de televisión. Todos los cambios se guardan y sincronizan automáticamente en la nube.",
            tip: "Puedes arrastrar y soltar las emisoras para personalizar el orden en todos tus dispositivos."
        },
        {
            title: "Filtros y Categorías",
            icon: <Filter size={22} className="text-emerald-400" />,
            badge: "Navegación",
            content: "Usa la barra superior de categorías para filtrar rápidamente. Si seleccionas un género (Música, Deportes, Noticias, etc.), el catálogo mostrará solo las emisoras de esa categoría.",
            tip: "Tu categoría y pestaña activa (Radio, TV o Favoritos) se recuerdan automáticamente."
        },
        {
            title: "Favoritos en Tiempo Real",
            icon: <Radio size={22} className="text-amber-400" />,
            badge: "Personalizado",
            content: "Pulsa la estrella en cualquier emisora para agregarla a tu lista de Favoritos. Accede a ellos inmediatamente desde la pestaña 'Favoritos' tanto en móviles como en ordenadores o TV.",
            tip: "Tus favoritos se respaldan en Supabase para que no los pierdas al cambiar de navegador."
        },
        {
            title: "Navegación Móvil y Modo Cine",
            icon: <Cloud size={22} className="text-cyan-400" />,
            badge: "Experiencia",
            content: "En dispositivos móviles la barra inferior se oculta inteligentemente al hacer scroll hacia abajo para darte mayor espacio de lectura. Si giras el móvil en horizontal mientras ves TV, se activa el Modo Cine a pantalla completa.",
            tip: "Haz un leve scroll hacia arriba para volver a ver los controles en cualquier momento."
        }
    ];

    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-[var(--dark-surface)] text-[var(--text-primary)] border border-white/10 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-in-right flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-500/20 via-transparent to-[var(--primary-color)]/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                            <Sparkles size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Ayuda y Guía de la App</h2>
                            <p className="text-xs text-[var(--text-secondary)]">Conoce las funciones principales de Radio Streaming Pro</p>
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
                                    <div className="text-[11px] font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                                        <span className="font-bold uppercase tracking-wider text-[10px]">Consejo:</span>
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
                        className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-[var(--primary-color)] text-white font-bold text-sm rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-lg"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GeneralHelpModal;
