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
        <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-none border border-white/10 mb-4">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-400">{greeting}</span>
                <div className="flex items-center gap-2 text-8 font-mono text-[var(--text-secondary)]">
                    <Clock size={25} />
                    <span>{format(time, 'hh:mm a')}</span>
                </div>
            </div>
            <div className="flex items-center justify-between bg-black/30 p-2 rounded-none">
                <div className="flex items-center gap-2 text-8">
                    <Users size={22} className="text-green-400" />
                    <span className="text-[var(--text-secondary)]">En Línea</span>
                </div>
                <span className="text-green-400 font-bold px-2 py-0.5 rounded-none bg-green-400/10 text-8">
                    {onlineListeners}
                </span>
            </div>
        </div>
    );
};
