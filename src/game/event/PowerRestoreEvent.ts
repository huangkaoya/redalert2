import { EventType } from "./EventType";
export class PowerRestoreEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.PowerRestore;
    }
}
