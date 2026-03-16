import type { TileSetEntry } from './TileSetEntry';
export class TileSet {
    public fileName: string;
    public setName: string;
    public tilesInSet: number;
    public entries: TileSetEntry[] = [];
    constructor(fileName: string, setName: string, tilesInSet: number) {
        this.fileName = fileName;
        this.setName = setName;
        this.tilesInSet = tilesInSet;
    }
    getEntry(indexInSet: number): TileSetEntry | undefined {
        return this.entries[indexInSet];
    }
}
