import { DeathType } from "@/game/gameobject/common/DeathType";
import { Timer } from "@/game/gameobject/unit/Timer";
import { NotifyTick } from "@/game/gameobject/trait/interface/NotifyTick";
export class C4ChargeTrait {
    private timer: Timer;
    private attackerInfo: any;
    constructor() {
        this.timer = new Timer();
    }
    hasCharge(): boolean {
        return this.timer.isActive();
    }
    setCharge(duration: number, attacker: any): void {
        if (!this.hasCharge()) {
            this.timer.setActiveFor(duration);
            this.attackerInfo = attacker;
        }
    }
    [NotifyTick.onTick](target: any, context: any): void {
        if (this.timer.isActive() &&
            this.timer.tick(context.currentTick) === true) {
            if (!target.invulnerableTrait.isActive()) {
                if (target.isBuilding() && target.cabHutTrait) {
                    target.cabHutTrait.demolishBridge(context, this.attackerInfo);
                }
                else {
                    target.deathType = DeathType.Demolish;
                    context.destroyObject(target, this.attackerInfo, true);
                }
            }
        }
    }
}
