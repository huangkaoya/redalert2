import { Task } from "@/game/gameobject/task/system/Task";
import { RadialTileFinder } from "@/game/map/tileFinder/RadialTileFinder";
import { MoveTask } from "@/game/gameobject/task/move/MoveTask";
import { WaitMinutesTask } from "@/game/gameobject/task/system/WaitMinutesTask";
import { CallbackTask } from "@/game/gameobject/task/system/CallbackTask";
import { MoveResult } from "@/game/gameobject/trait/MoveTrait";
import { MovementZone } from "@/game/type/MovementZone";
import { NotifyTick } from "@/game/gameobject/trait/interface/NotifyTick";
import { Coords } from "@/game/Coords";
import { Vector2 } from "@/game/math/Vector2";
enum DockingStatus {
    Idle = 0,
    MoveToQueueingTile = 1,
    WaitForTurn = 2,
    MoveToDock = 3,
    Docking = 4,
    Docked = 5
}
export class MoveToDockTask extends Task {
    private game: any;
    private target: any;
    public useChildTargetLines: boolean = true;
    public preventOpportunityFire: boolean = false;
    private dockingStatus: DockingStatus = DockingStatus.Idle;
    constructor(game: any, target: any) {
        super();
        this.game = game;
        this.target = target;
    }
    onStart(unit: any): void {
        if (!this.target.dockTrait) {
            throw new Error(`Target object "${this.target.name}" is not a valid dock`);
        }
        if (this.target.dockTrait.hasReservedDockForUnit(unit)) {
            this.dockingStatus = DockingStatus.MoveToDock;
        }
        else {
            const availableDockNumber = this.target.dockTrait.getFirstAvailableDockNumber();
            if (availableDockNumber !== undefined) {
                this.target.dockTrait.reserveDockAt(unit, availableDockNumber);
                this.dockingStatus = DockingStatus.MoveToDock;
            }
            else if (this.target.helipadTrait) {
                this.cancel();
            }
            else {
                this.dockingStatus = DockingStatus.MoveToQueueingTile;
            }
        }
    }
    onEnd(unit: any): void {
        if (this.dockingStatus !== DockingStatus.Docked && this.target.isSpawned) {
            this.target.dockTrait.undockUnit(unit);
            this.target.dockTrait.unreserveDockForUnit(unit);
        }
        this.dockingStatus = DockingStatus.Idle;
    }
    onTick(unit: any): boolean {
        if (this.isCancelling())
            return true;
        if (!this.isValidTarget(this.target, unit))
            return true;
        if (this.dockingStatus === DockingStatus.MoveToQueueingTile) {
            const queueingTile = this.findReachableQueueingTile(unit);
            if (!queueingTile)
                return true;
            if (unit.tile !== queueingTile) {
                this.children.push(new MoveTask(this.game, queueingTile, false, {
                    closeEnoughTiles: 5,
                }), new CallbackTask(() => {
                    if (unit.moveTrait.lastMoveResult === MoveResult.Fail) {
                        this.cancel();
                    }
                    else if (unit.moveTrait.lastMoveResult === MoveResult.CloseEnough) {
                        if (!this.game.map.tileOccupation.isTileOccupiedBy(unit.tile, this.target)) {
                            this.dockingStatus = DockingStatus.WaitForTurn;
                        }
                    }
                }));
                return false;
            }
            this.dockingStatus = DockingStatus.WaitForTurn;
        }
        if (this.dockingStatus === DockingStatus.WaitForTurn) {
            const availableDockNumber = this.target.dockTrait.getFirstAvailableDockNumber();
            if (availableDockNumber === undefined) {
                this.children.push(new WaitMinutesTask(1 / 60));
                return false;
            }
            this.target.dockTrait.reserveDockAt(unit, availableDockNumber);
            this.dockingStatus = DockingStatus.MoveToDock;
        }
        if (this.dockingStatus === DockingStatus.MoveToDock) {
            const reservedDock = this.target.dockTrait.getReservedDockForUnit(unit);
            const dockTile = this.target.dockTrait.getDockTile(reservedDock);
            const dockOffset = Coords.vecWorldToGround(this.target.dockTrait.getDockOffset(reservedDock))
                .add(this.target.position.getMapPosition())
                .sub(new Vector2(dockTile.rx, dockTile.ry).multiplyScalar(Coords.LEPTONS_PER_TILE));
            if (unit.tile !== dockTile) {
                this.children.push(new MoveTask(this.game, dockTile, false, {
                    targetOffset: unit.isAircraft() ? dockOffset : undefined,
                    closeEnoughTiles: 0,
                    strictCloseEnough: true,
                }), new CallbackTask(() => {
                    if (unit.moveTrait.lastMoveResult === MoveResult.Fail) {
                        this.cancel();
                    }
                }));
                this.game.afterTick(() => unit.unitOrderTrait[NotifyTick.onTick](unit, this.game));
                return false;
            }
            this.dockingStatus = DockingStatus.Docking;
        }
        if (this.dockingStatus !== DockingStatus.Docking)
            return false;
        const reservedDock = this.target.dockTrait.getReservedDockForUnit(unit);
        this.target.dockTrait.unreserveDockForUnit(unit);
        this.target.dockTrait.dockUnitAt(unit, reservedDock);
        if (unit.isAircraft() && unit.airportBoundTrait && this.target.helipadTrait) {
            unit.airportBoundTrait.preferredAirport = this.target;
        }
        this.dockingStatus = DockingStatus.Docked;
        return true;
    }
    private isValidTarget(target: any, unit: any): boolean {
        return target.isSpawned && this.game.areFriendly(target, unit);
    }
    private findReachableQueueingTile(unit: any): any {
        const foundation = this.target.getFoundation();
        const targetPosition = new Vector2(this.target.tile.rx + foundation.width, this.target.tile.ry + foundation.height);
        const targetTile = this.game.map.tiles.getByMapCoords(targetPosition.x, targetPosition.y);
        if (targetTile && this.isValidQueueingTile(targetTile, unit)) {
            return targetTile;
        }
        return new RadialTileFinder(this.game.map.tiles, this.game.map.mapBounds, this.target.tile, this.target.getFoundation(), 1, 1, (tile: any) => this.isValidQueueingTile(tile, unit)).getNextTile();
    }
    private isValidQueueingTile(tile: any, unit: any): boolean {
        const isFlying = unit.rules.movementZone === MovementZone.Fly;
        const speedType = unit.rules.speedType;
        const isInfantry = unit.isInfantry();
        let islandIdMap: any = undefined;
        if (!isFlying && this.game.map.terrain.getPassableSpeed(unit.tile, speedType, isInfantry, unit.onBridge)) {
            islandIdMap = this.game.map.terrain.getIslandIdMap(speedType, isInfantry);
        }
        const isReachable = isFlying || (islandIdMap?.get(tile, false) === islandIdMap?.get(unit.tile, unit.onBridge) &&
            Math.abs(tile.z - this.target.tile.z) < 2 &&
            !tile.onBridgeLandType &&
            !this.game.map.terrain.findObstacles({ tile: tile, onBridge: undefined }, unit).length);
        return isReachable && !this.game.map.tileOccupation.isTileOccupiedBy(tile, this.target);
    }
}
