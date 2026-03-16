import { EventType } from "./EventType";
export class WarheadDetonateEvent {
    public readonly type: EventType;
    constructor(public readonly target: any, public readonly position: any, public readonly explodeAnim: any, public readonly isLightningStrike: boolean) {
        this.type = EventType.WarheadDetonate;
    }
}
