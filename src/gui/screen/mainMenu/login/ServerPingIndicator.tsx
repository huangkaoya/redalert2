import React from "react";
import classnames from "classnames";
import { Image } from "@/gui/component/Image";
enum PingQuality {
    Good = 1,
    Average = 2,
    Bad = 3
}
interface ServerPingIndicatorProps {
    ping: number;
    strings: any;
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
const pingClassMap = new Map<PingQuality, string>()
    .set(PingQuality.Bad, "ping-bad")
    .set(PingQuality.Average, "ping-avg")
    .set(PingQuality.Good, "ping-good");
export const ServerPingIndicator: React.FC<ServerPingIndicatorProps> = ({ ping, strings }) => {
    const quality = getPingQuality(ping);
    const imageKey = pingImageMap.get(quality);
    const cssClass = pingClassMap.get(quality);
    return React.createElement("div", { className: "server-ping" }, React.createElement("span", { className: classnames("ping-text", cssClass) }, strings.get("TS:PingValue", ping)), React.createElement(Image, { src: `${imageKey}.pcx` }));
};
