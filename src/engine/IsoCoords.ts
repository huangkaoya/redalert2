import { Coords } from '../game/Coords';
interface Point {
    x: number;
    y: number;
}
interface Point3D extends Point {
    z: number;
}
export class IsoCoords {
    private static worldOrigin: Point;
    static init(origin: Point): void {
        this.worldOrigin = origin;
    }
    static worldToScreen(x: number, y: number): Point {
        if (!this.worldOrigin) {
            throw new Error("Coords not initialized with world origin");
        }
        x -= this.worldOrigin.x;
        y -= this.worldOrigin.y;
        const xScaled = x / Coords.ISO_WORLD_SCALE;
        const yScaled = y / Coords.ISO_WORLD_SCALE;
        return {
            x: xScaled - yScaled,
            y: (xScaled + yScaled) / 2
        };
    }
    static screenToWorld(x: number, y: number): Point {
        if (!this.worldOrigin) {
            throw new Error("Coords not initialized with world origin");
        }
        return {
            x: ((x + 2 * y) / 2) * Coords.ISO_WORLD_SCALE + this.worldOrigin.x,
            y: ((2 * y - x) / 2) * Coords.ISO_WORLD_SCALE + this.worldOrigin.y
        };
    }
    static vecWorldToScreen(vec: Point3D): Point {
        const screen = this.worldToScreen(vec.x, vec.z);
        screen.y -= this.tileHeightToScreen(Coords.worldToTileHeight(vec.y));
        return screen;
    }
    static tileToScreen(tileX: number, tileY: number): Point {
        const world = Coords.tileToWorld(tileX, tileY);
        return this.worldToScreen(world.x, world.y);
    }
    static tileHeightToScreen(height: number): number {
        return height * (Coords.ISO_TILE_SIZE / 2);
    }
    static tile3dToScreen(tileX: number, tileY: number, height: number): Point {
        const screen = this.tileToScreen(tileX, tileY);
        screen.y -= this.tileHeightToScreen(height);
        return screen;
    }
    static screenTileToScreen(tileX: number, tileY: number): Point {
        return {
            x: tileX * Coords.ISO_TILE_SIZE,
            y: (tileY * Coords.ISO_TILE_SIZE) / 2
        };
    }
    static screenToScreenTile(x: number, y: number): Point {
        return {
            x: x / Coords.ISO_TILE_SIZE,
            y: y / (Coords.ISO_TILE_SIZE / 2)
        };
    }
    static screenTileToWorld(tileX: number, tileY: number): Point {
        const screen = this.screenTileToScreen(tileX, tileY);
        return this.screenToWorld(screen.x, screen.y);
    }
    static getScreenTileSize(): {
        width: number;
        height: number;
    } {
        return {
            width: this.tileToScreen(1, 0).x - this.tileToScreen(0, 1).x,
            height: this.tileToScreen(1, 1).y - this.tileToScreen(0, 0).y
        };
    }
    static screenDistanceToWorld(x: number, y: number): {
        x: number;
        y: number;
    } {
        return Coords.screenDistanceToWorld(x, y);
    }
}
