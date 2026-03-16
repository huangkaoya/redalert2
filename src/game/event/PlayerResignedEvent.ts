import { EventType } from "./EventType";
export class PlayerResignedEvent {
    public readonly type: EventType;
    constructor(public readonly target: any, public readonly assetsRedistributed: any) {
        this.type = EventType.PlayerResigned;
    }
}
