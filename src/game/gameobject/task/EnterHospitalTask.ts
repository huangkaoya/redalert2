import { Task } from "@/game/gameobject/task/system/Task";
import { MoveOutsideTask } from "@/game/gameobject/task/move/MoveOutsideTask";
import { MoveInsideTask } from "@/game/gameobject/task/move/MoveInsideTask";
import { MovementZone } from "@/game/type/MovementZone";
import { MovePositionHelper } from "@/game/gameobject/unit/MovePositionHelper";
import { RadialTileFinder } from "@/game/map/tileFinder/RadialTileFinder";
import { MoveTask } from "@/game/gameobject/task/move/MoveTask";
import { CallbackTask } from "@/game/gameobject/task/system/CallbackTask";
import { MoveResult } from "@/game/gameobject/trait/MoveTrait";
import { EnterObjectEvent } from "@/game/event/EnterObjectEvent";
enum EnterHospitalState {
    MoveToQueueingTile = 0,
    WaitForTurn = 1,
    MoveToTarget = 2,
    EnterTarget = 3,
    ClearTarget = 4
}
export class EnterHospitalTask extends Task {
    private game: any;
    private target: any;
    private movePerformed: boolean = false;
    private state: EnterHospitalState;
    private queueingTile: any;
    private lastOutsideTile: any;
    constructor(game: any, target: any) {
        super();
        this.game = game;
        this.target = target;
    }
    isAllowed(unit: any): boolean {
        return (unit.rules.movementZone !== MovementZone.Fly &&
            unit.healthTrait.health < 100 &&
            this.target.hospitalTrait &&
            !this.target.isDestroyed &&
            !this.target.warpedOutTrait.isActive() &&
            this.game.areFriendly(unit, this.target) &&
            (!this.target.ammoTrait || this.target.ammoTrait.ammo > 0));
    }
    onStart(unit: any): void {
        if (!this.target.hospitalTrait) {
            throw new Error(`Target ${this.target.name} is not a valid hospital`);
        }
        if (this.target.hospitalTrait.addToHealQueue(unit) > 0) {
            this.state = EnterHospitalState.MoveToQueueingTile;
        }
        else {
            this.state = EnterHospitalState.MoveToTarget;
        }
    }
    onEnd(unit: any): void {
        if (!this.target.isDestroyed && unit.isSpawned) {
            this.target.hospitalTrait.removeFromHealQueue(unit);
        }
    }
    onTick(unit: any): boolean {
        if ((this.isCancelling() && this.state !== EnterHospitalState.EnterTarget) ||
            this.state === EnterHospitalState.ClearTarget ||
            unit.moveTrait.isDisabled()) {
            return true;
        }
        if (this.state === EnterHospitalState.MoveToQueueingTile) {
            const movePositionHelper = new MovePositionHelper(this.game.map);
            const tileFinder = new RadialTileFinder(this.game.map.tiles, this.game.map.mapBounds, this.target.tile, this.target.getFoundation(), 1, 1, (tile: any) => this.game.map.terrain.getPassableSpeed(tile, unit.rules.speedType, unit.isInfantry(), false) > 0 &&
                movePositionHelper.isEligibleTile(tile, undefined, undefined, this.target.tile));
            const nextTile = tileFinder.getNextTile();
            if (!nextTile) {
                return true;
            }
            this.children.push(new MoveTask(this.game, nextTile, false, { closeEnoughTiles: 5 }));
            this.children.push(new CallbackTask(() => {
                if (![MoveResult.Success, MoveResult.CloseEnough].includes(unit.moveTrait.lastMoveResult)) {
                    this.cancel();
                }
            }));
            this.state = EnterHospitalState.WaitForTurn;
            this.queueingTile = nextTile;
            return false;
        }
        if (this.state === EnterHospitalState.WaitForTurn) {
            if (!this.target.hospitalTrait.unitIsFirstInHealQueue(unit)) {
                return false;
            }
            this.queueingTile = undefined;
            this.state = EnterHospitalState.MoveToTarget;
        }
        if (this.state === EnterHospitalState.MoveToTarget) {
            if (this.movePerformed && this.children.length) {
                if (unit.tile !== this.lastOutsideTile &&
                    !this.game.map.tileOccupation.isTileOccupiedBy(unit.tile, this.target)) {
                    this.lastOutsideTile = unit.tile;
                }
                return false;
            }
            if (!this.isAllowed(unit)) {
                return true;
            }
            if (!this.game.map.tileOccupation.isTileOccupiedBy(unit.tile, this.target)) {
                if (this.movePerformed) {
                    return true;
                }
                this.children.push(new MoveInsideTask(this.game, this.target).setBlocking(false));
                this.movePerformed = true;
                return false;
            }
            this.state = EnterHospitalState.EnterTarget;
        }
        if (this.state === EnterHospitalState.EnterTarget) {
            if (!this.isAllowed(unit) || this.isCancelling()) {
                this.children.push(new MoveOutsideTask(this.game, this.target, this.lastOutsideTile));
                this.state = EnterHospitalState.ClearTarget;
                return false;
            }
            this.game.limboObject(unit, {
                selected: false,
                controlGroup: this.game
                    .getUnitSelection()
                    .getOrCreateSelectionModel(unit)
                    .getControlGroupNumber()
            });
            this.target.hospitalTrait.startHealing(unit);
            this.game.events.dispatch(new EnterObjectEvent(this.target, unit));
            return true;
        }
        return false;
    }
    getTargetLinesConfig(unit: any): any {
        return {
            target: this.queueingTile ? undefined : this.target,
            pathNodes: this.queueingTile
                ? [{ tile: this.queueingTile, onBridge: undefined }]
                : []
        };
    }
}
