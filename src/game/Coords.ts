import { GameMath } from './math/GameMath';
import { Vector2 } from './math/Vector2';
import { Vector3 } from './math/Vector3';
export class Coords {
    static readonly ISO_TILE_SIZE = 30;
    static readonly LEPTONS_PER_TILE = 256;
    static readonly ISO_WORLD_SCALE = Coords.LEPTONS_PER_TILE / Coords.ISO_TILE_SIZE;
    static readonly ISO_CAMERA_ALPHA = Math.PI / 6;
    static readonly ISO_CAMERA_BETA = Math.PI / 4;
    static readonly COS_ISO_CAMERA_BETA = GameMath.cos(Coords.ISO_CAMERA_BETA);
    static readonly zScale = Coords.COS_ISO_CAMERA_BETA / GameMath.cos(Coords.ISO_CAMERA_ALPHA);
    static tileToWorld(x: number, y: number): {
        x: number;
        y: number;
    } {
        return { x: x * Coords.LEPTONS_PER_TILE, y: y * Coords.LEPTONS_PER_TILE };
    }
    static vecWorldToGround(vec: Vector3): Vector2 {
        return new Vector2(vec.x, vec.z);
    }
    static vecGroundToWorld(vec: Vector2): Vector3 {
        return new Vector3(vec.x, 0, vec.y);
    }
    static tileHeightToWorld(height: number): number {
        return height * (Coords.LEPTONS_PER_TILE / 2) * Coords.zScale;
    }
    static worldToTileHeight(height: number): number {
        return height / ((Coords.LEPTONS_PER_TILE / 2) * Coords.zScale);
    }
    static tile3dToWorld(x: number, y: number, height: number): Vector3 {
        const world = Coords.tileToWorld(x, y);
        const z = Coords.tileHeightToWorld(height);
        return new Vector3(world.x, z, world.y);
    }
    static screenDistanceToWorld(x: number, y: number): {
        x: number;
        y: number;
    } {
        return {
            x: Math.floor(((x + 2 * y) / 2) * Coords.ISO_WORLD_SCALE),
            y: Math.floor(((2 * y - x) / 2) * Coords.ISO_WORLD_SCALE),
        };
    }
    static getWorldTileSize(): number {
        return Coords.LEPTONS_PER_TILE;
    }
}
