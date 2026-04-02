import { Vector2 } from '@/game/math/Vector2';
import type { Tile } from "@/game/map/TileCollection";
import type { MapBounds } from "@/game/map/MapBounds";
interface TileCollection {
    getByMapCoords(x: number, y: number): Tile | undefined;
}
export class CardinalTileFinder {
    private tiles: TileCollection;
    private mapBounds: MapBounds;
    private startTile: Tile;
    private maxDistance: number;
    private predicate: (tile: Tile) => boolean;
    private dirVec: Vector2;
    private finished: boolean;
    public diagonal: boolean;
    private distance: number;
    constructor(tiles: TileCollection, mapBounds: MapBounds, startTile: Tile, distance: number, maxDistance: number, predicate: (tile: Tile) => boolean = () => true) {
        this.tiles = tiles;
        this.mapBounds = mapBounds;
        this.startTile = startTile;
        this.maxDistance = maxDistance;
        this.predicate = predicate;
        this.dirVec = new Vector2(10, 0);
        this.finished = false;
        this.diagonal = true;
        this.distance = distance;
    }
    getNextTile(): Tile | undefined {
        if (!this.finished) {
            let result: Tile | undefined;
            do {
                let coords = { x: this.startTile.rx, y: this.startTile.ry };
                coords.x += this.distance * Math.sign(this.dirVec.x);
                coords.y += this.distance * Math.sign(this.dirVec.y);
                this.dirVec
                    .rotateAround(new Vector2(), (Math.PI / 4) * (this.diagonal ? 1 : 2))
                    .round();
                const tile = this.tiles.getByMapCoords(coords.x, coords.y);
                if (tile &&
                    this.mapBounds.isWithinBounds(tile) &&
                    this.predicate(tile) &&
                    (result = tile),
                    !this.dirVec.angle()) {
                    if (this.maxDistance && this.distance >= this.maxDistance) {
                        this.finished = true;
                        return result;
                    }
                    this.distance++;
                }
            } while (!result);
            return result;
        }
    }
}
