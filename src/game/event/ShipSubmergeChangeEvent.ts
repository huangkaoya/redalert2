import { EventType } from "./EventType";
export class ShipSubmergeChangeEvent {
    public readonly type: EventType;
    constructor(public readonly target: any) {
        this.type = EventType.ShipSubmergeChange;
    }
}
