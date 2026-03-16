import { EventType } from "@/game/event/EventType";
import { TriggerCondition } from "@/game/trigger/TriggerCondition";
export class DestroyedByAnyCondition extends TriggerCondition {
    check(context: any, events: any[]): any[] {
        return events
            .filter((event) => {
            if (event.type !== EventType.ObjectDestroy)
                return false;
            const target = event.target;
            if (!target.isTechno() || !this.targets.includes(target))
                return false;
            const attacker = event.attackerInfo?.player;
            return ((!attacker ||
                (!context.alliances.areAllied(attacker, target.owner) &&
                    attacker !== target.owner)) &&
                !event.incidental);
        })
            .map((event) => event.target);
    }
}
