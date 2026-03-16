import { EventType } from "./EventType";
export enum AllianceEventType {
    Requested = 0,
    Formed = 1,
    Broken = 2
}
export class AllianceChangeEvent {
    public readonly type: EventType;
    constructor(public readonly alliance: any, public readonly changeType: AllianceEventType, public readonly from: any) {
        this.type = EventType.AllianceChange;
    }
}
