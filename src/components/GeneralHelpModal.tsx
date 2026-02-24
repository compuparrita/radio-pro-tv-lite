import React from 'react';
import { X, HelpCircle, Radio, Settings, Filter } from 'lucide-react';

interface GeneralHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GeneralHelpModal: React.FC<GeneralHelpModalProps> = ({ isOpen, onClose }) => {
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sections = [
        {
            title: "Gestor de Emisoras",
            icon: <Settings className="text-indigo-500" />,
            content: "Pulsa el icono de engranaje en la parte inferior para añadir tus propias estaciones de radio o canales de televisión. Pulsa 'Gestionar Emisoras' para abrir el panel completo.",
            tip: "Puedes editar o borrar cualquier emisora desde este gestor."
        },
        {
            title: "Filtros y Categorías",
            icon: <Filter className="text-emerald-500" />,
            content: "Usa la barra superior de categorías para filtrar rápidamente. Si eliges una categoría, solo verás las emisoras que pertenecen a ese género.",
            tip: "La selección se guarda automáticamente al navegar entre Radios y TV."
        },
        {
            title: "Favoritos",
            icon: <Radio className="text-amber-500" />,
            content: "Pulsa el icono de estrella en cualquier emisora para añadirla a tu lista de Favoritos. Tendrás acceso rápido desde la pestaña correspondiente en móviles o el panel lateral.",
            tip: "Tus favoritos son persistentes y se sincronizan con tu navegador."
        }
    ];

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white text-slate-900 w-full max-w-2xl overflow-hidden shadow-2xl rounded-none md:rounded-lg border border-slate-200">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-100">
                    <div className="flex items-center gap-2">
                        <HelpCircle size={24} className="text-indigo-600" />
                        <h2 className="text-xl font-bold">Ayuda General</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                    {sections.map((section, idx) => (
                        <div key={idx} className="flex gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="mt-1">{section.icon}</div>
                            <div>
                                <h3 className="font-bold text-lg mb-1">{section.title}</h3>
                                <p className="text-slate-600 text-sm leading-relaxed mb-2">{section.content}</p>
                                <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 p-2 rounded inline-block uppercase tracking-wider">
                                    CONSEJO: {section.tip}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-100 text-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-lg rounded-none"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GeneralHelpModal;
