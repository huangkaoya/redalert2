import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface QrScannerPanelProps {
    onDetected: (payloadText: string) => Promise<void>;
}

async function decodeQrFromFile(file: File): Promise<string | undefined> {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context = canvas.getContext('2d', {
        willReadFrequently: true,
    });
    if (!context) {
        throw new Error('无法创建二维码识别画布。');
    }

    context.drawImage(bitmap, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
    });
    return result?.data;
}

export const QrScannerPanel: React.FC<QrScannerPanelProps> = ({ onDetected }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const frameRequestRef = useRef<number | undefined>(undefined);
    const streamRef = useRef<MediaStream | undefined>(undefined);

    const [active, setActive] = useState(false);
    const [busy, setBusy] = useState(false);
    const [errorText, setErrorText] = useState<string>();
    const [lastDetectedText, setLastDetectedText] = useState<string>();
    const handleDetected = useEffectEvent(onDetected);

    const stopScanner = () => {
        if (frameRequestRef.current) {
            cancelAnimationFrame(frameRequestRef.current);
            frameRequestRef.current = undefined;
        }
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = undefined;
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setActive(false);
    };

    useEffect(() => stopScanner, []);

    useEffect(() => {
        if (!active) {
            return;
        }

        let cancelled = false;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', {
            willReadFrequently: true,
        });
        if (!context) {
            setErrorText('无法创建二维码识别画布。');
            setActive(false);
            return;
        }

        const scanLoop = async () => {
            if (cancelled) {
                return;
            }

            const video = videoRef.current;
            if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                const width = video.videoWidth || 0;
                const height = video.videoHeight || 0;
                if (width > 0 && height > 0) {
                    canvas.width = width;
                    canvas.height = height;
                    context.drawImage(video, 0, 0, width, height);
                    const imageData = context.getImageData(0, 0, width, height);
                    const result = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: 'attemptBoth',
                    });
                    if (result?.data && result.data !== lastDetectedText && !busy) {
                        setBusy(true);
                        setLastDetectedText(result.data);
                        try {
                            await handleDetected(result.data);
                            stopScanner();
                            setErrorText(undefined);
                            setBusy(false);
                            return;
                        }
                        catch (error) {
                            setErrorText((error as Error).message);
                        }
                        finally {
                            setBusy(false);
                        }
                    }
                }
            }

            frameRequestRef.current = requestAnimationFrame(() => {
                scanLoop().catch((error) => {
                    setErrorText((error as Error).message);
                    stopScanner();
                });
            });
        };

        navigator.mediaDevices
            ?.getUserMedia({
                video: {
                    facingMode: 'environment',
                },
                audio: false,
            })
            .then((stream) => {
                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                streamRef.current = stream;
                const video = videoRef.current;
                if (!video) {
                    stopScanner();
                    return;
                }

                video.srcObject = stream;
                video.setAttribute('playsinline', 'true');
                video.play().catch((error) => {
                    setErrorText((error as Error).message);
                    stopScanner();
                });
                scanLoop().catch((error) => {
                    setErrorText((error as Error).message);
                    stopScanner();
                });
            })
            .catch((error) => {
                setErrorText((error as Error).message);
                stopScanner();
            });

        return () => {
            cancelled = true;
            stopScanner();
        };
    }, [active, busy, lastDetectedText]);

    const handleImportImage = async (file: File | undefined) => {
        if (!file) {
            return;
        }
        setBusy(true);
        try {
            const decoded = await decodeQrFromFile(file);
            if (!decoded) {
                throw new Error('没有在图片里识别到二维码。');
            }
            setLastDetectedText(decoded);
            await handleDetected(decoded);
            setErrorText(undefined);
        }
        catch (error) {
            setErrorText((error as Error).message);
        }
        finally {
            setBusy(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="lan-panel lan-scanner-panel" data-lan-card="scanner">
            <div className="lan-panel-header">
                <h3>扫码加入</h3>
                <span>支持摄像头和图片导入。</span>
            </div>

            <div className="lan-scanner-preview">
                {active ? (
                    <video ref={videoRef} muted={true} autoPlay={true} />
                ) : (
                    <div className="lan-qr-placeholder">
                        摄像头未开启，也可以直接导入二维码图片。
                    </div>
                )}
            </div>

            <div className="lan-actions">
                <button
                    type="button"
                    className="dialog-button"
                    disabled={busy}
                    data-lan-action={active ? 'stop-scanner' : 'start-scanner'}
                    onClick={() => {
                        if (active) {
                            stopScanner();
                            return;
                        }
                        setErrorText(undefined);
                        setActive(true);
                    }}
                >
                    {active ? '停止扫码' : '开启摄像头扫码'}
                </button>
                <button
                    type="button"
                    className="dialog-button"
                    disabled={busy}
                    onClick={() => fileInputRef.current?.click()}
                >
                    导入二维码图片
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="lan-hidden-input"
                    onChange={(event) => {
                        handleImportImage(event.target.files?.[0]).catch((error) => {
                            setErrorText((error as Error).message);
                        });
                    }}
                />
            </div>

            {errorText ? (
                <div className="lan-error-text">{errorText}</div>
            ) : null}
        </div>
    );
};
