import type { Tile } from "@/game/map/TileCollection";
import type { MapBounds } from "@/game/map/MapBounds";
interface TileCollection {
    getByMapCoords(x: number, y: number): Tile | undefined;
}
interface Foundation {
    width: number;
    height: number;
}
export class RadialBackFirstTileFinder {
    private tiles: TileCollection;
    private mapBounds: MapBounds;
    private startTile: Tile;
    private foundation: Foundation;
    private maxDistance: number;
    private predicate: (tile: Tile) => boolean;
    private checkBounds: boolean;
    private distance: number;
    private generator: Generator<Tile | undefined>;
    constructor(tiles: TileCollection, mapBounds: MapBounds, startTile: Tile, foundation: Foundation, distance: number, maxDistance: number, predicate: (tile: Tile) => boolean, checkBounds: boolean = true) {
        this.tiles = tiles;
        this.mapBounds = mapBounds;
        this.startTile = startTile;
        this.foundation = foundation;
        this.maxDistance = maxDistance;
        this.predicate = predicate;
        this.checkBounds = checkBounds;
        this.distance = distance;
        this.generator = this.generate();
    }
    getNextTile(): Tile | undefined {
        return this.generator.next().value;
    }
    private *generate(): Generator<Tile | undefined> {
        const getTile = (x: number, y: number): Tile | undefined => {
            const tile = this.tiles.getByMapCoords(x, y);
            if (tile &&
                (!this.checkBounds || this.mapBounds.isWithinBounds(tile)) &&
                this.predicate(tile)) {
                return tile;
            }
        };
        do {
            const left = this.startTile.rx - this.distance;
            const top = this.startTile.ry - this.distance;
            const right = this.startTile.rx + this.foundation.width - 1 + this.distance;
            const bottom = this.startTile.ry + this.foundation.height - 1 + this.distance;
            if (this.distance > 0) {
                for (let y = top + 1; y < bottom; y++) {
                    const tile = getTile(left, y);
                    if (tile)
                        yield tile;
                }
                for (let x = left; x < right; x++) {
                    const tile = getTile(x, top);
                    if (tile)
                        yield tile;
                }
                for (let y = bottom - 1; y >= top; y--) {
                    const tile = getTile(right, y);
                    if (tile)
                        yield tile;
                }
                for (let x = right; x >= left; x--) {
                    const tile = getTile(x, bottom);
                    if (tile)
                        yield tile;
                }
            }
            else if (this.predicate(this.startTile)) {
                yield this.startTile;
            }
        } while (++this.distance <= this.maxDistance);
    }
}
