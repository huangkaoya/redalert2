import { EventType } from "./EventType";
export class BuildingRepairStartEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.BuildingRepairStart;
    }
}
