import React, { useState, useEffect } from 'react';
import { Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useChat } from '../context/ChatContext';
import { getTimeOfDay } from '../utils/timeOfDay';

export const SidebarInfo: React.FC = () => {
    const [time, setTime] = useState(new Date());
    const [greeting, setGreeting] = useState('');
    const { onlineListeners, connectionStatus } = useChat();

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const timeOfDay = getTimeOfDay(time);
        if (timeOfDay === 'morning') setGreeting('Buenos días ☕‍');
        else if (timeOfDay === 'afternoon') setGreeting('Buenas tardes 😎');
        else setGreeting('Buenas noches 🌜');
    }, [time]);

    return (
        <div className="hidden lg:flex lg:flex-col lg:gap-1 lg:p-1.5 bg-[var(--dark-surface)] rounded-none border border-[var(--dark-border)] mb-1">
            <div className="flex items-center justify-between px-1">
                <span className="text-[12px] font-medium text-green-400"><span className="reading-text">{greeting}</span></span>
                <div className="flex items-center gap-1.5 font-mono text-[var(--text-secondary)] text-[16px]">
                    <Clock size={16} />
                    <span className="reading-text">{format(time, 'hh:mm a')}</span>
                </div>
            </div>
            <div className="flex items-center justify-between bg-[var(--dark-bg)] p-1.5 rounded-none">
                <div className="flex items-center gap-1.5 text-[10px]">
                    <Users size={18} className={
                        connectionStatus === 'connected'
                            ? 'text-green-400'
                            : connectionStatus === 'connecting'
                                ? 'text-amber-400 animate-pulse'
                                : 'text-red-400'
                    } />
                    <span className="text-[var(--text-secondary)] uppercase font-bold tracking-wider">
                        {connectionStatus === 'connected' ? 'En Línea' : connectionStatus === 'connecting' ? 'Reconectando...' : 'Sin Conexión'}
                    </span>
                </div>
                <span className={`font-bold px-1.5 py-0.5 rounded-none text-[11px] ${
                    connectionStatus === 'connected'
                        ? 'text-green-400 bg-green-400/10'
                        : connectionStatus === 'connecting'
                            ? 'text-amber-400 bg-amber-400/10 animate-pulse'
                            : 'text-red-400 bg-red-400/10'
                }`}>
                    {connectionStatus === 'connected' ? onlineListeners : 0}
                </span>
            </div>
        </div>
    );
};
