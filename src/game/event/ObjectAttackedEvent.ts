import { EventType } from "./EventType";
export class ObjectAttackedEvent {
    public readonly type: EventType;
    constructor(public readonly target: any, public readonly attacker: any, public readonly incidental: any) {
        this.type = EventType.ObjectAttacked;
    }
}
