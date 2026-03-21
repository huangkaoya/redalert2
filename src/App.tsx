import { useEffect, useRef, useState } from 'react';
import { Application, SplashScreenUpdateCallback } from './Application';
import SplashScreenComponent from './gui/component/SplashScreen';
import type { ComponentProps } from 'react';
function App() {
    const appRef = useRef<Application | null>(null);
    const appInitialized = useRef<boolean>(false);
    const [splashScreenProps, setSplashScreenProps] = useState<ComponentProps<typeof SplashScreenComponent> | null>(null);
    const [showTestMode, setShowTestMode] = useState(false);
    useEffect(() => {
        if (appInitialized.current) {
            return;
        }
        appInitialized.current = true;
        console.log('App.tsx: useEffect - Initializing Application');
        const handleSplashScreenUpdate: SplashScreenUpdateCallback = (props) => {
            console.log('App.tsx: SplashScreen update callback received', props);
            if (props === null) {
                setSplashScreenProps(null);
            }
            else {
                setSplashScreenProps(prevProps => ({
                    ...prevProps,
                    ...props
                }));
            }
        };
        const app = new Application(handleSplashScreenUpdate);
        appRef.current = app;
        const startApp = async () => {
            if (document.getElementById('ra2web-root')) {
                console.log('App.tsx: #ra2web-root found, calling app.main()');
                try {
                    await app.main();
                    console.log('App.tsx: app.main() completed.');
                }
                catch (error) {
                    console.error("Error running Application.main():", error);
                }
            }
            else {
                console.warn('App.tsx: #ra2web-root not found yet, retrying...');
                setTimeout(startApp, 100);
            }
        };
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('test') === 'glsl') {
            setShowTestMode(true);
            return;
        }
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            startApp();
        }
        else {
            document.addEventListener('DOMContentLoaded', startApp);
        }
        return () => {
            console.log('App.tsx: useEffect cleanup');
            setSplashScreenProps(null);
        };
    }, []);
    if (showTestMode) {
        return (<div className="App">
        <div style={{
                position: 'fixed',
                top: '10px',
                right: '10px',
                zIndex: 1000
            }}>
          <button onClick={() => {
                window.location.href = window.location.pathname;
            }} style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
            }}>
            返回正常模式
          </button>
        </div>
      </div>);
    }
    return (<div className="App">
      {splashScreenProps && splashScreenProps.parentElement && (<SplashScreenComponent {...splashScreenProps}/>)}
    </div>);
}
export default App;
