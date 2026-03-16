import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class TimerShortenExecutor extends TriggerExecutor {
    execute(context: any): void {
        context.countdownTimer.addSeconds(-Number(this.action.params[1]));
    }
}
