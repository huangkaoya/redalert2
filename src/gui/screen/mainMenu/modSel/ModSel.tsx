import React, { useRef, useEffect } from "react";
import { List, ListItem } from "@/gui/component/List";
import { ModDetailsPane } from "@/gui/screen/mainMenu/modSel/ModDetailsPane";
interface Mod {
    id: string;
    name: string;
    supported: boolean;
    status: any;
    meta: any;
}
interface ModSelProps {
    strings: any;
    mods: Mod[] | null;
    activeMod: Mod | null;
    selectedMod: Mod | null;
    onSelectMod: (mod: Mod, doubleClick?: boolean) => void;
}
export const ModSel: React.FC<ModSelProps> = ({ strings, mods, activeMod, selectedMod, onSelectMod, }) => {
    const selectedRef = useRef<HTMLElement>(null);
    useEffect(() => {
        selectedRef.current?.scrollIntoView();
    }, []);
    return React.createElement("div", { className: "mod-sel-form" }, React.createElement(List, { title: strings.get("GUI:SelectMod"), className: "mod-list" }, mods
        ? mods.map((mod) => {
            const isSelected = mod.id === selectedMod?.id;
            return React.createElement(ListItem, {
                key: mod.id,
                selected: isSelected,
                innerRef: isSelected ? selectedRef : null,
                onClick: () => onSelectMod(mod),
                onDoubleClick: () => onSelectMod(mod, true),
                style: { display: "flex" },
            }, React.createElement("div", { className: "mod-name" }, (mod === activeMod ? "✔ " : "") +
                mod.name +
                (mod.supported
                    ? ""
                    : ` (${strings.get("GUI:ModUnsupported").toUpperCase()})`)));
        })
        : React.createElement(ListItem, { style: { textAlign: "center" } }, strings.get("GUI:LoadingEx"))), selectedMod &&
        React.createElement(ModDetailsPane, {
            modLoaded: activeMod === selectedMod,
            modStatus: selectedMod.status,
            modDetails: selectedMod.meta,
            strings: strings,
        }));
};
