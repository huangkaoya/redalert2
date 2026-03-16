import type { VirtualFile } from '../data/vfs/VirtualFile'; // Type for what rfsDir.getRawFile returns

export class LazyAsyncResourceCollection<T> {
  private resourceFactory: (file: VirtualFile | File) => Promise<T> | T;
  private cacheByDefault: boolean;
  private resources: Map<string, T> = new Map();
  private rfsDir?: FileSystemDirectoryHandle; // Real File System directory handle

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
    // Assuming rfsDir.containsEntry might not exist, using getRawFile check
    try {
      return !!(await this.rfsDir?.getFileHandle(key)); // Check if file handle can be retrieved
    } catch (e) {
      return false;
    }
  }

  async get(key: string): Promise<T | undefined> {
    let resource = this.resources.get(key);
    if (!resource && this.rfsDir) {
      try {
        // getRawFile in original. Assuming it returns something like VirtualFile or a handle that can be read.
        // In the new RFS, it might be getFileHandle then file.getFile()
        const fileHandle = await this.rfsDir.getFileHandle(key);
        const file = await fileHandle.getFile(); // This is a File object
        // The factory needs to be adapted if it expects a VirtualFile or DataStream.
        // For now, passing the File object, assuming factory can handle it or it will be adjusted.
        // Original was: this.rfsDir.getRawFile(e)
        // Let's assume getRawFile returned an object that could be passed to the factory.
        // For now, we will assume the factory expects a VirtualFile-like object which we don't have directly here.
        // This part needs careful review based on what `resourceFactory` actually expects for `Mp3File` and `WavFile` (for taunts).
        // The `Engine.ts` for taunts did: `new WavFile(new Uint8Array(await e.arrayBuffer()))` where e was `fileHandle` from rfsDir.
        // So the factory for taunts expects something with an `arrayBuffer()` method.
        resource = await this.resourceFactory(file);
        if (this.cacheByDefault) {
          this.resources.set(key, resource!);
        }
      } catch (e) {
        // File not found or other error
        // console.warn(`Could not load async resource ${key}`, e);
        return undefined;
      }
    }
    return resource;
  }

  clear(key?: string): void {
    if (key) {
      this.resources.delete(key);
    } else {
      this.resources.clear();
    }
  }
  
  // Added to match usage in Engine.ts, assuming it clears all loaded resources
  clearAll(): void {
    this.resources.clear();
  }
}
