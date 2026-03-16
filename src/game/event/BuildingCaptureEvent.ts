import { EventType } from "./EventType";
export class BuildingCaptureEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.BuildingCapture;
    }
}
