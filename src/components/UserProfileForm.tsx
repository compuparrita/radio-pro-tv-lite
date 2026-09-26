import { useState, type FormEvent } from 'react';
import { Radio, User } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';

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
    const [rememberDevice, setRememberDevice] = useState(profile?.rememberDevice ?? true);
    const [error, setError] = useState('');
    const isEditing = mode === 'edit';
    const isCompact = variant === 'modal';

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedName = name.trim();
        if (trimmedName.length < 2 || trimmedName.length > 50) {
            setError('El nombre debe tener entre 2 y 50 caracteres.');
            return;
        }

        try {
            if (isEditing) {
                updateProfile({ name: trimmedName, phone: phone.trim() || undefined });
            } else {
                saveProfile({
                    name: trimmedName,
                    phone: phone.trim() || undefined,
                    rememberDevice,
                });
            }
            onSaved?.();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el perfil.');
        }
    };

    return (
        <main className={isCompact ? 'pointer-events-auto w-full touch-manipulation text-white' : 'pointer-events-auto relative flex min-h-screen touch-manipulation items-center justify-center overflow-hidden bg-[#090b10] px-5 py-10 text-white'}>
            {!isCompact && <div aria-hidden="true" className="pointer-events-none absolute -top-36 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-400/[0.08] blur-3xl" />}
            <form
                className={isCompact
                    ? 'pointer-events-auto relative w-full touch-manipulation rounded-lg border border-white/[0.08] bg-white/[0.025] p-4'
                    : 'pointer-events-auto relative w-full max-w-md touch-manipulation rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-7 shadow-[0_24px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-9'}
                onSubmit={handleSubmit}
            >
                {!isCompact && (
                    <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.07] text-cyan-100">
                        <Radio aria-hidden="true" size={22} />
                    </div>
                )}
                <h1 className={isCompact ? 'text-lg font-semibold tracking-tight' : 'text-2xl font-semibold tracking-tight'}>
                    {isEditing ? 'Editar perfil' : 'Centro Multimedia'}
                </h1>
                {!isEditing && (
                    <p className="mt-2 text-sm leading-6 text-white/50">
                        Bienvenido. Tu perfil se utiliza para conversar, compartir salas y conservar tu actividad en este dispositivo.
                    </p>
                )}

                <div className={`${isCompact ? 'mt-4 space-y-4' : 'mt-7 space-y-5'}`}>
                    <label className="block space-y-2 text-sm font-medium text-white/75">
                        Nombre <span className="text-cyan-200">*</span>
                        <span className="relative block">
                            <User aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={17} />
                            <input
                                autoComplete="name"
                                autoFocus
                                className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-200/50 focus:ring-2 focus:ring-cyan-200/10"
                                maxLength={50}
                                minLength={2}
                                onChange={(event) => { setName(event.target.value); setError(''); }}
                                placeholder="Tu nombre"
                                required
                                value={name}
                            />
                        </span>
                    </label>

                    <label className="block space-y-2 text-sm font-medium text-white/75">
                        Teléfono <span className="font-normal text-white/35">(opcional)</span>
                        <input
                            autoComplete="tel"
                            className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-200/50 focus:ring-2 focus:ring-cyan-200/10"
                            maxLength={30}
                            onChange={(event) => setPhone(event.target.value)}
                            placeholder="Tu teléfono"
                            type="tel"
                            value={phone}
                        />
                    </label>

                    {!isEditing && (
                        <label className="flex cursor-pointer items-center gap-3 text-sm text-white/65">
                            <input
                                checked={rememberDevice}
                                className="h-4 w-4 accent-cyan-300"
                                onChange={(event) => setRememberDevice(event.target.checked)}
                                type="checkbox"
                            />
                            Recordar este dispositivo
                        </label>
                    )}
                </div>

                {error && <p className="mt-4 text-sm text-red-300" role="alert">{error}</p>}

                <div className={`${isCompact ? 'mt-5' : 'mt-7'} flex gap-2`}>
                    {isCompact && onCancel && (
                        <button
                            className="h-11 flex-1 rounded-lg border border-white/10 text-sm font-semibold text-white/70 transition hover:bg-white/5"
                            onClick={onCancel}
                            type="button"
                        >
                            Cancelar
                        </button>
                    )}
                    <button
                        className="h-11 flex-1 rounded-lg bg-cyan-300 text-sm font-semibold text-[#111318] transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200/70"
                        type="submit"
                    >
                        {isEditing ? 'Guardar cambios' : 'Continuar'}
                    </button>
                </div>

                {!isEditing && !isCompact && (
                    <p className="mt-5 text-center text-xs leading-5 text-white/35">
                        El teléfono se utiliza únicamente como identificador para historial y favoritos.
                    </p>
                )}
            </form>
        </main>
    );
}
