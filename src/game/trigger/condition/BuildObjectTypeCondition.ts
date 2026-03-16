import { TriggerCondition } from "@/game/trigger/TriggerCondition";
import { EventType } from "@/game/event/EventType";
export class BuildObjectTypeCondition extends TriggerCondition {
    private objectType: string;
    private objectIndex: number;
    constructor(params: any[], trigger: any, objectType: string) {
        super(params, trigger);
        this.objectType = objectType;
        this.objectIndex = Number(params[1]);
    }
    check(event: any, events: any[]): boolean {
        return events.some((event) => event.type === EventType.ObjectSpawn &&
            event.gameObject.type === this.objectType &&
            event.gameObject.rules.index === this.objectIndex);
    }
}
