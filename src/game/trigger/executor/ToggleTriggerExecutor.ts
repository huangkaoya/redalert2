import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class ToggleTriggerExecutor extends TriggerExecutor {
    private triggerEnable: boolean;
    constructor(action: any, context: any, triggerEnable: boolean) {
        super(action, context);
        this.triggerEnable = triggerEnable;
    }
    execute(game: any): void {
        const triggerId = this.action.params[1];
        game.triggers.setTriggerEnabled(triggerId, this.triggerEnable);
    }
}
