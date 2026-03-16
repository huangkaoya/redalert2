export class TileSetAnim {
    public name: string;
    public subTile: number;
    public offsetX: number;
    public offsetY: number;
    constructor(name: string, subTile: number, offsetX: number, offsetY: number) {
        this.name = name;
        this.subTile = subTile;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    }
}
