import { EventType } from "./EventType";
export class ObjectMorphEvent {
    public readonly type: EventType;
    constructor(public readonly from: any, public readonly to: any) {
        this.type = EventType.ObjectMorph;
    }
}
