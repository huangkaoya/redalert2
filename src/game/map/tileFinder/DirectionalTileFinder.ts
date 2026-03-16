import type { Tile } from "@/game/map/TileCollection";
import type { MapBounds } from "@/game/map/MapBounds";
interface TileCollection {
    getByMapCoords(x: number, y: number): Tile | undefined;
}
export class DirectionalTileFinder {
    private tiles: TileCollection;
    private mapBounds: MapBounds;
    private startTile: Tile;
    private maxDistance: number;
    private dirX: number;
    private dirY: number;
    private predicate: (tile: Tile) => boolean;
    private checkBounds: boolean;
    private finished: boolean;
    private distance: number;
    constructor(tiles: TileCollection, mapBounds: MapBounds, startTile: Tile, distance: number, maxDistance: number, dirX: number, dirY: number, predicate: (tile: Tile) => boolean = () => true, checkBounds: boolean = true) {
        this.tiles = tiles;
        this.mapBounds = mapBounds;
        this.startTile = startTile;
        this.maxDistance = maxDistance;
        this.dirX = dirX;
        this.dirY = dirY;
        this.predicate = predicate;
        this.checkBounds = checkBounds;
        this.finished = false;
        this.distance = distance;
    }
    getNextTile(): Tile | undefined {
        if (!this.finished) {
            let result: Tile | undefined;
            do {
                let coords = { x: this.startTile.rx, y: this.startTile.ry };
                coords.x += this.distance * Math.sign(this.dirX);
                coords.y += this.distance * Math.sign(this.dirY);
                const tile = this.tiles.getByMapCoords(coords.x, coords.y);
                if (tile &&
                    (!this.checkBounds || this.mapBounds.isWithinBounds(tile)) &&
                    this.predicate(tile) &&
                    (result = tile),
                    this.maxDistance && this.distance >= this.maxDistance) {
                    this.finished = true;
                    return result;
                }
            } while ((this.distance++, !result));
            return result;
        }
    }
}
