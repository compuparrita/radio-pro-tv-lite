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
    const [isConfirmingProfileDeletion, setIsConfirmingProfileDeletion] = useState(false);

    const handlePanelClose = () => {
        setIsConfirmingProfileDeletion(false);
        onClose();
    };

    const handleClearProfile = () => {
        clearProfile();
        handlePanelClose();
    };

    return (
        <PanelShellComponent
            ariaLabel="Perfil local"
            closeButtonLabel="Cerrar perfil"
            closeIcon={<X aria-hidden="true" size={18} />}
            isOpen={isOpen}
            onClose={handlePanelClose}
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
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]"><span className="reading-text">Nombre</span></dt>
                            <dd className="reading-text-profile-value mt-0.5 text-sm font-semibold">{profile.name}</dd>
                        </div>
                        {profile.phone && (
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]"><span className="reading-text">Teléfono</span></dt>
                                <dd className="reading-text-profile-value mt-0.5 text-sm">{profile.phone}</dd>
                            </div>
                        )}
                    </dl>
                    {isConfirmingProfileDeletion ? (
                        <section aria-describedby="profile-delete-description" aria-labelledby="profile-delete-title" className="mt-4 rounded-lg border border-[var(--danger-color)]/25 bg-[var(--glass-bg)] p-4">
                            <h3 className="reading-text-profile-confirmation text-sm font-semibold text-[var(--text-primary)]" id="profile-delete-title">¿Eliminar tu perfil?</h3>
                            <p className="reading-text-profile-confirmation mt-1 text-sm text-[var(--text-secondary)]" id="profile-delete-description">Esta acción no se puede deshacer.</p>
                            <div className="mt-4 flex gap-2">
                                <button
                                    className="btn btn-secondary min-w-0 flex-1"
                                    onClick={() => setIsConfirmingProfileDeletion(false)}
                                    type="button"
                                >
                                    <span className="reading-text">Cancelar</span>
                                </button>
                                <button
                                    className="btn btn-danger min-w-0 flex-1"
                                    onClick={handleClearProfile}
                                    type="button"
                                >
                                    <span className="reading-text">Eliminar perfil</span>
                                </button>
                            </div>
                        </section>
                    ) : (
                        <div className="mt-4 flex flex-col gap-2">
                            <button
                                className="btn btn-primary"
                                onClick={() => setProfileFormMode('edit')}
                                type="button"
                            >
                                <Pencil size={15} /> <span className="reading-text">Editar perfil</span>
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => setIsConfirmingProfileDeletion(true)}
                                type="button"
                            >
                                <Trash2 size={15} /> <span className="reading-text">Borrar datos del dispositivo</span>
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div>
                    <p className="reading-text-profile-message text-sm text-[var(--text-secondary)]">No hay un perfil guardado en este dispositivo.</p>
                    <button
                        className="btn btn-primary btn-block mt-4"
                        onClick={() => setProfileFormMode('setup')}
                        type="button"
                    >
                        <span className="reading-text">Crear perfil</span>
                    </button>
                </div>
            )}
        </PanelShellComponent>
    );
}
