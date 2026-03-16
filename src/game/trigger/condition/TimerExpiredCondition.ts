import { EventType } from "@/game/event/EventType";
import { TriggerCondition } from "@/game/trigger/TriggerCondition";
export class TimerExpiredCondition extends TriggerCondition {
    check(event: any, events: any[]): boolean {
        return events.some((event) => event.type === EventType.TimerExpire);
    }
}
