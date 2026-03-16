import { EventType } from "./EventType";
export class UnitPromoteEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.UnitPromote;
    }
}
