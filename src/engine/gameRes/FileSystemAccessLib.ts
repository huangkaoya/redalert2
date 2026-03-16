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
    [key: string]: any;
}
