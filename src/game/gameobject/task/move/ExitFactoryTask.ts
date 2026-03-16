import { MoveTask } from "@/game/gameobject/task/move/MoveTask";
import { MoveState } from "@/game/gameobject/trait/MoveTrait";
import { FactoryType } from "@/game/rules/TechnoRules";
import { ScatterTask } from "@/game/gameobject/task/ScatterTask";
import { AttackTask } from "@/game/gameobject/task/AttackTask";
import { AttackMoveTargetTask } from "@/game/gameobject/task/move/AttackMoveTargetTask";
import { AttackMoveTask } from "@/game/gameobject/task/move/AttackMoveTask";
export class ExitFactoryTask extends MoveTask {
    private factory: any;
    private rallyPoint: any;
    private preventOpportunityFire: boolean = true;
    private rampBlockersPushed: boolean = false;
    private cancellable: boolean = false;
    private checkRampTiles?: any[];
    constructor(game: any, factory: any, targetTile: any, rallyPoint: any) {
        super(game, targetTile, false, {
            ignoredBlockers: [factory],
            closeEnoughTiles: 0,
            strictCloseEnough: true,
            forceWaitOnPathBlocked: factory.factoryTrait?.type !== FactoryType.InfantryType,
        });
        this.factory = factory;
        this.rallyPoint = rallyPoint;
    }
    onStart(unit: any): void {
        super.onStart(unit);
        if (this.factory.factoryTrait?.type === FactoryType.UnitType) {
            this.checkRampTiles = this.game.map.tileOccupation
                .calculateTilesForGameObject(this.factory.tile, this.factory)
                .filter(tile => this.game.map.terrain.getPassableSpeed(tile, unit.rules.speedType, unit.isInfantry(), false) > 0);
        }
    }
    canStopAtTile(unit: any, tile: any, onBridge: any): boolean {
        return !this.game.map.tileOccupation.isTileOccupiedBy(tile, this.factory) &&
            super.canStopAtTile(unit, tile, onBridge);
    }
    onTick(unit: any): boolean {
        if (this.checkRampTiles) {
            for (const tile of this.checkRampTiles) {
                for (const obj of this.game.map.tileOccupation.getGroundObjectsOnTile(tile)) {
                    if (obj.isUnit()) {
                        if (this.rampBlockersPushed)
                            return false;
                        const scatterTask = new ScatterTask(this.game, undefined, {
                            excludedTiles: this.checkRampTiles,
                        });
                        scatterTask.setCancellable(false);
                        const currentTask = obj.unitOrderTrait.getCurrentTask();
                        if (currentTask) {
                            if (currentTask.constructor === MoveTask ||
                                currentTask.constructor === AttackTask ||
                                currentTask.constructor === AttackMoveTask ||
                                currentTask.constructor === AttackMoveTargetTask) {
                                const duplicateTask = currentTask.duplicate();
                                currentTask.cancel();
                                obj.unitOrderTrait.addTaskNext(duplicateTask);
                                obj.unitOrderTrait.addTaskNext(scatterTask);
                            }
                        }
                        else {
                            obj.unitOrderTrait.addTask(scatterTask);
                        }
                    }
                }
            }
            if (!this.rampBlockersPushed) {
                this.rampBlockersPushed = true;
                return false;
            }
            this.checkRampTiles = undefined;
        }
        if (unit.moveTrait.moveState === MoveState.ReachedNextWaypoint &&
            this.options?.ignoredBlockers &&
            !this.game.map.terrain.isBlockerObject(this.factory, unit.tile, false, unit.rules.speedType, unit.isInfantry())) {
            this.options.ignoredBlockers = undefined;
            this.preventOpportunityFire = false;
            if (this.rallyPoint) {
                this.updateTarget(this.rallyPoint.tile, !!this.rallyPoint.onBridge);
                this.cancellable = true;
                this.options.closeEnoughTiles = this.game.rules.general.closeEnough;
                this.options.strictCloseEnough = false;
                this.options.forceWaitOnPathBlocked = false;
            }
        }
        return super.onTick(unit);
    }
}
