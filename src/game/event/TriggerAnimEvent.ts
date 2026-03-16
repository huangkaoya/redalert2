import { EventType } from "./EventType";
export class TriggerAnimEvent {
    public readonly type: EventType;
    constructor(public readonly name: string, public readonly tile: any) {
        this.type = EventType.TriggerAnim;
    }
}
