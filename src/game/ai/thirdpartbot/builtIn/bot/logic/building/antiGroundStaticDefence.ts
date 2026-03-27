import { GameApi, PlayerData, TechnoRules, Vector2 } from "../../../game-api";
import { getPointTowardsOtherPoint } from "../map/map";
import { GlobalThreat } from "../threat/threat";
import { AiBuildingRules, getDefaultPlacementLocation, numBuildingsOwnedOfType } from "./buildingRules";
import { getStaticDefencePlacement } from "./common";

export class AntiGroundStaticDefence implements AiBuildingRules {
    constructor(
        private basePriority: number,
        private baseAmount: number,
        private groundStrength: number,
        private limit: number,
    ) {}

    getPlacementLocation(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
    ): { rx: number; ry: number } | undefined {
        return getStaticDefencePlacement(game, playerData, technoRules);
    }

    getPriority(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
        threatCache: GlobalThreat | null,
    ): number {
        const numOwned = numBuildingsOwnedOfType(game, playerData, technoRules);
        if (numOwned >= this.limit) {
            return 0;
        }
        // If the enemy's ground power is increasing we should try to keep up.
        if (threatCache) {
            let denominator =
                threatCache.totalAvailableAntiGroundFirepower + threatCache.totalDefensivePower + this.groundStrength;
            if (threatCache.totalOffensiveLandThreat > denominator * 1.1) {
                return this.basePriority * (threatCache.totalOffensiveLandThreat / Math.max(1, denominator));
            } else {
                return 0;
            }
        }
        const strengthPerCost = (this.groundStrength / technoRules.cost) * 1000;
        return this.basePriority * (1.0 - numOwned / this.baseAmount) * strengthPerCost;
    }

    getMaxCount(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
        threatCache: GlobalThreat | null,
    ): number | null {
        return null;
    }
}
