import { GameSpeed } from "@/game/GameSpeed";
import { EnterObjectEvent } from "@/game/event/EnterObjectEvent";
import { EnterBuildingTask } from "@/game/gameobject/task/EnterBuildingTask";
export class PlantC4Task extends EnterBuildingTask {
    isAllowed(e: any): boolean {
        return (!this.target.isDestroyed &&
            !this.target.invulnerableTrait.isActive());
    }
    onEnter(e: any): boolean {
        const chargeTime = Math.floor(60 *
            this.game.rules.combatDamage.c4Delay *
            GameSpeed.BASE_TICKS_PER_SECOND);
        this.target.c4ChargeTrait.setCharge(chargeTime, {
            player: e.owner,
            obj: e,
        });
        this.game.events.dispatch(new EnterObjectEvent(this.target, e));
        return false;
    }
    getTargetLinesConfig(e: any): {
        target: any;
        pathNodes: any[];
        isAttack: boolean;
    } {
        return { target: this.target, pathNodes: [], isAttack: true };
    }
}
