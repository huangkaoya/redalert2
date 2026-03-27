import {
    GameApi,
    GameMath,
    GameObjectData,
    MovementZone,
    ObjectType,
    PlayerData,
    ProjectileRules,
    UnitData,
    WeaponRules,
} from "../../../game-api";
import { GlobalThreat } from "./threat";
import { getCachedTechnoRules } from "../common/rulesCache";

export function calculateGlobalThreat(game: GameApi, playerData: PlayerData, visibleAreaPercent: number): GlobalThreat {
    let groundUnits = game.getVisibleUnits(
        playerData.name,
        "enemy",
        (r) => r.type == ObjectType.Vehicle || r.type == ObjectType.Infantry,
    );
    let airUnits = game.getVisibleUnits(playerData.name, "enemy", (r) => r.movementZone == MovementZone.Fly);
    let groundDefence = game
        .getVisibleUnits(playerData.name, "enemy", (r) => r.type == ObjectType.Building)
        .filter((unitId) => isAntiGround(game, unitId));
    let antiAirPower = game
        .getVisibleUnits(playerData.name, "enemy", (r) => r.type != ObjectType.Building)
        .filter((unitId) => isAntiAir(game, unitId));

    let ourAntiGroundUnits = game
        .getVisibleUnits(playerData.name, "self", (r) => r.isSelectableCombatant)
        .filter((unitId) => isAntiGround(game, unitId));
    let ourAntiAirUnits = game
        .getVisibleUnits(playerData.name, "self", (r) => r.isSelectableCombatant || r.type === ObjectType.Building)
        .filter((unitId) => isAntiAir(game, unitId));
    let ourGroundDefence = game
        .getVisibleUnits(playerData.name, "self", (r) => r.type === ObjectType.Building)
        .filter((unitId) => isAntiGround(game, unitId));
    let ourAirUnits = game.getVisibleUnits(
        playerData.name,
        "self",
        (r) => r.movementZone == MovementZone.Fly && r.isSelectableCombatant,
    );

    let observedGroundThreat = calculateFirepowerForUnits(game, groundUnits);
    let observedAirThreat = calculateFirepowerForUnits(game, airUnits);
    let observedAntiAirThreat = calculateFirepowerForUnits(game, antiAirPower);
    let observedGroundDefence = calculateFirepowerForUnits(game, groundDefence);

    let ourAntiGroundPower = calculateFirepowerForUnits(game, ourAntiGroundUnits);
    let ourAntiAirPower = calculateFirepowerForUnits(game, ourAntiAirUnits);
    let ourAirPower = calculateFirepowerForUnits(game, ourAirUnits);
    let ourGroundDefencePower = calculateFirepowerForUnits(game, ourGroundDefence);

    return new GlobalThreat(
        visibleAreaPercent,
        observedGroundThreat,
        observedAirThreat,
        observedAntiAirThreat,
        observedGroundDefence,
        ourGroundDefencePower,
        ourAntiGroundPower,
        ourAntiAirPower,
        ourAirPower,
    );
}

// For the purposes of determining if units can target air/ground, we look purely at the technorules and only the base weapon (not elite)
// This excludes some special cases such as IFVs changing turrets, but we have to deal with it for now.
function isAntiGround(gameApi: GameApi, unitId: number): boolean {
    return testProjectile(gameApi, unitId, (p) => p.isAntiGround);
}
function isAntiAir(gameApi: GameApi, unitId: number): boolean {
    return testProjectile(gameApi, unitId, (p) => p.isAntiAir);
}

function testProjectile(gameApi: GameApi, unitId: number, test: (p: ProjectileRules) => boolean) {
    const rules = getCachedTechnoRules(gameApi, unitId);
    if (!rules || !(rules.primary || rules.secondary)) {
        return false;
    }

    const primaryWeapon = rules.primary ? gameApi.rulesApi.getWeapon(rules.primary) : null;
    const primaryProjectile = getProjectileRules(gameApi, primaryWeapon);
    if (primaryProjectile && test(primaryProjectile)) {
        return true;
    }

    const secondaryWeapon = rules.secondary ? gameApi.rulesApi.getWeapon(rules.secondary) : null;
    const secondaryProjectile = getProjectileRules(gameApi, secondaryWeapon);
    if (secondaryProjectile && test(secondaryProjectile)) {
        return true;
    }

    return false;
}

function getProjectileRules(gameApi: GameApi, weapon: WeaponRules | null): ProjectileRules | null {
    const primaryProjectile = weapon ? gameApi.rulesApi.getProjectile(weapon.projectile) : null;
    return primaryProjectile;
}

function calculateFirepowerForUnit(gameApi: GameApi, gameObjectData: GameObjectData): number {
    const rules = getCachedTechnoRules(gameApi, gameObjectData.id);
    if (!rules) {
        return 0;
    }
    const currentHp = gameObjectData?.hitPoints || 0;
    const maxHp = gameObjectData?.maxHitPoints || 0;
    let threat = 0;
    const hpRatio = currentHp / Math.max(1, maxHp);

    if (rules.primary) {
        const weapon = gameApi.rulesApi.getWeapon(rules.primary);
        threat += (hpRatio * ((weapon.damage + 1) * GameMath.sqrt(weapon.range + 1))) / Math.max(weapon.rof, 1);
    }
    if (rules.secondary) {
        const weapon = gameApi.rulesApi.getWeapon(rules.secondary);
        threat += (hpRatio * ((weapon.damage + 1) * GameMath.sqrt(weapon.range + 1))) / Math.max(weapon.rof, 1);
    }
    return Math.min(800, threat);
}

function calculateFirepowerForUnits(game: GameApi, unitIds: number[]) {
    let threat = 0;
    unitIds.forEach((unitId) => {
        const gameObjectData = game.getGameObjectData(unitId);
        if (gameObjectData) {
            threat += calculateFirepowerForUnit(game, gameObjectData);
        }
    });
    return threat;
}
