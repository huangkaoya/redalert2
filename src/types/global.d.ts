declare global {
    interface FileSystemAccessIndexedDBAdapterOptions {
        name: string;
        rootName?: string;
    }
    interface FileSystemAccessAPI {
        adapters?: {
            indexeddb: (options: FileSystemAccessIndexedDBAdapterOptions) => Promise<FileSystemDirectoryHandle>;
        };
    }
    interface Window {
        showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
        FileExplorer: any;
        FileSystemAccess?: FileSystemAccessAPI;
    }
    interface FileSystemHandle {
        readonly kind: 'file' | 'directory';
        readonly name: string;
    }
    interface FileSystemFileHandle extends FileSystemHandle {
        readonly kind: 'file';
        getFile(): Promise<File>;
    }
    interface FileSystemDirectoryHandle extends FileSystemHandle {
        readonly kind: 'directory';
        entries(): AsyncIterableIterator<[
            string,
            FileSystemHandle
        ]>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<FileSystemHandle>;
        getDirectoryHandle(name: string, options?: {
            create?: boolean;
        }): Promise<FileSystemDirectoryHandle>;
        getFileHandle(name: string, options?: {
            create?: boolean;
        }): Promise<FileSystemFileHandle>;
        removeEntry(name: string, options?: {
            recursive?: boolean;
        }): Promise<void>;
    }
}
export {};
