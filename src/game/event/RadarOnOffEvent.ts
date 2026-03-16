import { EventType } from "./EventType";
export class RadarOnOffEvent {
    public readonly type: EventType;
    constructor(public readonly target: any, public readonly radarEnabled: boolean) {
        this.type = EventType.RadarOnOff;
    }
}
