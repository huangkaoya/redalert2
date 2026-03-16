import type { TileSet } from "./TileSet";
import type { TileSetAnim } from "./TileSetAnim";
import type { TmpFile } from "../../data/TmpFile";
export class TileSetEntry {
    public owner: TileSet;
    public index: number;
    public files: TmpFile[] = [];
    public animation?: TileSetAnim;
    constructor(owner: TileSet, indexInSet: number) {
        this.owner = owner;
        this.index = indexInSet;
    }
    addFile(file: TmpFile): void {
        this.files.push(file);
    }
    setAnimation(animation: TileSetAnim): void {
        this.animation = animation;
    }
    getAnimation(): TileSetAnim | undefined {
        return this.animation;
    }
    getTmpFile(subTileIndex: number, randomIndexSelector: (min: number, max: number) => number, preferNonDamaged: boolean = false): TmpFile | undefined {
        if (this.files.length > 0) {
            const selectedFileIndex = randomIndexSelector(0, this.files.length - 1);
            let fileToReturn = this.files[selectedFileIndex];
            if (preferNonDamaged &&
                fileToReturn &&
                subTileIndex < fileToReturn.images.length &&
                (fileToReturn.images[subTileIndex] as any).hasDamagedData) {
                const fallbackIndex = Math.min(preferNonDamaged ? 1 : 0, this.files.length - 1);
                return this.files[fallbackIndex];
            }
            return fileToReturn;
        }
        return undefined;
    }
}
