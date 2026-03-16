import { GameSpeed } from "@/game/GameSpeed";
import { TriggerCondition } from "@/game/trigger/TriggerCondition";
export class ElapsedTimeCondition extends TriggerCondition {
    private elapsedTicks: number;
    private timerTicks: number;
    constructor(event: any, trigger: any) {
        super(event, trigger);
        this.elapsedTicks = 0;
        this.timerTicks = Number(this.event.params[1]) * GameSpeed.BASE_TICKS_PER_SECOND;
    }
    check(context: any): boolean {
        return this.elapsedTicks++ > this.timerTicks;
    }
    reset(): void {
        this.elapsedTicks = 0;
    }
}
