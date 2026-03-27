import { GameApi, GameMath, PlayerData, TechnoRules } from "../../../game-api";
import { GlobalThreat } from "../threat/threat";
import { AiBuildingRules, numBuildingsOwnedOfType } from "./buildingRules";

export class ArtilleryUnit implements AiBuildingRules {
    constructor(
        private basePriority: number,
        private artilleryPower: number,
        private antiGroundPower: number,
        private baseAmount: number,
    ) {}

    getPlacementLocation(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
    ): { rx: number; ry: number } | undefined {
        return undefined;
    }

    getPriority(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
        threatCache: GlobalThreat | null,
    ): number {
        // Units aren't built automatically, but are instead requested by missions.
        return 0;
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
