import { bresenham } from '@/util/bresenham';
import { LandType } from '@/game/type/LandType';
interface TileOccupation {
    getBridgeOnTile(tile: any): any;
}
interface Tiles {
    getByMapCoords(x: number, y: number): any;
}
interface GameObject {
    position?: any;
    tile: any;
    z: number;
    rx: number;
    ry: number;
    isUnit(): boolean;
    isBuilding(): boolean;
    onBridge?: boolean;
    centerTile?: any;
}
interface WeaponRules {
    warhead: {
        rules: {
            wall: boolean;
        };
    };
    projectileRules: {
        subjectToWalls: boolean;
        subjectToCliffs: boolean;
    };
    rules: {
        spawner: boolean;
    };
}
export class LosHelper {
    private tiles: Tiles;
    private tileOccupation: TileOccupation;
    constructor(tiles: Tiles, tileOccupation: TileOccupation) {
        this.tiles = tiles;
        this.tileOccupation = tileOccupation;
    }
    hasLineOfSight(source: GameObject | any, target: GameObject | any, weapon: WeaponRules): boolean {
        const ignoreWalls = weapon.warhead.rules.wall || !weapon.projectileRules.subjectToWalls;
        const checkCliffs = weapon.projectileRules.subjectToCliffs;
        const isSpawner = weapon.rules.spawner;
        let cliffCount = 0;
        let wasCliff = false;
        if (!ignoreWalls || checkCliffs || isSpawner) {
            const sourceTile = this.hasPosition(source) ? source.tile : source;
            const targetTile = this.hasPosition(target)
                ? (target.isBuilding() ? target.centerTile : target.tile)
                : target;
            let sourceZ = sourceTile.z;
            if (checkCliffs && this.hasPosition(source) && source.isUnit() && source.onBridge) {
                sourceZ += this.tileOccupation.getBridgeOnTile(sourceTile)?.tileElevation ?? 0;
            }
            for (const { x, y } of bresenham(sourceTile.rx, sourceTile.ry, targetTile.rx, targetTile.ry)) {
                const tile = this.tiles.getByMapCoords(x, y);
                if (!tile)
                    return false;
                if (!ignoreWalls && tile.landType === LandType.Wall)
                    return false;
                if (checkCliffs) {
                    if (tile.landType === LandType.Cliff) {
                        if (tile.z > sourceZ)
                            return false;
                        wasCliff = true;
                    }
                    else {
                        if (tile.z > sourceZ && wasCliff)
                            return false;
                        wasCliff = false;
                    }
                }
                if (isSpawner && cliffCount < 2 && this.tileOccupation.getBridgeOnTile(tile)?.isHighBridge()) {
                    return false;
                }
                cliffCount++;
            }
        }
        return true;
    }
    private hasPosition(obj: any): obj is GameObject {
        return obj.position !== undefined;
    }
}
