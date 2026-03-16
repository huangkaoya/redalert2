import { EventType } from "./EventType";
export class StalemateDetectEvent {
    public readonly type: EventType;
    constructor() {
        this.type = EventType.StalemateDetect;
    }
}
