import React from 'react';
import type { ComponentType } from 'react';
import { Radio, Settings, Filter, Cloud, Sparkles } from 'lucide-react';
import type { PanelShellProps } from './panels/PanelShell';

export interface GeneralHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface GeneralHelpModalHostProps extends GeneralHelpModalProps {
    PanelShellComponent: ComponentType<PanelShellProps>;
}

const GeneralHelpModal: React.FC<GeneralHelpModalHostProps> = ({ isOpen, onClose, PanelShellComponent }) => {
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
        <PanelShellComponent
            ariaLabel="Ayuda y Guía de la App"
            closeButtonLabel="Cerrar ayuda"
            contentClassName="custom-scrollbar"
            description="Conoce las funciones principales de Radio Streaming Pro"
            footer={(
                <div className="flex items-center justify-end border-t border-white/10 bg-black/20 p-3 sm:p-4">
                    <button
                        onClick={onClose}
                        className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-[var(--primary-color)] px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-95 sm:w-auto"
                    >
                        Entendido
                    </button>
                </div>
            )}
            isOpen={isOpen}
            lockBodyScroll
            onClose={onClose}
            title={(
                <span className="inline-flex items-center gap-3">
                    <span className="rounded-lg border border-indigo-500/30 bg-indigo-500/20 p-2 text-indigo-400">
                        <Sparkles aria-hidden="true" size={22} />
                    </span>
                    Ayuda y Guía de la App
                </span>
            )}
        >
                <div className="space-y-4 custom-scrollbar">
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
        </PanelShellComponent>
    );
};

export default GeneralHelpModal;
