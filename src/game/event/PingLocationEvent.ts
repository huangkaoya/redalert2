import { EventType } from "./EventType";
export class PingLocationEvent {
    public readonly type: EventType;
    constructor(public readonly tile: any, public readonly player: any) {
        this.type = EventType.PingLocation;
    }
}
