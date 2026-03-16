import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class GlobalVariableExecutor extends TriggerExecutor {
    private value: any;
    private variableIdx: number;
    constructor(params: any, context: any, value: any) {
        super(params, context);
        this.value = value;
        this.variableIdx = Number(params[1]);
    }
    execute(context: any): void {
        context.triggers.toggleGlobalVariable(this.variableIdx, this.value);
    }
}
