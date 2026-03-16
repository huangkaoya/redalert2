import { EventType } from "@/game/event/EventType";
import { ZoneType } from "@/game/gameobject/unit/ZoneType";
import { TriggerCondition } from "@/game/trigger/TriggerCondition";
export class CrossHorizLineCondition extends TriggerCondition {
    private houseId: number;
    constructor(event: any, targets: any) {
        super(event, targets);
        this.houseId = Number(this.event.params[1]);
    }
    check(event: any, events: any[]): any[] {
        return events
            .filter((event) => event.type === EventType.EnterTile &&
            event.source.zone !== ZoneType.Air &&
            this.targets.some((target) => target.ry === event.target.ry) &&
            (-1 === this.houseId ||
                event.source.owner.country?.id === this.houseId))
            .map((event) => event.target);
    }
}
