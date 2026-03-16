import { EventType } from "./EventType";
export class LightningStormCloudEvent {
    public readonly type: EventType;
    constructor(public readonly position: any) {
        this.type = EventType.LightningStormCloud;
    }
}
