import { EventType } from "./EventType";
export class ObjectCloakChangeEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.ObjectCloakChange;
    }
}
