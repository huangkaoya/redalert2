import { GameSpeed } from "@/game/GameSpeed";
import { TriggerCondition } from "@/game/trigger/TriggerCondition";
export class RandomDelayCondition extends TriggerCondition {
    private elapsedTicks: number = 0;
    private timerTicks?: number;
    check(e: any): boolean {
        if (!this.timerTicks) {
            this.timerTicks = Math.floor((e.generateRandomInt(50, 150) / 100) * Number(this.event.params[1])) * GameSpeed.BASE_TICKS_PER_SECOND;
        }
        return this.elapsedTicks++ > this.timerTicks;
    }
    reset(): void {
        this.timerTicks = undefined;
        this.elapsedTicks = 0;
    }
}
