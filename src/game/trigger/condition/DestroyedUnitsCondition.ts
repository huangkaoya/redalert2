import { EventType } from "@/game/event/EventType";
import { TriggerCondition } from "@/game/trigger/TriggerCondition";
export class DestroyedUnitsCondition extends TriggerCondition {
    private count: number = 0;
    private threshold: number;
    private houseId: number;
    constructor(params: any, context: any) {
        super(params, context);
        this.threshold = Number(params[1]);
    }
    check(events: any, eventList: any[]): boolean {
        if (!this.player)
            return false;
        if (this.count >= this.threshold)
            return true;
        for (const event of eventList) {
            if (event.type === EventType.ObjectDestroy) {
                const target = event.target;
                if (target.isUnit() && target.owner.country?.id === this.houseId) {
                    this.count++;
                }
            }
        }
        return this.count >= this.threshold;
    }
}
