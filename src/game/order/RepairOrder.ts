import { Order } from "./Order";
import { OrderType } from "./OrderType";
import { PointerType } from "@/engine/type/PointerType";
import { RangeHelper } from "../gameobject/unit/RangeHelper";
import { RepairBuildingTask } from "../gameobject/task/RepairBuildingTask";
import { OrderFeedbackType } from "./OrderFeedbackType";
export class RepairOrder extends Order {
    private game: any;
    public targetOptional: boolean = false;
    public terminal: boolean = true;
    public feedbackType: OrderFeedbackType = OrderFeedbackType.Capture;
    constructor(game: any) {
        super(OrderType.Repair);
        this.game = game;
    }
    getPointerType(isMini: boolean): PointerType {
        if (isMini) {
            return this.isAllowed()
                ? PointerType.OccupyMini
                : PointerType.NoActionMini;
        }
        return this.isAllowed()
            ? PointerType.RepairMove
            : PointerType.NoRepair;
    }
    isValid(): boolean {
        return (!!this.target.obj?.isBuilding() &&
            !this.target.obj.isDestroyed &&
            this.sourceObject.isInfantry() &&
            this.sourceObject.rules.engineer &&
            ((!this.target.obj.owner.isCombatant() &&
                (!!this.target.obj.garrisonTrait ||
                    !!this.target.obj.cabHutTrait)) ||
                this.game.areFriendly(this.target.obj, this.sourceObject)));
    }
    isAllowed(): boolean {
        const target = this.target.obj;
        if (target.cabHutTrait) {
            return target.cabHutTrait.canRepairBridge();
        }
        return !!(target.rules.repairable && target.healthTrait.health < 100);
    }
    process() {
        const target = this.target.obj;
        return [new RepairBuildingTask(this.game, target)];
    }
    onAdd(tasks: any[], isQueued: boolean): boolean {
        if (!isQueued) {
            const repairTask = tasks.find(task => task instanceof RepairBuildingTask);
            if (this.isValid() &&
                this.isAllowed() &&
                repairTask &&
                !repairTask.isCancelling() &&
                repairTask.target === this.target.obj) {
                if (new RangeHelper(this.game.map.tileOccupation).isInTileRange(this.sourceObject, this.target.obj, 0, Math.SQRT2)) {
                    return false;
                }
            }
        }
        return true;
    }
}
