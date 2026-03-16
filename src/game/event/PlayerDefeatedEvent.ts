import { EventType } from "./EventType";
export class PlayerDefeatedEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.PlayerDefeated;
    }
}
