import { EventType } from "./EventType";
export class UnitRepairStartEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.UnitRepairStart;
    }
}
