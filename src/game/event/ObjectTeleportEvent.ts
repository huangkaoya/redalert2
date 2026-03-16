import { EventType } from "./EventType";
export class ObjectTeleportEvent {
    public readonly type: EventType;
    constructor(public readonly target: any, public readonly isChronoshift: any, public readonly prevTile: any) {
        this.type = EventType.ObjectTeleport;
    }
}
