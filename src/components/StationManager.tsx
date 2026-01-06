import React, { useState } from 'react';
import { X, Plus, Save, Trash2, Upload, Download } from 'lucide-react';
import { useRadio } from '../context/RadioContext';
import { Station } from '../types';

interface StationManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const StationManager: React.FC<StationManagerProps> = ({ isOpen, onClose }) => {
    const { stations, addStation, removeStation } = useRadio();
    const [newStation, setNewStation] = useState<Partial<Station>>({
        name: '',
        url: '',
        logo: '',
        country: ''
    });

    if (!isOpen) return null;

    const handleAdd = () => {
        if (!newStation.name || !newStation.url) return;

        const station: Station = {
            id: Date.now().toString(),
            name: newStation.name,
            url: newStation.url,
            logo: newStation.logo || 'https://picsum.photos/seed/radio/150/150',
            country: newStation.country || 'Desconocido'
        };

        addStation(station);
        setNewStation({ name: '', url: '', logo: '', country: '' });
    };

    const handleExport = () => {
        try {
            const data = JSON.stringify(stations, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `radio-stations-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            // Clean up URL object after download
            setTimeout(() => URL.revokeObjectURL(url), 100);
        } catch (error) {
            console.error('Error exporting stations:', error);
            alert('Error al exportar las emisoras');
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                if (Array.isArray(imported)) {
                    imported.forEach(s => {
                        if (s.name && s.url) addStation({ ...s, id: Date.now().toString() + Math.random() });
                    });
                }
            } catch (err) {
                console.error('Error importing stations', err);
                alert('Error al importar emisoras. Verifica que el archivo sea válido.');
            }
        };
        reader.readAsText(file);
    };

    const handleClearStorage = () => {
        const confirmed = window.confirm(
            '⚠️ ¡ADVERTENCIA!\n\n' +
            'Esto borrará TODOS tus datos:\n' +
            '- Emisoras personalizadas\n' +
            '- Favoritos\n' +
            '- Configuraciones de volumen\n' +
            '- Historial reciente\n\n' +
            '¿Estás seguro que deseas continuar?'
        );

        if (confirmed) {
            localStorage.clear();
            window.location.reload();
        }
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[var(--dark-surface)] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-[var(--dark-border)] flex justify-between items-center">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Save size={24} className="text-[var(--primary-color)]" />
                        Gestor de Emisoras
                    </h2>
                    <button onClick={onClose} className="hover:text-[var(--primary-color)] transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Add New */}
                    <div className="bg-white/5 p-4 rounded-xl mb-8">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Plus size={20} /> Agregar Nueva Emisora
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <input
                                type="text"
                                placeholder="Nombre de la emisora"
                                value={newStation.name}
                                onChange={e => setNewStation({ ...newStation, name: e.target.value })}
                                className="bg-[var(--dark-bg)] border border-[var(--dark-border)] rounded-lg p-3 focus:border-[var(--primary-color)] outline-none"
                            />
                            <input
                                type="text"
                                placeholder="URL del Stream (MP3/M3U8)"
                                value={newStation.url}
                                onChange={e => setNewStation({ ...newStation, url: e.target.value })}
                                className="bg-[var(--dark-bg)] border border-[var(--dark-border)] rounded-lg p-3 focus:border-[var(--primary-color)] outline-none"
                            />
                            <input
                                type="text"
                                placeholder="URL del Logo (Opcional)"
                                value={newStation.logo}
                                onChange={e => setNewStation({ ...newStation, logo: e.target.value })}
                                className="bg-[var(--dark-bg)] border border-[var(--dark-border)] rounded-lg p-3 focus:border-[var(--primary-color)] outline-none"
                            />
                            <input
                                type="text"
                                placeholder="País/Ciudad"
                                value={newStation.country}
                                onChange={e => setNewStation({ ...newStation, country: e.target.value })}
                                className="bg-[var(--dark-bg)] border border-[var(--dark-border)] rounded-lg p-3 focus:border-[var(--primary-color)] outline-none"
                            />
                        </div>
                        <button
                            onClick={handleAdd}
                            disabled={!newStation.name || !newStation.url}
                            className="bg-[var(--primary-color)] text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity w-full md:w-auto"
                        >
                            Agregar Emisora
                        </button>
                    </div>

                    {/* List */}
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold mb-4">Emisoras Existentes ({stations.length})</h3>
                        {stations.map(station => (
                            <div key={station.id} className="flex items-center gap-4 bg-white/5 p-3 rounded-lg group hover:bg-white/10 transition-colors">
                                <img src={station.logo} alt="" className="w-10 h-10 rounded-full object-cover" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{station.name}</div>
                                    <div className="text-xs text-[var(--text-secondary)] truncate">{station.url}</div>
                                </div>
                                <button
                                    onClick={() => removeStation(station.id)}
                                    className="text-red-400 hover:text-red-300 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Eliminar"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-[var(--dark-border)] bg-[var(--dark-surface)] flex flex-wrap gap-4 justify-between items-center">
                    <div className="flex gap-4 flex-wrap">
                        <button onClick={handleExport} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-colors">
                            <Download size={18} /> Exportar JSON
                        </button>
                        <label className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer">
                            <Upload size={18} /> Importar JSON
                            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                        </label>
                        <button
                            onClick={handleClearStorage}
                            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
                        >
                            <Trash2 size={18} /> Limpiar LocalStorage
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
