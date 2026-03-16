import { EventType } from "./EventType";
export class WeaponFireEvent {
    public readonly type: EventType;
    constructor(public readonly weapon: any, public readonly gameObject: any) {
        this.type = EventType.WeaponFire;
    }
}
