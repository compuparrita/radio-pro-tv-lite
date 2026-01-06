import React from 'react';
import ReactDOM from 'react-dom';

interface QualitySelectorPortalProps {
    children: React.ReactNode;
    container: HTMLElement | null;
}

export const QualitySelectorPortal: React.FC<QualitySelectorPortalProps> = ({ children, container }) => {
    if (!container) return null;
    return ReactDOM.createPortal(children, container);
};
