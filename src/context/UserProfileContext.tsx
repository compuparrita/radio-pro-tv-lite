import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

const PROFILE_STORAGE_KEY = 'radiofm_user_profile';
const LEGACY_CHAT_IDENTITY_KEY = 'chatIdentity';

export interface UserProfile {
    name: string;
    phone?: string;
    rememberDevice: boolean;
}

export type UserProfileInput = Omit<UserProfile, 'phone'> & { phone?: string };

interface UserProfileContextValue {
    profile: UserProfile | null;
    hasProfile: boolean;
    saveProfile: (profile: UserProfileInput) => void;
    updateProfile: (updates: Partial<UserProfile>) => void;
    clearProfile: () => void;
}

const UserProfileContext = createContext<UserProfileContextValue | undefined>(undefined);

function normalizeProfile(value: unknown): UserProfile | null {
    if (!value || typeof value !== 'object') return null;
    const candidate = value as Partial<UserProfile>;
    if (typeof candidate.name !== 'string') return null;

    const name = candidate.name.trim();
    if (name.length < 2 || name.length > 50) return null;

    const phone = typeof candidate.phone === 'string' ? candidate.phone.trim() : '';
    return {
        name,
        ...(phone ? { phone } : {}),
        rememberDevice: candidate.rememberDevice !== false,
    };
}

function notifyLegacyIdentityConsumers(profile: UserProfile | null, persist: boolean) {
    if (profile) {
        const identity = JSON.stringify({ name: profile.name, phone: profile.phone });
        localStorage.setItem(LEGACY_CHAT_IDENTITY_KEY, identity);
    } else {
        localStorage.removeItem(LEGACY_CHAT_IDENTITY_KEY);
    }

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('user-identity-changed', { detail: profile }));
    }

    if (profile && !persist) localStorage.removeItem(LEGACY_CHAT_IDENTITY_KEY);
}

function loadInitialProfile(): UserProfile | null {
    if (typeof window === 'undefined') return null;

    try {
        const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (savedProfile) {
            const parsedProfile = normalizeProfile(JSON.parse(savedProfile));
            if (parsedProfile) {
                if (parsedProfile.rememberDevice) {
                    localStorage.setItem(LEGACY_CHAT_IDENTITY_KEY, JSON.stringify({
                        name: parsedProfile.name,
                        phone: parsedProfile.phone,
                    }));
                }
                return parsedProfile;
            }
        }

        const legacyIdentity = localStorage.getItem(LEGACY_CHAT_IDENTITY_KEY);
        if (!legacyIdentity) return null;

        const migratedProfile = normalizeProfile({
            ...JSON.parse(legacyIdentity),
            rememberDevice: true,
        });
        if (!migratedProfile) return null;

        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(migratedProfile));
        return migratedProfile;
    } catch {
        return null;
    }
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
    const [profile, setProfile] = useState<UserProfile | null>(loadInitialProfile);

    const saveProfile = useCallback((input: UserProfileInput) => {
        const normalizedProfile = normalizeProfile(input);
        if (!normalizedProfile) throw new Error('El nombre debe tener entre 2 y 50 caracteres.');

        if (normalizedProfile.rememberDevice) {
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalizedProfile));
            notifyLegacyIdentityConsumers(normalizedProfile, true);
        } else {
            localStorage.removeItem(PROFILE_STORAGE_KEY);
            notifyLegacyIdentityConsumers(normalizedProfile, false);
        }
        setProfile(normalizedProfile);
    }, []);

    const updateProfile = useCallback((updates: Partial<UserProfile>) => {
        if (!profile) return;
        const nextProfile = normalizeProfile({ ...profile, ...updates });
        if (!nextProfile) return;

        if (nextProfile.rememberDevice) {
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
            notifyLegacyIdentityConsumers(nextProfile, true);
        } else {
            localStorage.removeItem(PROFILE_STORAGE_KEY);
            notifyLegacyIdentityConsumers(nextProfile, false);
        }
        setProfile(nextProfile);
    }, [profile]);

    const clearProfile = useCallback(() => {
        localStorage.removeItem(PROFILE_STORAGE_KEY);
        notifyLegacyIdentityConsumers(null, false);
        setProfile(null);
    }, []);

    const value = useMemo(() => ({
        profile,
        hasProfile: Boolean(profile),
        saveProfile,
        updateProfile,
        clearProfile,
    }), [profile, saveProfile, updateProfile, clearProfile]);

    return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile(): UserProfileContextValue {
    const context = useContext(UserProfileContext);
    if (!context) throw new Error('useUserProfile debe usarse dentro de UserProfileProvider');
    return context;
}
