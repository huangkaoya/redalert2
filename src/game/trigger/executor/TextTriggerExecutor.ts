import { TriggerTextEvent } from '@/game/event/TriggerTextEvent';
import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class TextTriggerExecutor extends TriggerExecutor {
    execute(context: any): void {
        context.events.dispatch(new TriggerTextEvent(this.action.params[1]));
    }
}
