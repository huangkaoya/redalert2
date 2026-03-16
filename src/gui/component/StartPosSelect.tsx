import React from 'react';
import { Select } from './Select';
import { RANDOM_START_POS } from '@/game/gameopts/constants';
import { Option } from './Option';
interface StartPosSelectProps {
    startPos: number;
    disabled?: boolean;
    availableStartPositions: number[];
    onSelect?: (pos: number) => void;
    strings: {
        get: (key: string, ...args: any[]) => string;
    };
}
export const StartPosSelect: React.FC<StartPosSelectProps> = ({ startPos, disabled, availableStartPositions, onSelect, strings, }) => {
    const positions = [...new Set([startPos, ...availableStartPositions]).values()].sort();
    return (<Select className="player-start-pos-select" initialValue={String(startPos)} disabled={disabled} tooltip={strings.get("STT:HostComboStart")} onSelect={(value) => {
            onSelect?.(Number(value));
        }}>
      {positions.map((pos) => (<Option key={pos} value={String(pos)} label={pos === RANDOM_START_POS
                ? strings.get("GUI:RandomAsSymbols")
                : String(pos + 1)}/>))}
    </Select>);
};
