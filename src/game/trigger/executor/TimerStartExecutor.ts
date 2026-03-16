import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class TimerStartExecutor extends TriggerExecutor {
    execute(context: any): void {
        context.countdownTimer.start();
    }
}
