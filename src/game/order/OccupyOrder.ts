import { Order } from "@/game/order/Order";
import { OrderType } from "@/game/order/OrderType";
import { PointerType } from "@/engine/type/PointerType";
import { GarrisonBuildingTask } from "@/game/gameobject/task/GarrisonBuildingTask";
import { RangeHelper } from "@/game/gameobject/unit/RangeHelper";
import { OrderFeedbackType } from "@/game/order/OrderFeedbackType";
import { MovementZone } from "@/game/type/MovementZone";
import { LocomotorType } from "@/game/type/LocomotorType";
import { EnterRecyclerTask } from "@/game/gameobject/task/EnterRecyclerTask";
import { InfiltrateBuildingTask } from "@/game/gameobject/task/InfiltrateBuildingTask";
import { EnterHospitalTask } from "@/game/gameobject/task/EnterHospitalTask";
export class OccupyOrder extends Order {
    private game: any;
    constructor(game: any) {
        super(OrderType.Occupy);
        this.game = game;
        this.targetOptional = false;
        this.terminal = true;
        this.feedbackType = OrderFeedbackType.Capture;
    }
    getPointerType(mini: boolean): PointerType {
        return mini
            ? this.isAllowed()
                ? PointerType.OccupyMini
                : PointerType.NoActionMini
            : this.isAllowed()
                ? PointerType.Occupy
                : PointerType.NoOccupy;
    }
    isValid(): boolean {
        if (!(this.target.obj?.isSpawned &&
            this.target.obj?.isBuilding() &&
            this.sourceObject.isUnit())) {
            return false;
        }
        if (this.isUnitRecycle(this.sourceObject, this.target.obj)) {
            return true;
        }
        if (!this.sourceObject.isInfantry()) {
            return false;
        }
        if (this.target.obj.isBuilding() && this.target.obj.hospitalTrait) {
            return this.game.areFriendly(this.sourceObject, this.target.obj) &&
                this.sourceObject.isInfantry();
        }
        if (this.target.obj.garrisonTrait) {
            return this.target.obj.garrisonTrait.canBeOccupied() &&
                this.sourceObject.rules.occupier &&
                !(this.target.obj.garrisonTrait.units.length &&
                    this.target.obj.garrisonTrait.units[0].owner !== this.sourceObject.owner) &&
                !this.sourceObject.mindControllableTrait?.isActive() &&
                !this.sourceObject.mindControllerTrait?.isActive();
        }
        return !!(this.target.obj.rules.spyable &&
            this.sourceObject.rules.infiltrate &&
            !this.game.areFriendly(this.sourceObject, this.target.obj));
    }
    private isUnitRecycle(unit: any, building: any): boolean {
        return unit.owner === building.owner &&
            ((unit.isInfantry() && building.rules.cloning) || building.rules.grinding) &&
            !unit.rules.engineer;
    }
    isAllowed(): boolean {
        const building = this.target.obj;
        const unit = this.sourceObject;
        if (this.isUnitRecycle(unit, building)) {
            return unit.rules.movementZone !== MovementZone.Fly &&
                unit.rules.locomotor !== LocomotorType.Chrono &&
                this.game.sellTrait.computeRefundValue(unit) > 0;
        }
        if (building.hospitalTrait) {
            return unit.healthTrait.health < 100 &&
                unit.rules.movementZone !== MovementZone.Fly;
        }
        if (building.garrisonTrait) {
            return building.garrisonTrait.units.length < building.rules.maxNumberOccupants;
        }
        return true;
    }
    process(): any[] {
        const building = this.target.obj;
        const unit = this.sourceObject;
        if (this.isUnitRecycle(unit, building)) {
            return [new EnterRecyclerTask(this.game, building)];
        }
        if (building.hospitalTrait) {
            return [new EnterHospitalTask(this.game, building)];
        }
        if (building.garrisonTrait) {
            return [new GarrisonBuildingTask(this.game, building)];
        }
        return [new InfiltrateBuildingTask(this.game, building)];
    }
    onAdd(tasks: any[], replace: boolean): boolean {
        if (!replace) {
            const existingTask = tasks.find(task => task instanceof GarrisonBuildingTask ||
                task instanceof InfiltrateBuildingTask);
            if (this.isValid() &&
                this.isAllowed() &&
                existingTask &&
                !existingTask.isCancelling() &&
                existingTask.target === this.target.obj) {
                if (new RangeHelper(this.game.map.tileOccupation).isInTileRange(this.sourceObject, this.target.obj, 0, Math.SQRT2)) {
                    return false;
                }
            }
        }
        return true;
    }
}
