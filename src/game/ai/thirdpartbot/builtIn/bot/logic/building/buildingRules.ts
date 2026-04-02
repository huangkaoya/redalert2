import {
    BuildingPlacementData,
    GameApi,
    GameMath,
    LandType,
    ObjectType,
    PlayerData,
    Rectangle,
    Size,
    TechnoRules,
    Tile,
    Vector2,
} from "../../../game-api";
import { GlobalThreat } from "../threat/threat";
import { AntiGroundStaticDefence } from "./antiGroundStaticDefence";
import { ArtilleryUnit } from "./artilleryUnit";
import { BasicAirUnit } from "./basicAirUnit";
import { BasicBuilding } from "./basicBuilding";
import { BasicGroundUnit } from "./basicGroundUnit";
import { PowerPlant } from "./powerPlant";
import { ResourceCollectionBuilding } from "./resourceCollectionBuilding";
import { Harvester } from "./harvester";
import { uniqBy } from "../common/utils";
import { AntiAirStaticDefence } from "./antiAirStaticDefence";
import { computeAdjacentRect, getAdjacentTiles } from "../common/tileUtils";

export interface AiBuildingRules {
    getPriority(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
        threatCache: GlobalThreat | null,
    ): number;

    getPlacementLocation(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
    ): { rx: number; ry: number } | undefined;

    getMaxCount(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
        threatCache: GlobalThreat | null,
    ): number | null;
}

export function numBuildingsOwnedOfType(game: GameApi, playerData: PlayerData, technoRules: TechnoRules): number {
    return game.getVisibleUnits(playerData.name, "self", (r) => r == technoRules).length;
}

export function numBuildingsOwnedOfName(game: GameApi, playerData: PlayerData, name: string): number {
    return game.getVisibleUnits(playerData.name, "self", (r) => r.name === name).length;
}

export function getAdjacencyTiles(
    game: GameApi,
    playerData: PlayerData,
    technoRules: TechnoRules,
    onWater: boolean,
    minimumSpace: number,
): Tile[] {
    const placementRules = game.getBuildingPlacementData(technoRules.name);
    const { width: newBuildingWidth, height: newBuildingHeight } = placementRules.foundation;
    const tiles = [];
    const buildings = game.getVisibleUnits(playerData.name, "self", (r: TechnoRules) => r.type === ObjectType.Building);
    const removedTiles = new Set<string>();
    for (let buildingId of buildings) {
        const building = game.getUnitData(buildingId);
        if (!building?.rules?.baseNormal) {
            // This building is not considered for adjacency checks.
            continue;
        }
        const { foundation, tile } = building;
        const buildingBase = new Vector2(tile.rx, tile.ry);
        const buildingSize = {
            width: foundation?.width,
            height: foundation?.height,
        };
        const range = computeAdjacentRect(buildingBase, buildingSize, technoRules.adjacent, placementRules.foundation);
        const adjacentTiles = getAdjacentTiles(game, range, onWater);
        if (adjacentTiles.length === 0) {
            continue;
        }
        tiles.push(...adjacentTiles);

        // Prevent placing the new building on tiles that would cause it to overlap with this building.
        const modifiedBase = new Vector2(
            buildingBase.x - (newBuildingWidth - 1),
            buildingBase.y - (newBuildingHeight - 1),
        );
        const modifiedSize = {
            width: buildingSize.width + (newBuildingWidth - 1),
            height: buildingSize.height + (newBuildingHeight - 1),
        };
        const blockedRect = computeAdjacentRect(modifiedBase, modifiedSize, minimumSpace);
        const buildingTiles = adjacentTiles.filter((tile) => {
            return (
                tile.rx >= blockedRect.x &&
                tile.rx < blockedRect.x + blockedRect.width &&
                tile.ry >= blockedRect.y &&
                tile.ry < blockedRect.y + blockedRect.height
            );
        });
        buildingTiles.forEach((buildingTile) => removedTiles.add(buildingTile.id));
    }
    // Remove duplicate tiles.
    const withDuplicatesRemoved = uniqBy(tiles, (tile) => tile.id);
    // Remove tiles containing buildings and potentially area around them removed as well.
    return withDuplicatesRemoved.filter((tile) => !removedTiles.has(tile.id));
}

function getTileDistances(startPoint: Vector2, tiles: Tile[]) {
    return tiles
        .map((tile) => ({
            tile,
            distance: distance(tile.rx, tile.ry, startPoint.x, startPoint.y),
        }))
        .sort((a, b) => {
            return a.distance - b.distance;
        });
}

function distance(x1: number, y1: number, x2: number, y2: number) {
    var dx = x1 - x2;
    var dy = y1 - y2;
    let tmp = dx * dx + dy * dy;
    if (0 === tmp) {
        return 0;
    }
    return GameMath.sqrt(tmp);
}

export function getDefaultPlacementLocation(
    game: GameApi,
    playerData: PlayerData,
    idealPoint: Vector2,
    technoRules: TechnoRules,
    onWater: boolean = false,
    minSpace: number = 2,
): { rx: number; ry: number } | undefined {
    // Closest possible location near `startPoint`.
    const size: BuildingPlacementData = game.getBuildingPlacementData(technoRules.name) as any;
    if (!size) {
        return undefined;
    }
    const tiles = getAdjacencyTiles(game, playerData, technoRules, onWater, minSpace);

    // Score tiles: prefer close to ideal point but penalize crowding near many buildings.
    // This encourages a more spread-out base layout with room for unit movement.
    const buildings = game.getVisibleUnits(playerData.name, "self", (r: TechnoRules) => r.type === ObjectType.Building) as any;
    const buildingPositions: Vector2[] = [];
    for (const bid of buildings) {
        const bd = game.getGameObjectData(bid);
        if (bd?.tile) buildingPositions.push(new Vector2(bd.tile.rx, bd.tile.ry));
    }

    const scored = tiles.map((tile) => {
        const distToIdeal = distance(tile.rx, tile.ry, idealPoint.x, idealPoint.y);
        // Count nearby buildings within 3 tiles — more neighbors = higher crowding penalty
        let crowding = 0;
        for (const bp of buildingPositions) {
            const d = distance(tile.rx, tile.ry, bp.x, bp.y);
            if (d < 4) crowding += (4 - d);
        }
        // Combined score: distance matters most, but crowding adds a penalty
        const score = distToIdeal + crowding * 0.8;
        return { tile, score };
    }).sort((a, b) => a.score - b.score);

    for (const entry of scored) {
        if (entry.tile && game.canPlaceBuilding(playerData.name, technoRules.name, entry.tile)) {
            return entry.tile;
        }
    }
    return undefined;
}

