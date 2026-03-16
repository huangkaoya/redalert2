import { EventType } from "./EventType";
export class InflictDamageEvent {
    public readonly type: EventType;
    constructor(public readonly target: any, public readonly attacker: any, public readonly damageHitPoints: any, public readonly currentHealth: any, public readonly prevHealth: any) {
        this.type = EventType.InflictDamage;
    }
}
