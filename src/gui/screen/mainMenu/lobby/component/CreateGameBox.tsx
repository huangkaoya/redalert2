import React, { useState, useRef } from 'react';
import { Dialog } from '@/gui/component/Dialog';
import { WolConnection } from '@/network/WolConnection';
interface CreateGameBoxProps {
    strings: {
        get: (key: string) => string;
    };
    viewport: any;
    onSubmit: (roomName: string, password: string, observe: boolean) => void;
    onDismiss?: () => void;
}
export const CreateGameBox: React.FC<CreateGameBoxProps> = ({ strings, viewport, onSubmit, onDismiss }) => {
    const [hidden, setHidden] = useState(false);
    const [roomName, setRoomName] = useState('');
    const passwordRef = useRef<HTMLInputElement>(null);
    const submitRef = useRef<HTMLButtonElement>(null);
    const [enablePassword, setEnablePassword] = useState(false);
    const observeRef = useRef<HTMLInputElement>(null);
    return (<Dialog className="login-box create-game-box" hidden={hidden} viewport={viewport} buttons={[
            {
                label: strings.get("GUI:Ok"),
                onClick: () => submitRef.current?.click(),
            },
            {
                label: strings.get("GUI:Cancel"),
                onClick: () => {
                    setHidden(true);
                    onDismiss?.();
                },
            },
        ]} zIndex={100}>
      <form onSubmit={(e) => {
            e.preventDefault();
            setHidden(true);
            onSubmit(roomName, enablePassword ? passwordRef.current?.value || '' : '', observeRef.current?.checked || false);
        }} autoComplete="off">
        <div className="field">
          <label>{strings.get("GUI:RoomDesc")}</label>
          <input name="roomname" type="text" value={roomName} maxLength={WolConnection.MAX_ROOM_DESC_LEN} onChange={(e) => setRoomName(e.target.value)}/>
        </div>
        <div className="field">
          <label>{strings.get("GUI:Password")}</label>
          <input name="enablepass" type="checkbox" checked={enablePassword} onChange={() => setEnablePassword(!enablePassword)}/>
          <input name="lobbypass" type="password" autoComplete="off" data-lpignore="true" ref={passwordRef} disabled={!enablePassword} required={enablePassword}/>
        </div>
        <div className="field">
          <label>{strings.get("GUI:Observe")}</label>
          <input type="checkbox" name="test" ref={observeRef}/>
        </div>
        <button type="submit" ref={submitRef} style={{ visibility: "hidden" }}/>
      </form>
    </Dialog>);
};
