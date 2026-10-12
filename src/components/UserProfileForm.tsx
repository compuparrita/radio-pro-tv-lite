import { useState, type FormEvent } from 'react';
import { Radio, User } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';

const profileInputClassName = 'h-12 w-full cursor-text border border-[var(--dark-border)] bg-[var(--dark-bg)] px-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] focus-visible:border-[var(--focus-ring)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dark-surface)] disabled:cursor-not-allowed disabled:opacity-60';
const phoneErrorMessage = 'Ingresa un número válido de 8 dígitos para Costa Rica.';

function parseCostaRicaPhone(value: string) {
    const match = value.trim().match(/^(?:\+506[ ]*)?(\d{4})[ ]?(\d{4})$/);
    if (!match) return null;

    return {
        countryCode: '+506',
        nationalNumber: `${match[1]}${match[2]}`,
    };
}

interface UserProfileFormProps {
    mode?: 'setup' | 'edit';
    variant?: 'page' | 'modal';
    onSaved?: () => void;
    onCancel?: () => void;
}

export function UserProfileForm({ mode = 'setup', variant = 'page', onSaved, onCancel }: UserProfileFormProps) {
    const { profile, saveProfile, updateProfile } = useUserProfile();
    const [name, setName] = useState(profile?.name ?? '');
    const [phone, setPhone] = useState(profile?.phone ?? '');
    const originalPhone = profile?.phone ?? '';
    const [rememberDevice, setRememberDevice] = useState(profile?.rememberDevice ?? true);
    const [error, setError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const isEditing = mode === 'edit';
    const isCompact = variant === 'modal';

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedName = name.trim();
        const trimmedPhone = phone.trim();
        const parsedPhone = parseCostaRicaPhone(trimmedPhone);
        const isUnchangedLegacyPhone = isEditing && trimmedPhone === originalPhone.trim();
        const isPhoneInvalid = Boolean(trimmedPhone) && !parsedPhone && !isUnchangedLegacyPhone;
        setPhoneError(isPhoneInvalid ? phoneErrorMessage : '');

        if (trimmedName.length < 2 || trimmedName.length > 50) {
            setError('El nombre debe tener entre 2 y 50 caracteres.');
            return;
        }
        if (isPhoneInvalid) return;

        const phoneToSave = !trimmedPhone
            ? undefined
            : parsedPhone
                ? `${parsedPhone.countryCode} ${parsedPhone.nationalNumber.slice(0, 4)} ${parsedPhone.nationalNumber.slice(4)}`
                : trimmedPhone;

        try {
            if (isEditing) {
                updateProfile({ name: trimmedName, phone: phoneToSave });
            } else {
                saveProfile({
                    name: trimmedName,
                    phone: phoneToSave,
                    rememberDevice,
                });
            }
            onSaved?.();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el perfil.');
        }
    };

    return (
        <main className={isCompact
            ? 'pointer-events-auto w-full touch-manipulation text-[var(--text-primary)]'
            : 'relative isolate flex min-h-screen min-h-[100svh] items-center justify-center touch-manipulation bg-[var(--dark-bg)] px-4 py-8 text-[var(--text-primary)] sm:px-6 sm:py-12'}>
            {!isCompact && (
                <>
                    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 z-0 h-72 w-72 -translate-x-1/2 bg-[var(--primary-color)]/10 blur-3xl sm:h-96 sm:w-96" />
                    <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 z-0 h-64 w-64 bg-[var(--accent-color)]/10 blur-3xl" />
                </>
            )}
            <form
                className={isCompact
                    ? 'pointer-events-auto relative z-10 w-full touch-manipulation border border-[var(--dark-border)] bg-[var(--dark-surface)] p-4 sm:p-5'
                    : 'pointer-events-auto relative z-10 w-full max-w-lg touch-manipulation border border-[var(--dark-border)] bg-[var(--dark-surface)] p-6 shadow-[var(--shadow-xl)] sm:p-9'}
                onSubmit={handleSubmit}
            >
                {!isCompact && (
                    <div className="mb-7 flex h-12 w-12 items-center justify-center border border-[var(--dark-border)] bg-[var(--glass-bg)] text-[var(--primary-color)]">
                        <Radio aria-hidden="true" size={22} />
                    </div>
                )}
                <h1 className={isCompact ? 'text-lg font-semibold tracking-tight text-[var(--text-primary)]' : 'text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl'}>
                    <span className="reading-text">{isEditing ? 'Editar perfil' : 'Centro Multimedia'}</span>
                </h1>
                {!isEditing && (
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        <span className="reading-text">Bienvenido. Tu perfil se utiliza para conversar, compartir salas y conservar tu actividad en este dispositivo.</span>
                    </p>
                )}

                <div className={`${isCompact ? 'mt-4 space-y-4' : 'mt-7 space-y-5'}`}>
                    <label className="block space-y-2 text-sm font-medium text-[var(--text-primary)]">
                        <span className="reading-text">Nombre</span> <span className="text-[var(--primary-color)]">*</span>
                        <span className="relative block">
                            <User aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={17} />
                            <input
                                autoComplete="name"
                                autoFocus
                                className={profileInputClassName + ' pl-11 pr-4'}
                                maxLength={50}
                                minLength={2}
                                onChange={(event) => { setName(event.target.value); setError(''); }}
                                placeholder="Tu nombre"
                                required
                                value={name}
                            />
                        </span>
                    </label>

                    <label className="block space-y-2 text-sm font-medium text-[var(--text-primary)]">
                        <span className="reading-text">Teléfono</span> <span className="reading-text font-normal text-[var(--text-secondary)]">(opcional)</span>
                        <input
                            aria-describedby={phoneError ? 'profile-phone-error' : 'profile-phone-hint'}
                            aria-invalid={Boolean(phoneError)}
                            autoComplete="tel"
                            className={profileInputClassName + (phoneError ? ' !border-[var(--danger-color)] focus-visible:!border-[var(--danger-color)] focus-visible:!ring-[var(--danger-color)]' : '')}
                            maxLength={30}
                            onChange={(event) => {
                                const nextPhone = event.target.value;
                                setPhone(nextPhone);
                                const isUnchangedLegacyPhone = isEditing && nextPhone.trim() === originalPhone.trim();
                                setPhoneError(nextPhone.trim() && !parseCostaRicaPhone(nextPhone) && !isUnchangedLegacyPhone ? phoneErrorMessage : '');
                            }}
                            placeholder="+506 8888 8888"
                            type="tel"
                            value={phone}
                        />
                        {phoneError ? (
                            <span className="block text-xs font-normal text-[var(--danger-color)]" id="profile-phone-error" role="alert"><span className="reading-text">{phoneError}</span></span>
                        ) : (
                            <span className="block text-xs font-normal text-[var(--text-secondary)]" id="profile-phone-hint"><span className="reading-text">Costa Rica: +506 y 8 dígitos</span></span>
                        )}
                    </label>

                    {!isEditing && (
                        <label className="flex cursor-pointer items-center gap-3 text-sm text-[var(--text-secondary)]">
                            <input
                                checked={rememberDevice}
                                className="h-4 w-4 accent-[var(--primary-color)]"
                                onChange={(event) => setRememberDevice(event.target.checked)}
                                type="checkbox"
                            />
                            <span className="reading-text">Recordar este dispositivo</span>
                        </label>
                    )}
                </div>

                {error && <p className="mt-4 border-l-2 border-[var(--danger-color)] pl-3 text-sm text-[var(--danger-color)]" role="alert"><span className="reading-text">{error}</span></p>}

                <div className={`${isCompact ? 'mt-5' : 'mt-7'} flex gap-2`}>
                    {isCompact && onCancel && (
                        <button
                            className="btn btn-secondary flex-1"
                            onClick={onCancel}
                            type="button"
                        >
                            Cancelar
                        </button>
                    )}
                    <button
                        className="btn btn-primary flex-1"
                        type="submit"
                    >
                        {isEditing ? 'Guardar cambios' : 'Continuar'}
                    </button>
                </div>

                {!isEditing && !isCompact && (
                    <p className="mt-5 text-center text-xs leading-5 text-[var(--text-secondary)]">
                        <span className="reading-text">El teléfono se utiliza únicamente como identificador para historial y favoritos.</span>
                    </p>
                )}
            </form>
        </main>
    );
}
