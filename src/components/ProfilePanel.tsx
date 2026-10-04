import { useState } from 'react';
import type { ComponentType } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';
import { UserProfileForm } from './UserProfileForm';
import type { PanelShellProps } from './panels/PanelShell';

export interface ProfilePanelProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ProfilePanelHostProps extends ProfilePanelProps {
    PanelShellComponent: ComponentType<PanelShellProps>;
}

export default function ProfilePanel({ isOpen, onClose, PanelShellComponent }: ProfilePanelHostProps) {
    const { profile, clearProfile } = useUserProfile();
    const [profileFormMode, setProfileFormMode] = useState<'setup' | 'edit' | null>(null);

    const handleClearProfile = () => {
        if (!window.confirm('¿Borrar el perfil guardado en este dispositivo? No se borrarán tus favoritos ni tu historial.')) return;
        clearProfile();
        onClose();
    };

    return (
        <PanelShellComponent
            ariaLabel="Perfil local"
            closeButtonLabel="Cerrar perfil"
            closeIcon={<X aria-hidden="true" size={18} />}
            isOpen={isOpen}
            lockBodyScroll
            onClose={onClose}
            title="Perfil local"
        >
            {profileFormMode ? (
                <UserProfileForm
                    mode={profileFormMode}
                    variant="modal"
                    onCancel={() => setProfileFormMode(null)}
                    onSaved={onClose}
                />
            ) : profile ? (
                <>
                    <dl className="space-y-3 rounded-lg border border-white/5 bg-black/10 p-4">
                        <div>
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Nombre</dt>
                            <dd className="mt-0.5 text-sm font-semibold">{profile.name}</dd>
                        </div>
                        {profile.phone && (
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Teléfono</dt>
                                <dd className="mt-0.5 text-sm">{profile.phone}</dd>
                            </div>
                        )}
                    </dl>
                    <div className="mt-4 flex flex-col gap-2">
                        <button
                            className="flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
                            onClick={() => setProfileFormMode('edit')}
                            type="button"
                        >
                            <Pencil size={15} /> Editar perfil
                        </button>
                        <button
                            className="flex items-center justify-center gap-2 rounded-lg border border-red-400/20 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-400/10"
                            onClick={handleClearProfile}
                            type="button"
                        >
                            <Trash2 size={15} /> Borrar datos del dispositivo
                        </button>
                    </div>
                </>
            ) : (
                <div>
                    <p className="text-sm text-[var(--text-secondary)]">No hay un perfil guardado en este dispositivo.</p>
                    <button
                        className="mt-4 w-full rounded-lg bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
                        onClick={() => setProfileFormMode('setup')}
                        type="button"
                    >
                        Crear perfil
                    </button>
                </div>
            )}
        </PanelShellComponent>
    );
}
