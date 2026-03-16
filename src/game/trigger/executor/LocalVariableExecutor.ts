import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class LocalVariableExecutor extends TriggerExecutor {
    private value: boolean;
    private variableIdx: number;
    constructor(trigger: any, context: any, value: boolean) {
        super(trigger, context);
        this.value = value;
        this.variableIdx = Number(trigger.params[1]);
    }
    execute(context: any): void {
        context.triggers.toggleLocalVariable(this.variableIdx, this.value);
    }
}
