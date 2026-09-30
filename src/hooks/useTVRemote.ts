import { useEffect } from 'react';
import { useRadio } from '../context/RadioContext';
import { useWatchParty } from '../context/WatchPartyContext';

/**
 * Hook for Smart TV remote control navigation
 * - Left/Right arrows: Change station
 * - Up/Down arrows: Scroll page
 */
export const useTVRemote = () => {
    const { nextStation, prevStation, togglePlay, isPlaying } = useRadio();
    const { room, isHost, sendAction } = useWatchParty();

    const togglePlayback = () => {
        if (room && !isHost) {
            void sendAction(isPlaying ? 'pause' : 'play', null).then((response) => {
                if (!response.success) {
                    console.warn('[WatchParty] No se autorizó la acción de reproducción:', response.error);
                }
            }).catch((sendError) => {
                console.warn('[WatchParty] No se pudo enviar la acción de reproducción:', sendError);
            });
            return;
        }
        togglePlay();
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Do not intercept keyboard events if the user is typing in a form field
            const activeElement = document.activeElement;
            const isInputField =
                activeElement instanceof HTMLInputElement ||
                activeElement instanceof HTMLTextAreaElement ||
                activeElement instanceof HTMLSelectElement;

            if (isInputField) return;

            // Check if a modal is currently open (body overflow is set to hidden)
            const isModalOpen = document.body.style.overflow === 'hidden';

            const isButtonFocused =
                activeElement instanceof HTMLButtonElement ||
                activeElement instanceof HTMLAnchorElement;

            switch (e.key) {
                case 'ArrowLeft':
                case 'MediaTrackPrevious':
                    if (!isModalOpen) {
                        e.preventDefault();
                        prevStation();
                    }
                    break;

                case 'ArrowRight':
                case 'MediaTrackNext':
                    if (!isModalOpen) {
                        e.preventDefault();
                        nextStation();
                    }
                    break;

                case 'MediaPlayPause':
                case 'MediaPlay':
                case 'MediaPause':
                    e.preventDefault();
                    togglePlayback();
                    break;

                case 'Enter':
                case 'Return':
                case ' ':
                    // If a button or link is focused, let standard browser click happen
                    if (!isButtonFocused && !isModalOpen) {
                        e.preventDefault();
                        togglePlayback();
                    }
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
    }, [nextStation, prevStation, togglePlayback]);
};
