import { PointerType } from "@/engine/type/PointerType";
import { OrderFeedbackType } from "./OrderFeedbackType";
export abstract class Order {
    public orderType: any;
    public targetOptional: boolean = true;
    public minimapAllowed: boolean = true;
    public singleSelectionRequired: boolean = false;
    public terminal: boolean = false;
    public feedbackType: OrderFeedbackType = OrderFeedbackType.None;
    public sourceObject: any;
    public target: any;
    constructor(orderType: any) {
        this.orderType = orderType;
    }
    getPointerType(isMini: boolean, target?: any): PointerType {
        return isMini ? PointerType.Mini : PointerType.Default;
    }
    set(sourceObject: any, target: any): Order {
        this.sourceObject = sourceObject;
        this.target = target;
        return this;
    }
    isValid(): boolean {
        return true;
    }
    isAllowed(): boolean {
        return true;
    }
    onAdd(tasks: any[], isQueued: boolean): boolean {
        return true;
    }
}
