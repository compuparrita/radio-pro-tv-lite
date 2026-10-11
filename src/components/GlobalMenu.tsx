import type { ComponentType } from 'react';
import { useMemo } from 'react';
import { HelpCircle, ExternalLink, Palette, Settings } from 'lucide-react';
import { generateQrCodeMatrix } from '../utils/qrCode';
import type { PanelShellProps } from './panels/PanelShell';

export interface GlobalMenuProps {
    isOpen: boolean;
    onClose: () => void;
    theme: 'dark' | 'light' | 'youth';
    onThemeClick: () => void;
    onOpenHelp: () => void;
    onOpenStationManager: () => void;
}

interface GlobalMenuHostProps extends GlobalMenuProps {
    PanelShellComponent: ComponentType<PanelShellProps>;
}

export function GlobalMenu({ isOpen, onClose, theme, onThemeClick, onOpenHelp, onOpenStationManager, PanelShellComponent }: GlobalMenuHostProps) {
    const appUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/`;
    const qrMatrix = useMemo(() => {
        if (!appUrl) return null;
        try {
            return generateQrCodeMatrix(appUrl);
        } catch {
            return null;
        }
    }, [appUrl]);
    const qrSvgSize = qrMatrix ? qrMatrix.length + 8 : 0;
    const qrSvgPath = qrMatrix
        ? qrMatrix.flatMap((row, y) => row.flatMap((dark, x) => dark ? [`M${x + 4} ${y + 4}h1v1h-1z`] : [])).join(' ')
        : '';

    return (
        <PanelShellComponent
            ariaLabel="Menú global"
            closeButtonLabel="Cerrar menú"
            isOpen={isOpen}
            onClose={onClose}
            side="left"
            showBackButton={false}
            title="Menú"
        >
            <div className="space-y-3">
                <a
                    className="btn btn-secondary w-full justify-start"
                    href="/tv-lite.html"
                    onClick={onClose}
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    <ExternalLink aria-hidden="true" size={17} />
                    <span>RadioFM LITE</span>
                </a>
                <button className="btn btn-secondary w-full justify-start" onClick={() => { onClose(); onThemeClick(); }} type="button">
                    <Palette aria-hidden="true" size={17} />
                    <span>Tema: {theme === 'dark' ? 'Claro' : theme === 'light' ? 'Juvenil' : 'Dark'}</span>
                </button>
                <button className="btn btn-secondary w-full justify-start" onClick={onOpenHelp} type="button">
                    <HelpCircle aria-hidden="true" size={17} />
                    <span>Ayuda de la App</span>
                </button>
                <button className="btn btn-secondary w-full justify-start" onClick={onOpenStationManager} type="button">
                    <Settings aria-hidden="true" size={17} />
                    <span>Gestor de Emisoras</span>
                </button>
            </div>

            <section aria-label="Acceso general a RadioFM mediante código QR" className="mt-8 flex flex-col items-center gap-2 border-t border-[var(--dark-border)] pt-6">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Abrir RadioFM en otro dispositivo</h3>
                {qrMatrix ? (
                    <svg
                        aria-label="Código QR de acceso general a RadioFM"
                        className="h-36 w-36 bg-white p-1"
                        role="img"
                        shapeRendering="crispEdges"
                        viewBox={`0 0 ${qrSvgSize} ${qrSvgSize}`}
                    >
                        <rect fill="white" height={qrSvgSize} width={qrSvgSize} />
                        <path d={qrSvgPath} fill="black" />
                    </svg>
                ) : (
                    <div aria-label="No se pudo generar el código QR de RadioFM" className="flex h-36 w-36 items-center justify-center bg-white p-3 text-center text-xs text-zinc-700" role="img">
                        Código QR no disponible
                    </div>
                )}
                <p className="text-center text-xs text-[var(--text-secondary)]">Escanea para abrir RadioFM</p>
            </section>
        </PanelShellComponent>
    );
}
