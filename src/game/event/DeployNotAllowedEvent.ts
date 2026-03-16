import { EventType } from "./EventType";
export class DeployNotAllowedEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.DeployNotAllowed;
    }
}
