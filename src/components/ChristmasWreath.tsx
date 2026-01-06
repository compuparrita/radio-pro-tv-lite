import React from 'react';

export const ChristmasWreath: React.FC = () => {
    return (
        <div className="fixed top-0 left-0 z-[9999] pointer-events-none p-1 md:p-4 animate-wreath-float">
            <svg
                viewBox="0 0 200 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-9 h-9 md:w-24 md:h-24 drop-shadow-2xl"
            >
                {/* Wreath circle (Green) */}
                <circle cx="100" cy="100" r="70" stroke="#146B4A" strokeWidth="30" strokeDasharray="10 5" />
                <circle cx="100" cy="100" r="70" stroke="#064E3B" strokeWidth="15" strokeDasharray="5 10" />

                {/* Bow (Red) */}
                <path d="M100 30 L80 10 Q100 0 120 10 Z" fill="#EF4444" />
                <path d="M100 30 L120 50 Q100 60 80 50 Z" fill="#EF4444" />
                <circle cx="100" cy="30" r="10" fill="#B91C1C" />

                {/* Lights */}
                <circle className="christmas-light light-1" cx="60" cy="60" r="8" fill="#FACC15" color="#FACC15" />
                <circle className="christmas-light light-2" cx="140" cy="60" r="8" fill="#EF4444" color="#EF4444" />
                <circle className="christmas-light light-3" cx="150" cy="120" r="8" fill="#3B82F6" color="#3B82F6" />
                <circle className="christmas-light light-4" cx="100" cy="160" r="8" fill="#FACC15" color="#FACC15" />
                <circle className="christmas-light light-5" cx="50" cy="120" r="8" fill="#EF4444" color="#EF4444" />
            </svg>
        </div>
    );
};
