import React from "react";
interface ModDownloadPromptProps {
    url: string;
    sizeMb: number;
    isUpdate: boolean;
    strings: any;
    onClick: () => void;
}
export const ModDownloadPrompt: React.FC<ModDownloadPromptProps> = ({ url, sizeMb, isUpdate, strings, onClick, }) => React.createElement("div", null, isUpdate &&
    React.createElement("p", { style: { marginTop: 0 } }, strings.get("GUI:ModUpdateAvail")), React.createElement("p", null, strings.get("GUI:ManualDownloadModPrompt")), React.createElement("a", {
    href: url,
    rel: "nofollow noopener",
    target: "_blank",
    onClick: onClick,
}, url), React.createElement("br", null), React.createElement("br", null), React.createElement("em", null, strings.get("ts:gameres_download_size", sizeMb)));
