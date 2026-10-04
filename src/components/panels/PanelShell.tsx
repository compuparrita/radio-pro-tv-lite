import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft } from 'lucide-react';

export interface PanelShellProps {
    isOpen: boolean;
    title: ReactNode;
    ariaLabel: string;
    onClose: () => void;
    closeButtonLabel: string;
    children: ReactNode;
    titleId?: string;
    description?: ReactNode;
    onBack?: () => void;
    backButtonLabel?: string;
    footer?: ReactNode;
    lockBodyScroll?: boolean;
    contentClassName?: string;
}

export const PANEL_EXIT_DURATION_MS = 280;

export function PanelShell({
    isOpen,
    title,
    ariaLabel,
    onClose,
    closeButtonLabel,
    children,
    titleId = 'panel-shell-title',
    description,
    onBack,
    backButtonLabel,
    footer,
    lockBodyScroll = false,
    contentClassName = '',
}: PanelShellProps) {
    const [isMounted, setIsMounted] = useState(isOpen);
    const [isVisible, setIsVisible] = useState(false);
    const panelRef = useRef<HTMLElement>(null);
    const navigationButtonRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const onCloseRef = useRef(onClose);
    const onBackRef = useRef(onBack);

    useEffect(() => {
        onCloseRef.current = onClose;
        onBackRef.current = onBack;
    }, [onBack, onClose]);

    useEffect(() => {
        let animationFrame = 0;
        let closeTimer = 0;

        if (isOpen) {
            setIsMounted(true);
            animationFrame = window.requestAnimationFrame(() => setIsVisible(true));
        } else {
            setIsVisible(false);
            closeTimer = window.setTimeout(() => setIsMounted(false), PANEL_EXIT_DURATION_MS);
        }

        return () => {
            window.cancelAnimationFrame(animationFrame);
            window.clearTimeout(closeTimer);
        };
    }, [isOpen]);

    useEffect(() => {
        panelRef.current?.toggleAttribute('inert', !isOpen);
    }, [isOpen, isMounted]);

    useEffect(() => {
        if (!isOpen || !lockBodyScroll) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen, lockBodyScroll]);

    useEffect(() => {
        if (!isOpen) {
            previousFocusRef.current?.focus();
            return;
        }

        previousFocusRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        let focusFrame = 0;
        const initialFocusFrame = window.requestAnimationFrame(() => {
            focusFrame = window.requestAnimationFrame(() => navigationButtonRef.current?.focus());
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                if (onBackRef.current) {
                    onBackRef.current();
                    window.requestAnimationFrame(() => navigationButtonRef.current?.focus());
                } else {
                    onCloseRef.current();
                }
                return;
            }

            if (event.key !== 'Tab' || !panelRef.current) return;
            const focusable = panelRef.current.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            );
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!first || !last) return;

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.cancelAnimationFrame(initialFocusFrame);
            window.cancelAnimationFrame(focusFrame);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    if (!isMounted) return null;

    const hasBackAction = Boolean(onBack);
    const handleNavigation = onBack ?? onClose;
    const navigationLabel = hasBackAction ? backButtonLabel ?? closeButtonLabel : closeButtonLabel;

    return createPortal(
        <div
            aria-hidden={!isOpen}
            className={'fixed inset-0 z-[1000001] ' + (isOpen ? '' : 'pointer-events-none')}
            onClick={(event) => {
                if (event.target === event.currentTarget && isOpen) onClose();
            }}
        >
            <section
                aria-labelledby={titleId}
                aria-modal="true"
                aria-label={ariaLabel}
                className={'fixed inset-y-0 right-[env(safe-area-inset-right)] flex h-screen w-[min(88vw,28rem)] max-w-full flex-col overflow-hidden border-l border-[var(--dark-border)] bg-[var(--dark-surface)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-[var(--text-primary)] shadow-[-18px_0_60px_rgba(0,0,0,0.2)] backdrop-blur-xl transition-transform ease-out min-[1200px]:w-[min(86vw,23.75rem)] ' + (isVisible ? 'duration-[330ms] translate-x-0' : 'duration-[280ms] pointer-events-none translate-x-full')}
                role="dialog"
                onClick={(event) => event.stopPropagation()}
                ref={panelRef}
                style={{ height: '100dvh' }}
                tabIndex={-1}
            >
                <header className={'flex items-start border-b border-[var(--glass-border)] px-5 py-5 sm:px-6 ' + (hasBackAction ? 'justify-start gap-2' : 'justify-between')}>
                    <div className={hasBackAction ? 'order-2' : ''}>
                        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]" id={titleId}>{title}</h2>
                        {description && <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>}
                    </div>
                    <button
                        aria-label={navigationLabel}
                        className={'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] ' + (hasBackAction ? 'order-1 -ml-2' : '-mr-2 -mt-1')}
                        onClick={handleNavigation}
                        ref={navigationButtonRef}
                        title={navigationLabel}
                        type="button"
                    >
                        <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.75} />
                    </button>
                </header>

                <div className={'min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 ' + contentClassName}>
                    {children}
                </div>
                {footer}
            </section>
        </div>,
        document.body,
    );
}
