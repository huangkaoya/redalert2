import React from 'react';
interface IframeProps {
    src: string;
    className?: string;
}
export const Iframe: React.FC<IframeProps> = ({ src, className }) => {
    return <iframe src={src} className={className}/>;
};
