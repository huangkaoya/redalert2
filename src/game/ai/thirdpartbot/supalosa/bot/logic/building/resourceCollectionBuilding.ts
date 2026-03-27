import { Box2, GameApi, GameMath, PlayerData, TechnoRules, Tile, Vector2 } from "../../../game-api";
import { GlobalThreat } from "../threat/threat";
import { BasicBuilding } from "./basicBuilding";
import { getDefaultPlacementLocation } from "./buildingRules";
import { getCachedTechnoRules } from "../common/rulesCache";

const NO_REFINERY_DISTANCE = 10;
const REFINERY_HARD_LIMIT = 6;

export class ResourceCollectionBuilding extends BasicBuilding {
    constructor(basePriority: number, maxNeeded: number, onlyBuildWhenFloatingCreditsAmount?: number) {
        super(basePriority, maxNeeded, onlyBuildWhenFloatingCreditsAmount);
    }

    getPlacementLocation(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
    ): { rx: number; ry: number } | undefined {
        // Prefer spawning close to ore.
        const conyardVectors = game
            .getVisibleUnits(playerData.name, "self", (r) => r.constructionYard)
            .map((r) => game.getGameObjectData(r)?.tile)
            .filter((t): t is Tile => !!t)
            .map((t) => new Vector2(t.rx, t.ry));

        if (conyardVectors.length === 0) {
            return undefined;
        }

        var closeOre: Tile | undefined;
        var closeOreDist: number | undefined;
        let selectedLocation: Vector2 = conyardVectors[0];

        for (const conyard of conyardVectors) {
            let allTileResourceData = game.mapApi.getAllTilesResourceData();
            for (let i = 0; i < allTileResourceData.length; ++i) {
                let tileResourceData = allTileResourceData[i];
                if (tileResourceData.spawnsOre) {
                    let dist = GameMath.sqrt(
                        (conyard.x - tileResourceData.tile.rx) ** 2 + (conyard.y - tileResourceData.tile.ry) ** 2,
                    );
                    if (closeOreDist == undefined || dist < closeOreDist) {
                        closeOreDist = dist;
                        closeOre = tileResourceData.tile;
                    }
                }
            }
        }
        if (closeOre) {
            selectedLocation = new Vector2(closeOre.rx, closeOre.ry);
        }
        return getDefaultPlacementLocation(game, playerData, selectedLocation, technoRules, false, 2);
    }

    // Don't build/start selling these if we don't have any harvesters
    getMaxCount(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
        threatCache: GlobalThreat | null,
    ): number | null {
        const harvesters = game.getVisibleUnits(playerData.name, "self", (r) => r.harvester).length;
        // if there is no refinery within distance of a conyard, that conyard wants an expansion
        const conyardBoxes = game
            .getVisibleUnits(playerData.name, "self", (r) => r.constructionYard)
            .map((r) => game.getGameObjectData(r)?.tile)
            .filter((t): t is Tile => !!t)
            .map((t) => new Vector2(t.rx, t.ry))
            .map((v) => new Box2(v.clone().subScalar(NO_REFINERY_DISTANCE), v.clone().addScalar(NO_REFINERY_DISTANCE)));
        const conyardsWithRefineries = conyardBoxes
            .map((b) => game.getUnitsInArea(b))
            .filter((unitIds) => unitIds.some((unitId) => getCachedTechnoRules(game, unitId)?.refinery));
        const conyardsWithoutRefineries = conyardBoxes.length - conyardsWithRefineries.length;

        return Math.max(1, Math.min(REFINERY_HARD_LIMIT, 2 * harvesters * (conyardsWithoutRefineries + 1)));
    }
}
