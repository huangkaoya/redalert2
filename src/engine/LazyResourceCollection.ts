import type { VirtualFileSystem } from '../data/vfs/VirtualFileSystem';
import type { VirtualFile } from '../data/vfs/VirtualFile';
export class LazyResourceCollection<T> {
    private resourceFactory: (file: VirtualFile) => T;
    private resources: Map<string, T> = new Map();
    private vfs?: VirtualFileSystem;
    constructor(resourceFactory: (file: VirtualFile) => T) {
        this.resourceFactory = resourceFactory;
    }
    setVfs(vfs: VirtualFileSystem): void {
        this.vfs = vfs;
    }
    set(key: string, resource: T): void {
        this.resources.set(key, resource);
    }
    has(key: string): boolean {
        const inMem = this.resources.has(key);
        const inVfs = this.vfs?.fileExists(key) ?? false;
        if (!inMem) {
            try {
            }
            catch { }
        }
        return !!inMem || inVfs;
    }
    get(key: string): T | undefined {
        let resource = this.resources.get(key);
        if (!resource) {
            try {
            }
            catch { }
            if (this.vfs?.fileExists(key)) {
                try {
                    const owners = (this.vfs as any).debugListFileOwners?.(key);
                    try {
                    }
                    catch { }
                }
                catch { }
                const file = this.vfs.openFile(key);
                if (file) {
                    resource = this.resourceFactory(file);
                    this.resources.set(key, resource!);
                    try {
                    }
                    catch { }
                }
            }
            else {
                try {
                    console.warn('[LazyResourceCollection.get] not found in VFS', { key, archives: this.vfs?.listArchives?.() });
                }
                catch { }
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
