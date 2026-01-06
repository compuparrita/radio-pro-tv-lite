import React, { useEffect, useState } from 'react';
import { Moon, Sun, Zap } from 'lucide-react';

type Theme = 'dark' | 'light' | 'youth';

export const ThemeToggle: React.FC = () => {
    const [theme, setTheme] = useState<Theme>('dark');

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as Theme;
        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            // Fallback for old 'darkMode' boolean
            const oldDarkMode = localStorage.getItem('darkMode');
            if (oldDarkMode === 'false') setTheme('light');
        }
    }, []);

    useEffect(() => {
        document.body.classList.remove('light-mode', 'youth-mode');
        if (theme === 'light') document.body.classList.add('light-mode');
        if (theme === 'youth') document.body.classList.add('youth-mode');

        localStorage.setItem('theme', theme);
    }, [theme]);

    const cycleTheme = () => {
        if (theme === 'dark') setTheme('light');
        else if (theme === 'light') setTheme('youth');
        else setTheme('dark');
    };

    return (
        <button
            onClick={cycleTheme}
            className="fixed top-4 right-4 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300"
            title="Cambiar tema"
        >
            {theme === 'dark' && <Moon size={24} />}
            {theme === 'light' && <Sun size={24} />}
            {theme === 'youth' && <Zap size={24} />}
        </button>
    );
};
