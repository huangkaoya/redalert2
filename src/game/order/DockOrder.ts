import { Order } from "./Order";
import { OrderType } from "./OrderType";
import { PointerType } from "@/engine/type/PointerType";
import { Building, BuildStatus } from "@/game/gameobject/Building";
import { ReturnOreTask } from "@/game/gameobject/task/harvester/ReturnOreTask";
import { OrderFeedbackType } from "./OrderFeedbackType";
import { MoveToDockTask } from "@/game/gameobject/task/MoveToDockTask";
export class DockOrder extends Order {
    private game: any;
    constructor(game: any) {
        super(OrderType.Dock);
        this.game = game;
        this.targetOptional = false;
        this.feedbackType = OrderFeedbackType.Move;
    }
    getPointerType(isMini: boolean): PointerType {
        if (isMini) {
            return this.isAllowed() ? PointerType.OccupyMini : PointerType.NoActionMini;
        }
        return this.isAllowed() ? PointerType.Occupy : PointerType.NoOccupy;
    }
    isValid(): boolean {
        const targetObj = this.target.obj;
        if (!targetObj?.isBuilding() ||
            targetObj.isDestroyed ||
            !targetObj.dockTrait ||
            targetObj.buildStatus !== BuildStatus.Ready ||
            !this.sourceObject.isUnit() ||
            targetObj.warpedOutTrait.isActive()) {
            return false;
        }
        const isDock = !(targetObj.rules.refinery || targetObj.unitRepairTrait);
        return (this.game.areFriendly(targetObj, this.sourceObject) &&
            targetObj.dockTrait.isValidUnitForDock(this.sourceObject) &&
            !targetObj.dockTrait.isDocked(this.sourceObject) &&
            !(targetObj.unitRepairTrait &&
                !this.sourceObject.rules.dock.includes(targetObj.name) &&
                this.sourceObject.healthTrait.health === 100) &&
            (!isDock ||
                (targetObj.dockTrait.getAvailableDockCount() ?? 0) > 0 ||
                targetObj.dockTrait.hasReservedDockForUnit(this.sourceObject)));
    }
    isAllowed(): boolean {
        return true;
    }
    process(): (ReturnOreTask | MoveToDockTask)[] {
        const targetObj = this.target.obj;
        if (targetObj.rules.refinery &&
            this.sourceObject.isVehicle() &&
            this.sourceObject.harvesterTrait) {
            return [new ReturnOreTask(this.game, targetObj, true, true)];
        }
        if (targetObj.unitRepairTrait ||
            this.sourceObject.rules.dock.includes(targetObj.name)) {
            return [new MoveToDockTask(this.game, targetObj)];
        }
        return [];
    }
}
