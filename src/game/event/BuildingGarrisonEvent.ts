import { EventType } from "./EventType";
export class BuildingGarrisonEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.BuildingGarrison;
    }
}
