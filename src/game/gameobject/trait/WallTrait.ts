import { NotifyDamage } from "@/game/gameobject/trait/interface/NotifyDamage";
import { LandType } from "@/game/type/LandType";
import { NotifySpawn } from "@/game/gameobject/trait/interface/NotifySpawn";
import { NotifyUnspawn } from "@/game/gameobject/trait/interface/NotifyUnspawn";
import { CardinalTileFinder } from "@/game/map/tileFinder/CardinalTileFinder";
import { wallTypes } from "@/game/map/wallTypes";
export class WallTrait implements NotifyDamage, NotifySpawn, NotifyUnspawn {
    private linkedDamageHandled: boolean = false;
    private wallType: number = 0;
    [NotifySpawn.onSpawn](gameObject: any, context: any): void {
        if (gameObject.isBuilding()) {
            this.connectWall(gameObject, context.map);
        }
        else {
            this.wallType = gameObject.value;
        }
    }
    [NotifyUnspawn.onUnspawn](gameObject: any, context: any): void {
        this.updateAdjacentWalls(gameObject, context.map);
    }
    [NotifyDamage.onDamage](gameObject: any, context: any, damage: number, source: any): void {
        if (!this.linkedDamageHandled) {
            const linkedDamage = Math.floor(damage / 2);
            if (linkedDamage) {
                for (const tile of context.map.tiles.getAllNeighbourTiles(gameObject.tile)) {
                    if (tile.landType === LandType.Wall) {
                        const wall = context.map.getObjectsOnTile(tile).find((obj: any) => (obj.isBuilding() || obj.isOverlay()) && obj.wallTrait);
                        if (wall) {
                            wall.wallTrait.linkedDamageHandled = true;
                            wall.healthTrait.inflictDamage(linkedDamage, source, context);
                            wall.wallTrait.linkedDamageHandled = false;
                            if (!wall.healthTrait.health) {
                                context.destroyObject(wall, source);
                            }
                        }
                    }
                }
            }
        }
    }
    private updateAdjacentWalls(gameObject: any, map: any): void {
        const finder = new CardinalTileFinder(map.tiles, map.mapBounds, gameObject.tile, 1, 1);
        finder.diagonal = false;
        let tile;
        while ((tile = finder.getNextTile())) {
            const wall = map.getObjectsOnTile(tile).find((obj: any) => (obj.isBuilding() || obj.isOverlay()) && obj.name === gameObject.rules.name);
            if (wall) {
                this.connectWall(wall, map);
            }
        }
    }
    private connectWall(wall: any, map: any): void {
        const adjacentData = this.getAdjacentWallData(wall.tile, wall.name, map);
        this.updateWallType(wall, adjacentData.map(data => data.direction));
        adjacentData.forEach(data => {
            const adjacentWallData = this.getAdjacentWallData(data.tile, data.wall.name, map);
            this.updateWallType(data.wall, adjacentWallData.map(data => data.direction));
        });
    }
    private updateWallType(wall: any, directions: number[][]): void {
        const connections = [0, 0, 0, 0];
        for (const dir of directions) {
            if (dir[0] === 0 && dir[1] === -1)
                connections[0] = 1;
            if (dir[0] === 1 && dir[1] === 0)
                connections[1] = 1;
            if (dir[0] === 0 && dir[1] === 1)
                connections[2] = 1;
            if (dir[0] === -1 && dir[1] === 0)
                connections[3] = 1;
        }
        const wallType = this.findWallType(connections);
        wall.wallTrait.wallType = wallType;
        if (wall.isOverlay()) {
            wall.value = wallType;
        }
    }
    private findWallType(connections: number[]): number {
        for (let i = 0; i < wallTypes.length; ++i) {
            const type = wallTypes[i];
            if (type[0] === connections[0] &&
                type[1] === connections[1] &&
                type[2] === connections[2] &&
                type[3] === connections[3]) {
                return i;
            }
        }
        console.warn("Invalid wall directions", connections);
        return 0;
    }
    private getAdjacentWallData(tile: any, wallName: string, map: any): Array<{
        direction: number[];
        tile: any;
        wall: any;
    }> {
        const adjacentWalls = [];
        const directions = [
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0]
        ];
        for (const dir of directions) {
            const coords = { x: tile.rx + dir[0], y: tile.ry + dir[1] };
            const adjacentTile = map.tiles.getByMapCoords(coords.x, coords.y);
            if (adjacentTile) {
                const wall = map.getObjectsOnTile(adjacentTile).find((obj: any) => (obj.isBuilding() || obj.isOverlay()) && obj.name === wallName);
                if (wall) {
                    adjacentWalls.push({
                        direction: dir,
                        tile: adjacentTile,
                        wall: wall
                    });
                }
            }
        }
        return adjacentWalls;
    }
}
