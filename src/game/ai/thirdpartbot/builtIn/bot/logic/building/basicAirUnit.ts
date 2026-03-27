import { GameApi, GameMath, PlayerData, TechnoRules } from "../../../game-api";
import { GlobalThreat } from "../threat/threat";
import { AiBuildingRules, getDefaultPlacementLocation, numBuildingsOwnedOfType } from "./buildingRules";

export class BasicAirUnit implements AiBuildingRules {
    constructor(
        private basePriority: number,
        private baseAmount: number,
        private antiGroundPower: number = 1, // boolean for now, but will eventually be used in weighting.
        private antiAirPower: number = 0,
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
