import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class TimerStopExecutor extends TriggerExecutor {
    execute(context: any): void {
        context.countdownTimer.stop();
    }
}
