export enum StorageKey {
    GameRes = "_r_gameRes",
    Options = "_r_opts_v3",
    Mixer = "_r_mixer_v3",
    MusicOpts = "_r_opts_music",
    LastGpuTier = "_r_last_gpu",
    LastSeenPatch = "_r_last_patch",
    LastMap = "_r_lastMap",
    LastMode = "_r_lastMode",
    LastSortMap = "_r_lastSortMap",
    LastPlayerCountry = "_r_lastCountry",
    LastPlayerColor = "_r_lastColor",
    LastPlayerStartPos = "_r_lastStartPos",
    LastPlayerTeam = "_r_lastTeam",
    LastQueueRanked = "_r_lastRanked",
    LastQueueType = "_r_lastQueueType",
    LastBots = "_r_lastBots",
    PreferredGameOpts = "_r_hostOpts",
    LastConnection = "_r_lastCon",
    PreferredServerRegion = "_r_region",
    TauntsEnabled = "_r_taunts",
    DonateBoxState = "_r_donateBoxState"
}
export class LocalPrefs {
    protected storage: Storage;
    constructor(storage: Storage) {
        this.storage = storage;
    }
    getItem(key: StorageKey | string): string | undefined {
        try {
            return this.storage?.getItem(String(key)) ?? undefined;
        }
        catch (e) {
            console.warn(`Unable to read key ${key} from storage.`, e);
            return undefined;
        }
    }
    setItem(key: StorageKey | string, value: string): boolean {
        try {
            this.storage?.setItem(String(key), value);
            return true;
        }
        catch (e) {
            console.warn(`Unable to write key ${key} to storage.`, e);
            return false;
        }
    }
    removeItem(key: StorageKey | string): void {
        try {
            this.storage?.removeItem(String(key));
        }
        catch (e) {
            console.warn(`Unable to remove key ${key} from storage.`, e);
        }
    }
    listItems(): string[] {
        if (this.storage && typeof this.storage.length === 'number') {
            const keys: string[] = [];
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key !== null) {
                    keys.push(key);
                }
            }
            return keys;
        }
        return [];
    }
    getBool(key: StorageKey | string, defaultValue: boolean = false): boolean {
        const value = this.getItem(key);
        if (value === undefined)
            return defaultValue;
        return value === "true" || value === "1";
    }
    getNumber(key: StorageKey | string, defaultValue: number = 0): number {
        const value = this.getItem(key);
        if (value === undefined)
            return defaultValue;
        const num = parseFloat(value);
        return isNaN(num) ? defaultValue : num;
    }
}
