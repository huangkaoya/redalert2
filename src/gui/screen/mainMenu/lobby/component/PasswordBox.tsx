import React, { useRef, useState, useEffect } from 'react';
import { Dialog } from '@/gui/component/Dialog';
interface PasswordBoxProps {
    strings: {
        get: (key: string) => string;
    };
    viewport: any;
    onSubmit: (password: string) => void;
    onDismiss?: () => void;
}
export const PasswordBox: React.FC<PasswordBoxProps> = ({ strings, viewport, onSubmit, onDismiss }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [hidden, setHidden] = useState(false);
    useEffect(() => {
        setTimeout(() => {
            inputRef.current?.focus();
        }, 50);
    }, []);
    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        setHidden(true);
        onSubmit(inputRef.current?.value || '');
    };
    return (<Dialog className="login-box password-box" hidden={hidden} viewport={viewport} zIndex={100} buttons={[
            { label: strings.get("GUI:Ok"), onClick: handleSubmit },
            {
                label: strings.get("GUI:Cancel"),
                onClick: () => {
                    setHidden(true);
                    onDismiss?.();
                },
            },
        ]}>
      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="field">
          <label>{strings.get("GUI:Password")}</label>
          <input name="lobbypass" type="password" autoComplete="off" data-lpignore="true" ref={inputRef}/>
        </div>
        <button type="submit" style={{ visibility: "hidden" }}/>
      </form>
    </Dialog>);
};
