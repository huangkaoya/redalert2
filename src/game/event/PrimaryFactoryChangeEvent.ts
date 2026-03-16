import { EventType } from "./EventType";
export class PrimaryFactoryChangeEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.PrimaryFactoryChange;
    }
}
