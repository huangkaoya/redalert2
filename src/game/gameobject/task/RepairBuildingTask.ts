import { BuildingRepairFullEvent } from "@/game/event/BuildingRepairFullEvent";
import { BridgeRepairEvent } from "@/game/event/BridgeRepairEvent";
import { EnterBuildingTask } from "@/game/gameobject/task/EnterBuildingTask";
export class RepairBuildingTask extends EnterBuildingTask {
    isAllowed(e: any): boolean {
        return this.target.cabHutTrait
            ? this.target.cabHutTrait.canRepairBridge()
            : e.rules.engineer &&
                !this.target.isDestroyed &&
                this.target.rules.repairable &&
                this.target.healthTrait.health < 100 &&
                ((!this.target.owner.isCombatant() &&
                    !!this.target.garrisonTrait) ||
                    this.game.areFriendly(e, this.target));
    }
    onEnter(e: any): void {
        this.game.unspawnObject(e);
        if (this.target.cabHutTrait) {
            this.target.cabHutTrait.repairBridge(this.game, e.owner);
            this.game.events.dispatch(new BridgeRepairEvent(e.owner, this.target.centerTile));
        }
        else {
            this.target.healthTrait.healToFull(e, this.game);
            this.game.events.dispatch(new BuildingRepairFullEvent(this.target, e.owner));
        }
    }
}
