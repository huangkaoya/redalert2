import { FileNotFoundError } from "./FileNotFoundError";
import { RealFileSystemDir } from "./RealFileSystemDir";
import type { VirtualFile } from "./VirtualFile";
export interface RFSConstructorOptions {
}
export class RealFileSystem {
    private directories: RealFileSystemDir[];
    private rootDirectory: RealFileSystemDir | undefined;
    private rootDirectoryHandle: FileSystemDirectoryHandle | undefined;
    constructor(options?: RFSConstructorOptions) {
        this.directories = [];
    }
    addRootDirectoryHandle(handle: FileSystemDirectoryHandle): RealFileSystemDir {
        this.rootDirectoryHandle = handle;
        const newDir = new RealFileSystemDir(handle);
        this.directories.push(newDir);
        this.rootDirectory = newDir;
        return newDir;
    }
    getRootDirectoryHandle(): FileSystemDirectoryHandle | undefined {
        return this.rootDirectoryHandle;
    }
    addDirectoryHandle(handle: FileSystemDirectoryHandle): RealFileSystemDir {
        const newDir = new RealFileSystemDir(handle);
        this.directories.push(newDir);
        return newDir;
    }
    addDirectory(dir: RealFileSystemDir): void {
        if (!this.directories.includes(dir)) {
            this.directories.push(dir);
        }
    }
    async getDirectory(path: string): Promise<RealFileSystemDir> {
        for (const dir of this.directories) {
            if (dir.name === path)
                return dir;
            try {
                return await dir.getDirectory(path);
            }
            catch (e) {
                if (!(e instanceof FileNotFoundError)) {
                }
            }
        }
        throw new Error(`Directory "${path}" not found in real file system`);
    }
    async findDirectory(directoryName: string): Promise<RealFileSystemDir | undefined> {
        for (const dir of this.directories) {
            if (await dir.containsEntry(directoryName)) {
                try {
                    return await dir.getDirectory(directoryName);
                }
                catch (e) {
                    continue;
                }
            }
        }
        return undefined;
    }
    getRootDirectory(): RealFileSystemDir | undefined {
        return this.rootDirectory;
    }
    async containsEntry(entryName: string): Promise<boolean> {
        for (const dir of this.directories) {
            if (await dir.containsEntry(entryName)) {
                return true;
            }
        }
        return false;
    }
    async openFile(filename: string, skipCaseFix: boolean = false): Promise<VirtualFile> {
        for (const dir of this.directories) {
            try {
                return await dir.openFile(filename, skipCaseFix);
            }
            catch (e) {
                if (!(e instanceof FileNotFoundError)) {
                    throw e;
                }
            }
        }
        throw new FileNotFoundError(`File "${filename}" not found in any registered real file system directories.`);
    }
    async getRawFile(filename: string): Promise<File> {
        for (const dir of this.directories) {
            try {
                return await dir.getRawFile(filename);
            }
            catch (e) {
                if (!(e instanceof FileNotFoundError))
                    throw e;
            }
        }
        throw new FileNotFoundError(`File "${filename}" not found in real file system (getRawFile)`);
    }
    async *getEntries(): AsyncGenerator<string, void, undefined> {
        for (const dir of this.directories) {
            for await (const entryName of dir.getEntries()) {
                yield entryName;
            }
        }
    }
}
