import React, { useRef, useState, useEffect } from "react";
import { List, ListItem } from "@/gui/component/List";
import { Select } from "@/gui/component/Select";
import { Option } from "@/gui/component/Option";
export enum SortType {
    None = "",
    NameAsc = "nameAsc",
    NameDesc = "nameDesc",
    MaxSlotsAsc = "maxSlotsAsc",
    MaxSlotsDesc = "maxSlotsDesc"
}
interface MapData {
    mapName: string;
    mapTitle: string;
    maxSlots: number;
}
interface GameMode {
    id: number;
    label: string;
    description?: string;
}
interface MapSelProps {
    strings: any;
    gameModes: GameMode[];
    maps: MapData[];
    selectedGameMode: GameMode;
    selectedMapName: string;
    initialSortType: SortType;
    onSelectGameMode: (gameMode: GameMode) => void;
    onSelectMap: (mapName: string, doubleClick: boolean) => void;
    onSelectSort: (sortType: SortType) => void;
}
const sortMaps = (maps: MapData[], sortType: SortType): MapData[] => {
    switch (sortType) {
        case SortType.None:
            return maps;
        case SortType.NameAsc:
            return maps.sort((a, b) => a.mapTitle.localeCompare(b.mapTitle));
        case SortType.NameDesc:
            return maps.sort((a, b) => b.mapTitle.localeCompare(a.mapTitle));
        case SortType.MaxSlotsAsc:
            return maps.sort((a, b) => a.maxSlots - b.maxSlots);
        case SortType.MaxSlotsDesc:
            return maps.sort((a, b) => b.maxSlots - a.maxSlots);
        default:
            throw new Error(`Unsupported sort type "${sortType}"`);
    }
};
export const MapSel: React.FC<MapSelProps> = ({ strings, gameModes, maps, selectedGameMode, selectedMapName, initialSortType, onSelectGameMode, onSelectMap, onSelectSort, }) => {
    const selectedRef = useRef<HTMLDivElement>(null);
    const [filteredMaps, setFilteredMaps] = useState<MapData[]>(maps);
    const [searchFilter, setSearchFilter] = useState<string>("");
    const [sortType, setSortType] = useState<SortType>(initialSortType);
    useEffect(() => {
        updateFilteredMaps();
    }, [maps, searchFilter, sortType]);
    useEffect(() => {
        const timeout = setTimeout(() => selectedRef.current?.scrollIntoView(), 50);
        return () => clearTimeout(timeout);
    }, [maps]);
    const updateFilteredMaps = () => {
        const filtered = maps.filter((map) => map.mapTitle.toLowerCase().includes(searchFilter.toLowerCase()));
        setFilteredMaps(sortMaps(filtered, sortType));
    };
    return React.createElement("div", { className: "map-sel-form" }, React.createElement("div", { className: "map-sel-title" }, strings.get("GUI:SelectEngagement")), React.createElement("div", { className: "map-sel-body" }, React.createElement("div", { className: "map-sel-game-mode" }, React.createElement(List, { title: strings.get("GUI:GameType"), className: "game-mode-list", tooltip: strings.get("STT:ScenarioListGameType") }, gameModes.map((gameMode) => React.createElement(ListItem, {
        key: gameMode.id,
        selected: selectedGameMode?.id === gameMode.id,
        tooltip: gameMode.description ? strings.get(gameMode.description) : undefined,
        onClick: () => onSelectGameMode(gameMode),
    }, strings.get(gameMode.label))))), React.createElement("div", { className: "map-sel-map" }, React.createElement(List, {
        title: React.createElement("div", { className: "map-list-title" }, React.createElement("div", null, strings.get("GUI:GameMap")), React.createElement("div", { className: "map-list-sort", "data-r-tooltip": strings.get("STT:SortBy") }, React.createElement("label", null, "⇵"), React.createElement(Select, {
            initialValue: sortType,
            onSelect: (value: SortType) => {
                setSortType(value);
                onSelectSort(value);
            },
            className: "map-list-sort-select",
        }, React.createElement(Option, { value: SortType.None, label: strings.get("TS:SortNone") }), React.createElement(Option, { value: SortType.NameAsc, label: strings.get("TS:SortName") + " ↓" }), React.createElement(Option, { value: SortType.NameDesc, label: strings.get("TS:SortName") + " ↑" }), React.createElement(Option, { value: SortType.MaxSlotsAsc, label: strings.get("TS:SortMaxSlots") + " ↓" }), React.createElement(Option, { value: SortType.MaxSlotsDesc, label: strings.get("TS:SortMaxSlots") + " ↑" })))),
        className: "map-list",
        tooltip: strings.get("STT:ScenarioListMaps"),
    }, filteredMaps.map((map) => {
        const isSelected = map.mapName === selectedMapName;
        return React.createElement(ListItem, {
            key: map.mapName,
            selected: isSelected,
            innerRef: isSelected ? selectedRef : null,
            onClick: () => onSelectMap(map.mapName, false),
            onDoubleClick: () => onSelectMap(map.mapName, true),
        }, map.mapTitle);
    })), React.createElement("div", { className: "map-sel-search" }, React.createElement("label", null, React.createElement("span", null, strings.get("GUI:Search")), React.createElement("input", {
        type: "text",
        className: "new-message",
        value: searchFilter,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSearchFilter(e.target.value),
    }))))));
};
