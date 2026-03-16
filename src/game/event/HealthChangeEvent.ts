import { EventType } from "./EventType";
export class HealthChangeEvent {
    public readonly type: EventType;
    constructor(public readonly target: any, public readonly currentHealth: any, public readonly prevHealth: any) {
        this.type = EventType.HealthChange;
    }
}
