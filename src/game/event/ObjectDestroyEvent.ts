import { EventType } from "./EventType";
export class ObjectDestroyEvent {
    public readonly type: EventType;
    constructor(public readonly target: any, public readonly attackerInfo: any, public readonly incidental: any) {
        this.type = EventType.ObjectDestroy;
    }
}
