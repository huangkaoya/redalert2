import React, { useRef, useState, useEffect } from 'react';
import { Dialog } from '@/gui/component/Dialog';
import { Replay } from '@/network/gamestate/Replay';
interface KeepReplayBoxProps {
    defaultName: string;
    strings: {
        get(key: string, ...args: any[]): string;
    };
    viewport: any;
    onSubmit: (name: string) => void;
    onDismiss?: () => void;
}
export const KeepReplayBox: React.FC<KeepReplayBoxProps> = ({ defaultName, strings, viewport, onSubmit, onDismiss }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [hidden, setHidden] = useState(false);
    useEffect(() => {
        setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.setSelectionRange(0, inputRef.current.value.length);
        }, 50);
    }, []);
    const handleSubmit = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }
        const value = inputRef.current?.value;
        if (value) {
            setHidden(true);
            onSubmit(value);
        }
    };
    return (<Dialog className="keep-replay-box" hidden={hidden} viewport={viewport} zIndex={100} buttons={[
            { label: strings.get("GUI:Ok"), onClick: handleSubmit },
            {
                label: strings.get("GUI:Cancel"),
                onClick: () => {
                    setHidden(true);
                    onDismiss?.();
                }
            }
        ]}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>{strings.get("GUI:ReplayNamePrompt")}</label>
          <input type="text" name="replayname" autoComplete="off" ref={inputRef} defaultValue={defaultName} maxLength={Replay.maxNameLength}/>
        </div>
        <button type="submit" style={{ visibility: "hidden" }}/>
      </form>
    </Dialog>);
};
