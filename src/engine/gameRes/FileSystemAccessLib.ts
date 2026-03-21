export interface FileSystemAccessAdapterSupport {
    native?: boolean;
    cache?: boolean;
    [key: string]: any;
}
export interface FileSystemAccessAdapters {
    indexeddb?: any;
    cache?: any;
    [key: string]: any;
}
export interface FileSystemAccessLib {
    support: {
        adapter: FileSystemAccessAdapterSupport;
    };
    adapters: FileSystemAccessAdapters;
    getOriginPrivateDirectory: (adapterModule?: any) => Promise<FileSystemDirectoryHandle>;
    polyfillDataTransferItem?: () => Promise<void>;
    showDirectoryPicker?: (options?: any) => Promise<FileSystemDirectoryHandle>;
    showOpenFilePicker?: (options?: any) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (options?: any) => Promise<FileSystemFileHandle>;
    [key: string]: any;
}
