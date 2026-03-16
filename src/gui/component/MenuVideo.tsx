import React, { useEffect, useRef } from 'react';
interface MenuVideoProps {
    src?: string | File;
    className?: string;
}
const MenuVideo: React.FC<MenuVideoProps> = ({ src, className = 'video-wrapper' }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const logoRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!src)
            return;
        const video = videoRef.current;
        const logo = logoRef.current;
        if (!video || !logo)
            return;
        let videoUrl: string;
        let cleanup: (() => void) | undefined;
        if (typeof src === 'string') {
            videoUrl = src;
        }
        else {
            videoUrl = URL.createObjectURL(src);
            cleanup = () => URL.revokeObjectURL(videoUrl);
        }
        const source = video.querySelector('source');
        if (source) {
            source.src = videoUrl;
            const extension = videoUrl.split('.').pop()?.toLowerCase();
            source.type = extension === 'mp4' ? 'video/mp4' : 'video/webm';
        }
        const handleLoadedData = () => {
            logo.style.opacity = '1';
        };
        video.addEventListener('loadeddata', handleLoadedData);
        video.load();
        return () => {
            video.removeEventListener('loadeddata', handleLoadedData);
            cleanup?.();
        };
    }, [src]);
    if (!src) {
        return (<div className={className}>
        <div style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffff00',
                fontSize: '24px',
                fontWeight: 'bold'
            }}>
          RED ALERT 2 WEB
        </div>
        
      </div>);
    }
    return (<div className={className}>
      <video ref={videoRef} style={{ outline: 'none', width: '100%', height: '100%' }} loop playsInline muted autoPlay>
        <source src="" type="video/webm"/>
      </video>
      
    </div>);
};
export default MenuVideo;
