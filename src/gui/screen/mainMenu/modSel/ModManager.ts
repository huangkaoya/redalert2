import { IniFile } from "data/IniFile";
import { RouteHelper } from "RouteHelper";
import { Mod } from "@/gui/screen/mainMenu/modSel/Mod";
import { ModMeta } from "@/gui/screen/mainMenu/modSel/ModMeta";
interface Directory {
    getEntries(): AsyncIterable<string>;
    containsEntry(name: string): Promise<boolean>;
    getDirectory(name: string, create: boolean): Promise<Directory>;
    getRawFile(name: string): Promise<RawFile>;
    deleteDirectory(name: string, recursive: boolean): Promise<void>;
}
interface RawFile {
    text(): Promise<string>;
}
interface AppResourceLoader {
    loadText(fileName: string): Promise<string>;
}
interface Location {
    href: string;
}
export class ModManager {
    public static readonly remoteListFileName = "mods.ini";
    public static readonly modMetaFileName = "modcd.ini";
    public static readonly modIdRegex = /^[a-z0-9-_]+$/i;
    private location: Location;
    private modDir: Directory;
    private appResourceLoader: AppResourceLoader;
    constructor(location: Location, modDir: Directory, appResourceLoader: AppResourceLoader) {
        this.location = location;
        this.modDir = modDir;
        this.appResourceLoader = appResourceLoader;
    }
    getModDir(): Directory {
        return this.modDir;
    }
    async buildModList(localMods: ModMeta[], remoteMods?: ModMeta[]): Promise<Mod[]> {
        const mods: Mod[] = [];
        const remoteModsCopy = [...(remoteMods ?? [])];
        for (const localMod of localMods) {
            const remoteIndex = remoteModsCopy.findIndex((remote) => remote.id === localMod.id);
            const remoteMod = remoteIndex !== -1 ? remoteModsCopy.splice(remoteIndex, 1)[0] : undefined;
            mods.push(new Mod(localMod, remoteMod));
        }
        for (const remoteMod of remoteModsCopy) {
            mods.push(new Mod(undefined, remoteMod));
        }
        return mods;
    }
    async listRemote(): Promise<ModMeta[]> {
        const iniText = await this.appResourceLoader.loadText(ModManager.remoteListFileName);
        const iniFile = new IniFile(iniText);
        const generalSection = iniFile.getSection("General");
        if (!generalSection) {
            throw new Error(ModManager.remoteListFileName + " is missing the [General] section");
        }
        const mods: ModMeta[] = [];
        for (const modId of generalSection.entries.values()) {
            const modSection = iniFile.getSection(modId);
            if (modSection) {
                const modMeta = new ModMeta().fromIniSection(modSection);
                mods.push(modMeta);
            }
            else {
                console.warn(`Mod "${modId}" has no INI section`);
            }
        }
        return mods;
    }
    async listLocal(): Promise<ModMeta[]> {
        const mods: ModMeta[] = [];
        if (this.modDir) {
            for await (const modId of this.modDir.getEntries()) {
                const modMeta = await this.loadModMeta(modId);
                mods.push(modMeta);
            }
        }
        mods.sort((a, b) => a.name!.localeCompare(b.name!));
        return mods;
    }
    async loadModMeta(modId: string): Promise<ModMeta> {
        const modMeta = new ModMeta();
        modMeta.id = modId;
        modMeta.name = modId;
        try {
            const modDirectory = await this.modDir.getDirectory(modId, true);
            const metaFile = (await modDirectory.containsEntry(ModManager.modMetaFileName))
                ? await modDirectory.getRawFile(ModManager.modMetaFileName)
                : undefined;
            if (metaFile) {
                try {
                    modMeta.fromIniFile(new IniFile(await metaFile.text()));
                }
                catch (error) {
                    console.warn(`Couldn't parse meta file in mod folder "${modId}"`);
                    modMeta.name = modId;
                }
                modMeta.id = modId;
            }
        }
        catch (error) {
            console.warn(error);
        }
        return modMeta;
    }
    async deleteModFiles(modId: string): Promise<void> {
        if (await this.modDir?.containsEntry(modId)) {
            await this.modDir.deleteDirectory(modId, true);
        }
    }
    loadMod(modId?: string): void {
        const url = new URL(this.location.href);
        if (modId) {
            url.searchParams.set(RouteHelper.modQueryStringName, modId);
        }
        else {
            url.searchParams.delete(RouteHelper.modQueryStringName);
        }
        this.location.href = url.href;
    }
}
