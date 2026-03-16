import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class TimerSetExecutor extends TriggerExecutor {
    execute(context: any): void {
        context.countdownTimer.setSeconds(Number(this.action.params[1]));
    }
}
