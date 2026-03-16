import { Order } from "./Order";
import { OrderType } from "./OrderType";
import { PointerType } from "@/engine/type/PointerType";
import { CheerTask } from "@/game/gameobject/task/CheerTask";
import { StanceType } from "@/game/gameobject/infantry/StanceType";
export class CheerOrder extends Order {
    constructor() {
        super(OrderType.Cheer);
        this.getPointerType = () => PointerType.NoAction;
    }
    isValid(): boolean {
        return (this.sourceObject.isInfantry() &&
            [StanceType.None, StanceType.Guard].includes(this.sourceObject.stance));
    }
    isAllowed(): boolean {
        return true;
    }
    process(): CheerTask[] {
        return [new CheerTask()];
    }
}
