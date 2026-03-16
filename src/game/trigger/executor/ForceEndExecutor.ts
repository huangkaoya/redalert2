import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class ForceEndExecutor extends TriggerExecutor {
    execute(trigger: any): void {
        trigger.end();
    }
}
