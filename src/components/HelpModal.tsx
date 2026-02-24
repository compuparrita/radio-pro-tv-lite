import React from 'react';
import { X, HelpCircle, MessageSquare, Share2 } from 'lucide-react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const sections = [
        {
            title: "Sintonizador Inteligente (Chat)",
            icon: <MessageSquare className="text-violet-500" />,
            content: "Mientras escribes en el chat, el sistema te sugerirá nombres de emisoras. Puedes navegar las sugerencias con las flechas del teclado y presionar Enter para autocompletar.",
            tip: "Solo escribe las primeras letras como 'multi' para ver sugerencias."
        },
        {
            title: "Compartir Emisoras",
            icon: <Share2 className="text-cyan-500" />,
            content: "Cualquier nombre de emisora en tu lista se convierte automáticamente en un botón sintonizador cuando lo escribes en el chat.",
            tip: "Escribe 'Telesur' y verás cómo se transforma en un botón táctil."
        },
        {
            title: "Enlaces de YouTube",
            icon: <Share2 className="text-red-500" />,
            content: "Al compartir enlaces de YouTube, el chat generará automáticamente una miniatura de previsualización para el resto de oyentes.",
            tip: "Copia y pega el link directamente en el cuadro de mensaje."
        }
    ];

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white text-slate-900 w-full max-w-2xl overflow-hidden shadow-2xl rounded-none md:rounded-lg">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                        <HelpCircle size={24} className="text-violet-600" />
                        <h2 className="text-xl font-bold">Guía de Uso</h2>
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
                                <div className="text-xs font-semibold text-violet-600 bg-violet-50 p-2 rounded inline-block">
                                    TIP: {section.tip}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors shadow-lg"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HelpModal;
