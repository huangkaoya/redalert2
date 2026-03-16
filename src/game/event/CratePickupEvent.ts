import { EventType } from "./EventType";
export class CratePickupEvent {
    public readonly type: EventType;
    constructor(public readonly target: any, public readonly player: any, public readonly source: any, public readonly tile: any) {
        this.type = EventType.CratePickup;
    }
}
