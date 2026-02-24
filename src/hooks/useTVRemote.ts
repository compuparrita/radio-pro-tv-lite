import { useEffect } from 'react';
import { useRadio } from '../context/RadioContext';

/**
 * Hook for Smart TV remote control navigation
 * - Left/Right arrows: Change station
 * - Up/Down arrows: Scroll page
 */
export const useTVRemote = () => {
    const { nextStation, prevStation, togglePlay } = useRadio();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Do not intercept keyboard events if the user is typing in a form field
            const activeElement = document.activeElement;
            const isInputField =
                activeElement instanceof HTMLInputElement ||
                activeElement instanceof HTMLTextAreaElement ||
                activeElement instanceof HTMLSelectElement;

            if (isInputField) return;

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

                case 'Enter':
                case 'Return':
                case ' ':
                case 'MediaPlayPause':
                case 'Play':
                case 'Pause':
                    e.preventDefault();
                    togglePlay();
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
    }, [nextStation, prevStation, togglePlay]);
};
