import { EventType } from "@/game/event/EventType";
import { ZoneType } from "@/game/gameobject/unit/ZoneType";
import { TriggerCondition } from "@/game/trigger/TriggerCondition";
export class EnteredByCondition extends TriggerCondition {
    private houseId: number;
    constructor(event: any, targets: any) {
        super(event, targets);
        this.houseId = Number(this.event.params[1]);
    }
    check(event: any, events: any[]): any[] {
        return events
            .filter((event) => (event.type === EventType.EnterObject ||
            event.type === EventType.EnterTile) &&
            this.targets.includes(event.target) &&
            (event.type !== EventType.EnterTile ||
                event.source.zone !== ZoneType.Air) &&
            (-1 === this.houseId ||
                event.source.owner.country?.id === this.houseId))
            .map((event) => event.target);
    }
}
