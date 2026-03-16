import { EventType } from "./EventType";
export class RallyPointChangeEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.RallyPointChange;
    }
}
