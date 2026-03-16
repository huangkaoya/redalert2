import { IniFile, IniSection } from '../data/IniFile';
import type { GameModeEntry } from '../game/ini/GameModes';
import type { VirtualFile } from '../data/vfs/VirtualFile';
import type { Strings } from '../data/Strings';
export class MapManifest {
    public fileName!: string;
    public uiName!: string;
    public maxSlots!: number;
    public official!: boolean;
    public gameModes!: GameModeEntry[];
    fromIni(section: IniSection, availableGameModes: GameModeEntry[]): this {
        this.fileName = section.getString("File") || section.name.toLowerCase() + ".map";
        this.uiName = section.getString("Description");
        this.maxSlots = section.getNumber("MaxPlayers");
        this.official = true;
        const supportedModeFilters = section.getArray("GameMode");
        this.gameModes = availableGameModes.filter((gm) => supportedModeFilters.includes(gm.mapFilter));
        return this;
    }
    getFullMapTitle(strings: Strings): string {
        const mapTitle = strings.get(this.uiName);
        return this.addTitleSlotsSuffix(mapTitle, this.maxSlots);
    }
    private addTitleSlotsSuffix(title: string, maxPlayers: number): string {
        if (!title.match(/(\s*\(|（)\s*\d(-\d)?\s*(\)|）)\s*$/)) {
            title += ` (2${maxPlayers > 2 ? "-" + maxPlayers : ""})`;
        }
        return title;
    }
    fromMapFile(mapFile: VirtualFile, availableGameModes: GameModeEntry[]): this {
        const mapContent = mapFile.readAsString();
        const mapFileName = mapFile.filename;
        const basicSectionContent = this.extractIniSection("Basic", mapContent);
        if (!basicSectionContent) {
            throw new Error(`Map "${mapFileName}" is missing the [Basic] section content`);
        }
        const basicIniFile = new IniFile(basicSectionContent);
        const basicSection = basicIniFile.getSection("Basic");
        if (!basicSection) {
            throw new Error(`Map "${mapFileName}" is missing the [Basic] section after parsing`);
        }
        this.fileName = mapFileName;
        this.uiName = "NOSTR:" + (basicSection.getString("Name") || mapFileName.replace(/\.[^.]+$/, ""));
        const waypointsSectionContent = this.extractIniSection("Waypoints", mapContent);
        let maxPlayersFromWaypoints = 0;
        if (waypointsSectionContent) {
            const waypointsIniFile = new IniFile(waypointsSectionContent);
            const waypointsSection = waypointsIniFile.getSection("Waypoints");
            if (waypointsSection) {
                maxPlayersFromWaypoints = Array.from(waypointsSection.entries.keys()).filter((key) => Number(key) < 8).length;
            }
        }
        this.maxSlots = maxPlayersFromWaypoints;
        this.official = basicSection.getBool("Official");
        const supportedModeFilters = basicSection.getArray("GameMode", /,\s*/, ["standard"]);
        this.gameModes = availableGameModes.filter((gm) => supportedModeFilters.includes(gm.mapFilter));
        return this;
    }
    private extractIniSection(sectionName: string, content: string): string | undefined {
        const sectionStartTag = `[${sectionName}]`;
        const startIndex = content.indexOf(sectionStartTag);
        if (startIndex !== -1) {
            let endIndex = content.length;
            let nextSectionIndex = startIndex + sectionStartTag.length;
            while (nextSectionIndex < content.length) {
                const nlIndex = content.indexOf('\n', nextSectionIndex);
                if (nlIndex === -1) {
                    nextSectionIndex = content.length;
                    break;
                }
                let line = content.substring(nextSectionIndex, nlIndex).trim();
                if (line.startsWith('[') && line.endsWith(']')) {
                    endIndex = nextSectionIndex;
                    break;
                }
                nextSectionIndex = nlIndex + 1;
                if (!line) {
                    continue;
                }
                const potentialNextSectionStart = content.indexOf('\n[', startIndex + sectionStartTag.length);
                if (potentialNextSectionStart !== -1) {
                    endIndex = potentialNextSectionStart + 1;
                }
                else {
                    endIndex = content.length;
                }
                break;
            }
            let currentSearchIndex = startIndex + sectionStartTag.length;
            let nextSectionFoundIndex = -1;
            while (currentSearchIndex < content.length) {
                let nlIndex = content.indexOf('\n', currentSearchIndex);
                if (nlIndex === -1)
                    break;
                if (content.charAt(nlIndex + 1) === '[') {
                    nextSectionFoundIndex = nlIndex + 1;
                    break;
                }
                currentSearchIndex = nlIndex + 1;
            }
            endIndex = nextSectionFoundIndex !== -1 ? nextSectionFoundIndex : content.length;
            return content.slice(startIndex, endIndex).trim();
        }
        return undefined;
    }
}
