import { GameMath } from '@/game/math/GameMath';
import type { Tile } from "@/game/map/TileCollection";
import type { MapBounds } from "@/game/map/MapBounds";
interface TileCollection {
    getByMapCoords(x: number, y: number): Tile | undefined;
}
interface RNG {
    generateRandomInt(min: number, max: number): number;
}
export class RandomTileFinder {
    private tiles: TileCollection;
    private mapBounds: MapBounds;
    private startTile: Tile;
    private maxDistance: number;
    private rng: RNG;
    private predicate: (tile: Tile) => boolean;
    private includeStartTile: boolean;
    private checkBounds: boolean;
    private pool: number[];
    private generator: Generator<Tile | undefined>;
    constructor(tiles: TileCollection, mapBounds: MapBounds, startTile: Tile, maxDistance: number, rng: RNG, predicate: (tile: Tile) => boolean, includeStartTile: boolean = false, checkBounds: boolean = true) {
        this.tiles = tiles;
        this.mapBounds = mapBounds;
        this.startTile = startTile;
        this.maxDistance = maxDistance;
        this.rng = rng;
        this.predicate = predicate;
        this.includeStartTile = includeStartTile;
        this.checkBounds = checkBounds;
        this.pool = [];
        this.pool = new Array(GameMath.pow(2 * this.maxDistance + 1, 2))
            .fill(0)
            .map((_, i) => i);
        this.generator = this.generate();
    }
    getNextTile(): Tile | undefined {
        return this.generator.next().value;
    }
    private *generate(): Generator<Tile | undefined> {
        const getTile = (x: number, y: number): Tile | undefined => {
            const tile = this.tiles.getByMapCoords(x, y);
            if (this.includeStartTile || tile !== this.startTile) {
                return tile &&
                    (!this.checkBounds || this.mapBounds.isWithinBounds(tile)) &&
                    this.predicate(tile)
                    ? tile
                    : undefined;
            }
        };
        const size = 2 * this.maxDistance + 1;
        while (this.pool.length) {
            const index = this.pool.length > 1
                ? this.rng.generateRandomInt(0, this.pool.length)
                : 0;
            const value = this.pool.splice(index, 1)[0];
            const x = value % size;
            const y = Math.floor(value / size);
            const tile = getTile(this.startTile.rx - this.maxDistance + x, this.startTile.ry - this.maxDistance + y);
            if (tile) {
                yield tile;
            }
        }
    }
}
