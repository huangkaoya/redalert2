import { GameApi, PlayerData, TechnoRules } from "../../../game-api";
import { AiBuildingRules, getDefaultPlacementLocation } from "./buildingRules";
import { GlobalThreat } from "../threat/threat";

export class PowerPlant implements AiBuildingRules {
    getPlacementLocation(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules
    ): { rx: number; ry: number } | undefined {
        return getDefaultPlacementLocation(game, playerData, playerData.startLocation, technoRules);
    }

    getPriority(game: GameApi, playerData: PlayerData, technoRules: TechnoRules): number {
        if (playerData.power.total < playerData.power.drain) {
            return 100;
        } else if (playerData.power.total < playerData.power.drain + technoRules.power / 2) {
            return 20;
        } else {
            return 0;
        }
    }

    getMaxCount(
        game: GameApi,
        playerData: PlayerData,
        technoRules: TechnoRules,
        threatCache: GlobalThreat | null
    ): number | null {
        return null;
    }
}
