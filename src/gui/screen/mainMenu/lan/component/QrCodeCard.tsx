import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeCardProps {
    title: string;
    description?: string;
    payloadText: string;
}

export const QrCodeCard: React.FC<QrCodeCardProps> = ({ title, description, payloadText }) => {
    const [dataUrl, setDataUrl] = useState<string>();
    const [errorText, setErrorText] = useState<string>();

    useEffect(() => {
        let cancelled = false;

        if (!payloadText) {
            setDataUrl(undefined);
            setErrorText(undefined);
            return;
        }

        QRCode.toDataURL(payloadText, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 280,
            color: {
                dark: '#ffffff',
                light: '#000000',
            },
        })
            .then((nextDataUrl) => {
                if (!cancelled) {
                    setDataUrl(nextDataUrl);
                    setErrorText(undefined);
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setDataUrl(undefined);
                    setErrorText((error as Error).message);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [payloadText]);

    return (
        <div className="lan-qr-card" data-lan-card="qr">
            <div className="lan-panel-header">
                <h3>{title}</h3>
                {description ? <span>{description}</span> : null}
            </div>
            {dataUrl ? (
                <div className="lan-qr-artwork">
                    <img src={dataUrl} alt={title} />
                </div>
            ) : (
                <div className="lan-qr-placeholder">
                    {errorText ?? '当前还没有可展示的二维码内容。'}
                </div>
            )}
        </div>
    );
};

