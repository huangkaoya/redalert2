import { EventType } from "@/game/event/EventType";
import { TriggerCondition } from "@/game/trigger/TriggerCondition";
export class SpyEnteringAsInfantryCondition extends TriggerCondition {
    private infantryIdx: number;
    constructor(params: any[], targets: any[]) {
        super(params, targets);
        this.infantryIdx = Number(params[1]);
    }
    check(events: any[], targets: any[]): any[] {
        return events
            .filter((event) => {
            if (event.type !== EventType.BuildingInfiltration)
                return false;
            const target = event.target;
            return (this.targets.includes(target) &&
                event.source.disguiseTrait?.getDisguise()?.rules.index === this.infantryIdx);
        })
            .map((event) => event.target);
    }
}
