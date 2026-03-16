import React from 'react';
import { Image } from './Image';
enum PingQuality {
    Good = 1,
    Average = 2,
    Bad = 3
}
interface PingIndicatorProps {
    ping?: number;
    strings: {
        get: (key: string, ...args: any[]) => string;
    };
}
const getPingQuality = (ping: number): PingQuality => {
    if (ping <= 100)
        return PingQuality.Good;
    if (ping <= 250)
        return PingQuality.Average;
    return PingQuality.Bad;
};
const pingImageMap = new Map<PingQuality, string>()
    .set(PingQuality.Bad, "pingr")
    .set(PingQuality.Average, "pingy")
    .set(PingQuality.Good, "pingg");
export const PingIndicator: React.FC<PingIndicatorProps> = ({ ping, strings }) => {
    const tooltip = ping !== undefined ? strings.get("Msg:PingInfo", ping) : undefined;
    return (<div className="ping-indicator" data-r-tooltip={tooltip} title={tooltip}>
      {ping !== undefined && (<Image src={pingImageMap.get(getPingQuality(ping)) + ".pcx"}/>)}
    </div>);
};
