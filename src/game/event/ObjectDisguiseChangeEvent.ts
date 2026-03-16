import { EventType } from "./EventType";
export class ObjectDisguiseChangeEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.ObjectDisguiseChange;
    }
}
