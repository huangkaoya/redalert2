import { GameSpeed } from "@/game/GameSpeed";
import { TriggerCondition } from "@/game/trigger/TriggerCondition";
export class ElapsedScenarioTimeCondition extends TriggerCondition {
    private timerTicks: number;
    constructor(event: any, trigger: any) {
        super(event, trigger);
        this.timerTicks = Number(this.event.params[1]) * GameSpeed.BASE_TICKS_PER_SECOND;
    }
    check(context: any): boolean {
        return context.currentTick > this.timerTicks;
    }
}
