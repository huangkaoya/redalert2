import { MpDialogSettings } from '../rules/MpDialogSettings';
import { GameModeType } from './GameModeType';
import type { IniFile } from '../../data/IniFile';
import type { IniSection } from '../../data/IniSection';
export interface GameModeEntry {
    id: number;
    type: GameModeType;
    label: string;
    description: string;
    rulesOverride: string;
    mapFilter: string;
    randomMapsAllowed: string;
    aiAllowed: boolean;
    mpDialogSettings: MpDialogSettings;
}
export class GameModes {
    private modeIniLoader: (fileName: string) => IniFile;
    private entries: Map<number, GameModeEntry> = new Map();
    constructor(mainMpModesIni: IniFile, modeIniLoader: (fileName: string) => IniFile) {
        this.modeIniLoader = modeIniLoader;
        this.loadIni(mainMpModesIni);
    }
    private loadIni(iniFile: IniFile): void {
        iniFile.getOrderedSections().forEach((section: IniSection) => {
            const gameModeTypeKey = section.name as keyof typeof GameModeType;
            const type: GameModeType = GameModeType[gameModeTypeKey] ?? GameModeType.Battle;
            Array.from(section.entries.keys()).forEach((key: string) => {
                const values = section.getArray(key);
                if (values.length < 5) {
                    throw new Error(`Invalid format for mp mode entry "${key}". Expected at least 5 values.`);
                }
                const id = Number(key);
                const rulesOverrideFileName = values[2].toLowerCase();
                const entry: GameModeEntry = {
                    id: id,
                    type: type,
                    label: values[0],
                    description: values[1],
                    rulesOverride: rulesOverrideFileName,
                    mapFilter: values[3],
                    randomMapsAllowed: values[4],
                    aiAllowed: id < 3,
                    mpDialogSettings: new MpDialogSettings().readIni(this.modeIniLoader(rulesOverrideFileName).getOrCreateSection("MultiplayerDialogSettings")),
                };
                this.entries.set(id, entry);
            });
        });
    }
    getById(id: number): GameModeEntry {
        const entry = this.entries.get(id);
        if (!entry) {
            throw new Error(`No game mode found with id ${id}`);
        }
        return entry;
    }
    hasId(id: number): boolean {
        return this.entries.has(id);
    }
    getAll(): GameModeEntry[] {
        return Array.from(this.entries.values());
    }
}
