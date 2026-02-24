import React, { useState, useEffect } from 'react';
import { X, Plus, Save, Trash2, Upload, Download, Edit2, CheckCircle, AlertTriangle, Monitor, Music, HelpCircle, Menu } from 'lucide-react';
import { useRadio } from '../context/RadioContext';
import { Station } from '../types';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface StationManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Toast {
    message: string;
    type: 'success' | 'error';
}

const SortableStationItem = ({
    station,
    onEdit,
    onDelete,
    confirmDelete,
    setConfirmDelete,
    showToast,
    removeStation,
    isCurrent,
    isEditing
}: {
    station: Station;
    onEdit: (s: Station) => void;
    onDelete: (id: string) => void;
    confirmDelete: string | null;
    setConfirmDelete: (id: string | null) => void;
    showToast: (m: string) => void;
    removeStation: (id: string) => void;
    isCurrent: boolean;
    isEditing: boolean;
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: station.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 2 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-2 p-1 group transition-all border ${isEditing
                ? 'bg-blue-500/10 border-blue-500/30'
                : isCurrent
                    ? 'bg-[var(--primary-color)]/10 border-[var(--primary-color)]/30'
                    : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                } ${isDragging ? 'shadow-2xl' : ''}`}
        >
            <div className="relative flex-shrink-0">
                <img src={station.logo} alt="" className="w-10 h-10 rounded-full object-contain border border-white/10 bg-black/20 p-0.5" />
                {isCurrent && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--primary-color)] rounded-full border-2 border-[var(--dark-surface)] flex items-center justify-center">
                        <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`font-bold truncate text-xs max-w-[120px] sm:max-w-[300px] ${isCurrent ? 'text-[var(--primary-color)]' : isEditing ? 'text-blue-400' : ''}`}>
                        {station.name}
                    </span>
                    <div className="flex items-center gap-1">
                        {isCurrent && (
                            <span className="text-[8px] bg-[var(--primary-color)] text-white px-1 font-black animate-pulse uppercase">En Línea</span>
                        )}
                        <span className={`text-[9px] px-1 uppercase font-bold border ${station.type === 'video' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                            {station.type === 'video' ? 'TV' : 'FM'}
                        </span>
                        {station.useProxy && (
                            <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1 rounded uppercase font-bold">Proxy</span>
                        )}
                        <span className="text-[9px] text-[var(--text-secondary)] bg-white/5 px-1 uppercase">{station.country}</span>
                        {station.category && station.category !== 'Otros' && (
                            <span className="hidden sm:inline-block text-[9px] text-[var(--text-secondary)] bg-white/5 px-1 uppercase opacity-70">{station.category}</span>
                        )}
                    </div>
                </div>
                <div className="text-[12px] text-cyan-500 truncate font-mono opacity-60 mt-0.5">
                    {station.iframeUrl ? 'IFRAME MODE' : station.url}
                </div>
            </div>

            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 sm:bg-transparent p-1 sm:p-0 backdrop-blur-sm sm:backdrop-blur-none" >
                {confirmDelete === station.id ? (
                    <div className="flex items-center gap-1 animate-in slide-in-from-right-2">
                        <button
                            onClick={() => {
                                removeStation(station.id);
                                setConfirmDelete(null);
                                showToast('Eliminado');
                            }}
                            className="bg-red-500 text-white px-2 py-1 text-[10px] font-bold hover:bg-red-600 transition-all"
                        >
                            Borrar
                        </button>
                        <button
                            onClick={() => setConfirmDelete(null)}
                            className="bg-white/10 text-white px-2 py-1 text-[10px] font-bold hover:bg-white/20 transition-all"
                        >
                            X
                        </button>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={() => onEdit(station)}
                            className="p-1.5 text-blue-400 hover:bg-blue-500/10 transition-colors"
                            title="Editar"
                        >
                            <Edit2 size={14} />
                        </button>
                        <button
                            onClick={() => onDelete(station.id)}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 size={14} />
                        </button>
                    </>
                )}
            </div>

            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 text-[var(--text-secondary)] hover:text-white transition-colors"
                title="Arrastrar para reordenar"
            >
                <Menu size={14} />
            </div>
        </div>
    );
};

export const StationManager: React.FC<StationManagerProps> = ({ isOpen, onClose }) => {
    const { stations, addStation, removeStation, updateStation, importStations, reorderStations, radioCategories, tvCategories, currentStation } = useRadio();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [toast, setToast] = useState<Toast | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [formData, setFormData] = useState<Partial<Station>>({
        name: '',
        url: '',
        logo: '',
        country: '',
        type: 'audio',
        iframeUrl: '',
        useProxy: false,
        category: 'Otros',
        embedCanal: ''
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData({ name: '', url: '', logo: '', country: '', type: 'audio', iframeUrl: '', useProxy: false, category: 'Otros', embedCanal: '' });
    };

    // Reset form when modal closes or when canceling edit
    useEffect(() => {
        if (!isOpen) {
            handleCancel();
            setConfirmDelete(null);
            setConfirmReset(false);
            document.body.style.overflow = '';
        } else {
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // La emisora es válida si tiene nombre y al menos una fuente (URL o Iframe/Canal)
        if (!formData.name || (!formData.url && !formData.iframeUrl && !formData.embedCanal)) {
            showToast('Por favor completa el nombre y al menos una fuente (Stream o Iframe/Canal)', 'error');
            return;
        }

        // Procesar la fuente (Iframe / Canal) Inteligente
        let rawInput = formData.iframeUrl?.trim() || formData.embedCanal?.trim() || '';
        let finalIframeUrl = rawInput;
        let finalEmbedCanal = undefined;

        if (rawInput) {
            // 1. Si es un iframe completo, extraer el src
            if (rawInput.includes('<iframe')) {
                const srcMatch = rawInput.match(/src="([^"]+)"/);
                if (srcMatch) finalIframeUrl = srcMatch[1];
            }

            // 2. Determinar si es un nombre corto o una URL
            const isShort = !finalIframeUrl.includes('://') && finalIframeUrl.length < 30 && !finalIframeUrl.includes('/');

            if (isShort) {
                // Es un nombre corto tipo 'natgeo'
                finalEmbedCanal = finalIframeUrl.replace('.html', '').replace('.php', '').split('?')[0];
                finalIframeUrl = `https://embed.saohgdasregions.fun/embed2/${finalEmbedCanal}.html`;
            } else if (finalIframeUrl.includes('embed.saohgdasregions.fun')) {
                // Es una URL de la página conocida, extraemos el canal
                const parts = finalIframeUrl.split('/');
                const filename = parts[parts.length - 1];
                finalEmbedCanal = filename.split('.')[0].split('?')[0];
            }
        }

        const stationData: Station = {
            id: editingId || Date.now().toString(),
            name: formData.name || '',
            url: formData.url || '',
            logo: formData.logo || 'https://images.unsplash.com/photo-1695083691065-4f77dfd0f0d5',
            country: formData.country || 'Desconocido',
            type: formData.type as 'audio' | 'video',
            iframeUrl: finalIframeUrl || undefined,
            useProxy: formData.useProxy,
            category: formData.category || 'Otros',
            embedCanal: finalEmbedCanal || undefined
        };

        if (editingId) {
            updateStation(stationData);
            showToast('Emisora actualizada con éxito');
        } else {
            addStation(stationData);
            showToast('Emisora agregada con éxito');
        }

        handleCancel();
    };

    const handleEdit = (station: Station) => {
        setEditingId(station.id);
        setFormData({
            name: station.name,
            url: station.url,
            logo: station.logo,
            country: station.country,
            type: station.type,
            iframeUrl: station.iframeUrl || '',
            useProxy: station.useProxy || false,
            category: station.category || 'Otros',
            embedCanal: station.embedCanal || ''
        });
        document.getElementById('station-form')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = stations.findIndex((s: Station) => s.id === active.id);
            const newIndex = stations.findIndex((s: Station) => s.id === over.id);

            const newStations = arrayMove(stations, oldIndex, newIndex);
            reorderStations(newStations);
        }
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
            setTimeout(() => URL.revokeObjectURL(url), 100);
            showToast('Lista exportada con éxito');
        } catch (error) {
            console.error('Error exporting stations:', error);
            showToast('Error al exportar las emisoras', 'error');
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
                    importStations(imported);
                    showToast('Importación completada');
                } else {
                    showToast('Formato de archivo no válido', 'error');
                }
            } catch (err) {
                console.error('Error importing stations', err);
                showToast('Error al importar emisoras', 'error');
            }
        };
        reader.readAsText(file);
        // Reset input value to allow importing the same file again
        e.target.value = '';
    };

    const handleClearStorage = () => {
        localStorage.clear();
        window.location.reload();
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md sm:p-4 sm:pt-4 animate-in fade-in duration-300">
            <div className="bg-[var(--dark-surface)] w-full h-[90vh] sm:h-auto sm:max-h-[85vh] sm:max-w-4xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-white/5">
                <div className="p-1 border-b border-white/5 flex justify-between items-center bg-white/5 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <div className="p-1 bg-[var(--primary-color)]/20 text-[var(--primary-color)]">
                                <Save size={18} />
                            </div>
                            Gestionar Emisoras
                        </h2>
                        <button
                            onClick={() => setShowHelp(!showHelp)}
                            className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold transition-all ${showHelp ? 'bg-[var(--primary-color)] text-white' : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'}`}
                            title="Ver ayuda"
                        >
                            <HelpCircle size={16} />
                            <span>{showHelp ? 'Ocultar' : 'Ayuda'}</span>
                        </button>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Main Content Area - Split View */}
                <div className="flex flex-col flex-1 min-h-0">

                    {/* FIXED Top Section: Form */}
                    <div className="bg-black/20 border-b border-white/5 p-2 z-10 shadow-lg flex-shrink-0">
                        {/* Educational Help Section */}
                        {showHelp && (
                            <div className="mb-4 bg-blue-500/10 border border-blue-500/20 p-3 flex gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="bg-blue-500/20 p-2 h-fit text-blue-400">
                                    <AlertTriangle size={18} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-blue-300 text-xs">Ayuda Rápida</h4>
                                    <div className="text-[14px] text-blue-100/70 space-y-1 leading-relaxed">
                                        <p>• <strong>Iframes:</strong> Copia solo el contenido de <code>src="..."</code>.</p>
                                        <p>• <strong>Flexibilidad:</strong> Úsa URL Stream o Iframe según necesites.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form id="station-form" onSubmit={handleSubmit} className="bg-white/5 p-2 border border-white/5 relative overflow-hidden transition-all duration-300">
                            {/* Decorative background accent */}
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--primary-color)] to-[var(--secondary-color)]"></div>

                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-bold flex items-center gap-2">
                                    {editingId ? <Edit2 size={16} className="text-[var(--secondary-color)]" /> : <Plus size={16} className="text-[var(--primary-color)]" />}
                                    {editingId ? 'Editar' : 'Agregar'}
                                </h3>

                                <div className="flex p-0.4 bg-black/40 border border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'audio' })}
                                        className={`flex items-center justify-center gap-1.5 px-2 py-0.5 transition-all font-bold text-[10px] uppercase tracking-wider ${formData.type === 'audio' ? 'bg-[var(--primary-color)] text-white shadow-sm' : 'hover:bg-white/5 text-[var(--text-secondary)]'}`}
                                    >
                                        <Music size={10} /> Audio
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'video' })}
                                        className={`flex items-center justify-center gap-1.5 px-2 py-0.5 transition-all font-bold text-[10px] uppercase tracking-wider ${formData.type === 'video' ? 'bg-[var(--secondary-color)] text-white shadow-sm' : 'hover:bg-white/5 text-[var(--text-secondary)]'}`}
                                    >
                                        <Monitor size={14} /> TV
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-1">
                                <div className="col-span-12 md:col-span-8 space-y-0.5">
                                    <input
                                        type="text"
                                        placeholder="Nombre de la emisora"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 py-1.5 px-2.5 focus:border-[var(--primary-color)] focus:bg-black/30 outline-none transition-all placeholder:text-white/20 text-xs font-medium"
                                    />
                                </div>
                                <div className="col-span-12 md:col-span-4 space-y-0.5">
                                    <input
                                        type="text"
                                        placeholder="País"
                                        value={formData.country}
                                        onChange={e => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 py-1.5 px-2.5 focus:border-[var(--primary-color)] focus:bg-black/30 outline-none transition-all placeholder:text-white/20 text-xs"
                                    />
                                </div>

                                <div className="col-span-12 md:col-span-8 space-y-0.5">
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            placeholder="URL Stream, ej. https://rt-esp.rttv.com/dvr/rtesp/playlist.m3u8"
                                            value={formData.url}
                                            onChange={e => setFormData({ ...formData, url: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 py-1.5 pl-2.5 pr-6 focus:border-[var(--primary-color)] focus:bg-black/30 outline-none transition-all placeholder:text-white/20 font-mono text-[11px]"
                                        />
                                        {formData.url && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                                        )}
                                    </div>
                                </div>
                                <div className="col-span-12 md:col-span-4 space-y-0.5">
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 py-1.5 px-2.5 focus:border-[var(--primary-color)] focus:bg-black/30 outline-none transition-all text-xs text-white appearance-none cursor-pointer"
                                    >
                                        <option value="Todas" className="bg-[var(--dark-surface)]">Seleccionar Categoría</option>
                                        {(formData.type === 'video' ? tvCategories : radioCategories).map(cat => (
                                            <option key={cat} value={cat} className="bg-[var(--dark-surface)]">{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-12 md:col-span-6 space-y-0.5">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Logo URL (Opcional)"
                                            value={formData.logo}
                                            onChange={e => setFormData({ ...formData, logo: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 py-1.5 px-2.5 focus:border-[var(--primary-color)] focus:bg-black/30 outline-none transition-all placeholder:text-white/20 font-mono text-[11px]"
                                        />
                                        <div className="w-8 h-8 flex-shrink-0 border border-white/10 bg-black/30 rounded-full overflow-hidden flex items-center justify-center">
                                            {formData.logo ? (
                                                <img src={formData.logo} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                            ) : (
                                                <div className="text-[10px] text-white/20">IMG</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-12 md:col-span-4 space-y-0.5">
                                    <input
                                        type="text"
                                        placeholder="Iframe / Canal (ej. natgeo o URL completa)"
                                        value={formData.iframeUrl || formData.embedCanal}
                                        onChange={e => setFormData({ ...formData, iframeUrl: e.target.value, embedCanal: '' })}
                                        className="w-full bg-black/20 border border-white/10 py-1.5 px-2.5 focus:border-[var(--primary-color)] focus:bg-black/30 outline-none transition-all placeholder:text-white/20 font-mono text-[11px]"
                                        title="Pega el nombre de canal (natgeo), la URL completa o el código iframe"
                                    />
                                </div>

                                <div className="col-span-12 pt-1 flex items-center justify-between gap-4 border-t border-white/5 mt-1">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-7 h-3.5 rounded-full p-0.5 transition-colors ${formData.useProxy ? 'bg-[var(--primary-color)]' : 'bg-white/10 group-hover:bg-white/20'}`}>
                                            <div className={`w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-transform ${formData.useProxy ? 'translate-x-[14px]' : 'translate-x-0'}`}></div>
                                        </div>
                                        <span className="text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-white transition-colors">Proxy</span>
                                        <input
                                            type="checkbox"
                                            checked={formData.useProxy}
                                            onChange={e => setFormData({ ...formData, useProxy: e.target.checked })}
                                            className="hidden"
                                        />
                                    </label>

                                    <div className="flex gap-2">
                                        {editingId && (
                                            <button
                                                type="button"
                                                onClick={handleCancel}
                                                className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white font-bold transition-all text-[11px]"
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={!formData.name || (!formData.url && !formData.iframeUrl && !formData.embedCanal)}
                                            className={`px-4 py-1 font-bold transition-all flex items-center gap-1.5 text-[10px] uppercase tracking-wide shadow-lg ${(!formData.name || (!formData.url && !formData.iframeUrl && !formData.embedCanal))
                                                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                                : 'bg-[var(--primary-color)] text-white hover:brightness-110 active:scale-95'
                                                }`}
                                        >
                                            <CheckCircle size={11} />
                                            {editingId ? 'Guardar' : 'Agregar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* SCROLLABLE Bottom Section: List */}
                    <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2">
                        <div className="flex justify-between items-center px-1 mb-2">
                            <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                Lista ({stations.length})
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-1.5">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={stations.map((s: Station) => s.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {stations.map((station: Station) => (
                                        <SortableStationItem
                                            key={station.id}
                                            station={station}
                                            onEdit={handleEdit}
                                            onDelete={(id) => setConfirmDelete(id)}
                                            confirmDelete={confirmDelete}
                                            setConfirmDelete={setConfirmDelete}
                                            showToast={showToast}
                                            removeStation={removeStation}
                                            isCurrent={currentStation?.id === station.id}
                                            isEditing={editingId === station.id}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>
                    </div>
                </div>

                <div className="p-2 border-t border-white/5 bg-white/5 flex flex-wrap gap-4 justify-between items-center flex-shrink-0">
                    <div className="flex gap-4 items-center flex-wrap">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-white transition-colors"
                        >
                            <Download size={14} /> Exportar
                        </button>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer">
                            <Upload size={14} /> Importar
                            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                        </label>

                        <div className="relative">
                            {confirmReset ? (
                                <div className="flex items-center gap-2 animate-in zoom-in-95 bg-white/5 p-1 border border-white/10">
                                    <button onClick={handleClearStorage} className="text-[10px] bg-red-500 text-white px-3 py-1 font-bold hover:bg-red-600 transition-all">Sí, restablecer</button>
                                    <button onClick={() => setConfirmReset(false)} className="text-[10px] bg-white/10 text-white px-3 py-1 font-bold hover:bg-white/20 transition-all">Cancelar</button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setConfirmReset(true)}
                                    className="flex items-center gap-1.5 text-xs font-medium text-red-500/60 hover:text-red-600 transition-colors"
                                >
                                    <AlertTriangle size={18} /> Reset
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="px-3 py-1.4 p-0.5 bg-white/10 hover:bg-white/20 text-white font-bold transition-all text-sm"
                    >
                        Cerrar
                    </button>
                </div>
            </div>

            {/* Custom Toast Notification */}
            {toast && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-4 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 z-[1000] border border-white/10 backdrop-blur-xl ${toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-green-500/90 text-white'}`}>
                    {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                    <span className="font-bold">{toast.message}</span>
                </div>
            )}
        </div>
    );
};
