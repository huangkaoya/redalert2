import { TriggerEvaEvent } from '@/game/event/TriggerEvaEvent';
import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class PlaySpeechExecutor extends TriggerExecutor {
    execute(context: any): void {
        context.events.dispatch(new TriggerEvaEvent(this.action.params[1]));
    }
}
