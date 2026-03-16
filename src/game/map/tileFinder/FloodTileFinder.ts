import type { Tile } from "@/game/map/TileCollection";
import type { MapBounds } from "@/game/map/MapBounds";
interface TileCollection {
    getAllNeighbourTiles(tile: Tile): Tile[];
}
export class FloodTileFinder {
    private tiles: TileCollection;
    private mapBounds: MapBounds;
    private startTile: Tile;
    private areConnected: (tile1: Tile, tile2: Tile) => boolean;
    private predicate: (tile: Tile) => boolean;
    private checkBounds: boolean;
    private generator: Generator<Tile | undefined>;
    constructor(tiles: TileCollection, mapBounds: MapBounds, startTile: Tile, areConnected: (tile1: Tile, tile2: Tile) => boolean, predicate: (tile: Tile) => boolean, checkBounds: boolean = true) {
        this.tiles = tiles;
        this.mapBounds = mapBounds;
        this.startTile = startTile;
        this.areConnected = areConnected;
        this.predicate = predicate;
        this.checkBounds = checkBounds;
        this.generator = this.generate();
    }
    getNextTile(): Tile | undefined {
        return this.generator.next().value;
    }
    private *generate(): Generator<Tile | undefined> {
        let queue = [this.startTile];
        let visited = new Set<Tile>();
        while (queue.length) {
            const current = queue.pop()!;
            if (!visited.has(current)) {
                visited.add(current);
                if (!(this.checkBounds && !this.mapBounds.isWithinBounds(current)) &&
                    this.predicate(current)) {
                    yield current;
                }
                for (const neighbor of this.tiles.getAllNeighbourTiles(current)) {
                    if (this.areConnected(neighbor, current)) {
                        queue.push(neighbor);
                    }
                }
            }
        }
    }
}