// Priority 0 = don't build.
export type TechnoRulesWithPriority = { unit: TechnoRules; priority: number };

export const DEFAULT_BUILDING_PRIORITY = 0;

export const BUILDING_NAME_TO_RULES = new Map<string, AiBuildingRules>([
    // Allied
    ["GAPOWR", new PowerPlant()],
    ["GAREFN", new ResourceCollectionBuilding(10, 3)], // Refinery
    ["GAWEAP", new BasicBuilding(15, 3)], // War Factory
    ["GAPILE", new BasicBuilding(12, 1)], // Barracks
    ["CMIN", new Harvester(15, 4, 2)], // Chrono Miner
    ["GADEPT", new BasicBuilding(1, 1, 10000)], // Repair Depot
    ["GAAIRC", new BasicBuilding(10, 1, 500)], // Airforce Command
    ["AMRADR", new BasicBuilding(10, 1, 500)], // Airforce Command (USA)

    ["GATECH", new BasicBuilding(20, 1, 4000)], // Allied Battle Lab
    ["GAYARD", new BasicBuilding(0, 0, 0)], // Naval Yard, disabled

    ["GAPILL", new AntiGroundStaticDefence(2, 1, 7.5, 5)], // Pillbox
    ["ATESLA", new AntiGroundStaticDefence(2, 1, 10, 3)], // Prism Cannon
    ["NASAM", new AntiAirStaticDefence(1, 1, 7.5)], // Patriot Missile
    ["GAWALL", new AntiGroundStaticDefence(0, 0, 0, 0)], // Walls

    ["E1", new BasicGroundUnit(2, 2, 0.2, 0)], // GI
    ["ENGINEER", new BasicGroundUnit(1, 0, 0)], // Engineer
    ["MTNK", new BasicGroundUnit(10, 3, 2, 0)], // Grizzly Tank
    ["MGTK", new BasicGroundUnit(10, 1, 2.5, 0)], // Mirage Tank
    ["FV", new BasicGroundUnit(5, 2, 0.5, 1)], // IFV
    ["JUMPJET", new BasicAirUnit(10, 1, 1, 1)], // Rocketeer
    ["ORCA", new BasicAirUnit(7, 1, 2, 0)], // Rocketeer
    ["SREF", new ArtilleryUnit(10, 5, 3, 3)], // Prism Tank
    ["CLEG", new BasicGroundUnit(0, 0)], // Chrono Legionnaire (Disabled - we don't handle the warped out phase properly and it tends to bug both bots out)
    ["SHAD", new BasicGroundUnit(0, 0)], // Nighthawk (Disabled)

    // Soviet
    ["NAPOWR", new PowerPlant()],
    ["NAREFN", new ResourceCollectionBuilding(10, 3)], // Refinery
    ["NAWEAP", new BasicBuilding(15, 3)], // War Factory
    ["NAHAND", new BasicBuilding(12, 1)], // Barracks
    ["HARV", new Harvester(15, 4, 2)], // War Miner
    ["NADEPT", new BasicBuilding(1, 1, 10000)], // Repair Depot
    ["NARADR", new BasicBuilding(10, 1, 500)], // Radar
    ["NANRCT", new PowerPlant()], // Nuclear Reactor
    ["NAYARD", new BasicBuilding(0, 0, 0)], // Naval Yard, disabled

    ["NATECH", new BasicBuilding(20, 1, 4000)], // Soviet Battle Lab

    ["NALASR", new AntiGroundStaticDefence(2, 1, 7.5, 5)], // Sentry Gun
    ["NAFLAK", new AntiAirStaticDefence(1, 1, 7.5)], // Flak Cannon
    ["TESLA", new AntiGroundStaticDefence(2, 1, 10, 3)], // Tesla Coil
    ["NAWALL", new AntiGroundStaticDefence(0, 0, 0, 0)], // Walls

    ["E2", new BasicGroundUnit(2, 2, 0.2, 0)], // Conscript
    ["SENGINEER", new BasicGroundUnit(1, 0, 0)], // Soviet Engineer
    ["FLAKT", new BasicGroundUnit(2, 2, 0.1, 0.3)], // Flak Trooper
    ["YURI", new BasicGroundUnit(1, 1, 1, 0)], // Yuri
    ["DOG", new BasicGroundUnit(1, 1, 0, 0)], // Soviet Attack Dog
    ["HTNK", new BasicGroundUnit(10, 3, 3, 0)], // Rhino Tank
    ["APOC", new BasicGroundUnit(6, 1, 5, 0)], // Apocalypse Tank
    ["HTK", new BasicGroundUnit(5, 2, 0.33, 1.5)], // Flak Track
    ["ZEP", new BasicAirUnit(5, 1, 5, 1)], // Kirov
    ["V3", new ArtilleryUnit(9, 10, 0, 3)], // V3 Rocket Launcher
]);
