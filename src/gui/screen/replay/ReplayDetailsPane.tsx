import React from 'react';
import { formatTimeDuration } from '@/util/format';
interface Player {
    name: string;
    color: string;
}
interface ReplayDetails {
    engineVersion: string;
    durationSeconds?: number;
    gameId: string;
    gameTimestamp?: number;
    mapName?: string;
    players?: Player[];
}
interface ReplayDetailsPaneProps {
    replayDetails: ReplayDetails;
    strings: {
        get(key: string, ...args: any[]): string;
    };
}
export const ReplayDetailsPane: React.FC<ReplayDetailsPaneProps> = ({ replayDetails: { engineVersion, durationSeconds, gameId, gameTimestamp, mapName, players }, strings }) => (<div className="replay-details">
    <table>
      <tbody>
        {gameTimestamp ? (<tr>
            <td>{strings.get("GUI:ReplayTime")}:</td>
            <td dir="auto">
              {new Date(gameTimestamp * (String(gameTimestamp).length < 13 ? 1000 : 1)).toLocaleString()}
            </td>
          </tr>) : null}
        <tr>
          <td>{strings.get("GUI:GameVersion")}:</td>
          <td>{engineVersion}</td>
        </tr>
        {gameId !== "0" ? (<tr>
            <td>{strings.get("GUI:GameID")}:</td>
            <td>{gameId}</td>
          </tr>) : null}
        {mapName !== undefined && (<tr>
            <td>{strings.get("GUI:Map")}:</td>
            <td>{mapName}</td>
          </tr>)}
        {players && (<tr>
            <td>{strings.get("GUI:Players")}:</td>
            <td>
              {players.map((player, index) => (<React.Fragment key={player.name}>
                  {index ? ", " : ""}
                  <span style={{ color: player.color }}>
                    {player.name}
                  </span>
                </React.Fragment>))}
            </td>
          </tr>)}
        {durationSeconds !== undefined && (<tr>
            <td>{strings.get("GUI:Duration")}:</td>
            <td>{formatTimeDuration(durationSeconds)}</td>
          </tr>)}
      </tbody>
    </table>
  </div>);
