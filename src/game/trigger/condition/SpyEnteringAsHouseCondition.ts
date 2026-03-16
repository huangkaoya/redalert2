import { EventType } from "@/game/event/EventType";
import { TriggerCondition } from "@/game/trigger/TriggerCondition";
export class SpyEnteringAsHouseCondition extends TriggerCondition {
    private houseId: number;
    constructor(params: any[], targets: any[]) {
        super(params, targets);
        this.houseId = Number(params[1]);
    }
    check(events: any[], targets: any[]): any[] {
        return events
            .filter((event) => {
            if (event.type !== EventType.BuildingInfiltration)
                return false;
            const target = event.target;
            return (this.targets.includes(target) &&
                (this.houseId === -1 ||
                    event.source.disguiseTrait?.getDisguise()?.owner?.country?.id === this.houseId));
        })
            .map((event) => event.target);
    }
}
