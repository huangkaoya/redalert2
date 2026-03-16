import { EventType } from "./EventType";
export class TimerExpireEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.TimerExpire;
    }
}
