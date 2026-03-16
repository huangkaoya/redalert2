import { EventType } from "./EventType";
export class EnterObjectEvent {
    public readonly type: EventType;
    constructor(public readonly target: any, public readonly source: any) {
        this.type = EventType.EnterObject;
    }
}
