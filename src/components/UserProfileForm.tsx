import { useState, type FormEvent } from 'react';
import { Radio, User } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';

export function UserProfileForm() {
    const { saveProfile } = useUserProfile();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [rememberDevice, setRememberDevice] = useState(true);
    const [error, setError] = useState('');

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedName = name.trim();
        if (trimmedName.length < 2 || trimmedName.length > 50) {
            setError('El nombre debe tener entre 2 y 50 caracteres.');
            return;
        }

        try {
            saveProfile({
                name: trimmedName,
                phone: phone.trim() || undefined,
                rememberDevice,
            });
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el perfil.');
        }
    };

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090b10] px-5 py-10 text-white">
            <div aria-hidden="true" className="pointer-events-none absolute -top-36 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-400/[0.08] blur-3xl" />
            <form
                className="relative w-full max-w-md rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-7 shadow-[0_24px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-9"
                onSubmit={handleSubmit}
            >
                <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.07] text-cyan-100">
                    <Radio aria-hidden="true" size={22} />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">Tu perfil</h1>
                <p className="mt-2 text-sm leading-6 text-white/50">
                    Usa el mismo perfil para conversar, compartir salas y conservar tu actividad.
                </p>

                <div className="mt-7 space-y-5">
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

                    <label className="flex cursor-pointer items-center gap-3 text-sm text-white/65">
                        <input
                            checked={rememberDevice}
                            className="h-4 w-4 accent-cyan-300"
                            onChange={(event) => setRememberDevice(event.target.checked)}
                            type="checkbox"
                        />
                        Recordar este dispositivo
                    </label>
                </div>

                {error && <p className="mt-4 text-sm text-red-300" role="alert">{error}</p>}

                <button
                    className="mt-7 h-12 w-full rounded-xl bg-white text-sm font-semibold text-[#111318] transition hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-200/70"
                    type="submit"
                >
                    Continuar
                </button>

                <p className="mt-5 text-center text-xs leading-5 text-white/35">
                    El teléfono se utiliza únicamente como identificador para historial y favoritos.
                </p>
            </form>
        </main>
    );
}
