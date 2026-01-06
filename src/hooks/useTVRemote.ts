import { useEffect } from 'react';
import { useRadio } from '../context/RadioContext';

/**
 * Hook for Smart TV remote control navigation
 * - Left/Right arrows: Change station
 * - Up/Down arrows: Scroll page
 */
export const useTVRemote = () => {
    const { nextStation, prevStation } = useRadio();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    prevStation();
                    break;

                case 'ArrowRight':
                    e.preventDefault();
                    nextStation();
                    break;

                case 'ArrowUp':
                    // Allow default scroll behavior
                    break;

                case 'ArrowDown':
                    // Allow default scroll behavior
                    break;

                default:
                    break;
            }
        };

        // Add keyboard event listener
        window.addEventListener('keydown', handleKeyDown);

        // Cleanup
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [nextStation, prevStation]);
};
