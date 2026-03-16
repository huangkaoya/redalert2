import React from "react";
import classnames from "classnames";
import { Image } from "@/gui/component/Image";
import { ButtonSelect } from "@/gui/component/ButtonSelect";
import { ColorSelect } from "@/gui/component/ColorSelect";
import { CountrySelect } from "@/gui/component/CountrySelect";
import { Option } from "@/gui/component/Option";
import { RankIndicator } from "@/gui/screen/mainMenu/lobby/component/RankIndicator";
import { QuickGameChat } from "@/gui/screen/mainMenu/quickGame/component/QuickGameChat";
interface QuickGameFormProps {
    strings: any;
    disabled: boolean;
    playerName: string;
    playerProfile: any;
    unrankedEnabled: boolean;
    ranked: boolean;
    type: string;
    availableTypes: string[];
    enabledTypes: string[];
    chatProps: any;
    onRankedChange: (ranked: boolean) => void;
    onTypeChange: (type: string) => void;
}
export const QuickGameForm: React.FC<QuickGameFormProps> = ({ strings, disabled, playerName, playerProfile, unrankedEnabled, ranked, type, availableTypes, enabledTypes, chatProps, onRankedChange, onTypeChange, }) => {
    return React.createElement("div", { className: "qm-form" }, React.createElement("div", { className: "qm-top" }, React.createElement("div", { className: "opts" }, React.createElement("div", { className: "item qm-game-type-item" }, React.createElement("label", null, React.createElement("span", { className: "label" }, strings.get("GUI:QuickMatchGameMode")), React.createElement("div", { className: "qm-game-type" }, React.createElement(ButtonSelect, {
        initialValue: type,
        onSelect: (value: string) => onTypeChange(value),
        disabled: disabled,
    }, availableTypes.map((typeValue) => React.createElement(Option, {
        value: typeValue,
        label: typeValue,
        key: typeValue,
        disabled: !enabledTypes.includes(typeValue),
    })))))), React.createElement("div", { className: "item qm-ranked-item" }, React.createElement("label", null, React.createElement("span", { className: "label" }, strings.get("GUI:QuickMatchRanked")), React.createElement("div", { className: "qm-ranked" }, React.createElement(ButtonSelect, {
        initialValue: ranked,
        onSelect: (value: boolean) => onRankedChange(value),
        disabled: disabled || !unrankedEnabled,
    }, React.createElement(Option, {
        value: true,
        label: strings.get("GUI:Yes"),
        key: "ranked",
    }), React.createElement(Option, {
        value: false,
        label: strings.get("GUI:No"),
        key: "unranked",
        disabled: !unrankedEnabled,
    })))))), React.createElement("div", { className: "qm-player" }, React.createElement("div", { className: "qm-player-info" }, React.createElement("div", { className: "qm-player-name" }, playerName), playerProfile &&
        React.createElement(RankIndicator, {
            rank: playerProfile.rank,
            points: playerProfile.points,
            strings: strings,
        })))), React.createElement("div", { className: "qm-bottom" }, React.createElement(QuickGameChat, chatProps)));
};
