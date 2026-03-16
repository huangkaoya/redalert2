import { TriggerCondition } from "@/game/trigger/TriggerCondition";
export class NoFactoriesLeftCondition extends TriggerCondition {
    check(): boolean {
        if (!this.player)
            return false;
        for (const building of this.player.buildings) {
            if (building.factoryTrait)
                return false;
        }
        return true;
    }
}
