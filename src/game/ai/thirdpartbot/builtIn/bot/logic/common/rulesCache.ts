import { GameApi, TechnoRules } from "../../../game-api";

// checking technorules directly reduces the amount of calls to getUnitData(), which is a relatively expensive function.
// A null value indicates an object that does not have TechnoRules.
const technoRulesCache: { [rulesName: string]: TechnoRules | null } = {};

export const getCachedTechnoRules = (gameApi: GameApi, unitId: any): TechnoRules | null => {
    const gameObject = gameApi.getGameObjectData(unitId);
    if (!gameObject) {
        return null;
    }
    const { rulesApi } = gameApi;
    const { name } = gameObject;

    if (technoRulesCache[name]) {
        // object is present in cache, either with TechnoRules or null (indicating that it does not have TechnoRules)
        return technoRulesCache[name];
    }

    const aircraftRules = rulesApi.aircraftRules.get(name);
    if (aircraftRules) {
        technoRulesCache[name] = aircraftRules;
        return aircraftRules;
    }

    const buildingRules = rulesApi.buildingRules.get(name);
    if (buildingRules) {
        technoRulesCache[name] = buildingRules;
        return buildingRules;
    }

    const infantryRules = rulesApi.infantryRules.get(name);
    if (infantryRules) {
        technoRulesCache[name] = infantryRules;
        return infantryRules;
    }

    const vehicleRules = rulesApi.vehicleRules.get(name);
    if (vehicleRules) {
        technoRulesCache[name] = vehicleRules;
        return vehicleRules;
    }

    technoRulesCache[name] = null;
    return null;
};
