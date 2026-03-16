import { Order } from "./Order";
import { OrderType } from "./OrderType";
import { PointerType } from "@/engine/type/PointerType";
import { DeployIntoTask } from "@/game/gameobject/task/morph/DeployIntoTask";
import { StanceType } from "@/game/gameobject/infantry/StanceType";
import { CallbackTask } from "@/game/gameobject/task/system/CallbackTask";
import { UnitDeployUndeployEvent } from "@/game/event/UnitDeployUndeployEvent";
import { PrimaryFactoryChangeEvent } from "@/game/event/PrimaryFactoryChangeEvent";
import { EvacuateTransportTask } from "@/game/gameobject/task/EvacuateTransportTask";
import { SpeedType } from "@/game/type/SpeedType";
import { Task } from "@/game/gameobject/task/system/Task";
export class DeployOrder extends Order {
    private game: any;
    private targeted: boolean;
    constructor(game: any, targeted: boolean) {
        super(targeted ? OrderType.Deploy : OrderType.DeploySelected);
        this.game = game;
        this.targeted = targeted;
        this.minimapAllowed = false;
        this.targetOptional = !targeted;
        this.singleSelectionRequired = targeted;
    }
    getPointerType = (): PointerType => {
        return this.isAllowed() ? PointerType.Deploy : PointerType.NoDeploy;
    };
    isValid(): boolean {
        if (this.targeted &&
            (!this.target.obj || this.target.obj !== this.sourceObject)) {
            return false;
        }
        const sourceObject = this.sourceObject;
        return !!((sourceObject.isInfantry() &&
            sourceObject.deployerTrait &&
            ![StanceType.Cheer].includes(sourceObject.stance)) ||
            (sourceObject.isVehicle() && sourceObject.deployerTrait) ||
            (sourceObject.isVehicle() && sourceObject.rules.deploysInto) ||
            (sourceObject.isVehicle() && sourceObject.transportTrait) ||
            (sourceObject.isBuilding() &&
                sourceObject.rules.factory &&
                !sourceObject.owner.production?.isPrimaryFactory(sourceObject)) ||
            (sourceObject.isBuilding() && sourceObject.garrisonTrait?.units.length));
    }
    isAllowed(): boolean {
        const sourceObject = this.sourceObject;
        if (sourceObject.isVehicle() && sourceObject.transportTrait) {
            return !!(sourceObject.transportTrait.units.length &&
                0 <
                    this.game.map.terrain.getPassableSpeed(sourceObject.tile, SpeedType.Foot, false, sourceObject.onBridge));
        }
        if ((sourceObject.isInfantry() || sourceObject.isVehicle()) && sourceObject.deployerTrait) {
            return true;
        }
        if (sourceObject.isVehicle() && sourceObject.rules.deploysInto) {
            if (sourceObject.parasiteableTrait?.isInfested() &&
                !sourceObject.parasiteableTrait.beingBoarded) {
                return false;
            }
            const constructionWorker = this.game.getConstructionWorker(sourceObject.owner);
            if (sourceObject.moveTrait.currentWaypoint?.onBridge) {
                return false;
            }
            const tile = sourceObject.moveTrait.currentWaypoint?.tile ?? sourceObject.tile;
            return constructionWorker.canPlaceAt(sourceObject.rules.deploysInto, tile, {
                ignoreObjects: [sourceObject],
                ignoreAdjacent: true,
            });
        }
        if (sourceObject.isBuilding() && sourceObject.rules.factory) {
            return true;
        }
        if (sourceObject.isBuilding() && sourceObject.garrisonTrait?.units.length) {
            return true;
        }
        throw new Error("Shouldn't reach this point. Missed a case.");
    }
    process(): Task[] | undefined {
        const sourceObject = this.sourceObject;
        if (sourceObject.isVehicle() && sourceObject.transportTrait) {
            return [new EvacuateTransportTask(this.game, true)];
        }
        if (sourceObject.isBuilding() && sourceObject.rules.factory) {
            return undefined;
        }
        if (sourceObject.isVehicle() && sourceObject.rules.deploysInto) {
            return [new DeployIntoTask(this.game)];
        }
        if ((sourceObject.isInfantry() || sourceObject.isVehicle()) && sourceObject.deployerTrait) {
            return [
                new CallbackTask(() => {
                    sourceObject.deployerTrait.toggleDeployed();
                    this.game.events.dispatch(new UnitDeployUndeployEvent(sourceObject, sourceObject.deployerTrait.isDeployed() ? "undeploy" : "deploy"));
                }),
            ];
        }
        if (sourceObject.isBuilding() && sourceObject.garrisonTrait?.units.length) {
            return [
                new CallbackTask(() => {
                    sourceObject.garrisonTrait.evacuate(this.game, true);
                }),
            ];
        }
        return undefined;
    }
    onAdd(tasks: Task[], isQueued: boolean): boolean {
        const sourceObject = this.sourceObject;
        if (sourceObject.isBuilding() && sourceObject.rules.factory) {
            sourceObject.owner.production.setPrimaryFactory(sourceObject);
            this.game.events.dispatch(new PrimaryFactoryChangeEvent(sourceObject));
            return false;
        }
        if (sourceObject.isVehicle() &&
            sourceObject.transportTrait &&
            !isQueued &&
            this.isValid() &&
            this.isAllowed()) {
            const existingEvacTask = tasks.find((task: any) => task.constructor === EvacuateTransportTask &&
                !task.isCancelling()) as any;
            if (existingEvacTask) {
                existingEvacTask.forceEvac();
                return false;
            }
        }
        return true;
    }
}
