import { IniFile, IniSection } from '../data/IniFile';
import type { GameModeEntry } from '../game/ini/GameModes';
import type { VirtualFile } from '../data/vfs/VirtualFile';
import type { Strings } from '../data/Strings'; // For getFullMapTitle string lookup

export class MapManifest {
  public fileName!: string;
  public uiName!: string; // Can be a string key like "NOSTR:MAPNAME" or direct name
  public maxSlots!: number;
  public official!: boolean;
  public gameModes!: GameModeEntry[];

  fromIni(section: IniSection, availableGameModes: GameModeEntry[]): this {
    this.fileName = section.getString("File") || section.name.toLowerCase() + ".map";
    this.uiName = section.getString("Description");
    this.maxSlots = section.getNumber("MaxPlayers");
    this.official = true; // In the original, maps from INI lists (missions.pkt) are considered official.
    
    const supportedModeFilters = section.getArray("GameMode");
    this.gameModes = availableGameModes.filter((gm) =>
      supportedModeFilters.includes(gm.mapFilter),
    );
    return this;
  }

  getFullMapTitle(strings: Strings): string {
    // Assuming strings.get() handles "NOSTR:" prefix or direct string retrieval.
    const mapTitle = strings.get(this.uiName);
    return this.addTitleSlotsSuffix(mapTitle, this.maxSlots);
  }

  private addTitleSlotsSuffix(title: string, maxPlayers: number): string {
    // Regex to check if title already ends with a player count like (2) or (2-4)
    if (!title.match(/(\s*\(|（)\s*\d(-\d)?\s*(\)|）)\s*$/)) {
      title += ` (2${maxPlayers > 2 ? "-" + maxPlayers : ""})`;
    }
    return title;
  }

  fromMapFile(mapFile: VirtualFile, availableGameModes: GameModeEntry[]): this {
    const mapContent = mapFile.readAsString(); // Assuming VirtualFile has readAsString()
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
        maxPlayersFromWaypoints = Array.from(waypointsSection.entries.keys()).filter(
          (key) => Number(key) < 8, // Player waypoints are 0-7
        ).length;
      }
    }
    this.maxSlots = maxPlayersFromWaypoints;
    this.official = basicSection.getBool("Official");

    const supportedModeFilters = basicSection.getArray("GameMode", /,\s*/, ["standard"]);
    this.gameModes = availableGameModes.filter((gm) =>
      supportedModeFilters.includes(gm.mapFilter),
    );
    return this;
  }

  private extractIniSection(sectionName: string, content: string): string | undefined {
    const sectionStartTag = `[${sectionName}]`;
    const startIndex = content.indexOf(sectionStartTag);

    if (startIndex !== -1) {
      let endIndex = content.length;
      let nextSectionIndex = startIndex + sectionStartTag.length;
      while(nextSectionIndex < content.length) {
        const nlIndex = content.indexOf('\n', nextSectionIndex);
        if (nlIndex === -1) {
            nextSectionIndex = content.length; // No more newlines, rest is part of section
            break;
        }
        let line = content.substring(nextSectionIndex, nlIndex).trim();
        if (line.startsWith('[') && line.endsWith(']')) {
            endIndex = nextSectionIndex; // Found start of next section on a new line
            break;
        }
        nextSectionIndex = nlIndex + 1;
        if (!line) { // If empty line, continue to check next line for section start
            continue;
        }
        // If non-empty line that is not a section, then current section continues
        // This loop will find the beginning of the *next* section by searching for '[' at the start of a line
        // The original code was a bit more complex: `("[" !== t[e] || "\n" !== t[e - 1]); e++`
        // This simplified version looks for `\n[` to mark end, or end of string
        const potentialNextSectionStart = content.indexOf('\n[', startIndex + sectionStartTag.length);
        if (potentialNextSectionStart !== -1) {
            endIndex = potentialNextSectionStart + 1; // +1 to keep the newline for the current section, or to mark start of next section block
        } else {
            endIndex = content.length;
        }
        break; // Break after first check for simplicity matching original loop structure more closely
      }
       // The original logic `for (;e < t.length && ("[" !== t[e] || "\n" !== t[e - 1]);e++);` is tricky.
      // It continues as long as the current char is NOT `[` OR the previous char is NOT `\n`.
      // This means it stops if current char IS `[` AND previous char IS `\n` (start of new section on new line).
      // A simpler interpretation for robust extraction up to the next `\n[` or end of string:
      let currentSearchIndex = startIndex + sectionStartTag.length;
      let nextSectionFoundIndex = -1;
      while(currentSearchIndex < content.length) {
          let nlIndex = content.indexOf('\n', currentSearchIndex);
          if (nlIndex === -1) break; // No more newlines
          if (content.charAt(nlIndex + 1) === '[') {
              nextSectionFoundIndex = nlIndex + 1;
              break;
          }
          currentSearchIndex = nlIndex + 1;
      }
      endIndex = nextSectionFoundIndex !== -1 ? nextSectionFoundIndex : content.length;
      return content.slice(startIndex, endIndex).trim(); // Trim trailing newlines from section
    }
    return undefined;
  }
}
