import React, { useState, useEffect } from 'react';
import { CountryIcon } from '@/gui/component/CountryIcon';
import { OBS_COUNTRY_NAME } from '@/game/gameopts/constants';
import { RECIPIENT_ALL, RECIPIENT_TEAM } from '@/network/gservConfig';
import { Chat } from '@/gui/component/Chat';
interface Color {
    asHexString(): string;
}
interface Country {
    name: string;
}
interface Player {
    name: string;
    color: Color;
    country?: Country;
    isAi: boolean;
}
interface ConInfo {
    name: string;
    status: string;
    ping?: number;
    lagAllowanceMillis?: number;
}
interface Strings {
    get(key: string, ...args: any[]): string;
}
interface ChatHistory {
    lastComposeTarget?: {
        value: {
            type: any;
            name: string;
        };
    };
}
interface ConInfoFormProps {
    strings: Strings;
    conInfos?: ConInfo[];
    players: Player[];
    localPlayer: Player;
    messages: any[];
    chatHistory?: ChatHistory;
    onSendMessage: (message: string) => void;
}
const TURN_TIMEOUT_MILLIS = 60000;
const LAG_STATE_THRESH_MILLIS = 5000;
const CON_INFO_THRESH_MILLIS = 3000;
const PlayerConnectionStatus = {
    Connected: 'Connected',
    Disconnected: 'Disconnected',
    Lagging: 'Lagging'
};
export const ConInfoForm: React.FC<ConInfoFormProps> = ({ strings, conInfos, players, localPlayer, messages, chatHistory, onSendMessage, }) => {
    const [timeRemaining, setTimeRemaining] = useState(() => Math.floor((TURN_TIMEOUT_MILLIS -
        LAG_STATE_THRESH_MILLIS -
        CON_INFO_THRESH_MILLIS) /
        1000));
    useEffect(() => {
        const interval = setInterval(() => setTimeRemaining(Math.max(0, timeRemaining - 1)), 1000);
        return () => clearInterval(interval);
    }, [timeRemaining]);
    return (<div className="con-info-form">
      <div className="con-info-form-content">
        <table>
          <thead>
            <tr>
              <th></th>
              <th className="player-name">
                {strings.get("GUI:Player")}
              </th>
              <th className="player-ping">
                {strings.get("GUI:Ping")}
              </th>
              <th className="player-time">
                {strings.get("GUI:Time")}
              </th>
            </tr>
          </thead>
          <tbody>
            {players
            .filter((player) => !player.isAi)
            .map((player) => {
            const conInfo = conInfos?.find((info) => info.name === player.name);
            return (<tr key={player.name} style={{
                    color: player.color.asHexString(),
                    opacity: conInfo &&
                        conInfo.status !== PlayerConnectionStatus.Connected
                        ? 0.5
                        : 1,
                }}>
                    <td>
                      <CountryIcon country={player.country
                    ? player.country.name
                    : OBS_COUNTRY_NAME}/>
                    </td>
                    <td className="player-name">
                      {player.name}
                    </td>
                    <td className="player-ping">
                      <meter value={conInfo?.ping ?? 1000} max={1000} low={150} high={500} optimum={0}/>
                    </td>
                    <td className="player-time">
                      {conInfo
                    ? Math.floor((conInfo.lagAllowanceMillis ?? 0) / 1000)
                    : undefined}
                    </td>
                  </tr>);
        })}
          </tbody>
        </table>
      </div>
      <div className="con-info-form-footer">
        <div className="time-allowed">
          {strings.get("TXT_TIME_ALLOWED", timeRemaining)}
        </div>
        <div className="chat">
          <Chat strings={strings} messages={messages} channels={[RECIPIENT_ALL, RECIPIENT_TEAM]} chatHistory={chatHistory} userColors={new Map(players.map((player) => [player.name, player.color.asHexString()]))} localUsername={localPlayer.name} onSendMessage={onSendMessage}/>
        </div>
      </div>
    </div>);
};
