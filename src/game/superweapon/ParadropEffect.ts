import { Coords } from "@/game/Coords";
import { ObjectType } from "@/engine/type/ObjectType";
import { Infantry } from "@/game/gameobject/Infantry";
import { StanceType } from "@/game/gameobject/infantry/StanceType";
import { MoveTask } from "@/game/gameobject/task/move/MoveTask";
import { ParadropTask } from "@/game/gameobject/task/ParadropTask";
import { UnlandableTrait } from "@/game/gameobject/trait/UnlandableTrait";
import { FacingUtil } from "@/game/gameobject/unit/FacingUtil";
import { RangeHelper } from "@/game/gameobject/unit/RangeHelper";
import { VeteranLevel } from "@/game/gameobject/unit/VeteranLevel";
import { ZoneType } from "@/game/gameobject/unit/ZoneType";
import { GameSpeed } from "@/game/GameSpeed";
import { RadialTileFinder } from "@/game/map/tileFinder/RadialTileFinder";
import { Vector2 } from "@/game/math/Vector2";
import { bresenham } from "@/util/bresenham";
import { SuperWeaponEffect } from "@/game/superweapon/SuperWeaponEffect";
enum ParadropState {
    Spawning = 0,
    EnRoute = 1,
    Dropping = 2,
    TurningAround = 3
}
const SPAWN_DELAY_MULTIPLIER = 5 * GameSpeed.BASE_TICKS_PER_SECOND;
export class ParadropEffect extends SuperWeaponEffect {
    private paradropSquad: any;
    private state: ParadropState;
    private failedAttempts: number;
    private spawnDelay: number;
    private passengerRules: any;
    private passengerCount: number;
    private targetTile: any;
    private pdPlane: any;
    constructor(e: any, t: any, i: any, r: any, s: number) {
        super(e, t, i);
        this.paradropSquad = r;
        this.state = ParadropState.Spawning;
        this.failedAttempts = 0;
        this.spawnDelay = s * SPAWN_DELAY_MULTIPLIER;
    }
    onStart(e: any): void {
        this.passengerRules = e.rules.getObject(this.paradropSquad.inf, ObjectType.Infantry);
        this.passengerCount = this.paradropSquad.num;
    }
    computeFlightPath(e: Vector2, t: Vector2, i: any): {
        fromTile: any;
        toTile: any;
    } {
        if (t.equals(e))
            throw new Error("Source and destination must be different");
        let r = e.clone().sub(t);
        const radiusInTiles = i.rules.general.paradrop.paradropRadius / Coords.LEPTONS_PER_TILE;
        const endPoint = t
            .clone()
            .add(r.clone().setLength(r.length() + 2 * radiusInTiles))
            .floor();
        let pathTiles = bresenham(t.x, t.y, endPoint.x, endPoint.y)
            .map((e: any) => i.map.tiles.getByMapCoords(e.x, e.y) ??
            i.map.tiles.getPlaceholderTile(e.x, e.y));
        while (pathTiles.length) {
            const firstTile = pathTiles[0];
            const worldCoords = Coords.tileToWorld(firstTile.rx + 0.5, firstTile.ry + 0.5);
            if (i.map.isWithinHardBounds(new Vector2(worldCoords.x, worldCoords.y)))
                break;
            pathTiles.shift();
        }
        if (!pathTiles.length)
            throw new Error("No valid paradrop path found");
        return { fromTile: pathTiles[0], toTile: pathTiles[pathTiles.length - 1] };
    }
    onTick(gameState: any): boolean {
        if (this.state === ParadropState.Spawning) {
            if (this.spawnDelay > 0) {
                this.spawnDelay--;
                return false;
            }
            const mapSize = gameState.map.tiles.getMapSize();
            const spawnPoints = [
                new Vector2(0, 0),
                new Vector2(Math.floor(mapSize.width / 2), 0),
                new Vector2(0, Math.floor(mapSize.height / 2)),
            ];
            const spawnPoint = spawnPoints[gameState.generateRandomInt(0, 2)];
            const speedType = this.passengerRules.speedType;
            const tileFinder = new RadialTileFinder(gameState.map.tiles, gameState.map.mapBounds, this.tile, { width: 1, height: 1 }, 0, 50, (tile: any) => gameState.map.terrain.getPassableSpeed(tile, speedType, true, !!tile.onBridgeLandType) > 0);
            const targetTile = (this.targetTile = tileFinder.getNextTile());
            if (!targetTile)
                return true;
            const targetCoords = new Vector2(targetTile.rx, targetTile.ry);
            const { fromTile, toTile } = this.computeFlightPath(targetCoords, spawnPoint, gameState);
            const planeType = gameState.rules.general.paradrop.paradropPlane;
            const planeRules = gameState.rules.getObject(planeType, ObjectType.Aircraft);
            const plane = (this.pdPlane = gameState.createUnitForPlayer(planeRules, this.owner));
            gameState.spawnObject(plane, fromTile);
            plane.direction = FacingUtil.fromMapCoords(targetCoords.clone().sub(new Vector2(fromTile.rx, fromTile.ry)));
            plane.position.tileElevation = Coords.worldToTileHeight(plane.rules.flightLevel ?? gameState.rules.general.flightLevel);
            plane.zone = ZoneType.Air;
            plane.onBridge = false;
            plane.unitOrderTrait.addTask(new MoveTask(gameState, toTile, false, { allowOutOfBoundsTarget: true }));
            plane.traits.get(UnlandableTrait).setEnabled(false);
            this.state = ParadropState.EnRoute;
        }
        if (!this.pdPlane ||
            this.pdPlane.isDestroyed ||
            this.pdPlane.isCrashing) {
            return true;
        }
        const targetTile = this.targetTile;
        if (!this.pdPlane.unitOrderTrait.hasTasks()) {
            this.state = ParadropState.TurningAround;
            this.pdPlane.unitOrderTrait.addTask(new MoveTask(gameState, targetTile, false, { allowOutOfBoundsTarget: true }));
            return false;
        }
        const paradropRadius = gameState.rules.general.paradrop.paradropRadius / Coords.LEPTONS_PER_TILE;
        const rangeHelper = new RangeHelper(gameState.map.tileOccupation);
        const inRange = rangeHelper.isInTileRange(this.pdPlane.tile, targetTile, 0, paradropRadius);
        if (this.state === ParadropState.EnRoute && inRange) {
            this.state = ParadropState.Dropping;
        }
        if (this.state === ParadropState.Dropping) {
            if (inRange && this.passengerCount > 0) {
                const currentTile = this.pdPlane.tile;
                const onBridge = !!currentTile.onBridgeLandType;
                if (this.failedAttempts > 5 &&
                    gameState.map.mapBounds.isWithinBounds(currentTile)) {
                    this.passengerCount = 0;
                    return false;
                }
                if (!gameState.map.terrain.getPassableSpeed(currentTile, this.passengerRules.speedType, true, onBridge)) {
                    return false;
                }
                const groundObjects = gameState.map.getGroundObjectsOnTile(currentTile);
                if (groundObjects.some((obj: any) => (obj.isVehicle() && obj.onBridge === onBridge) ||
                    (obj.isBuilding() && !obj.isDestroyed) ||
                    (obj.isInfantry() && obj.stance === StanceType.Paradrop))) {
                    return false;
                }
                const freeSubCell = this.findFreeSubCell(gameState, currentTile);
                if (!freeSubCell)
                    return false;
                this.passengerCount--;
                const infantry = gameState.createUnitForPlayer(this.passengerRules, this.owner);
                infantry.stance = StanceType.Paradrop;
                infantry.position.tileElevation = this.pdPlane.tileElevation;
                infantry.position.subCell = freeSubCell;
                infantry.onBridge = onBridge;
                if (infantry.rules.trainable &&
                    this.owner.canProduceVeteran(infantry.rules)) {
                    infantry.veteranTrait?.setVeteranLevel(VeteranLevel.Veteran);
                }
                gameState.spawnObject(infantry, currentTile);
                infantry.unitOrderTrait.addTask(new ParadropTask(gameState).setCancellable(false));
            }
            else {
                if (this.passengerCount <= 0) {
                    this.pdPlane.unitOrderTrait
                        .getCurrentTask()
                        .forceCancel(this.pdPlane);
                    this.pdPlane.traits
                        .get(UnlandableTrait)
                        .setEnabled(true);
                    return true;
                }
                this.failedAttempts++;
                this.state = ParadropState.TurningAround;
                this.pdPlane.unitOrderTrait
                    .getCurrentTask()
                    .updateTarget(targetTile, !!targetTile.onBridgeLandType);
            }
        }
        if (this.state === ParadropState.TurningAround && inRange) {
            const exitTile = this.computeFlightPath(new Vector2(targetTile.rx, targetTile.ry), new Vector2(this.pdPlane.tile.rx, this.pdPlane.tile.ry), gameState).toTile;
            this.pdPlane.unitOrderTrait
                .getCurrentTask()
                .updateTarget(exitTile, false);
            this.state = ParadropState.EnRoute;
        }
        return false;
    }
    findFreeSubCell(gameState: any, tile: any): any {
        const occupiedSubCells = gameState.map
            .getGroundObjectsOnTile(tile)
            .filter((obj: any) => obj.isTerrain())
            .map((obj: any) => obj.rules.getOccupiedSubCells(gameState.map.getTheaterType()))
            .flat();
        const availableSubCells = Infantry.SUB_CELLS.filter((subCell: any) => occupiedSubCells.indexOf(subCell) === -1);
        if (availableSubCells.length) {
            return availableSubCells.length > 1
                ? availableSubCells[gameState.generateRandomInt(0, availableSubCells.length - 1)]
                : availableSubCells[0];
        }
        return null;
    }
}
