import React from "react";
import { List, ListItem } from "@/gui/component/List";
interface Region {
    id: string;
    label: string;
    available: boolean;
}
interface ServerListProps {
    regionId: string;
    regions: Region[];
    pings: Map<Region, number | undefined>;
    strings: any;
    onChange: (regionId: string) => void;
}
export const ServerList: React.FC<ServerListProps> = ({ regionId, regions, pings, strings, onChange, }) => React.createElement(List, { className: "server-list" }, regions.map((region) => {
    const ping = pings.get(region);
    const isDisabled = !region.available || (pings.has(region) && ping === undefined);
    return React.createElement(ListItem, {
        key: region.id,
        selected: region.id === regionId && !isDisabled,
        disabled: isDisabled,
        onClick: () => !isDisabled && onChange(region.id),
    }, React.createElement("span", { className: "label" }, region.label), React.createElement("span", { className: "ping" }, isDisabled
        ? React.createElement("span", { className: "offline-text" }, strings.get("TS:ServerOffline"))
        : ping !== undefined &&
            React.createElement("span", { className: "online-text" }, strings.get("TS:ServerOnline"))));
}));
