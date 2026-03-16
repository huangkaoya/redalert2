import { EventType } from "./EventType";
export class TriggerEvaEvent {
    public readonly type: EventType;
    constructor(public readonly soundId: string) {
        this.type = EventType.TriggerEva;
    }
}
