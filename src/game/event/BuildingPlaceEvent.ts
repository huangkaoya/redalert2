import { EventType } from "./EventType";
export class BuildingPlaceEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.BuildingPlace;
    }
}
