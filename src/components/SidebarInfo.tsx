import React, { useState, useEffect } from 'react';
import { Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useChat } from '../context/ChatContext';

export const SidebarInfo: React.FC = () => {
    const [time, setTime] = useState(new Date());
    const [greeting, setGreeting] = useState('');
    const { onlineListeners } = useChat();

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const hour = time.getHours();
        if (hour < 12) setGreeting('Buenos días ☕‍');
        else if (hour < 18) setGreeting('Buenas tardes 😎');
        else setGreeting('Buenas noches 🌜');
    }, [time]);

    return (
        <div className="flex flex-col gap-2 p-2 bg-white/5 rounded-none border border-white/10 mb-4">
            <div className="flex items-center justify-between px-1">
                <span className="text-[12px] font-medium text-green-400">{greeting}</span>
                <div className="flex items-center gap-1.5 font-mono text-[var(--text-secondary)] text-[16px]">
                    <Clock size={16} />
                    <span>{format(time, 'hh:mm a')}</span>
                </div>
            </div>
            <div className="flex items-center justify-between bg-black/30 p-1.5 rounded-none">
                <div className="flex items-center gap-1.5 text-[10px]">
                    <Users size={18} className="text-green-400" />
                    <span className="text-[var(--text-secondary)] uppercase font-bold tracking-wider">En Línea</span>
                </div>
                <span className="text-green-400 font-bold px-1.5 py-0.5 rounded-none bg-green-400/10 text-[10px]">
                    {onlineListeners}
                </span>
            </div>
        </div>
    );
};
