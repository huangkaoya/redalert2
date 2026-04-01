import { TileCollection } from '@/game/map/TileCollection';
import { TileOccupation } from '@/game/map/TileOccupation';
import { Terrain } from '@/game/map/Terrain';
import { MapBounds } from '@/game/map/MapBounds';
import { Bridges } from '@/game/map/Bridges';
import { QuadTree } from '@/util/QuadTree';
import { TileOcclusion } from '@/game/map/TileOcclusion';
import { AutoLat } from '@/game/theater/AutoLat';
import { TheaterType } from '@/engine/TheaterType';
import { Vector2 } from '@/game/math/Vector2';
import { Box2 } from '@/game/math/Box2';
interface MapFile {
    startingLocations: any[];
    tiles: any[];
    theaterType: TheaterType;
    tags: Tag[];
    cellTags: CellTag[];
    lighting: any;
    ionLighting: any;
    triggers: any[];
    variables: any[];
    waypoints: Waypoint[];
    terrains: any[];
    overlays: any[];
    smudges: any[];
    structures: any[];
    infantries: any[];
    vehicles: any[];
    aircrafts: any[];
}
interface Tag {
    id: string;
}
interface CellTag {
    coords: {
        x: number;
        y: number;
    };
    tagId: string;
}
interface Waypoint {
    number: number;
    rx: number;
    ry: number;
}
interface Tile {
    rx: number;
    ry: number;
    dx: number;
    dy: number;
    z: number;
    tag?: Tag;
}
interface Techno {
    isBuilding(): boolean;
    centerTile: Tile;
    tile: Tile;
}
interface InitialMapObjects {
    terrains: any[];
    overlays: any[];
    smudges: any[];
    technos: any[];
}
interface QuadTreeOptions {
    getKey: (item: Techno) => Vector2;
    maxDepth: number;
    splitThreshold: number;
    joinThreshold: number;
}
export class GameMap {
    private mapFile: MapFile;
    public tiles: TileCollection;
    public mapBounds: MapBounds;
    public tileOccupation: TileOccupation;
    private tileOcclusion: TileOcclusion;
    public terrain: Terrain;
    public bridges: Bridges;
    private technosByTile: QuadTree<Techno>;
    get startingLocations() {
        return this.mapFile.startingLocations;
    }
    constructor(mapFile: MapFile, t: any, i: any, r: any) {
        this.mapFile = mapFile;
        this.tiles = new TileCollection(this.mapFile.tiles, t, i.general, r);
        this.mapBounds = new MapBounds().fromMapFile(this.mapFile as any, this.tiles);
        this.tileOccupation = new TileOccupation(this.tiles);
        this.tileOcclusion = new TileOcclusion(this.tiles);
        this.terrain = new Terrain(this.tiles, this.mapFile.theaterType, this.mapBounds, this.tileOccupation, i);
        this.bridges = new Bridges(t, this.tiles, this.tileOccupation, this.mapBounds, i);
        const tags = this.mapFile.tags;
        for (const cellTag of this.mapFile.cellTags) {
            const tile = this.tiles.getByMapCoords(cellTag.coords.x, cellTag.coords.y);
            if (tile) {
                (tile as any).tag = tags.find((tag) => tag.id === cellTag.tagId);
            }
        }
        const mapSize = this.tiles.getMapSize();
        const n = Math.max(mapSize.width, mapSize.height) / 5;
        this.technosByTile = new QuadTree<Techno>(new Box2(new Vector2(0, 0), new Vector2(mapSize.width, mapSize.height)), {
            getKey: (techno: Techno) => {
                const tile = techno.isBuilding() ? techno.centerTile : techno.tile;
                return new Vector2(tile.rx, tile.ry);
            },
            maxDepth: this.computeQuadDepth(n),
            splitThreshold: 10,
            joinThreshold: 5,
        });
        if (this.mapFile.theaterType !== TheaterType.Snow) {
            AutoLat.calculate(this.tiles, t);
        }
    }
    private computeQuadDepth(e: number): number {
        if (e <= 1)
            return 1;
        let depth = 0;
        while (e / 2 >= 1) {
            e /= 2;
            depth++;
        }
        return depth + (e > 1 ? 1 : 0);
    }
    getLighting(): any {
        return this.mapFile.lighting;
    }
    getIonLighting(): any {
        return this.mapFile.ionLighting;
    }
    getTheaterType(): TheaterType {
        return this.mapFile.theaterType;
    }
    getTags(): Tag[] {
        return this.mapFile.tags;
    }
    getTriggers(): any[] {
        return this.mapFile.triggers;
    }
    getCellTags(): CellTag[] {
        return this.mapFile.cellTags;
    }
    getVariables(): any[] {
        return this.mapFile.variables;
    }
    getWaypoint(waypointNumber: number): Waypoint | undefined {
        return this.mapFile.waypoints.find((waypoint) => waypoint.number === waypointNumber);
    }
    getTileAtWaypoint(waypointNumber: number): Tile | undefined {
        const waypoint = this.getWaypoint(waypointNumber);
        if (waypoint) {
            const tile = this.tiles.getByMapCoords(waypoint.rx, waypoint.ry);
            if (tile)
                return tile;
        }
    }
    isWithinBounds(tile: Tile): boolean {
        return this.mapBounds.isWithinBounds(tile);
    }
    clampWithinBounds(tile: Tile): Tile {
        const clampedTile = this.mapBounds.clampWithinBounds(tile);
        let resultTile = this.tiles.getByDisplayCoords(clampedTile.dx, clampedTile.dy);
        if (resultTile && this.mapBounds.isWithinBounds(resultTile)) {
            let currentTile = resultTile;
            let currentZ = resultTile.z;
            while (currentZ >= 0 && currentTile && this.mapBounds.isWithinBounds(currentTile)) {
                resultTile = currentTile;
                currentTile = this.tiles.getByDisplayCoords(currentTile.dx, currentTile.dy + 2);
                currentZ -= 2;
            }
        }
        else {
            let elevation = 0;
            while (!resultTile || !this.mapBounds.isWithinBounds(resultTile)) {
                if (elevation > 30) {
                    throw new Error("Exceeded max elevation while trying to clamp tile to map bounds");
                }
                resultTile = this.tiles.getByDisplayCoords(clampedTile.dx, clampedTile.dy + elevation);
                elevation += 2;
            }
        }
        return resultTile;
    }
    isWithinHardBounds(tile: Tile): boolean {
        return this.mapBounds.isWithinHardBounds(tile as any);
    }
    getInitialMapObjects(): InitialMapObjects {
        return {
            terrains: this.mapFile.terrains,
            overlays: this.mapFile.overlays,
            smudges: this.mapFile.smudges,
            technos: [
                ...this.mapFile.structures,
                ...this.mapFile.infantries,
                ...this.mapFile.vehicles,
                ...this.mapFile.aircrafts,
            ],
        };
    }
    getObjectsOnTile(tile: Tile): any[] {
        return this.tileOccupation.getObjectsOnTile(tile);
    }
    getGroundObjectsOnTile(tile: Tile): any[] {
        return this.tileOccupation.getGroundObjectsOnTile(tile);
    }
    getTileZone(tile: Tile, includeAdjacent: boolean = false): any {
        return this.tileOccupation.getTileZone(tile, includeAdjacent);
    }
    dispose(): void {
        this.terrain.dispose();
        this.bridges.dispose();
    }
}
