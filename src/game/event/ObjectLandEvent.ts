import { EventType } from "./EventType";
export class ObjectLandEvent {
    public readonly type: EventType;
    constructor(public readonly gameObject: any) {
        this.type = EventType.ObjectLand;
    }
}
