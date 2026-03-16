import { EventType } from "./EventType";
export class ObjectLiftOffEvent {
    public readonly type: EventType;
    constructor(public readonly gameObject: any) {
        this.type = EventType.ObjectLiftOff;
    }
}
