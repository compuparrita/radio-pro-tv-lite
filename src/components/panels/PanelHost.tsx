import { useLayoutEffect, useRef, useState } from 'react';
import { PANEL_EXIT_DURATION_MS, PanelShell } from './PanelShell';
import WatchPartyModal from '../WatchPartyModal';
import type { WatchPartyModalProps } from '../WatchPartyModal';
import GeneralHelpModal from '../GeneralHelpModal';
import type { GeneralHelpModalProps } from '../GeneralHelpModal';
import HelpModal from '../HelpModal';
import type { HelpModalProps } from '../HelpModal';

export type ActivePanel =
    | { kind: 'watchparty'; props: WatchPartyModalProps }
    | { kind: 'general-help'; props: GeneralHelpModalProps }
    | { kind: 'chat-help'; props: HelpModalProps };

interface PanelHostProps {
    activePanel: ActivePanel | null;
}

export function PanelHost({ activePanel }: PanelHostProps) {
    const [closingPanel, setClosingPanel] = useState<ActivePanel | null>(null);
    const lastActivePanelRef = useRef<ActivePanel | null>(activePanel);

    if (activePanel) lastActivePanelRef.current = activePanel;

    useLayoutEffect(() => {
        if (activePanel) {
            setClosingPanel(null);
            return;
        }

        const lastActivePanel = lastActivePanelRef.current;
        if (!lastActivePanel) return;

        const panelClosing: ActivePanel = lastActivePanel.kind === 'watchparty'
            ? { kind: 'watchparty', props: { ...lastActivePanel.props, isOpen: false } }
            : lastActivePanel.kind === 'general-help'
                ? { kind: 'general-help', props: { ...lastActivePanel.props, isOpen: false } }
                : { kind: 'chat-help', props: { ...lastActivePanel.props, isOpen: false } };

        setClosingPanel(panelClosing);
        const timeout = window.setTimeout(() => setClosingPanel(null), PANEL_EXIT_DURATION_MS);
        return () => window.clearTimeout(timeout);
    }, [activePanel]);

    const panelToRender = activePanel ?? closingPanel;
    if (!panelToRender) return null;

    switch (panelToRender.kind) {
        case 'watchparty':
            return <WatchPartyModal {...panelToRender.props} PanelShellComponent={PanelShell} />;
        case 'general-help':
            return <GeneralHelpModal {...panelToRender.props} PanelShellComponent={PanelShell} />;
        case 'chat-help':
            return <HelpModal {...panelToRender.props} PanelShellComponent={PanelShell} />;
    }
}
