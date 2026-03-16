import { DataStream } from '../../../data/DataStream';
import { VirtualFile } from '../../../data/vfs/VirtualFile';
import { BufferGeometrySerializer } from './BufferGeometrySerializer';
import { FileNotFoundError } from '../../../data/vfs/FileNotFoundError';
import * as THREE from 'three';
interface VirtualFileSystem {
    openFile(filename: string): Promise<{
        stream: DataStream;
    }>;
    writeFile(file: VirtualFile): Promise<void>;
    getEntries(): AsyncIterable<string>;
    deleteFile(filename: string): Promise<void>;
}
interface VxlFile {
    name: string;
}
export class VxlGeometryCache {
    static cacheFilePrefix = 'geocache_';
    private cacheDir: VirtualFileSystem | null;
    private activeMod: string | null;
    private geometries: Map<VxlFile, THREE.BufferGeometry>;
    constructor(cacheDir: VirtualFileSystem | null, activeMod: string | null) {
        this.cacheDir = cacheDir;
        this.activeMod = activeMod;
        this.geometries = new Map();
    }
    async loadFromStorage(vxlFile: VxlFile, filename: string): Promise<THREE.BufferGeometry | undefined> {
        let geometry = this.geometries.get(vxlFile);
        if (!geometry) {
            const cacheDir = this.cacheDir;
            if (cacheDir) {
                const cacheFileName = this.getCacheFileName(filename, vxlFile.name);
                try {
                    const file = await cacheDir.openFile(cacheFileName);
                    geometry = new BufferGeometrySerializer().unserialize(file.stream);
                    this.set(vxlFile, geometry);
                }
                catch (error) {
                    if (!(error instanceof FileNotFoundError)) {
                        console.error(`Failed to load buffer geometry from cache file "${cacheFileName}"`, error);
                    }
                }
            }
        }
        return geometry;
    }
    async persistToStorage(vxlFile: VxlFile, filename: string, data: ArrayBuffer): Promise<void> {
        if (!this.geometries.has(vxlFile)) {
            this.set(vxlFile, new BufferGeometrySerializer().unserialize(new DataStream(data)));
        }
        await this.cacheDir?.writeFile(new VirtualFile(new DataStream(data), this.getCacheFileName(filename, vxlFile.name)));
    }
    async clearStorage(): Promise<void> {
        await this.clearStorageFiles();
    }
    async clearOtherModStorage(): Promise<void> {
        const prefix = VxlGeometryCache.cacheFilePrefix + this.getModPrefix();
        await this.clearStorageFiles((filename) => !filename.startsWith(prefix));
    }
    async clearStorageFiles(filter: (filename: string) => boolean = () => true): Promise<void> {
        const cacheDir = this.cacheDir;
        if (cacheDir) {
            for await (const entry of cacheDir.getEntries()) {
                if (entry.startsWith(VxlGeometryCache.cacheFilePrefix) && filter(entry)) {
                    await cacheDir.deleteFile(entry);
                }
            }
        }
    }
    getCacheFileName(filename: string, vxlName: string): string {
        const modPrefix = this.getModPrefix();
        return VxlGeometryCache.cacheFilePrefix + modPrefix + filename.replace('.vxl', '') + '_' + vxlName;
    }
    getModPrefix(): string {
        return this.activeMod ? this.activeMod + '#' : '#';
    }
    clear(): void {
        this.geometries.forEach((geometry) => {
            geometry.dispose();
            for (const attributeName of Object.keys(geometry.attributes)) {
                geometry.deleteAttribute(attributeName);
            }
        });
        this.geometries.clear();
    }
    get(vxlFile: VxlFile): THREE.BufferGeometry | undefined {
        return this.geometries.get(vxlFile);
    }
    set(vxlFile: VxlFile, geometry: THREE.BufferGeometry): void {
        this.geometries.set(vxlFile, geometry);
    }
}
