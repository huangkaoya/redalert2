import React from "react";
import { ModStatus } from "@/gui/screen/mainMenu/modSel/ModStatus";
interface ModDetails {
    supported: boolean;
    name: string;
    description?: string;
    authors?: string[];
    version?: string;
    website?: string;
}
interface ModDetailsPaneProps {
    modDetails: ModDetails;
    modLoaded: boolean;
    modStatus: ModStatus;
    strings: any;
}
const statusLabels = new Map<ModStatus, string>([
    [ModStatus.Installed, "GUI:ModStatusInstalled"],
    [ModStatus.UpdateAvailable, "GUI:ModStatusUpdateAvail"],
    [ModStatus.NotInstalled, "GUI:ModStatusNotInstalled"],
]);
export const ModDetailsPane: React.FC<ModDetailsPaneProps> = ({ modDetails: { supported, name, description, authors, version, website }, modLoaded, modStatus, strings, }) => React.createElement("div", { className: "mod-details" }, React.createElement("table", null, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("td", null, strings.get("GUI:ModName"), ":"), React.createElement("td", null, name)), React.createElement("tr", null, React.createElement("td", null, strings.get("GUI:ModStatus"), ":"), React.createElement("td", null, strings.get(statusLabels.get(modStatus) ?? "GUI:Unknown"), modLoaded ? ", " + strings.get("GUI:ModLoaded") : "", supported ? "" : ", " + strings.get("GUI:ModUnsupported"))), version &&
    React.createElement("tr", null, React.createElement("td", null, strings.get("GUI:ModVersion"), ":"), React.createElement("td", null, version)), description &&
    React.createElement("tr", null, React.createElement("td", null, strings.get("GUI:ModDescription"), ":"), React.createElement("td", { className: "mod-desc" }, description)), authors &&
    React.createElement("tr", null, React.createElement("td", null, strings.get("GUI:ModAuthor"), ":"), React.createElement("td", null, authors.join(", "))), website &&
    React.createElement("tr", null, React.createElement("td", null, strings.get("GUI:ModWebsite"), ":"), React.createElement("td", null, React.createElement("a", {
        href: website,
        rel: "nofollow noopener",
        target: "_blank",
    }, website))))));
