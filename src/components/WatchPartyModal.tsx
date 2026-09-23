import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, PlusCircle, Users } from 'lucide-react';

interface WatchPartyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type WatchPartyTab = 'create' | 'join';

const inputClassName = 'h-12 w-full rounded-xl border border-zinc-700 bg-zinc-800/70 px-4 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/15';

function WatchPartyModal({ isOpen, onClose }: WatchPartyModalProps) {
    const [activeTab, setActiveTab] = useState<WatchPartyTab>('create');

    if (!isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <section
                aria-labelledby="watchparty-title"
                aria-modal="true"
                className="mx-4 my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 text-white shadow-2xl"
                role="dialog"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex items-start justify-between border-b border-white/10 px-5 py-6 sm:px-7">
                    <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">WATCHPARTY BETA</p>
                        <h2 id="watchparty-title" className="text-2xl font-bold tracking-tight">Cine Compartido</h2>
                        <p className="mt-2 text-sm text-white/55">{'Sincroniza pel\u00edculas, TV y YouTube con tus amigos.'}</p>
                    </div>
                    <button
                        aria-label="Cerrar"
                        className="rounded-xl p-2 text-white/55 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
                        onClick={onClose}
                        type="button"
                    >
                        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </header>

                <div className="px-5 pt-6 sm:px-7">
                    <div aria-label="Opciones de WatchParty" className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-800/70 p-1" role="tablist">
                        <button
                            aria-selected={activeTab === 'create'}
                            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold transition ${activeTab === 'create' ? 'bg-zinc-700 text-white shadow-sm' : 'bg-transparent text-zinc-400 hover:text-zinc-200'}`}
                            onClick={() => setActiveTab('create')}
                            role="tab"
                            type="button"
                        >
                            <PlusCircle aria-hidden="true" size={17} />
                            Crear Sala
                        </button>
                        <button
                            aria-selected={activeTab === 'join'}
                            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold transition ${activeTab === 'join' ? 'bg-zinc-700 text-white shadow-sm' : 'bg-transparent text-zinc-400 hover:text-zinc-200'}`}
                            onClick={() => setActiveTab('join')}
                            role="tab"
                            type="button"
                        >
                            <Users aria-hidden="true" size={17} />
                            Unirse
                        </button>
                    </div>
                </div>

                <form
                    className="space-y-5 px-5 py-6 sm:px-7 sm:py-7"
                    onSubmit={(event) => {
                        event.preventDefault();
                        console.log(activeTab === 'create' ? 'Crear Sala' : 'Unirse');
                    }}
                >
                    <label className="block space-y-2 text-sm font-medium text-white/75">
                        Alias del usuario
                        <input autoComplete="nickname" className={inputClassName} placeholder="Tu nombre" required />
                    </label>

                    {activeTab === 'create' ? (
                        <label className="block space-y-2 text-sm font-medium text-white/75">
                            Nombre de la sala
                            <input className={inputClassName} placeholder="Noche de cine" required />
                        </label>
                    ) : (
                        <label className="block space-y-2 text-sm font-medium text-white/75">
                            {'C\u00f3digo de sala'}
                            <input className={`${inputClassName} uppercase`} placeholder="A7K9P2" required />
                        </label>
                    )}

                    <button
                        className="min-h-12 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-950/30 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-zinc-900"
                        type="submit"
                    >
                        {activeTab === 'create' ? 'Crear Sala' : 'Unirse a la Sala'}
                    </button>
                </form>

                <footer className="px-5 pb-5 sm:px-7 sm:pb-7">
                    <div className="flex gap-3 rounded-xl bg-zinc-800 p-4 text-sm leading-relaxed text-zinc-300">
                        <Info aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-300" size={18} />
                        <p>
                            <span className="mb-0.5 block font-semibold text-white">Beta</span>
                            {'El anfitri\u00f3n controla la reproducci\u00f3n y los invitados pueden seguir la sincronizaci\u00f3n en tiempo real.'}
                        </p>
                    </div>
                </footer>
            </section>
        </div>
    );

    return createPortal(modalContent, document.body);
}

export default WatchPartyModal;
