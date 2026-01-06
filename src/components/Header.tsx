import { Radio } from 'lucide-react';

export const Header: React.FC = () => {

    return (
        <header className="relative top-0 left-0 right-0 z-40 bg-[var(--dark-bg)]/80 backdrop-blur-md py-4 md:py-6 text-center border-b border-white/5 lg:border-none">
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-color)] via-[var(--secondary-color)] to-[var(--accent-color)] flex items-center justify-center gap-3">
                <Radio size={32} className="md:w-12 md:h-12 text-[var(--primary-color)]" />
                <span className="hidden sm:inline">Radio Streaming <span className="text-white">Pro</span></span>
                <span className="sm:hidden text-white">Radio Pro</span>
            </h1>
        </header>
    );
};
