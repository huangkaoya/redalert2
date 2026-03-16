import { EventType } from "./EventType";
export class BridgeRepairEvent {
    public readonly type: EventType;
    constructor(public readonly source: any, public readonly tile: any) {
        this.type = EventType.BridgeRepair;
    }
}
