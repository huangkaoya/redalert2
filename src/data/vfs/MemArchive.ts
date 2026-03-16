import type { VirtualFile } from "./VirtualFile";
export class MemArchive {
    private entries: Map<string, VirtualFile>;
    constructor() {
        this.entries = new Map<string, VirtualFile>();
    }
    addFile(file: VirtualFile): void {
        this.entries.set(file.filename, file);
    }
    containsFile(filename: string): boolean {
        return this.entries.has(filename);
    }
    openFile(filename: string): VirtualFile {
        if (!this.containsFile(filename)) {
            throw new Error(`File "${filename}" not found in MemArchive`);
        }
        return this.entries.get(filename)!;
    }
    listFiles(): string[] {
        return [...this.entries.keys()];
    }
    getAllFiles(): VirtualFile[] {
        return [...this.entries.values()];
    }
}
