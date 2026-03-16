import { EventType } from "./EventType";
export class InsufficientFundsEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.InsufficientFunds;
    }
}
