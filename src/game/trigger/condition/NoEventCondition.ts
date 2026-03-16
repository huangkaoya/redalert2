import { TriggerCondition } from "../TriggerCondition";
export class NoEventCondition extends TriggerCondition {
    check(): boolean {
        return false;
    }
}
