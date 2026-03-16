import { EventType } from "./EventType";
export class BuildStatusChangeEvent {
    public readonly type: EventType;
    constructor(public readonly target: any, public readonly status: any) {
        this.type = EventType.BuildStatusChange;
    }
}
