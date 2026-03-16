import { FileNotFoundError } from '../../data/vfs/FileNotFoundError';
import { IOError } from '../../data/vfs/IOError';

export class FileSystemUtil {
    /**
     * Gets all FileSystemHandle entries (files and directories) from a given directory handle.
     * @param directoryHandle The FileSystemDirectoryHandle to read from.
     * @returns A promise that resolves to an array of FileSystemHandle objects.
     */
    static async getDirContents(directoryHandle: FileSystemDirectoryHandle): Promise<FileSystemHandle[]> {
        const entries: FileSystemHandle[] = [];
        try {
            for await (const handle of directoryHandle.values()) {
                entries.push(handle);
            }
        } catch (e: any) {
            if (e.name === "NotFoundError") {
                const err = new FileNotFoundError(
                    `Directory "${directoryHandle.name}" not found while getting contents`
                );
                (err as any).cause = e; 
                throw err;
            }
            if (e instanceof DOMException) {
                const err = new IOError(
                    `Directory "${directoryHandle.name}" could not be read (${e.name}) while getting contents`
                );
                (err as any).cause = e;
                throw err;
            }
            throw e;
        }
        return entries;
    }

    /**
     * Lists the names of all entries (files and directories) in a given directory handle or RealFileSystemDir.
     * @param dirHandleOrWrapper The FileSystemDirectoryHandle or RealFileSystemDir to list.
     * @returns A promise that resolves to an array of entry names (strings).
     */
    static async listDir(directoryHandle: FileSystemDirectoryHandle): Promise<string[]> {
        const entries: string[] = [];
        try {
            for await (const key of directoryHandle.keys()) {
                entries.push(key);
            }
        } catch (e: any) {
            if (e.name === "NotFoundError") {
                const err = new FileNotFoundError(
                    `Directory "${directoryHandle.name}" not found while listing dir`
                );
                (err as any).cause = e;
                throw err;
            }
            if (e instanceof DOMException) {
                const err = new IOError(
                    `Directory "${directoryHandle.name}" could not be read (${e.name}) while listing dir`
                );
                (err as any).cause = e;
                throw err;
            }
            throw e;
        }
        return entries;
    }

    /**
     * Shows an open file picker dialog, configured to select common archive types.
     * @param fsAccessLib An object providing the showOpenFilePicker method.
     * @returns A promise that resolves to a FileSystemFileHandle for the selected archive.
     */
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
            // console.warn("showOpenFilePicker API is not available.");
            // throw new Error("File picker API is not available."); // Original did not throw here
            return null; // Match original behavior of potentially returning null if API is missing.
        }

        try {
            const handles = await pickerFn(pickerOptions);
            if (Array.isArray(handles)) {
                if (handles.length === 0) return null; // No file selected
                return handles[0];
            }
            return handles as FileSystemFileHandle; 
        } catch (e: any) {
            if (e.name === 'AbortError') {
                console.log('File picker aborted by user.');
                return null;
            }
            console.error("Error showing file picker:", e);
            throw e; 
        }
    }

    /**
     * Polyfills the FileSystemFileHandle.getFile() method to ensure the returned File object
     * correctly carries over the `name` property from the handle.
     * This addresses inconsistencies in some browser implementations.
     */
    static polyfillGetFile(): void {
        if (typeof FileSystemFileHandle !== 'undefined' && FileSystemFileHandle.prototype) {
            const originalGetFile = FileSystemFileHandle.prototype.getFile;
            if (originalGetFile && originalGetFile.toString().includes("this.name")) { 
                 // Polyfill seems to be already applied or not needed based on this check from original.
                return;
            }
            if (originalGetFile) { 
                FileSystemFileHandle.prototype.getFile = function(this: FileSystemFileHandle): Promise<File> {
                    const handleName = this.name; 
                    return originalGetFile.call(this).then(
                        (file: File) =>
                            new File([file], handleName, {
                                type: file.type,
                                lastModified: file.lastModified,
                            }),
                    );
                };
            } else {
                // console.warn("FileSystemFileHandle.prototype.getFile does not exist. Polyfill skipped.");
            }
        } else {
            // console.warn("FileSystemFileHandle is not defined. Polyfill for getFile skipped.");
        }
    }
}

export {}; // Add an empty export to make this a module and avoid global scope issues 
