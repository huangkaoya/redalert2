import { GameApi, PlayerData, TechnoRules, Vector2 } from "../../../game-api";
import { getPointTowardsOtherPoint } from "../map/map";
import { getDefaultPlacementLocation } from "./buildingRules";

export const getStaticDefencePlacement = (game: GameApi, playerData: PlayerData, technoRules: TechnoRules) => {
    // Prefer front towards enemy.
    const { startLocation, name: currentName } = playerData;
    const allNames = game.getPlayers();
    // Create a list of positions that point roughly towards hostile player start locatoins.
    const candidates = allNames
        .filter((otherName) => otherName !== currentName && !game.areAlliedPlayers(otherName, currentName))
        .map((otherName) => {
            const enemyPlayer = game.getPlayerData(otherName);
            return getPointTowardsOtherPoint(game, startLocation, enemyPlayer.startLocation, 4, 16, 1.5);
        });
    if (candidates.length === 0) {
        return undefined;
    }
    const selectedLocation = candidates[Math.floor(game.generateRandom() * candidates.length)];
    return getDefaultPlacementLocation(game, playerData, selectedLocation, technoRules, false, 2);
};
