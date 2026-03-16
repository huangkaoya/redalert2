import { EventType } from "./EventType";
export class ObjectOwnerChangeEvent {
    public readonly type: EventType;
    constructor(public readonly target: any, public readonly prevOwner: any) {
        this.type = EventType.ObjectOwnerChange;
    }
}
