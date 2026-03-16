import { EventType } from "@/game/event/EventType";
import { TriggerCondition } from "@/game/trigger/TriggerCondition";
export class AttackedByHouseCondition extends TriggerCondition {
    private houseId: number;
    constructor(event: any, trigger: any) {
        super(event, trigger);
        this.houseId = Number(event.params[1]);
    }
    check(context: any, events: any[]): any[] {
        return events
            .filter((event) => {
            if (event.type !== EventType.ObjectAttacked)
                return false;
            const target = event.target;
            if (!target.isTechno() || !this.targets.includes(target))
                return false;
            const attacker = event.attacker?.player;
            return (attacker &&
                (this.houseId === -1 || attacker?.country?.id === this.houseId));
        })
            .map((event) => event.target);
    }
}
