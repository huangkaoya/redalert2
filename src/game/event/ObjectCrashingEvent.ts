import { EventType } from "./EventType";
export class ObjectCrashingEvent {
    public readonly type: EventType;
    constructor(public readonly gameObject: any) {
        this.type = EventType.ObjectCrashing;
    }
}
