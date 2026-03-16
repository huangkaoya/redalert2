import type { VirtualFile } from '../data/vfs/VirtualFile';
export class LazyAsyncResourceCollection<T> {
    private resourceFactory: (file: VirtualFile | File) => Promise<T> | T;
    private cacheByDefault: boolean;
    private resources: Map<string, T> = new Map();
    private rfsDir?: FileSystemDirectoryHandle;
    constructor(resourceFactory: (file: VirtualFile | File) => Promise<T> | T, cacheByDefault: boolean = true) {
        this.resourceFactory = resourceFactory;
        this.cacheByDefault = cacheByDefault;
    }
    setDir(rfsDir: FileSystemDirectoryHandle | undefined): void {
        this.rfsDir = rfsDir;
    }
    set(key: string, resource: T): void {
        this.resources.set(key, resource);
    }
    async has(key: string): Promise<boolean> {
        if (this.resources.has(key)) {
            return true;
        }
        try {
            return !!(await this.rfsDir?.getFileHandle(key));
        }
        catch (e) {
            return false;
        }
    }
    async get(key: string): Promise<T | undefined> {
        let resource = this.resources.get(key);
        if (!resource && this.rfsDir) {
            try {
                const fileHandle = await this.rfsDir.getFileHandle(key);
                const file = await fileHandle.getFile();
                resource = await this.resourceFactory(file);
                if (this.cacheByDefault) {
                    this.resources.set(key, resource!);
                }
            }
            catch (e) {
                return undefined;
            }
        }
        return resource;
    }
    clear(key?: string): void {
        if (key) {
            this.resources.delete(key);
        }
        else {
            this.resources.clear();
        }
    }
    clearAll(): void {
        this.resources.clear();
    }
}
