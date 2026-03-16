import { EventType } from "./EventType";
export class LeaveTransportEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.LeaveTransport;
    }
}
