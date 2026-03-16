import { EventType } from "./EventType";
export class ObjectSellEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.ObjectSell;
    }
}
