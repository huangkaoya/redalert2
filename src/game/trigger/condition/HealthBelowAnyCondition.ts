import { EventType } from "@/game/event/EventType";
import { TriggerCondition } from "@/game/trigger/TriggerCondition";
export class HealthBelowAnyCondition extends TriggerCondition {
    private threshold: number;
    constructor(id: string, targets: string[], threshold: number) {
        super(id, targets);
        this.threshold = threshold;
    }
    check(events: any[], targets: any[]): any[] {
        return events
            .filter((event) => {
            if (event.type !== EventType.HealthChange)
                return false;
            const target = event.target;
            return (!(!target.isTechno() || !this.targets.includes(target)) &&
                event.currentHealth < this.threshold &&
                event.prevHealth > this.threshold);
        })
            .map((event) => event.target);
    }
}
