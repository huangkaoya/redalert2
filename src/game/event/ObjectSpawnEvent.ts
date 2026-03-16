import { EventType } from "./EventType";
export class ObjectSpawnEvent {
    public readonly type: EventType;
    constructor(public readonly gameObject: any) {
        this.type = EventType.ObjectSpawn;
    }
}
