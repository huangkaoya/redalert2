import { EventType } from "./EventType";
export class LightningStormManifestEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.LightningStormManifest;
    }
}
