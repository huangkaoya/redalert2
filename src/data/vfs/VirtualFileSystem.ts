import { AudioBagFile } from "../AudioBagFile";
import { IdxFile } from "../IdxFile";
import { MixFile } from "../MixFile";
import { EngineType } from "../../engine/EngineType";
import { pad } from "../../util/string";
import { FileNotFoundError } from "./FileNotFoundError";
import { MemArchive } from "./MemArchive";
import type { VirtualFile } from "./VirtualFile";
import type { RealFileSystem } from "./RealFileSystem";
interface VfsLogger {
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}
interface Archive {
    containsFile(filename: string): boolean;
    openFile(filename: string): VirtualFile;
}
export class VirtualFileSystem {
    private rfs: RealFileSystem;
    private logger: VfsLogger;
    private allArchives: Map<string, Archive>;
    private archivesByPriority: Archive[];
    constructor(rfs: RealFileSystem, logger: VfsLogger) {
        this.rfs = rfs;
        this.logger = logger;
        this.allArchives = new Map<string, Archive>();
        this.archivesByPriority = [];
    }
    fileExists(filename: string): boolean {
        for (const archive of this.archivesByPriority) {
            if (archive.containsFile(filename)) {
                return true;
            }
        }
        return false;
    }
    openFile(filename: string): VirtualFile {
        for (const archive of this.archivesByPriority) {
            if (archive.containsFile(filename)) {
                return archive.openFile(filename);
            }
        }
        throw new FileNotFoundError(`File "${filename}" not found in VFS`);
    }
    addArchive(archive: Archive, name: string): void {
        if (!this.allArchives.has(name)) {
            this.allArchives.set(name, archive);
            this.archivesByPriority.push(archive);
            this.logger.info(`Added archive "${name}" to VFS`);
        }
    }
    hasArchive(name: string): boolean {
        return this.allArchives.has(name);
    }
    removeArchive(name: string): void {
        const archive = this.allArchives.get(name);
        if (archive) {
            this.allArchives.delete(name);
            const index = this.archivesByPriority.indexOf(archive);
            if (index > -1) {
                this.archivesByPriority.splice(index, 1);
            }
            this.logger.info(`Removed archive "${name}" from VFS`);
        }
    }
    listArchives(): string[] {
        return [...this.allArchives.keys()];
    }
    debugListFileOwners(filename: string): string[] {
        const owners: string[] = [];
        this.allArchives.forEach((archive, name) => {
            try {
                if (archive.containsFile(filename))
                    owners.push(name);
            }
            catch {
            }
        });
        return owners;
    }
    private async openFileWithRfs(filename: string): Promise<VirtualFile | undefined> {
        let file: VirtualFile | undefined;
        try {
            file = await this.rfs.openFile(filename);
        }
        catch (e) {
            if (!(e instanceof FileNotFoundError)) {
                throw e;
            }
        }
        if (!file) {
            if (!this.fileExists(filename)) {
                this.logger.warn(`File "${filename}" not found in VFS, returning undefined`);
                return undefined;
            }
            file = this.openFile(filename);
        }
        return file;
    }
    private async addArchiveByFilename(filename: string, createArchive: (file: VirtualFile) => Archive | Promise<Archive>): Promise<void> {
        if (this.allArchives.has(filename)) {
            this.logger.info(`Archive "${filename}" already loaded, skipping.`);
            return;
        }
        const virtualFile = await this.openFileWithRfs(filename);
        if (virtualFile) {
            try {
                const archive = await createArchive(virtualFile);
                this.addArchive(archive, filename);
            }
            catch (error) {
                this.logger.error(`Failed to create archive from "${filename}":`, error);
            }
        }
        else {
            this.logger.warn(`Could not open "${filename}" via RFS to add as archive.`);
        }
    }
    async addMixFile(filename: string): Promise<void> {
        await this.addArchiveByFilename(filename, async (fileStreamHolder) => {
            if (filename === "ra2.mix") {
                this.logger.info(`Testing original MixFile implementation for ${filename}...`);
                try {
                    this.logger.info(`Original MixFile created successfully for ${filename}`);
                }
                catch (error) {
                    this.logger.error(`Original MixFile failed for ${filename}:`, error);
                }
                fileStreamHolder.stream.seek(0);
            }
            return new MixFile(fileStreamHolder.stream);
        });
    }
    async addBagFile(filename: string): Promise<void> {
        const idxFilename = filename.replace(/\.bag$/i, ".idx");
        try {
            const idxFile = await this.openFileWithRfs(idxFilename);
            if (!idxFile) {
                this.logger.error(`IDX file "${idxFilename}" not found for BAG file "${filename}".`);
                return;
            }
            await this.addArchiveByFilename(filename, async (bagVirtualFile) => {
                const idxData = new IdxFile(idxFile.stream);
                const audioBag = new AudioBagFile();
                await audioBag.fromVirtualFile(bagVirtualFile, idxData);
                return audioBag;
            });
        }
        catch (error) {
            this.logger.error(`Failed to add BAG file "${filename}":`, error);
        }
    }
    async loadImplicitMixFiles(engineType: EngineType): Promise<void> {
        this.logger.info("Initializing implicit mix files...");
        const YR = engineType === EngineType.YurisRevenge;
        if (YR)
            await this.addMixFile("langmd.mix");
        await this.addMixFile("language.mix");
        if (YR)
            await this.addMixFile("ra2md.mix");
        await this.addMixFile("ra2.mix");
        if (YR)
            await this.addMixFile("cachemd.mix");
        await this.addMixFile("cache.mix");
        if (YR)
            await this.addMixFile("loadmd.mix");
        await this.addMixFile("load.mix");
        if (YR)
            await this.addMixFile("localmd.mix");
        await this.addMixFile("local.mix");
        if (YR)
            await this.addMixFile("ntrlmd.mix");
        await this.addMixFile("neutral.mix");
        if (YR)
            await this.addMixFile("audiomd.mix");
        await this.addMixFile("audio.mix");
        await this.addBagFile("audio.bag");
        await this.addMixFile("conquer.mix");
        if (YR) {
            await this.addMixFile("conqmd.mix");
            await this.addMixFile("genermd.mix");
        }
        await this.addMixFile("generic.mix");
        if (YR)
            await this.addMixFile("isogenmd.mix");
        await this.addMixFile("isogen.mix");
        if (YR)
            await this.addMixFile("cameomd.mix");
        await this.addMixFile("cameo.mix");
        await this.addMixFile("cameocd.mix");
        if (YR)
            await this.addMixFile("multimd.mix");
        await this.addMixFile("multi.mix");
        this.logger.info("Finished initializing implicit mix files.");
    }
    async loadExtraMixFiles(engineType: EngineType): Promise<void> {
        this.logger.info("Loading extra mix files...");
        const rfsEntries = new Set<string>();
        for await (const entry of this.rfs.getEntries()) {
            rfsEntries.add(entry.toLowerCase());
        }
        const prefixes = ["ecache", "expand", "elocal"];
        for (const prefix of prefixes) {
            for (let i = 99; i >= 0; i--) {
                const numStr = pad(i, "00");
                const baseFilename = `${prefix}${numStr}.mix`;
                const mdFilename = `${prefix}md${numStr}.mix`;
                const filesToTry: string[] = [];
                if (engineType === EngineType.YurisRevenge) {
                    filesToTry.push(mdFilename);
                }
                filesToTry.push(baseFilename);
                for (const fileToTry of filesToTry) {
                    if (rfsEntries.has(fileToTry)) {
                        if (!this.hasArchive(fileToTry)) {
                            await this.addMixFile(fileToTry);
                        }
                    }
                }
            }
        }
        const mapExtensions = [".mmx"];
        if (engineType === EngineType.YurisRevenge) {
            mapExtensions.push(".yro");
        }
        for (const ext of mapExtensions) {
            for (const rfsFile of rfsEntries) {
                if (rfsFile.endsWith(ext)) {
                    if (!this.hasArchive(rfsFile)) {
                        const fileData = await this.rfs.openFile(rfsFile);
                        if (fileData) {
                            this.addArchive(new MixFile(fileData.stream), rfsFile);
                        }
                        else {
                            this.logger.warn(`Could not open RFS file ${rfsFile} for map archive loading.`);
                        }
                    }
                }
            }
        }
        this.logger.info("Finished loading extra mix files.");
    }
    async loadStandaloneFiles(options?: {
        exclude?: string[];
    }): Promise<void> {
        this.logger.info("Loading standalone files into mem.archive...");
        const extensionsToLoad = ["ini", "csf"];
        const excludeSet = new Set<string>((options?.exclude || []).map(f => f.toLowerCase()));
        const filesForMemArchive: VirtualFile[] = [];
        for await (const entryName of this.rfs.getEntries()) {
            const lowerEntryName = entryName.toLowerCase();
            if (extensionsToLoad.some((ext) => lowerEntryName.endsWith("." + ext)) &&
                !excludeSet.has(lowerEntryName)) {
                try {
                    const file = await this.rfs.openFile(entryName);
                    if (file) {
                        filesForMemArchive.push(file);
                    }
                }
                catch (e) {
                    if (e instanceof FileNotFoundError) {
                        this.logger.warn(`Standalone file ${entryName} not found during VFS loadStandaloneFiles.`);
                    }
                    else {
                        throw e;
                    }
                }
            }
        }
        if (filesForMemArchive.length > 0) {
            const memArchive = new MemArchive();
            for (const vf of filesForMemArchive) {
                memArchive.addFile(vf);
            }
            this.addArchive(memArchive, "mem.archive");
            this.logger.info(`Added ${filesForMemArchive.length} standalone files to mem.archive`);
        }
        else {
            this.logger.info("No standalone files found or added to mem.archive.");
        }
    }
}
