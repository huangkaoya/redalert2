import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class DestroyTriggerExecutor extends TriggerExecutor {
    execute(context: any): void {
        const triggerId = this.action.params[1];
        context.triggers.destroyTrigger(triggerId);
    }
}
