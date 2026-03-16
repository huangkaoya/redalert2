import { FileNotFoundError } from '../../data/vfs/FileNotFoundError';
import { IOError } from '../../data/vfs/IOError';
export class FileSystemUtil {
    static async getDirContents(directoryHandle: FileSystemDirectoryHandle): Promise<FileSystemHandle[]> {
        const entries: FileSystemHandle[] = [];
        try {
            for await (const handle of directoryHandle.values()) {
                entries.push(handle);
            }
        }
        catch (e: any) {
            if (e.name === "NotFoundError") {
                const err = new FileNotFoundError(`Directory "${directoryHandle.name}" not found while getting contents`);
                (err as any).cause = e;
                throw err;
            }
            if (e instanceof DOMException) {
                const err = new IOError(`Directory "${directoryHandle.name}" could not be read (${e.name}) while getting contents`);
                (err as any).cause = e;
                throw err;
            }
            throw e;
        }
        return entries;
    }
    static async listDir(directoryHandle: FileSystemDirectoryHandle): Promise<string[]> {
        const entries: string[] = [];
        try {
            for await (const key of directoryHandle.keys()) {
                entries.push(key);
            }
        }
        catch (e: any) {
            if (e.name === "NotFoundError") {
                const err = new FileNotFoundError(`Directory "${directoryHandle.name}" not found while listing dir`);
                (err as any).cause = e;
                throw err;
            }
            if (e instanceof DOMException) {
                const err = new IOError(`Directory "${directoryHandle.name}" could not be read (${e.name}) while listing dir`);
                (err as any).cause = e;
                throw err;
            }
            throw e;
        }
        return entries;
    }
    static async showArchivePicker(fsAccessLib?: any): Promise<FileSystemFileHandle | null> {
        const pickerOptions = {
            types: [
                {
                    description: "Archive Files",
                    accept: {
                        "application/zip": [".zip"],
                        "application/x-7z-compressed": [".7z"],
                        "application/vnd.rar": [".rar"],
                        "application/x-tar": [".tar"],
                        "application/gzip": [".gz", ".tgz"],
                        "application/x-bzip2": [".bz2", ".tbz2"],
                        "application/x-xz": [".xz"],
                        "application/octet-stream": [".exe", ".mix"],
                    },
                },
            ],
            multiple: false,
        };
        const pickerFn = fsAccessLib?.showOpenFilePicker || (window as any).showOpenFilePicker;
        if (!pickerFn) {
            return null;
        }
        try {
            const handles = await pickerFn(pickerOptions);
            if (Array.isArray(handles)) {
                if (handles.length === 0)
                    return null;
                return handles[0];
            }
            return handles as FileSystemFileHandle;
        }
        catch (e: any) {
            if (e.name === 'AbortError') {
                console.log('File picker aborted by user.');
                return null;
            }
            console.error("Error showing file picker:", e);
            throw e;
        }
    }
    static polyfillGetFile(): void {
        if (typeof FileSystemFileHandle !== 'undefined' && FileSystemFileHandle.prototype) {
            const originalGetFile = FileSystemFileHandle.prototype.getFile;
            if (originalGetFile && originalGetFile.toString().includes("this.name")) {
                return;
            }
            if (originalGetFile) {
                FileSystemFileHandle.prototype.getFile = function (this: FileSystemFileHandle): Promise<File> {
                    const handleName = this.name;
                    return originalGetFile.call(this).then((file: File) => new File([file], handleName, {
                        type: file.type,
                        lastModified: file.lastModified,
                    }));
                };
            }
            else {
            }
        }
        else {
        }
    }
}
export {};
