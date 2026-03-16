import React, { useRef, useEffect } from 'react';
import { List, ListItem } from '@/gui/component/List';
import { StorageWarning } from '@/gui/screen/replay/StorageWarning';
import { ReplayDetailsPane } from '@/gui/screen/replay/ReplayDetailsPane';
interface Replay {
    id: string;
    name: string;
    timestamp: number;
    keep?: boolean;
}
interface ReplayDetails {
    engineVersion: string;
    durationSeconds?: number;
    gameId: string;
    gameTimestamp?: number;
    mapName?: string;
    players?: Array<{
        name: string;
        color: string;
    }>;
}
interface ReplaySelProps {
    strings: {
        get(key: string, ...args: any[]): string;
    };
    replays?: Replay[];
    selectedReplay?: Replay;
    selectedReplayDetails?: ReplayDetails;
    onSelectReplay: (replay: Replay, doubleClick?: boolean) => void;
}
export const ReplaySel: React.FC<ReplaySelProps> = ({ strings, replays, selectedReplay, selectedReplayDetails, onSelectReplay }) => {
    const selectedRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        selectedRef.current?.scrollIntoView();
    }, []);
    return (<div className="replay-sel-form">
      <List title={strings.get("GUI:SelectReplay")} className="replay-list">
        {replays ? (replays.map((replay) => {
            const isSelected = replay.id === selectedReplay?.id;
            return (<ListItem key={replay.id} selected={isSelected} innerRef={isSelected ? selectedRef : null} onClick={() => onSelectReplay(replay)} onDoubleClick={() => onSelectReplay(replay, true)} style={{ display: "flex" }}>
                <div className="replay-name">
                  {replay.keep ? "" : "* "}
                  {replay.name}
                </div>
                <div className="replay-time" dir="auto">
                  {new Date(replay.timestamp).toLocaleString()}
                </div>
              </ListItem>);
        })) : (<ListItem style={{ textAlign: "center" }}>
            {strings.get("GUI:LoadingEx")}
          </ListItem>)}
      </List>
      {selectedReplayDetails && (<ReplayDetailsPane replayDetails={selectedReplayDetails} strings={strings}/>)}
      <StorageWarning strings={strings}/>
    </div>);
};
