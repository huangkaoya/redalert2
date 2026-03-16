import { TriggerCondition } from "@/game/trigger/TriggerCondition";
export class AnyEventCondition extends TriggerCondition {
    check(event: any): boolean {
        return true;
    }
}
