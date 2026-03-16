import { EventType } from "./EventType";
export class BuildingFailedPlaceEvent {
    public readonly type: EventType;
    constructor(public readonly name: string, public readonly player: any, public readonly tile: any) {
        this.type = EventType.BuildingFailedPlace;
    }
}
