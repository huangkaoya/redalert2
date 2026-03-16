import { PowerLevel } from "@/game/player/trait/PowerTrait";
import { MapApi } from "@/game/api/MapApi";
import { ObjectType } from "@/engine/type/ObjectType";
import { GameSpeed } from "@/game/GameSpeed";
import { RulesApi } from "@/game/api/RulesApi";
interface WeaponData {
    type: string;
    rules: any;
    projectileRules: any;
    warheadRules: any;
    minRange: number;
    maxRange: number;
    speed: number;
    cooldownTicks: number;
}
interface PlayerData {
    name: string;
    country: string;
    startLocation: any;
    isObserver: boolean;
    isAi: boolean;
    isCombatant: boolean;
    credits: number;
    power: {
        total: number;
        drain: number;
        isLowPower: boolean;
    };
    radarDisabled: boolean;
}
interface GameObjectData {
    id: string;
    type: string;
    name: string;
    rules: any;
    tile: any;
    tileElevation: number;
    worldPosition: any;
    foundation: any;
    hitPoints?: number;
    maxHitPoints?: number;
    owner?: string;
}
interface UnitData extends GameObjectData {
    owner: string;
    sight: number;
    veteranLevel: number;
    guardMode: boolean;
    purchaseValue: number;
    primaryWeapon?: WeaponData;
    secondaryWeapon?: WeaponData;
    deathWeapon?: WeaponData;
    attackState?: string;
    direction: number;
    onBridge?: boolean;
    zone?: any;
    buildStatus?: string;
    factory?: {
        deliveringUnit?: string;
        status: string;
    };
    rallyPoint?: any;
    isPoweredOn?: boolean;
    hasWrenchRepair?: boolean;
    turretFacing?: number;
    turretNo?: number;
    garrisonUnitCount?: number;
    garrisonUnitsMax?: number;
    passengerSlotCount?: number;
    passengerSlotMax?: number;
    isIdle: boolean;
    canMove?: boolean;
    velocity?: any;
    stance?: string;
    harvestedOre?: number;
    harvestedGems?: number;
    ammo?: number;
    isWarpedOut: boolean;
    mindControlledBy?: string;
    tntTimer?: number;
}
interface SuperWeaponData {
    playerName: string;
    type: string;
    status: string;
    timerSeconds: number;
}
interface BuildingPlacementData {
    foundation: any;
    foundationCenter: any;
}
export class GameApi {
    private game: any;
    private useGameRandom: boolean;
    public mapApi: MapApi;
    public rulesApi: RulesApi;
    constructor(game: any, useGameRandom: boolean) {
        this.game = game;
        this.useGameRandom = useGameRandom;
        this.mapApi = new MapApi(game);
        this.rulesApi = new RulesApi(game.rules);
    }
    isPlayerDefeated(playerName: string): boolean {
        return this.game.getPlayerByName(playerName).defeated;
    }
    areAlliedPlayers(playerName1: string, playerName2: string): boolean {
        const player1 = this.game.getPlayerByName(playerName1);
        if (!player1)
            throw new Error(`Player "${playerName1}" doesn't exist`);
        const player2 = this.game.getPlayerByName(playerName2);
        if (!player2)
            throw new Error(`Player "${playerName2}" doesn't exist`);
        return this.game.alliances.areAllied(player1, player2);
    }
    canPlaceBuilding(playerName: string, position: any, buildingType: string): boolean {
        const player = this.game.getPlayerByName(playerName);
        if (!player)
            throw new Error(`Player "${playerName}" doesn't exist`);
        return this.game
            .getConstructionWorker(player)
            .canPlaceAt(position, buildingType, { normalizedTile: true });
    }
    getBuildingPlacementData(buildingType: string): BuildingPlacementData {
        const buildingData = this.game.art.getObject(buildingType, ObjectType.Building);
        return {
            foundation: buildingData.foundation,
            foundationCenter: buildingData.foundationCenter,
        };
    }
    getPlayers(): string[] {
        return this.game
            .getNonNeutralPlayers()
            .map((player: any) => player.name);
    }
    getPlayerData(playerName: string): PlayerData {
        const player = this.game.getPlayerByName(playerName);
        if (!player)
            throw new Error(`Player "${playerName}" doesn't exist`);
        return {
            name: player.name,
            country: player.country,
            startLocation: this.mapApi.getStartingLocations()[player.startLocation ?? 0],
            isObserver: player.isObserver,
            isAi: player.isAi,
            isCombatant: player.isCombatant(),
            credits: player.credits,
            power: {
                total: player.powerTrait?.power ?? 0,
                drain: player.powerTrait?.drain ?? 0,
                isLowPower: player.powerTrait?.level === PowerLevel.Low,
            },
            radarDisabled: !!player.radarTrait?.isDisabled(),
        };
    }
    getAllTerrainObjects(): string[] {
        return this.game
            .getWorld()
            .getAllObjects()
            .filter((obj: any) => obj.isTerrain())
            .map((obj: any) => obj.id);
    }
    getAllUnits(filter: (rules: any) => boolean = () => true): string[] {
        return this.game
            .getWorld()
            .getAllObjects()
            .filter((obj: any) => obj.isTechno() && filter(obj.rules))
            .map((obj: any) => obj.id);
    }
    getNeutralUnits(filter: (rules: any) => boolean = () => true): string[] {
        return this.game
            .getCivilianPlayer()
            .getOwnedObjects()
            .filter((obj: any) => filter(obj.rules))
            .map((obj: any) => obj.id);
    }
    getUnitsInArea(area: any): string[] {
        return this.game.map.technosByTile
            .queryRange(area)
            .map((obj: any) => obj.id);
    }
    getVisibleUnits(playerName: string, type: "self" | "allied" | "hostile" | "enemy", filter: (rules: any) => boolean = () => true): string[] {
        const player = this.game.getPlayerByName(playerName);
        if (!player)
            throw new Error(`Player "${playerName}" doesn't exist`);
        if (type === "self") {
            return player
                .getOwnedObjects()
                .filter((obj: any) => filter(obj.rules))
                .map((obj: any) => obj.id);
        }
        let visibilityFilter: (obj: any) => boolean;
        if (type === "allied") {
            visibilityFilter = (obj: any) => obj.owner === player ||
                this.game.alliances.areAllied(obj.owner, player);
        }
        else if (type === "hostile" || type === "enemy") {
            const playerShroud = this.game.mapShroudTrait.getPlayerShroud(player);
            visibilityFilter = (obj: any) => this.game.map.tileOccupation
                .calculateTilesForGameObject(obj.tile, obj)
                .some((tile: any) => !playerShroud?.isShrouded(tile, obj.tileElevation)) &&
                obj.owner !== player &&
                !this.game.alliances.areAllied(obj.owner, player) &&
                (type !== "enemy" || obj.owner.isCombatant());
        }
        else {
            throw new Error("Unexpected type " + type);
        }
        return this.game
            .getWorld()
            .getAllObjects()
            .filter((obj: any) => obj.isTechno() &&
            !obj.isDestroyed &&
            visibilityFilter(obj) &&
            filter(obj.rules))
            .map((obj: any) => obj.id);
    }
    getGameObjectData(objectId: string): GameObjectData | undefined {
        if (this.game.getWorld().hasObjectId(objectId)) {
            const obj = this.game.getObjectById(objectId);
            return {
                id: obj.id,
                type: obj.type,
                name: obj.name,
                rules: obj.rules,
                tile: obj.tile,
                tileElevation: obj.tileElevation,
                worldPosition: obj.position.worldPosition.clone(),
                foundation: obj.getFoundation(),
                hitPoints: obj.healthTrait?.getHitPoints(),
                maxHitPoints: obj.healthTrait?.maxHitPoints,
                owner: obj.isTechno() ? obj.owner.name : undefined,
            };
        }
    }
    getUnitData(objectId: string): UnitData | undefined {
        const gameObjectData = this.getGameObjectData(objectId);
        if (gameObjectData) {
            const unit = this.game.getObjectById(objectId);
            if (!unit.isTechno()) {
                throw new Error(`Game object with id ${objectId} is not a Techno type`);
            }
            return {
                ...gameObjectData,
                owner: unit.owner.name,
                sight: unit.sight,
                veteranLevel: unit.veteranLevel,
                guardMode: unit.guardMode,
                purchaseValue: unit.purchaseValue,
                primaryWeapon: unit.primaryWeapon
                    ? this.getWeaponData(unit.primaryWeapon)
                    : undefined,
                secondaryWeapon: unit.secondaryWeapon
                    ? this.getWeaponData(unit.secondaryWeapon)
                    : undefined,
                deathWeapon: unit.armedTrait?.deathWeapon
                    ? this.getWeaponData(unit.armedTrait.deathWeapon)
                    : undefined,
                attackState: unit.attackTrait?.attackState,
                direction: unit.direction,
                onBridge: unit.isInfantry() || unit.isVehicle() ? unit.onBridge : undefined,
                zone: unit.isUnit() ? unit.zone : undefined,
                buildStatus: unit.isBuilding() ? unit.buildStatus : undefined,
                factory: unit.isBuilding() && unit.factoryTrait
                    ? {
                        deliveringUnit: unit.factoryTrait.deliveringUnit?.id,
                        status: unit.factoryTrait.status,
                    }
                    : undefined,
                rallyPoint: unit.isBuilding() ? unit.rallyTrait?.getRallyPoint() : undefined,
                isPoweredOn: unit.isBuilding() && unit.poweredTrait?.isPoweredOn(),
                hasWrenchRepair: unit.isBuilding() && !unit.autoRepairTrait.isDisabled(),
                turretFacing: unit.isBuilding() || unit.isVehicle() ? unit.turretTrait?.facing : undefined,
                turretNo: unit.isVehicle() ? unit.turretNo : undefined,
                garrisonUnitCount: unit.isBuilding() ? unit.garrisonTrait?.units.length : undefined,
                garrisonUnitsMax: unit.isBuilding() ? unit.garrisonTrait?.maxOccupants : undefined,
                passengerSlotCount: unit.isVehicle() ? unit.transportTrait?.getOccupiedCapacity() : undefined,
                passengerSlotMax: unit.isVehicle() ? unit.transportTrait?.getMaxCapacity() : undefined,
                isIdle: !unit.unitOrderTrait.hasTasks(),
                canMove: unit.isUnit() ? !unit.moveTrait.isDisabled() : undefined,
                velocity: unit.isUnit() ? unit.moveTrait.velocity.clone() : undefined,
                stance: unit.isInfantry() ? unit.stance : undefined,
                harvestedOre: unit.isVehicle() ? unit.harvesterTrait?.ore : undefined,
                harvestedGems: unit.isVehicle() ? unit.harvesterTrait?.gems : undefined,
                ammo: unit.isAircraft() ? unit.ammo : undefined,
                isWarpedOut: unit.warpedOutTrait.isActive(),
                mindControlledBy: unit.mindControllableTrait?.getController()?.id,
                tntTimer: unit.tntChargeTrait?.getTicksLeft(),
            };
        }
    }
    getAllSuperWeaponData(): SuperWeaponData[] {
        return this.game
            .getCombatants()
            .map((player: any) => player.superWeaponsTrait.getAll().map((weapon: any) => ({
            playerName: player.name,
            type: weapon.rules.type,
            status: weapon.status,
            timerSeconds: weapon.getTimerSeconds(),
        })))
            .flat();
    }
    getGeneralRules(): any {
        return this.game.rules.general;
    }
    getRulesIni(): string {
        return this.game.rules.getIni();
    }
    getArtIni(): string {
        return this.game.art.getIni();
    }
    getAiIni(): string {
        return this.game.ai.getIni();
    }
    generateRandomInt(min: number, max: number): number {
        if (this.useGameRandom) {
            return this.game.generateRandomInt(min, max);
        }
        const random = this.generateRandom();
        return Math.round(random * (max - min)) + min;
    }
    generateRandom(): number {
        return this.useGameRandom
            ? this.game.generateRandom()
            : Math.random();
    }
    getTickRate(): number {
        return this.game.speed.value * GameSpeed.BASE_TICKS_PER_SECOND;
    }
    getBaseTickRate(): number {
        return GameSpeed.BASE_TICKS_PER_SECOND;
    }
    getCurrentTick(): number {
        return this.game.currentTick;
    }
    getCurrentTime(): number {
        return this.game.currentTime / 1000;
    }
    private getWeaponData(weapon: any): WeaponData {
        return {
            type: weapon.type,
            rules: weapon.rules,
            projectileRules: weapon.projectileRules,
            warheadRules: weapon.warhead.rules,
            minRange: weapon.minRange,
            maxRange: weapon.range,
            speed: weapon.speed,
            cooldownTicks: weapon.getCooldownTicks(),
        };
    }
}
