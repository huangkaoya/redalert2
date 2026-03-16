import { IsoCoords } from '../IsoCoords';
interface Point {
    x: number;
    y: number;
}
interface Point3D extends Point {
    z: number;
}
interface Tile {
    z: number;
}
interface TileManager {
    getByMapCoords(x: number, y: number): Tile | undefined;
    getPlaceholderTile(x: number, y: number): Tile;
}
interface GameMap {
    tiles: TileManager;
}
interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export class MapPanningHelper {
    private map: GameMap;
    constructor(map: GameMap) {
        this.map = map;
    }
    computeCameraPanFromTile(tileX: number, tileY: number): Point {
        const tile = this.map.tiles.getByMapCoords(tileX, tileY) ??
            this.map.tiles.getPlaceholderTile(tileX, tileY);
        const screenPos = IsoCoords.tile3dToScreen(tileX + 0.5, tileY + 0.5, tile.z);
        return this.computeCameraPanFromScreen(screenPos);
    }
    computeCameraPanFromWorld(worldPosition: Point3D): Point {
        const screenPos = IsoCoords.vecWorldToScreen(worldPosition);
        return this.computeCameraPanFromScreen(screenPos);
    }
    computeCameraPanFromScreen(screenPosition: Point): Point {
        const origin = this.getScreenPanOrigin();
        return {
            x: Math.floor(screenPosition.x - origin.x),
            y: Math.floor(screenPosition.y - origin.y)
        };
    }
    getScreenPanOrigin(): Point {
        return IsoCoords.worldToScreen(0, 0);
    }
    computeCameraPanLimits(viewport: Rect, mapBounds: Rect): Rect {
        const origin = this.getScreenPanOrigin();
        return {
            x: Math.ceil(mapBounds.x - origin.x + viewport.width / 2),
            y: Math.ceil(mapBounds.y - origin.y + viewport.height / 2 - 1),
            width: mapBounds.width - viewport.width - 1,
            height: mapBounds.height - viewport.height - 1
        };
    }
}
