import { TerrainType } from '@/engine/type/TerrainType';
export enum LandType {
    Clear = 0,
    Road = 1,
    Rock = 2,
    Beach = 3,
    Rough = 4,
    Railroad = 5,
    Weeds = 6,
    Water = 7,
    Wall = 8,
    Tiberium = 9,
    Cliff = 10
}
const terrainToLandTypeMap = new Map([
    [TerrainType.Default, LandType.Clear],
    [TerrainType.Clear, LandType.Clear],
    [TerrainType.Tunnel, LandType.Cliff],
    [TerrainType.Railroad, LandType.Railroad],
    [TerrainType.Rock1, LandType.Rock],
    [TerrainType.Rock2, LandType.Rock],
    [TerrainType.Water, LandType.Water],
    [TerrainType.Shore, LandType.Beach],
    [TerrainType.Pavement, LandType.Road],
    [TerrainType.Dirt, LandType.Road],
    [TerrainType.Rough, LandType.Rough],
    [TerrainType.Cliff, LandType.Cliff]
]);
export function getLandType(terrainType: TerrainType): LandType {
    if (!terrainToLandTypeMap.has(terrainType)) {
        throw new Error(`Unknown terrain type ${terrainType}`);
    }
    return terrainToLandTypeMap.get(terrainType)!;
}
