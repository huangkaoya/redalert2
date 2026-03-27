import {
    GameApi,
    GameObjectData,
    LandType,
    Rectangle,
    Size,
    SpeedType,
    TerrainType,
    Tile,
    Vector2,
} from "../../../game-api";
import { getAdjacencyTiles } from "../building/buildingRules";

const FLAT_RAMP_TYPE = 0;

/**
 * Return true if the given tile could be built on (not including other things being there already). This is purely based on static map information.
 */
function tileIsBuildable(tile: Tile) {
    return (
        tile.rampType === FLAT_RAMP_TYPE &&
        (tile.terrainType === TerrainType.Clear ||
            tile.terrainType === TerrainType.Pavement ||
            tile.terrainType === TerrainType.Default ||
            tile.terrainType === TerrainType.Shore ||
            tile.terrainType === TerrainType.Rock1 ||
            tile.terrainType === TerrainType.Rock2 ||
            tile.terrainType === TerrainType.Rough ||
            tile.terrainType === TerrainType.Railroad ||
            tile.terrainType === TerrainType.Dirt)
    );
}

/**
 * As above, but consider if there is something on the tile.
 * @param tile
 */
function tileIsOccupied(tile: Tile, gameApi: GameApi) {
    if (tile.landType === LandType.Tiberium) {
        return true;
    }
    // Proxy for "can I build something or is there something there"
    return !gameApi.map.isPassableTile(tile, SpeedType.Track, false, false);
}

export function canBuildOnTile(tile: Tile, gameApi: GameApi) {
    return tileIsBuildable(tile) && !tileIsOccupied(tile, gameApi);
}

/**
 * Computes a rect 'centered' around a structure of a certain size with an additional radius (`adjacent`).
 * The radius is optionally expanded by the size of the new building.
 *
 * This is essentially the candidate placement around a given structure.
 *
 * @param point Top-left location of the inner rect.
 * @param t Size of the inner rect.
 * @param adjacent Amount to expand the building's inner rect by (so buildings must be adjacent by this many tiles)
 * @param newBuildingSize? Size of the new building
 * @returns
 */
export function computeAdjacentRect(point: Vector2, t: Size, adjacent: number, newBuildingSize?: Size): Rectangle {
    return {
        x: point.x - adjacent - (newBuildingSize?.width || 0),
        y: point.y - adjacent - (newBuildingSize?.height || 0),
        width: t.width + 2 * adjacent + (newBuildingSize?.width || 0),
        height: t.height + 2 * adjacent + (newBuildingSize?.height || 0),
    };
}

export function getAdjacentTiles(game: GameApi, range: Rectangle, onWater: boolean) {
    // use the bulk API to get all tiles from the baseTile to the (baseTile + range)
    const adjacentTiles = game.mapApi
        .getTilesInRect(range)
        .filter((tile) => !onWater || tile.landType === LandType.Water);
    return adjacentTiles;
}
