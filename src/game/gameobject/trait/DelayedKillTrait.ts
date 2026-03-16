import { Timer } from "@/game/gameobject/unit/Timer";
import { NotifyTick } from "@/game/gameobject/trait/interface/NotifyTick";
export class DelayedKillTrait {
    private timer: Timer;
    private attackerInfo: any;
    constructor() {
        this.timer = new Timer();
    }
    isActive(): boolean {
        return this.timer.isActive();
    }
    activate(ticks: number, attackerInfo: any): void {
        if (!this.isActive()) {
            this.timer.setActiveFor(ticks);
            this.attackerInfo = attackerInfo;
        }
    }
    [NotifyTick.onTick](target: any, context: any): void {
        if (this.timer.isActive() && this.timer.tick(context.currentTick) === true) {
            if (!target.invulnerableTrait.isActive() &&
                !(target.isBuilding() && target.cabHutTrait)) {
                context.destroyObject(target, this.attackerInfo, true, true);
            }
        }
    }
}
