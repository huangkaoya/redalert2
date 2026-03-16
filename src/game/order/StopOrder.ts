import { Order } from "./Order";
import { OrderType } from "./OrderType";
import { PointerType } from "@/engine/type/PointerType";
import { LocomotorType } from "../type/LocomotorType";
import { CallbackTask } from "../gameobject/task/system/CallbackTask";
export class StopOrder extends Order {
    private game: any;
    constructor(game: any) {
        super(OrderType.Stop);
        this.game = game;
    }
    getPointerType(): PointerType {
        return PointerType.NoAction;
    }
    isValid(): boolean {
        return this.sourceObject.isTechno();
    }
    isAllowed(): boolean {
        return true;
    }
    process() {
        return [
            new CallbackTask((unit) => {
                if (!unit.isUnit())
                    return;
                if (unit.rules.locomotor !== LocomotorType.Vehicle &&
                    unit.rules.locomotor !== LocomotorType.Ship)
                    return;
                unit.moveTrait.speedPenalty = 0;
            })
        ];
    }
    onAdd(tasks: any[], isQueued: boolean): boolean {
        const source = this.sourceObject;
        if (!isQueued && tasks.length > 0 && source.isUnit()) {
            if (source.rules.locomotor === LocomotorType.Vehicle ||
                source.rules.locomotor === LocomotorType.Ship) {
                source.moveTrait.speedPenalty = 0.5;
            }
        }
        if (source.isBuilding() && source.rallyTrait?.getRallyPoint()) {
            source.unitRepairTrait?.resetRallyPoint(source, this.game);
            source.factoryTrait?.resetRallyPoint(source, this.game);
        }
        return true;
    }
}
