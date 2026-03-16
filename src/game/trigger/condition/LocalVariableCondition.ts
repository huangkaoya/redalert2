import { TriggerCondition } from '../TriggerCondition';
export class LocalVariableCondition extends TriggerCondition {
    private value: any;
    private variableIdx: number;
    constructor(trigger: any, type: any, value: any) {
        super(trigger, type);
        this.value = value;
        this.blocking = true;
        this.variableIdx = Number(trigger.params[1]);
    }
    check(context: any): boolean {
        return context.triggers.getLocalVariable(this.variableIdx) === this.value;
    }
}
