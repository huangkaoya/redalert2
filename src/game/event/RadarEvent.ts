import { EventType } from "./EventType";
export class RadarEvent {
    public readonly type: EventType;
    constructor(public readonly target: any, public readonly radarEventType: any, public readonly tile: any) {
        this.type = EventType.RadarEvent;
    }
}
