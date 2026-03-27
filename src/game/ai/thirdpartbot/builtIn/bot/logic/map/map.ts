import { GameApi, GameMath, MapApi, PlayerData, Size, Tile, UnitData, Vector2 } from "../../../game-api";

export function calculateAreaVisibility(
    mapApi: MapApi,
    playerData: PlayerData,
    startPoint: Vector2,
    endPoint: Vector2,
): { visibleTiles: number; validTiles: number, clearTiles: number} {
    let validTiles: number = 0,
        visibleTiles: number = 0,
        clearTiles: number = 0;
    for (let xx = startPoint.x; xx < endPoint.x; ++xx) {
        for (let yy = startPoint.y; yy < endPoint.y; ++yy) {
            let tile = mapApi.getTile(xx, yy);
            if (tile) {
                ++validTiles;
                if (mapApi.isVisibleTile(tile, playerData.name)) {
                    ++visibleTiles;
                }
                if (tile.rampType === 0) {
                    ++clearTiles;
                }
            }
        }
    }
    return { visibleTiles, validTiles, clearTiles };
}

export function getPointTowardsOtherPoint(
    gameApi: GameApi,
    startLocation: Vector2,
    endLocation: Vector2,
    minRadius: number,
    maxRadius: number,
    randomAngle: number,
): Vector2 {
    // TODO: Use proper vector maths here.
    let radius = minRadius + Math.round(gameApi.generateRandom() * (maxRadius - minRadius));
    let directionToEndLocation = GameMath.atan2(endLocation.y - startLocation.y, endLocation.x - startLocation.x);
    let randomisedDirection =
        directionToEndLocation -
        (randomAngle * (Math.PI / 12) + 2 * randomAngle * gameApi.generateRandom() * (Math.PI / 12));
    let candidatePointX = Math.round(startLocation.x + GameMath.cos(randomisedDirection) * radius);
    let candidatePointY = Math.round(startLocation.y + GameMath.sin(randomisedDirection) * radius);
    return new Vector2(candidatePointX, candidatePointY);
}

export function getDistanceBetweenPoints(startLocation: Vector2, endLocation: Vector2): number {
    // TODO: Remove this now we have Vector2s.
    return startLocation.distanceTo(endLocation);
}

export function getDistanceBetweenTileAndPoint(tile: Tile, vector: Vector2): number {
    // TODO: Remove this now we have Vector2s.
    return new Vector2(tile.rx, tile.ry).distanceTo(vector);
}

export function getDistanceBetweenUnits(unit1: UnitData, unit2: UnitData): number {
    return new Vector2(unit1.tile.rx, unit1.tile.ry).distanceTo(new Vector2(unit2.tile.rx, unit2.tile.ry));
}

export function getDistanceBetween(unit: UnitData, point: Vector2): number {
    return getDistanceBetweenPoints(new Vector2(unit.tile.rx, unit.tile.ry), point);
}
