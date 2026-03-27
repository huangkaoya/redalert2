import { GameApi, PlayerData, TechnoRules, Tile, Vector2 } from "../../../game-api";
import { AiBuildingRules, getDefaultPlacementLocation, numBuildingsOwnedOfType } from "./buildingRules";
import { GlobalThreat } from "../threat/threat";

export class BasicBuilding implements AiBuildingRules {
    constructor(
        protected basePriority: number,
        protected maxNeeded: number,
        protected onlyBuildWhenFloatingCreditsAmount?: number,
    ) {}

    getPlacementLocation(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
    ): { rx: number; ry: number } | undefined {
        // Prefer spawning close to conyard
        const conyardVectors = game
            .getVisibleUnits(playerData.name, "self", (r) => r.constructionYard)
            .map((r) => game.getGameObjectData(r)?.tile)
            .filter((t): t is Tile => !!t)
            .map((t) => new Vector2(t.rx, t.ry));

        if (conyardVectors.length === 0) {
            return undefined;
        }
        return getDefaultPlacementLocation(game, playerData, conyardVectors[0], technoRules, false, 2);
    }

    getPriority(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
        threatCache: GlobalThreat | null,
    ): number {
        const numOwned = numBuildingsOwnedOfType(game, playerData, technoRules);
        const calcMaxCount = this.getMaxCount(game, playerData, technoRules, threatCache);
        const max = calcMaxCount ?? this.maxNeeded;
        if (numOwned >= max) {
            return -100;
        }

        const priority = this.basePriority * (1.0 - numOwned / max);

        if (this.onlyBuildWhenFloatingCreditsAmount && playerData.credits < this.onlyBuildWhenFloatingCreditsAmount) {
            return priority * (playerData.credits / this.onlyBuildWhenFloatingCreditsAmount);
        }

        return priority;
    }

    getMaxCount(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
        threatCache: GlobalThreat | null,
    ): number | null {
        return this.maxNeeded;
    }
}
